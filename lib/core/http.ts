import https from 'node:https';
import dns from 'node:dns';
import { isPrivateIp } from './ssrf';

export interface TransportRequest { url: string; headers: Record<string, string>; body: string; timeoutMs: number }
export interface TransportResult { status: number; body: string }
export type Transport = (req: TransportRequest) => Promise<TransportResult>;

const PREVIEW_BYTES = 2048;

/**
 * SSRF-hardened HTTPS POST.
 *  - the DNS answer is validated at *connect time* (defeats DNS rebinding between check and use);
 *  - redirects are never followed (a 3xx is just a response);
 *  - hard timeout and a response-size cap.
 */
export const safeTransport: Transport = ({ url, headers, body, timeoutMs }) =>
  new Promise((resolve, reject) => {
    const u = new URL(url);
    const req = https.request(
      {
        method: 'POST', hostname: u.hostname.replace(/^\[|\]$/g, ''), port: u.port || 443, path: u.pathname + u.search,
        headers: { ...headers, 'content-length': Buffer.byteLength(body).toString(), 'user-agent': 'MONEY-Webhooks/1.0 (sandbox)' },
        timeout: timeoutMs,
        lookup: (hostname, options, cb) => {
          dns.lookup(hostname, { all: true }, (err, addrs) => {
            if (err) return (cb as (e: Error | null, a?: unknown, f?: number) => void)(err);
            const bad = addrs.find((a) => isPrivateIp(a.address));
            if (bad || addrs.length === 0) return (cb as (e: Error) => void)(new Error('blocked_destination'));
            if ((options as { all?: boolean }).all) return (cb as unknown as (e: null, a: typeof addrs) => void)(null, addrs);
            return (cb as unknown as (e: null, a: string, f: number) => void)(null, addrs[0].address, addrs[0].family);
          });
        },
      },
      (res) => {
        const chunks: Buffer[] = []; let size = 0;
        res.on('data', (c: Buffer) => { size += c.length; if (size <= PREVIEW_BYTES) chunks.push(c); else res.destroy(); });
        const done = () => resolve({ status: res.statusCode ?? 0, body: Buffer.concat(chunks).toString('utf8') });
        res.on('end', done); res.on('close', done);
      },
    );
    req.on('timeout', () => req.destroy(new Error('timeout')));
    req.on('error', reject);
    req.end(body);
  });

export const defaultResolver = async (hostname: string): Promise<string[]> =>
  (await dns.promises.lookup(hostname, { all: true })).map((a) => a.address);
