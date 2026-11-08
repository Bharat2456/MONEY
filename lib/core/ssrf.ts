import { isIP } from 'node:net';
import { badRequest } from './errors';

/** Expand an IPv6 literal into 8 numeric hextets. Returns null when malformed. */
function ipv6Hextets(ip: string): number[] | null {
  let addr = ip.toLowerCase().split('%')[0];
  const v4 = /(\d+\.\d+\.\d+\.\d+)$/.exec(addr);
  if (v4) {
    const p = v4[1].split('.').map(Number);
    if (p.some((n) => n > 255)) return null;
    addr = addr.slice(0, -v4[1].length) + ((p[0] << 8) | p[1]).toString(16) + ':' + ((p[2] << 8) | p[3]).toString(16);
  }
  const halves = addr.split('::');
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(':') : [];
  const tail = halves.length === 2 && halves[1] ? halves[1].split(':') : [];
  const fill = halves.length === 2 ? 8 - head.length - tail.length : 0;
  if (fill < 0 || (halves.length === 1 && head.length !== 8)) return null;
  const all = [...head, ...Array(fill).fill('0'), ...tail];
  if (all.length !== 8) return null;
  const nums = all.map((h) => parseInt(h, 16));
  return nums.some((n) => Number.isNaN(n) || n < 0 || n > 0xffff) ? null : nums;
}

function isPrivateV4(ip: string): boolean {
  const [a, b, c] = ip.split('.').map(Number);
  return (
    a === 0 || a === 10 || a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0 && (c === 0 || c === 2)) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    (a === 198 && b === 51 && c === 100) ||
    (a === 203 && b === 0 && c === 113) ||
    a >= 224
  );
}

/** True for loopback, private, link-local, CGNAT, multicast, reserved, metadata and malformed addresses. */
export function isPrivateIp(ip: string): boolean {
  const kind = isIP(ip);
  if (kind === 4) return isPrivateV4(ip);
  if (kind === 6) {
    const h = ipv6Hextets(ip);
    if (!h) return true;
    if (h.every((x) => x === 0)) return true; // ::
    if (h.slice(0, 7).every((x) => x === 0) && h[7] === 1) return true; // ::1
    if (h.slice(0, 5).every((x) => x === 0) && (h[5] === 0xffff || h[5] === 0)) {
      return isPrivateV4(`${h[6] >> 8}.${h[6] & 255}.${h[7] >> 8}.${h[7] & 255}`); // IPv4-mapped / compatible
    }
    if ((h[0] & 0xfe00) === 0xfc00) return true; // fc00::/7 unique local
    if ((h[0] & 0xffc0) === 0xfe80) return true; // fe80::/10 link-local
    if ((h[0] & 0xff00) === 0xff00) return true; // multicast
    if (h[0] === 0x2001 && h[1] === 0x0db8) return true; // documentation
    if (h[0] === 0x2002) return true; // 6to4
    if (h[0] === 0x0064 && h[1] === 0xff9b) return true; // NAT64
    return false;
  }
  return true; // not an IP => treat as unsafe when asked
}

const BLOCKED_HOSTS = new Set(['localhost', 'metadata.google.internal', 'metadata', 'instance-data']);
const BLOCKED_SUFFIXES = ['.localhost', '.local', '.internal', '.localdomain', '.lan', '.home', '.corp', '.intranet'];

export function isBlockedHostname(hostRaw: string): boolean {
  const host = hostRaw.toLowerCase().replace(/\.$/, '');
  if (BLOCKED_HOSTS.has(host)) return true;
  return BLOCKED_SUFFIXES.some((s) => host.endsWith(s));
}

/** Synchronous structural validation of a webhook destination. Throws ApiError(400) when unsafe. */
export function validateWebhookUrl(raw: string): URL {
  if (typeof raw !== 'string' || raw.length === 0 || raw.length > 2048) throw badRequest('Webhook URL is missing or too long.', { field: 'url' }, 'invalid_webhook_url');
  let u: URL;
  try { u = new URL(raw); } catch { throw badRequest('Webhook URL is not a valid URL.', { field: 'url' }, 'invalid_webhook_url'); }
  if (u.protocol !== 'https:') throw badRequest('Webhook URLs must use https.', { field: 'url' }, 'invalid_webhook_url');
  if (u.username || u.password) throw badRequest('Webhook URLs must not contain credentials.', { field: 'url' }, 'invalid_webhook_url');
  if (u.port && !['443', '8443'].includes(u.port)) throw badRequest('Webhook URLs may only use port 443 or 8443.', { field: 'url' }, 'invalid_webhook_url');
  const host = u.hostname.replace(/^\[|\]$/g, '');
  if (isIP(host)) {
    if (isPrivateIp(host)) throw badRequest('Webhook destination is not a public address.', { field: 'url' }, 'unsafe_webhook_destination');
  } else {
    if (isBlockedHostname(host)) throw badRequest('Webhook destination is not allowed.', { field: 'url' }, 'unsafe_webhook_destination');
    if (!host.includes('.')) throw badRequest('Webhook host must be a fully qualified domain name.', { field: 'url' }, 'unsafe_webhook_destination');
  }
  return u;
}

export type DnsResolver = (hostname: string) => Promise<string[]>;

/** Resolves a hostname and rejects if ANY returned address is non-public (defends against DNS-based SSRF). */
export async function assertPublicHost(hostname: string, resolve: DnsResolver): Promise<string[]> {
  const host = hostname.replace(/^\[|\]$/g, '');
  const addrs = isIP(host) ? [host] : await resolve(host);
  if (!addrs.length) throw badRequest('Webhook host did not resolve.', undefined, 'unsafe_webhook_destination');
  for (const a of addrs) if (isPrivateIp(a)) throw badRequest('Webhook destination resolves to a non-public address.', undefined, 'unsafe_webhook_destination');
  return addrs;
}

/**
 * Return URLs must be http(s), credential-free and belong to an origin the project owner has allow-listed.
 * `http:` is only accepted for localhost origins (developer convenience; no server-side fetch is made to return URLs).
 */
export function validateReturnUrl(raw: string, allowedOrigins: readonly string[]): URL {
  if (typeof raw !== 'string' || raw.length > 2048) throw badRequest('return_url is invalid.', { field: 'return_url' });
  let u: URL;
  try { u = new URL(raw); } catch { throw badRequest('return_url is not a valid URL.', { field: 'return_url' }); }
  if (u.username || u.password) throw badRequest('return_url must not contain credentials.', { field: 'return_url' });
  const isLocal = u.hostname === 'localhost' || u.hostname === '127.0.0.1';
  if (u.protocol !== 'https:' && !(u.protocol === 'http:' && isLocal)) throw badRequest('return_url must use https (http is allowed only for localhost).', { field: 'return_url' });
  if (!isLocal && !allowedOrigins.includes(u.origin)) {
    throw badRequest('return_url origin is not allowed for this project. Add it to the project website or allowed return origins.', { field: 'return_url', origin: u.origin }, 'return_url_not_allowed');
  }
  return u;
}

export function originOf(raw: string | undefined | null): string | null {
  if (!raw) return null;
  try { return new URL(raw).origin; } catch { return null; }
}
