import type { Firestore, Query } from 'firebase-admin/firestore';
import type { Doc, DocStore, QueryOptions, Tx } from '@/lib/core/docstore';

/** DocStore backed by Firestore (Admin SDK). Only ever instantiated in trusted server code. */
export class FirestoreStore implements DocStore {
  constructor(private readonly db: Firestore) {}

  async get<T = Doc>(path: string): Promise<T | null> {
    const s = await this.db.doc(path).get();
    return s.exists ? (s.data() as T) : null;
  }
  async set(path: string, data: Doc) { await this.db.doc(path).set(data); }
  async update(path: string, patch: Doc) { await this.db.doc(path).update(patch); }
  async delete(path: string) { await this.db.doc(path).delete(); }

  private apply(q: Query, o?: QueryOptions): Query {
    for (const [f, op, v] of o?.where ?? []) q = q.where(f, op, v);
    if (o?.orderBy) q = q.orderBy(o.orderBy[0], o.orderBy[1]);
    if (o?.limit) q = q.limit(o.limit);
    return q;
  }
  async query<T = Doc>(collectionPath: string, o?: QueryOptions): Promise<T[]> {
    return (await this.apply(this.db.collection(collectionPath), o).get()).docs.map((d) => d.data() as T);
  }
  async queryGroup<T = Doc>(collectionId: string, o?: QueryOptions): Promise<T[]> {
    return (await this.apply(this.db.collectionGroup(collectionId), o).get()).docs.map((d) => d.data() as T);
  }
  async deleteTree(path: string) { await this.db.recursiveDelete(this.db.doc(path)); }

  runTransaction<R>(fn: (tx: Tx) => Promise<R>): Promise<R> {
    return this.db.runTransaction(async (t) =>
      fn({
        get: async <T = Doc>(p: string) => { const s = await t.get(this.db.doc(p)); return s.exists ? (s.data() as T) : null; },
        set: (p, d) => { t.set(this.db.doc(p), d); },
        update: (p, d) => { t.update(this.db.doc(p), d); },
        delete: (p) => { t.delete(this.db.doc(p)); },
      }),
    );
  }
}
