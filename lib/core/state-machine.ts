export const ORDER_STATUSES = [
  'CREATED', 'PENDING', 'PROCESSING', 'SUCCESS', 'FAILED', 'CANCELLED', 'EXPIRED', 'REVERSED', 'REFUNDED',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

/**
 * The only permitted transitions. Anything else is rejected with 409 invalid_state_transition.
 * SUCCESS -> REFUNDED happens only when cumulative successful refunds equal the full amount.
 */
export const TRANSITIONS: Readonly<Record<OrderStatus, readonly OrderStatus[]>> = {
  CREATED: ['PROCESSING', 'PENDING', 'CANCELLED', 'EXPIRED'],
  PENDING: ['PROCESSING', 'SUCCESS', 'FAILED', 'CANCELLED', 'EXPIRED'],
  PROCESSING: ['SUCCESS', 'FAILED', 'PENDING', 'CANCELLED'],
  SUCCESS: ['REVERSED', 'REFUNDED'],
  FAILED: [],
  CANCELLED: [],
  EXPIRED: [],
  REVERSED: [],
  REFUNDED: [],
};

export const canTransition = (from: OrderStatus, to: OrderStatus): boolean => TRANSITIONS[from].includes(to);
export const isTerminal = (s: OrderStatus): boolean => TRANSITIONS[s].length === 0;

export const WEBHOOK_EVENT_TYPES = [
  'payment.created', 'payment.pending', 'payment.succeeded', 'payment.failed', 'payment.cancelled',
  'payment.expired', 'payment.reversed', 'refund.created', 'refund.succeeded', 'refund.failed',
] as const;
export type WebhookEventType = (typeof WEBHOOK_EVENT_TYPES)[number];

/** Which webhook event (if any) is emitted when an order enters a status. */
export const EVENT_FOR_STATUS: Readonly<Partial<Record<OrderStatus, WebhookEventType>>> = {
  CREATED: 'payment.created',
  PENDING: 'payment.pending',
  SUCCESS: 'payment.succeeded',
  FAILED: 'payment.failed',
  CANCELLED: 'payment.cancelled',
  EXPIRED: 'payment.expired',
  REVERSED: 'payment.reversed',
};
