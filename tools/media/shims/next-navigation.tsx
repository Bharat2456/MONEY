import { useSyncExternalStore } from 'react';

const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());
if (typeof window !== 'undefined') window.addEventListener('popstate', emit);
const subscribe = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };

export function navigate(url: string, replace = false) {
  if (replace) history.replaceState({}, '', url); else history.pushState({}, '', url);
  emit();
  const hash = url.split('#')[1];
  if (hash) setTimeout(() => document.getElementById(hash)?.scrollIntoView(), 30); else window.scrollTo(0, 0);
}

const router = { replace: (u: string) => navigate(u, true), push: (u: string) => navigate(u) };
const path = () => location.pathname;
const search = () => location.search;

export const useRouter = () => router;
export const usePathname = () => useSyncExternalStore(subscribe, path, path);
export const useSearchParams = () => new URLSearchParams(useSyncExternalStore(subscribe, search, search));
export function useParams<T = Record<string, string>>(): T {
  const p = usePathname();
  let m = /^\/checkout\/([^/]+)/.exec(p); if (m) return { orderId: m[1] } as T;
  m = /^\/dashboard\/projects\/([^/]+)/.exec(p); if (m) return { id: m[1] } as T;
  return {} as T;
}
export function notFound(): never { throw new Error('notFound'); }
