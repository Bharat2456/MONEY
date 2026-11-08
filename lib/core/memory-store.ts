import type { Doc, DocStore, QueryOptions, Tx } from './docstore';

const clone = <T>(v: T): T => structuredClone(v);

function matches(doc: Doc, opts: QueryOptions | undefined): boolean {
  for (const [f, op, v] of opts?.where ?? []) {
    const x = doc[f] as string | number | boolean;
    if (op === '==' && x !== v) return false;
    if (op === '<' && !(x < v)) return false;
    if (op === '<=' && !(x <= v)) return false;
    if (op === '>' && !(x > v)) return false;
    if (op === '>=' && !(x >= v)) return false;
  }
  return true;
}

function finish<T>(docs: Doc[], opts?: QueryOptions): T[] {
  let out = docs.filter((d) => matches(d, opts));
  if (opts?.orderBy) {
    const [f, dir] = opts.orderBy;
    out = out.sort((a, b) => {
      const x = a[f] as number | string, y = b[f] as number | string;
      return (x < y ? -1 : x > y ? 1 : 0) * (dir === 'desc' ? -1 : 1);
    });
  }
  if (opts?.limit) out = out.slice(0, opts.limit);
  return out.map((d) => clone(d)) as T[];
}

/** In-memory DocStore for unit/integration tests and the optional `MONEY_STORE=memory` demo mode. */
export class MemoryStore implements DocStore {
  private data = new Map<string, Doc>();
  private lock: Promise<unknown> = Promise.resolve();

  async get<T = Doc>(path: string): Promise<T | null> {
    const d = this.data.get(path);
    return d ? (clone(d) as T) : null;
  }
  async set(path: string, doc: Doc): Promise<void> { this.data.set(path, clone(doc)); }
  async update(path: string, patch: Doc): Promise<void> {
    const cur = this.data.get(path);
    if (!cur) throw Object.assign(new Error(`No document at ${path}`), { code: 5 });
    this.data.set(path, { ...cur, ...clone(patch) });
  }
  async delete(path: string): Promise<void> { this.data.delete(path); }

  async query<T = Doc>(collectionPath: string, opts?: QueryOptions): Promise<T[]> {
    const prefix = collectionPath + '/';
    const docs: Doc[] = [];
    for (const [p, d] of this.data) if (p.startsWith(prefix) && !p.slice(prefix.length).includes('/')) docs.push(d);
    return finish<T>(docs, opts);
  }
  async queryGroup<T = Doc>(collectionId: string, opts?: QueryOptions): Promise<T[]> {
    const docs: Doc[] = [];
    for (const [p, d] of this.data) { const s = p.split('/'); if (s[s.length - 2] === collectionId) docs.push(d); }
    return finish<T>(docs, opts);
  }
  async deleteTree(path: string): Promise<void> {
    for (const p of [...this.data.keys()]) if (p === path || p.startsWith(path + '/')) this.data.delete(p);
  }

  /** Serialises transactions with a mutex, which gives the same atomicity guarantee as Firestore for tests. */
  runTransaction<R>(fn: (tx: Tx) => Promise<R>): Promise<R> {
    const run = async (): Promise<R> => {
      const writes: Array<() => void> = [];
      const tx: Tx = {
        get: async <T = Doc>(path: string) => this.get<T>(path),
        set: (path, doc) => { writes.push(() => this.data.set(path, clone(doc))); },
        update: (path, patch) => { writes.push(() => { const c = this.data.get(path); if (!c) throw new Error(`No document at ${path}`); this.data.set(path, { ...c, ...clone(patch) }); }); },
        delete: (path) => { writes.push(() => { this.data.delete(path); }); },
      };
      const result = await fn(tx);
      for (const w of writes) w();
      return result;
    };
    const next = this.lock.then(run, run);
    this.lock = next.catch(() => undefined);
    return next;
  }

  /** Test helper. */
  paths(): string[] { return [...this.data.keys()]; }
}
