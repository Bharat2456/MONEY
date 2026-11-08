import type { OrderStatus } from './state-machine';

export const MAX_SIMULATED_DELAY_MS = 60_000; // safety limit against abuse

export interface ScenarioPlan {
  id: string;
  label: string;
  description: string;
  /** Statuses applied immediately, in order, through the state machine. */
  immediate: OrderStatus[];
  /** Optional backend-owned delayed transition. Resolved lazily on the next read (no browser timers, no queue). */
  scheduled?: { to: OrderStatus; afterMs: number; failureCode?: string };
  failureCode?: string;
  /** After applying the plan, attempt a second payment and record it as rejected (no duplicate financial event). */
  duplicateAttempt?: boolean;
}

export const SCENARIOS: Readonly<Record<string, ScenarioPlan>> = {
  success: { id: 'success', label: 'Instant success', description: 'Payment succeeds immediately.', immediate: ['PROCESSING', 'SUCCESS'] },
  success_after_5s: { id: 'success_after_5s', label: 'Success after 5 seconds', description: 'Processing, then success once 5 seconds have elapsed.', immediate: ['PROCESSING'], scheduled: { to: 'SUCCESS', afterMs: 5_000 } },
  pending_30s: { id: 'pending_30s', label: 'Pending for 30 seconds', description: 'Pending, then delayed confirmation after 30 seconds.', immediate: ['PENDING'], scheduled: { to: 'SUCCESS', afterMs: 30_000 } },
  pending_until_expiry: { id: 'pending_until_expiry', label: 'Pending until expiry', description: 'Stays pending until the order expires.', immediate: ['PENDING'] },
  failure: { id: 'failure', label: 'Immediate failure', description: 'Payment is declined by the simulator.', immediate: ['PROCESSING', 'FAILED'], failureCode: 'SIMULATED_DECLINE' },
  timeout: { id: 'timeout', label: 'Network timeout', description: 'Processing, then fails with a simulated timeout after 10 seconds.', immediate: ['PROCESSING'], scheduled: { to: 'FAILED', afterMs: 10_000, failureCode: 'SIMULATED_TIMEOUT' } },
  cancelled: { id: 'cancelled', label: 'Customer cancels', description: 'The customer abandons the payment.', immediate: ['CANCELLED'] },
  expired: { id: 'expired', label: 'Session expired', description: 'The payment session expires before completion.', immediate: ['EXPIRED'] },
  reversed: { id: 'reversed', label: 'Success then reversal', description: 'Payment succeeds and is then reversed.', immediate: ['PROCESSING', 'SUCCESS', 'REVERSED'] },
  duplicate: { id: 'duplicate', label: 'Duplicate attempt', description: 'Succeeds, then a second attempt is made and rejected.', immediate: ['PROCESSING', 'SUCCESS'], duplicateAttempt: true },
};

export const SCENARIO_LIST: ScenarioPlan[] = Object.values(SCENARIOS);
export const getScenario = (id: string): ScenarioPlan | null => (Object.prototype.hasOwnProperty.call(SCENARIOS, id) ? SCENARIOS[id] : null);
