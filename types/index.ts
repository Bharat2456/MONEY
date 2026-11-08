import type { OrderStatus, WebhookEventType } from '@/lib/core/state-machine';

export type Actor = 'api' | 'checkout' | 'dashboard' | 'system';
export type ProjectStatus = 'active' | 'archived';

export interface UserDoc { id: string; email: string; createdAt: number; suspended: boolean; suspendedReason?: string | null; deletionRequestedAt?: number | null }

export interface ProjectDoc {
  id: string; uid: string; name: string; description: string; websiteUrl: string; category: string;
  environment: 'test'; status: ProjectStatus; allowedReturnOrigins: string[]; createdAt: number; updatedAt: number;
}

export interface KeyDoc {
  id: string; uid: string; projectId: string; label: string; publishableKey: string; secretHash: string; secretLast4: string;
  status: 'active' | 'revoked'; createdAt: number; lastUsedAt: number | null; revokedAt: number | null;
}

export interface ScheduledTransition { to: OrderStatus; at: number; failureCode?: string }

export interface OrderDoc {
  id: string; uid: string; projectId: string; transactionId: string; amount: number; currency: string; description: string;
  merchantOrderId: string; returnUrl: string | null; status: OrderStatus; failureCode: string | null; refundedAmount: number;
  checkoutToken: string; scenario: string | null; attempts: number; scheduled: ScheduledTransition | null;
  metadata: Record<string, string>; createdAt: number; updatedAt: number; expiresAt: number; paidAt: number | null;
}

export interface TxnDoc {
  id: string; uid: string; projectId: string; orderId: string; amount: number; currency: string; status: OrderStatus;
  scenario: string | null; failureCode: string | null; refundedAmount: number; simulatedReference: string; eventCount: number;
  createdAt: number; updatedAt: number; paidAt: number | null;
}

export interface EventDoc {
  id: string; seq: number; type: string; from: OrderStatus | null; to: OrderStatus | null; at: number; actor: Actor; data: Record<string, unknown>;
}

export type RefundStatus = 'PENDING' | 'SUCCEEDED' | 'FAILED';
export interface RefundDoc {
  id: string; uid: string; projectId: string; orderId: string; transactionId: string; amount: number; currency: string;
  reason: string; status: RefundStatus; failureCode: string | null; createdAt: number; updatedAt: number; eventCount: number;
}

export interface WebhookDoc {
  id: string; uid: string; projectId: string; url: string; description: string; events: Array<WebhookEventType | '*'>;
  status: 'active' | 'disabled'; secretEnc: string; secretLast4: string; createdAt: number;
}

export interface DeliveryDoc {
  id: string; uid: string; projectId: string; webhookId: string; url: string; eventId: string; eventType: string; payload: string;
  status: 'pending' | 'delivered' | 'failed'; attempts: number; responseStatus: number | null; responseBodyPreview: string | null;
  error: string | null; createdAt: number; lastAttemptAt: number | null;
}
