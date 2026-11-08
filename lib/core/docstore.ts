/**
 * Minimal document-store abstraction. Production = Firestore (Admin SDK); tests = in-memory.
 * Paths are Firestore-style: even segment count = document, odd = collection.
 */
export type WhereOp = '==' | '<' | '<=' | '>' | '>=';
export interface QueryOptions {
  where?: Array<[field: string, op: WhereOp, value: string | number | boolean]>;
  orderBy?: [field: string, dir: 'asc' | 'desc'];
  limit?: number;
}
export type Doc = Record<string, unknown>;

export interface Tx {
  get<T = Doc>(path: string): Promise<T | null>;
  set(path: string, data: Doc): void;
  update(path: string, patch: Doc): void;
  delete(path: string): void;
}

export interface DocStore {
  get<T = Doc>(path: string): Promise<T | null>;
  set(path: string, data: Doc): Promise<void>;
  update(path: string, patch: Doc): Promise<void>;
  delete(path: string): Promise<void>;
  query<T = Doc>(collectionPath: string, opts?: QueryOptions): Promise<T[]>;
  queryGroup<T = Doc>(collectionId: string, opts?: QueryOptions): Promise<T[]>;
  /** Recursively deletes a document and every sub-collection beneath it. */
  deleteTree(path: string): Promise<void>;
  /** Atomic read-then-write. All reads must precede writes. May re-run `fn` on contention. */
  runTransaction<R>(fn: (tx: Tx) => Promise<R>): Promise<R>;
}
