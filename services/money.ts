import { randomBytes } from 'node:crypto';
import type { Doc, DocStore, Tx } from '@/lib/core/docstore';
import { decryptSecret, encryptSecret } from '@/lib/core/crypto';
import { ApiError, badRequest, conflict, forbidden, notFound, unauthorized, unprocessable } from '@/lib/core/errors';
import type { Transport } from '@/lib/core/http';
import { newId, randomToken, sha256Hex } from '@/lib/core/ids';
import { classifyKey, generateKeyPair, hashSecret } from '@/lib/core/keys';
import { getScenario } from '@/lib/core/simulation';
import { assertPublicHost, originOf, validateReturnUrl, validateWebhookUrl, type DnsResolver } from '@/lib/core/ssrf';
import { signPayload } from '@/lib/core/signing';
import { EVENT_FOR_STATUS, canTransition, type OrderStatus, type WebhookEventType } from '@/lib/core/state-machine';
import { parseCreateOrder, parseProject, parseRefund, parseWebhook, type ProjectInput } from '@/lib/core/validation';
import type { Actor, DeliveryDoc, EventDoc, KeyDoc, OrderDoc, ProjectDoc, RefundDoc, TxnDoc, UserDoc, WebhookDoc } from '@/types';
import { serializeOrder, serializeRefund } from './serializers';

export interface Deps {
  store: DocStore;
  appUrl: string;
  encryptionKey: string;
  keyPepper?: string;
  transport: Transport;
  resolveDns: DnsResolver;
  now?: () => number;
}
export interface Ctx { uid: string; projectId: string }

export const LIMITS = { projectsPerUser: 10, activeKeysPerProject: 5, webhooksPerProject: 5, maxDeliveryAttempts: 10, listMax: 500 };
const DELIVERY_TIMEOUT_MS = 4000;

interface PendingWebhookEvent { id: string; type: WebhookEventType; object: Doc }
interface Out { events: PendingWebhookEvent[] }

const P = {
  user: (u: string) => `users/${u}`,
  projects: (u: string) => `users/${u}/projects`,
  project: (u: string, p: string) => `users/${u}/projects/${p}`,
  keys: (c: Ctx) => `users/${c.uid}/projects/${c.projectId}/apiKeys`,
  key: (c: Ctx, k: string) => `users/${c.uid}/projects/${c.projectId}/apiKeys/${k}`,
  orders: (c: Ctx) => `users/${c.uid}/projects/${c.projectId}/orders`,
  order: (c: Ctx, o: string) => `users/${c.uid}/projects/${c.projectId}/orders/${o}`,
  txns: (c: Ctx) => `users/${c.uid}/projects/${c.projectId}/transactions`,
  txn: (c: Ctx, t: string) => `users/${c.uid}/projects/${c.projectId}/transactions/${t}`,
  txnEvents: (c: Ctx, t: string) => `users/${c.uid}/projects/${c.projectId}/transactions/${t}/events`,
  txnEvent: (c: Ctx, t: string, e: string) => `users/${c.uid}/projects/${c.projectId}/transactions/${t}/events/${e}`,
  refunds: (c: Ctx) => `users/${c.uid}/projects/${c.projectId}/refunds`,
  refund: (c: Ctx, r: string) => `users/${c.uid}/projects/${c.projectId}/refunds/${r}`,
  refundEvents: (c: Ctx, r: string) => `users/${c.uid}/projects/${c.projectId}/refunds/${r}/events`,
  refundEvent: (c: Ctx, r: string, e: string) => `users/${c.uid}/projects/${c.projectId}/refunds/${r}/events/${e}`,
  webhooks: (c: Ctx) => `users/${c.uid}/projects/${c.projectId}/webhooks`,
  webhook: (c: Ctx, w: string) => `users/${c.uid}/projects/${c.projectId}/webhooks/${w}`,
  deliveries: (c: Ctx) => `users/${c.uid}/projects/${c.projectId}/deliveries`,
  delivery: (c: Ctx, d: string) => `users/${c.uid}/projects/${c.projectId}/deliveries/${d}`,
  idem: (c: Ctx, hash: string) => `users/${c.uid}/projects/${c.projectId}/idempotency/${hash}`,
  apiLogs: (c: Ctx) => `users/${c.uid}/projects/${c.projectId}/apiLogs`,
  apiLog: (c: Ctx, l: string) => `users/${c.uid}/projects/${c.projectId}/apiLogs/${l}`,
  skIndex: (hash: string) => `apiKeyIndex/${hash}`,
  pkIndex: (pk: string) => `pkIndex/${pk}`,
  orderIndex: (o: string) => `orderIndex/${o}`,
  audit: (id: string) => `auditLogs/${id}`,
};

export interface ListFilters { status?: string; merchantOrderId?: string; minAmount?: number; maxAmount?: number; from?: number; to?: number; limit?: number }

export class MoneyService {
  readonly store: DocStore;
  private readonly d: Deps;
  constructor(deps: Deps) { this.d = deps; this.store = deps.store; }
  private now = () => (this.d.now ? this.d.now() : Date.now());

  // ───────────────────────── users & audit ─────────────────────────
  async ensureUser(uid: string, email: string): Promise<UserDoc> {
    const existing = await this.store.get<UserDoc>(P.user(uid));
    if (existing) return existing;
    const u: UserDoc = { id: uid, email, createdAt: this.now(), suspended: false, deletionRequestedAt: null };
    await this.store.set(P.user(uid), u as unknown as Doc);
    return u;
  }
  async assertUserActive(uid: string): Promise<void> {
    const u = await this.store.get<UserDoc>(P.user(uid));
    if (u?.suspended) throw forbidden('This account has been suspended. Contact support.', 'account_suspended');
  }
  async audit(actorUid: string, action: string, target: string, meta: Doc = {}): Promise<void> {
    const id = newId('aud');
    await this.store.set(P.audit(id), { id, at: this.now(), actorUid, action, target, meta });
  }
  async requestAccountDeletion(uid: string): Promise<void> {
    await this.store.update(P.user(uid), { deletionRequestedAt: this.now() });
    await this.audit(uid, 'account.deletion_requested', P.user(uid));
  }

  // ───────────────────────── projects ─────────────────────────
  async createProject(uid: string, body: unknown) {
    const input = parseProject(body);
    const existing = await this.store.query<ProjectDoc>(P.projects(uid), { limit: LIMITS.projectsPerUser + 1 });
    if (existing.length >= LIMITS.projectsPerUser) throw conflict('project_limit_reached', `The free plan allows up to ${LIMITS.projectsPerUser} projects.`);
    const t = this.now();
    const project: ProjectDoc = { id: newId('prj'), uid, ...this.projectFields(input), environment: 'test', status: 'active', createdAt: t, updatedAt: t };
    await this.store.set(P.project(uid, project.id), project as unknown as Doc);
    const key = await this.createKeyPair({ uid, projectId: project.id }, 'Default key');
    await this.audit(uid, 'project.created', P.project(uid, project.id));
    return { project, key: key.key, secretKey: key.secretKey };
  }
  private projectFields(i: ProjectInput) {
    return { name: i.name, description: i.description, websiteUrl: i.websiteUrl, category: i.category, allowedReturnOrigins: i.allowedReturnOrigins };
  }
  listProjects(uid: string) { return this.store.query<ProjectDoc>(P.projects(uid), { orderBy: ['createdAt', 'desc'], limit: 50 }); }
  async getProject(uid: string, projectId: string): Promise<ProjectDoc> {
    const p = await this.store.get<ProjectDoc>(P.project(uid, projectId)); // ownership is structural: the path contains the authenticated uid
    if (!p) throw notFound('Project');
    return p;
  }
  async updateProject(uid: string, projectId: string, body: unknown) {
    await this.getProject(uid, projectId);
    const input = parseProject(body);
    await this.store.update(P.project(uid, projectId), { ...this.projectFields(input), updatedAt: this.now() });
    await this.audit(uid, 'project.updated', P.project(uid, projectId));
    return this.getProject(uid, projectId);
  }
  async setProjectStatus(uid: string, projectId: string, status: 'active' | 'archived') {
    await this.getProject(uid, projectId);
    await this.store.update(P.project(uid, projectId), { status, updatedAt: this.now() });
    await this.audit(uid, `project.${status === 'archived' ? 'archived' : 'restored'}`, P.project(uid, projectId));
    return this.getProject(uid, projectId);
  }
  async deleteProject(uid: string, projectId: string, confirmName: string) {
    const p = await this.getProject(uid, projectId);
    if (confirmName !== p.name) throw badRequest('Type the exact project name to confirm deletion.', { field: 'confirm_name' }, 'confirmation_mismatch');
    const c = { uid, projectId };
    for (const k of await this.store.query<KeyDoc>(P.keys(c))) { await this.store.delete(P.skIndex(k.secretHash)); await this.store.delete(P.pkIndex(k.publishableKey)); }
    for (const o of await this.store.query<OrderDoc>(P.orders(c))) await this.store.delete(P.orderIndex(o.id));
    await this.store.deleteTree(P.project(uid, projectId));
    await this.audit(uid, 'project.deleted', P.project(uid, projectId), { name: p.name });
  }

  // ───────────────────────── API keys ─────────────────────────
  async createKeyPair(c: Ctx, label = 'API key') {
    await this.getProject(c.uid, c.projectId);
    const active = (await this.store.query<KeyDoc>(P.keys(c), { where: [['status', '==', 'active']] })).length;
    if (active >= LIMITS.activeKeysPerProject) throw conflict('key_limit_reached', `A project may have at most ${LIMITS.activeKeysPerProject} active key pairs. Revoke one first.`);
    const kp = generateKeyPair(this.d.keyPepper);
    const key: KeyDoc = {
      id: newId('key'), uid: c.uid, projectId: c.projectId, label: label.replace(/[^\w .\-]/g, '').slice(0, 40) || 'API key',
      publishableKey: kp.publishableKey, secretHash: kp.secretHash, secretLast4: kp.secretLast4, status: 'active',
      createdAt: this.now(), lastUsedAt: null, revokedAt: null,
    };
    await this.store.runTransaction(async (tx) => {
      tx.set(P.key(c, key.id), key as unknown as Doc);
      tx.set(P.skIndex(kp.secretHash), { uid: c.uid, projectId: c.projectId, keyId: key.id });
      tx.set(P.pkIndex(kp.publishableKey), { uid: c.uid, projectId: c.projectId, keyId: key.id });
    });
    await this.audit(c.uid, 'apikey.created', P.key(c, key.id));
    return { key, secretKey: kp.secretKey }; // secretKey is returned ONCE and never stored
  }
  listKeys(c: Ctx) { return this.store.query<KeyDoc>(P.keys(c), { orderBy: ['createdAt', 'desc'], limit: 50 }); }
  async revokeKey(c: Ctx, keyId: string) {
    const k = await this.store.get<KeyDoc>(P.key(c, keyId));
    if (!k) throw notFound('API key');
    if (k.status === 'revoked') return k;
    await this.store.runTransaction(async (tx) => {
      tx.update(P.key(c, keyId), { status: 'revoked', revokedAt: this.now() });
      tx.delete(P.skIndex(k.secretHash));
      tx.delete(P.pkIndex(k.publishableKey));
    });
    await this.audit(c.uid, 'apikey.revoked', P.key(c, keyId));
    return { ...k, status: 'revoked' as const, revokedAt: this.now() };
  }
  async rotateKey(c: Ctx, keyId: string) {
    const old = await this.store.get<KeyDoc>(P.key(c, keyId));
    if (!old) throw notFound('API key');
    await this.revokeKey(c, keyId);
    const fresh = await this.createKeyPair(c, old.label);
    await this.audit(c.uid, 'apikey.rotated', P.key(c, keyId), { replacement: fresh.key.id });
    return fresh;
  }

  /** Authenticates `Authorization: Bearer money_test_sk_…`. Returns the project context. */
  async authenticateSecretKey(raw: string): Promise<Ctx & { keyId: string }> {
    if (classifyKey(raw) !== 'secret') throw unauthorized('Invalid API key. Use your secret test key (money_test_sk_…).', 'invalid_api_key');
    const idx = await this.store.get<{ uid: string; projectId: string; keyId: string }>(P.skIndex(hashSecret(raw, this.d.keyPepper)));
    if (!idx) throw unauthorized('Invalid or revoked API key.', 'invalid_api_key');
    const c = { uid: idx.uid, projectId: idx.projectId };
    const [key, project] = await Promise.all([this.store.get<KeyDoc>(P.key(c, idx.keyId)), this.store.get<ProjectDoc>(P.project(c.uid, c.projectId))]);
    if (!key || key.status !== 'active' || !project) throw unauthorized('Invalid or revoked API key.', 'invalid_api_key');
    if (project.status !== 'active') throw forbidden('This project is archived.', 'project_archived');
    await this.assertUserActive(c.uid);
    if (!key.lastUsedAt || this.now() - key.lastUsedAt > 60_000) await this.store.update(P.key(c, key.id), { lastUsedAt: this.now() });
    return { ...c, keyId: key.id };
  }

  /** Publishable keys are public identifiers that can only look up non-sensitive checkout data. */
  async resolvePublishableKey(pk: string): Promise<Ctx | null> {
    if (classifyKey(pk) !== 'publishable') return null;
    const idx = await this.store.get<{ uid: string; projectId: string }>(P.pkIndex(pk));
    return idx ? { uid: idx.uid, projectId: idx.projectId } : null;
  }

  // ───────────────────────── idempotency ─────────────────────────
  private async idemRead(tx: Tx, c: Ctx, key: string | undefined, requestHash: string) {
    if (!key) return { path: null as string | null, replay: null as { kind: string; id: string } | null };
    if (key.length > 255) throw badRequest('Idempotency-Key must be at most 255 characters.');
    const path = P.idem(c, sha256Hex(key));
    const rec = await tx.get<{ requestHash: string; kind: string; id: string }>(path);
    if (rec && rec.requestHash !== requestHash) throw unprocessable('idempotency_key_reuse', 'This Idempotency-Key was already used with a different request.');
    return { path, replay: rec ? { kind: rec.kind, id: rec.id } : null };
  }

  // ───────────────────────── orders ─────────────────────────
  async createOrder(c: Ctx, body: unknown, idempotencyKey?: string) {
    const input = parseCreateOrder(body);
    const project = await this.getProject(c.uid, c.projectId);
    if (project.status !== 'active') throw forbidden('This project is archived.', 'project_archived');
    if (input.returnUrl) validateReturnUrl(input.returnUrl, this.allowedOrigins(project));
    const requestHash = sha256Hex(JSON.stringify(input));

    const result = await this.store.runTransaction(async (tx) => {
      const out: Out = { events: [] };
      const idem = await this.idemRead(tx, c, idempotencyKey, requestHash);
      if (idem.replay) return { orderId: idem.replay.id, replayed: true, out };
      const t = this.now();
      const order: OrderDoc = {
        id: newId('ord'), uid: c.uid, projectId: c.projectId, transactionId: newId('txn'), amount: input.amount, currency: input.currency,
        description: input.description, merchantOrderId: input.merchantOrderId, returnUrl: input.returnUrl, status: 'CREATED', failureCode: null,
        refundedAmount: 0, checkoutToken: randomBytes(24).toString('base64url'), scenario: null, attempts: 0, scheduled: null,
        metadata: input.metadata, createdAt: t, updatedAt: t, expiresAt: t + input.expiresInMinutes * 60_000, paidAt: null,
      };
      const txn: TxnDoc = {
        id: order.transactionId, uid: c.uid, projectId: c.projectId, orderId: order.id, amount: order.amount, currency: order.currency,
        status: 'CREATED', scenario: null, failureCode: null, refundedAmount: 0, simulatedReference: 'SIM' + randomToken(6).toUpperCase(),
        eventCount: 1, createdAt: t, updatedAt: t, paidAt: null,
      };
      const ev: EventDoc = { id: newId('evt'), seq: 1, type: 'payment.created', from: null, to: 'CREATED', at: t, actor: 'api', data: {} };
      tx.set(P.order(c, order.id), order as unknown as Doc);
      tx.set(P.txn(c, txn.id), txn as unknown as Doc);
      tx.set(P.txnEvent(c, txn.id, ev.id), ev as unknown as Doc);
      tx.set(P.orderIndex(order.id), { uid: c.uid, projectId: c.projectId });
      if (idem.path) tx.set(idem.path, { requestHash, kind: 'order', id: order.id, createdAt: t });
      out.events.push({ id: ev.id, type: 'payment.created', object: serializeOrder(order, this.d.appUrl) });
      return { orderId: order.id, replayed: false, out };
    });
    if (!result.replayed) await this.dispatch(c, result.out.events);
    const order = await this.getOrderDoc(c, result.orderId);
    return { order, replayed: result.replayed };
  }

  private allowedOrigins(p: ProjectDoc): string[] {
    const o = originOf(p.websiteUrl);
    return [...(o ? [o] : []), ...p.allowedReturnOrigins];
  }

  private needsReconcile(o: OrderDoc): boolean {
    const t = this.now();
    if (o.status === 'CREATED' || o.status === 'PENDING') { if (t >= o.expiresAt) return true; }
    return !!o.scheduled && o.scheduled.at <= t;
  }

  /** Applies a due scheduled transition or expiry. The backend (not the browser) owns every timer. */
  private reconcileInTx(tx: Tx, c: Ctx, order: OrderDoc, txn: TxnDoc, out: Out): boolean {
    const t = this.now();
    if ((order.status === 'CREATED' || order.status === 'PENDING') && t >= order.expiresAt) {
      order.scheduled = null;
      this.transition(tx, c, order, txn, 'EXPIRED', 'system', out);
      return true;
    }
    if (order.scheduled && order.scheduled.at <= t) {
      const s = order.scheduled;
      order.scheduled = null;
      if (canTransition(order.status, s.to)) { this.transition(tx, c, order, txn, s.to, 'system', out, s.failureCode); return true; }
      return true; // scheduled entry cleared, nothing else to do
    }
    return false;
  }

  /** Moves the order+transaction through the state machine, appending an immutable event. */
  private transition(tx: Tx, c: Ctx, order: OrderDoc, txn: TxnDoc, to: OrderStatus, actor: Actor, out: Out, failureCode?: string) {
    const from = order.status;
    if (!canTransition(from, to)) throw conflict('invalid_state_transition', `Cannot move a payment from ${from} to ${to}.`, { from, to });
    const at = this.now();
    order.status = to; txn.status = to; order.updatedAt = at; txn.updatedAt = at;
    if (failureCode) { order.failureCode = failureCode; txn.failureCode = failureCode; }
    if (to === 'SUCCESS') { order.paidAt = at; txn.paidAt = at; }
    txn.eventCount += 1;
    const ev: EventDoc = { id: newId('evt'), seq: txn.eventCount, type: 'status.changed', from, to, at, actor, data: failureCode ? { failure_code: failureCode } : {} };
    tx.set(P.txnEvent(c, txn.id, ev.id), ev as unknown as Doc);
    const type = EVENT_FOR_STATUS[to];
    if (type) out.events.push({ id: ev.id, type, object: serializeOrder(order, this.d.appUrl) });
  }

  private rejectedAttempt(tx: Tx, c: Ctx, order: OrderDoc, txn: TxnDoc, actor: Actor, reason: string) {
    txn.eventCount += 1;
    const ev: EventDoc = { id: newId('evt'), seq: txn.eventCount, type: 'attempt.rejected', from: order.status, to: null, at: this.now(), actor, data: { reason } };
    tx.set(P.txnEvent(c, txn.id, ev.id), ev as unknown as Doc);
  }

  private async getOrderDoc(c: Ctx, orderId: string): Promise<OrderDoc> {
    const o = await this.store.get<OrderDoc>(P.order(c, orderId));
    if (!o) throw notFound('Payment order');
    return o;
  }

  async reconcile(c: Ctx, orderId: string): Promise<OrderDoc> {
    const peek = await this.getOrderDoc(c, orderId);
    if (!this.needsReconcile(peek)) return peek;
    const res = await this.store.runTransaction(async (tx) => {
      const out: Out = { events: [] };
      const order = await tx.get<OrderDoc>(P.order(c, orderId));
      const txn = await tx.get<TxnDoc>(P.txn(c, peek.transactionId));
      if (!order || !txn) throw notFound('Payment order');
      if (this.reconcileInTx(tx, c, order, txn, out)) { tx.set(P.order(c, orderId), order as unknown as Doc); tx.set(P.txn(c, txn.id), txn as unknown as Doc); }
      return { order, out };
    });
    await this.dispatch(c, res.out.events);
    return res.order;
  }

  getOrder(c: Ctx, orderId: string) { return this.reconcile(c, orderId); }

  async listOrders(c: Ctx, f: ListFilters = {}) {
    const limit = Math.min(f.limit ?? 50, LIMITS.listMax);
    const rows = await this.store.query<OrderDoc>(P.orders(c), { orderBy: ['createdAt', 'desc'], limit: LIMITS.listMax });
    const fresh: OrderDoc[] = [];
    let reconciled = 0;
    for (const r of rows) {
      fresh.push(this.needsReconcile(r) && reconciled < 20 ? (reconciled++, await this.reconcile(c, r.id)) : r);
    }
    return fresh
      .filter((o) => (!f.status || o.status === f.status) && (!f.merchantOrderId || o.merchantOrderId.includes(f.merchantOrderId)) &&
        (f.minAmount === undefined || o.amount >= f.minAmount) && (f.maxAmount === undefined || o.amount <= f.maxAmount) &&
        (!f.from || o.createdAt >= f.from) && (!f.to || o.createdAt <= f.to))
      .slice(0, limit);
  }

  /** Applies a simulation scenario. Safe against duplicates and concurrency: exactly one attempt can win. */
  async simulate(c: Ctx, orderId: string, scenarioId: string, actor: Actor, idempotencyKey?: string) {
    const plan = getScenario(scenarioId);
    if (!plan) throw badRequest(`Unknown scenario '${String(scenarioId).slice(0, 40)}'.`, { field: 'scenario' }, 'invalid_scenario');
    const requestHash = sha256Hex(`simulate:${orderId}:${scenarioId}`);
    const peek = await this.getOrderDoc(c, orderId);

    const res = await this.store.runTransaction(async (tx) => {
      const out: Out = { events: [] };
      const idem = await this.idemRead(tx, c, idempotencyKey, requestHash);
      const order = await tx.get<OrderDoc>(P.order(c, orderId));
      const txn = await tx.get<TxnDoc>(P.txn(c, peek.transactionId));
      if (!order || !txn) throw notFound('Payment order');
      if (idem.replay) return { order, out, rejected: null as string | null, replayed: true };

      this.reconcileInTx(tx, c, order, txn, out);
      let rejected: string | null = null;
      if (order.status !== 'CREATED' && order.status !== 'PENDING') {
        rejected = order.status === 'PROCESSING' ? 'payment_in_progress' : 'payment_already_processed';
        this.rejectedAttempt(tx, c, order, txn, actor, rejected);
      } else {
        for (const to of plan.immediate) this.transition(tx, c, order, txn, to, actor, out, to === 'FAILED' ? plan.failureCode : undefined);
        order.scenario = plan.id; txn.scenario = plan.id; order.attempts += 1;
        order.scheduled = plan.scheduled ? { to: plan.scheduled.to, at: this.now() + plan.scheduled.afterMs, ...(plan.scheduled.failureCode ? { failureCode: plan.scheduled.failureCode } : {}) } : null;
        if (plan.duplicateAttempt) this.rejectedAttempt(tx, c, order, txn, actor, 'duplicate_payment_attempt');
      }
      tx.set(P.order(c, orderId), order as unknown as Doc); tx.set(P.txn(c, txn.id), txn as unknown as Doc);
      if (idem.path && !rejected) tx.set(idem.path, { requestHash, kind: 'simulate', id: orderId, createdAt: this.now() });
      return { order, out, rejected, replayed: false };
    });
    await this.dispatch(c, res.out.events);
    if (res.rejected) throw conflict(res.rejected, res.rejected === 'payment_in_progress' ? 'A payment is already in progress for this order.' : `This order is already ${res.order.status.toLowerCase()}; a duplicate attempt was recorded and ignored.`, { status: res.order.status });
    return { order: res.order, replayed: res.replayed };
  }

  async cancelOrder(c: Ctx, orderId: string, actor: Actor) {
    const peek = await this.getOrderDoc(c, orderId);
    const res = await this.store.runTransaction(async (tx) => {
      const out: Out = { events: [] };
      const order = await tx.get<OrderDoc>(P.order(c, orderId));
      const txn = await tx.get<TxnDoc>(P.txn(c, peek.transactionId));
      if (!order || !txn) throw notFound('Payment order');
      this.reconcileInTx(tx, c, order, txn, out);
      if (!canTransition(order.status, 'CANCELLED')) { tx.set(P.order(c, orderId), order as unknown as Doc); tx.set(P.txn(c, txn.id), txn as unknown as Doc); return { order, out, ok: false }; }
      order.scheduled = null;
      this.transition(tx, c, order, txn, 'CANCELLED', actor, out);
      tx.set(P.order(c, orderId), order as unknown as Doc); tx.set(P.txn(c, txn.id), txn as unknown as Doc);
      return { order, out, ok: true };
    });
    await this.dispatch(c, res.out.events);
    if (!res.ok) throw conflict('invalid_state_transition', `A ${res.order.status} payment cannot be cancelled.`, { status: res.order.status });
    return res.order;
  }

  // ───────────────────────── transactions ─────────────────────────
  async listTransactions(c: Ctx, limit = 50) {
    await this.listOrders(c, { limit: 1 }); // lazily settles due scheduled transitions
    return this.store.query<TxnDoc>(P.txns(c), { orderBy: ['createdAt', 'desc'], limit: Math.min(limit, LIMITS.listMax) });
  }
  async getTransaction(c: Ctx, id: string) {
    const t = await this.store.get<TxnDoc>(P.txn(c, id));
    if (!t) throw notFound('Transaction');
    await this.reconcile(c, t.orderId);
    const fresh = (await this.store.get<TxnDoc>(P.txn(c, id)))!;
    const events = await this.store.query<EventDoc>(P.txnEvents(c, id), { orderBy: ['seq', 'asc'], limit: 200 });
    return { transaction: fresh, events };
  }

  // ───────────────────────── refunds ─────────────────────────
  async createRefund(c: Ctx, body: unknown, actor: Actor, idempotencyKey?: string) {
    const input = parseRefund(body);
    let orderId = input.orderId;
    if (!orderId && input.transactionId) {
      const t = await this.store.get<TxnDoc>(P.txn(c, input.transactionId));
      if (!t) throw notFound('Transaction');
      orderId = t.orderId;
    }
    const peek = await this.getOrderDoc(c, orderId!);
    const requestHash = sha256Hex(JSON.stringify(input));

    const res = await this.store.runTransaction(async (tx) => {
      const out: Out = { events: [] };
      const idem = await this.idemRead(tx, c, idempotencyKey, requestHash);
      if (idem.replay) return { refundId: idem.replay.id, out, replayed: true };
      const order = await tx.get<OrderDoc>(P.order(c, peek.id));
      const txn = await tx.get<TxnDoc>(P.txn(c, peek.transactionId));
      if (!order || !txn) throw notFound('Payment order');
      if (order.status !== 'SUCCESS') throw conflict('refund_not_allowed', `Only successful payments can be refunded (this one is ${order.status}).`, { status: order.status });
      const refundable = order.amount - order.refundedAmount;
      const amount = input.amount ?? refundable;
      if (amount < 1 || amount > refundable) throw unprocessable('refund_exceeds_available', `Refund amount exceeds the refundable balance of ${refundable}.`);

      const t = this.now();
      const refund: RefundDoc = {
        id: newId('re'), uid: c.uid, projectId: c.projectId, orderId: order.id, transactionId: txn.id, amount, currency: order.currency,
        reason: input.reason, status: 'PENDING', failureCode: null, createdAt: t, updatedAt: t, eventCount: 0,
      };
      const addEvent = (type: 'refund.created' | 'refund.succeeded' | 'refund.failed') => {
        refund.eventCount += 1;
        const ev: EventDoc = { id: newId('evt'), seq: refund.eventCount, type, from: null, to: null, at: this.now(), actor, data: {} };
        tx.set(P.refundEvent(c, refund.id, ev.id), ev as unknown as Doc);
        out.events.push({ id: ev.id, type, object: serializeRefund({ ...refund }) });
      };
      addEvent('refund.created');
      if (input.outcome === 'success') {
        refund.status = 'SUCCEEDED';
        addEvent('refund.succeeded');
        order.refundedAmount += amount; txn.refundedAmount += amount;
        if (order.refundedAmount === order.amount) this.transition(tx, c, order, txn, 'REFUNDED', actor, out);
        else { order.updatedAt = t; txn.updatedAt = t; }
        tx.set(P.order(c, order.id), order as unknown as Doc); tx.set(P.txn(c, txn.id), txn as unknown as Doc);
      } else {
        refund.status = 'FAILED'; refund.failureCode = 'SIMULATED_REFUND_FAILURE';
        addEvent('refund.failed');
      }
      refund.updatedAt = this.now();
      tx.set(P.refund(c, refund.id), refund as unknown as Doc);
      if (idem.path) tx.set(idem.path, { requestHash, kind: 'refund', id: refund.id, createdAt: t });
      return { refundId: refund.id, out, replayed: false };
    });
    await this.dispatch(c, res.out.events);
    const refund = await this.getRefund(c, res.refundId);
    await this.audit(c.uid, 'refund.created', P.refund(c, refund.id), { amount: refund.amount, status: refund.status });
    return { refund, replayed: res.replayed };
  }
  async getRefund(c: Ctx, id: string) {
    const r = await this.store.get<RefundDoc>(P.refund(c, id));
    if (!r) throw notFound('Refund');
    return r;
  }
  getRefundEvents(c: Ctx, id: string) { return this.store.query<EventDoc>(P.refundEvents(c, id), { orderBy: ['seq', 'asc'], limit: 50 }); }
  listRefunds(c: Ctx, limit = 50) { return this.store.query<RefundDoc>(P.refunds(c), { orderBy: ['createdAt', 'desc'], limit: Math.min(limit, LIMITS.listMax) }); }

  // ───────────────────────── webhooks ─────────────────────────
  async createWebhook(c: Ctx, body: unknown) {
    await this.getProject(c.uid, c.projectId);
    const input = parseWebhook(body);
    const url = validateWebhookUrl(input.url);
    await assertPublicHost(url.hostname, this.d.resolveDns);
    const count = (await this.store.query<WebhookDoc>(P.webhooks(c), { limit: LIMITS.webhooksPerProject + 1 })).length;
    if (count >= LIMITS.webhooksPerProject) throw conflict('webhook_limit_reached', `A project may have at most ${LIMITS.webhooksPerProject} webhook endpoints.`);
    const secret = 'whsec_' + randomBytes(24).toString('base64url');
    const hook: WebhookDoc = {
      id: newId('wh'), uid: c.uid, projectId: c.projectId, url: url.toString(), description: input.description, events: input.events,
      status: 'active', secretEnc: encryptSecret(secret, this.d.encryptionKey), secretLast4: secret.slice(-4), createdAt: this.now(),
    };
    await this.store.set(P.webhook(c, hook.id), hook as unknown as Doc);
    await this.audit(c.uid, 'webhook.created', P.webhook(c, hook.id), { url: hook.url });
    return { webhook: hook, secret };
  }
  listWebhooks(c: Ctx) { return this.store.query<WebhookDoc>(P.webhooks(c), { orderBy: ['createdAt', 'desc'], limit: 20 }); }
  async deleteWebhook(c: Ctx, id: string) {
    const w = await this.store.get<WebhookDoc>(P.webhook(c, id));
    if (!w) throw notFound('Webhook');
    await this.store.delete(P.webhook(c, id));
    await this.audit(c.uid, 'webhook.deleted', P.webhook(c, id));
  }
  listDeliveries(c: Ctx, limit = 50) { return this.store.query<DeliveryDoc>(P.deliveries(c), { orderBy: ['createdAt', 'desc'], limit }); }

  /** Creates a delivery record per (event × subscribed endpoint) and attempts each once, with a short timeout. */
  async dispatch(c: Ctx, events: PendingWebhookEvent[]): Promise<void> {
    if (!events.length) return;
    const hooks = (await this.listWebhooks(c)).filter((h) => h.status === 'active');
    if (!hooks.length) return;
    const jobs: Promise<unknown>[] = [];
    for (const ev of events) {
      for (const hook of hooks) {
        if (!hook.events.includes('*') && !hook.events.includes(ev.type)) continue;
        const body = JSON.stringify({ id: ev.id, object: 'event', type: ev.type, api_version: '2026-01-01', created: Math.floor(this.now() / 1000), livemode: false, data: { object: ev.object } });
        const delivery: DeliveryDoc = {
          id: newId('dlv'), uid: c.uid, projectId: c.projectId, webhookId: hook.id, url: hook.url, eventId: ev.id, eventType: ev.type, payload: body,
          status: 'pending', attempts: 0, responseStatus: null, responseBodyPreview: null, error: null, createdAt: this.now(), lastAttemptAt: null,
        };
        jobs.push(this.store.set(P.delivery(c, delivery.id), delivery as unknown as Doc).then(() => this.attempt(c, delivery, hook)));
      }
    }
    await Promise.allSettled(jobs);
  }

  private async attempt(c: Ctx, delivery: DeliveryDoc, hook: WebhookDoc): Promise<DeliveryDoc> {
    const patch: Partial<DeliveryDoc> = { attempts: delivery.attempts + 1, lastAttemptAt: this.now(), error: null, responseStatus: null, responseBodyPreview: null };
    try {
      const url = validateWebhookUrl(hook.url);
      await assertPublicHost(url.hostname, this.d.resolveDns); // re-checked at send time
      const secret = decryptSecret(hook.secretEnc, this.d.encryptionKey);
      const sec = Math.floor(this.now() / 1000);
      const r = await this.d.transport({
        url: url.toString(), timeoutMs: DELIVERY_TIMEOUT_MS, body: delivery.payload,
        headers: {
          'content-type': 'application/json', 'money-signature': signPayload(secret, delivery.payload, sec),
          'money-event-id': delivery.eventId, 'money-delivery-id': delivery.id, 'money-event-type': delivery.eventType,
        },
      });
      patch.responseStatus = r.status;
      // eslint-disable-next-line no-control-regex
      patch.responseBodyPreview = r.body.replace(/[^\x20-\x7e\n]/g, '').slice(0, 500);
      patch.status = r.status >= 200 && r.status < 300 ? 'delivered' : 'failed';
      if (patch.status === 'failed') patch.error = `Endpoint responded with HTTP ${r.status}.`;
    } catch (e) {
      patch.status = 'failed';
      patch.error = e instanceof ApiError ? e.message : (e as Error).message === 'timeout' ? 'Request timed out.' : (e as Error).message === 'blocked_destination' ? 'Destination is not a public address.' : 'Delivery failed (network error).';
    }
    await this.store.update(P.delivery(c, delivery.id), patch as Doc);
    return { ...delivery, ...patch } as DeliveryDoc;
  }

  async retryDelivery(c: Ctx, deliveryId: string) {
    const d = await this.store.get<DeliveryDoc>(P.delivery(c, deliveryId));
    if (!d) throw notFound('Webhook delivery');
    if (d.attempts >= LIMITS.maxDeliveryAttempts) throw conflict('retry_limit_reached', `A delivery may be attempted at most ${LIMITS.maxDeliveryAttempts} times.`);
    const hook = await this.store.get<WebhookDoc>(P.webhook(c, d.webhookId));
    if (!hook) throw conflict('webhook_deleted', 'The webhook endpoint for this delivery no longer exists.');
    return this.attempt(c, d, hook);
  }

  // ───────────────────────── logs & stats ─────────────────────────
  async logApi(c: Ctx, entry: { method: string; path: string; status: number; durationMs: number; keyId?: string }) {
    const id = newId('log');
    await this.store.set(P.apiLog(c, id), { id, at: this.now(), ...entry });
  }
  listApiLogs(c: Ctx, limit = 100) { return this.store.query(P.apiLogs(c), { orderBy: ['at', 'desc'], limit }); }

  async stats(uid: string, projectId?: string) {
    const projects = projectId ? [await this.getProject(uid, projectId)] : await this.listProjects(uid);
    const orders: OrderDoc[] = [];
    for (const p of projects) orders.push(...(await this.listOrders({ uid, projectId: p.id }, { limit: LIMITS.listMax })));
    const count = (...s: OrderStatus[]) => orders.filter((o) => s.includes(o.status)).length;
    const successful = orders.filter((o) => o.status === 'SUCCESS' || o.status === 'REFUNDED');
    const failed = count('FAILED');
    const decided = successful.length + failed;
    return {
      total_orders: orders.length, successful: successful.length, failed, pending: count('PENDING', 'PROCESSING', 'CREATED'),
      cancelled: count('CANCELLED'), expired: count('EXPIRED'), reversed: count('REVERSED'),
      volume: successful.reduce((a, o) => a + o.amount, 0), refunded: orders.reduce((a, o) => a + o.refundedAmount, 0),
      success_rate: decided ? Math.round((successful.length / decided) * 1000) / 10 : null,
      recent: orders.sort((a, b) => b.createdAt - a.createdAt).slice(0, 8).map((o) => serializeOrder(o, this.d.appUrl)),
    };
  }

  // ───────────────────────── checkout (customer-facing, token-gated) ─────────────────────────
  async resolveCheckout(orderId: string, token: string) {
    const idx = await this.store.get<{ uid: string; projectId: string }>(P.orderIndex(orderId));
    if (!idx) throw notFound('Checkout session');
    const c = { uid: idx.uid, projectId: idx.projectId };
    const peek = await this.getOrderDoc(c, orderId);
    if (!token || token.length !== peek.checkoutToken.length || token !== peek.checkoutToken) throw notFound('Checkout session');
    await this.assertUserActive(c.uid);
    const order = await this.reconcile(c, orderId);
    const project = await this.getProject(c.uid, c.projectId);
    return { ctx: c, order, project };
  }

  /** Destination for the customer after checkout. Re-validated so a stale/edited allow-list cannot cause an open redirect. */
  redirectUrlFor(order: OrderDoc, project: ProjectDoc): string | null {
    if (!order.returnUrl) return null;
    try {
      const u = validateReturnUrl(order.returnUrl, this.allowedOrigins(project));
      u.searchParams.set('payment_order_id', order.id);
      u.searchParams.set('merchant_order_id', order.merchantOrderId);
      u.searchParams.set('status', order.status.toLowerCase());
      return u.toString();
    } catch { return null; }
  }
}
