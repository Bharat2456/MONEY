export interface OrderView { id: string; amount: number; currency: string; description: string; merchant_order_id: string; status: string; failure_code: string | null; refunded_amount: number; transaction_id: string; scenario: string | null; checkout_url: string; created_at: string; expires_at: string }
export interface TxnView { id: string; payment_order_id: string; amount: number; currency: string; status: string; scenario: string | null; refunded_amount: number; simulated_reference: string; created_at: string; failure_code: string | null }
export interface EventView { id: string; seq: number; type: string; from: string | null; to: string | null; actor: string; created_at: string; data: Record<string, unknown> }
export interface RefundView { id: string; payment_order_id: string; amount: number; currency: string; reason: string; status: string; created_at: string }
export interface KeyView { id: string; label: string; publishable_key: string; secret_key_hint: string; status: string; created_at: string; last_used_at: string | null }
export interface WebhookView { id: string; url: string; description: string; events: string[]; status: string; secret_hint: string; created_at: string }
export interface DeliveryView { id: string; webhook_id: string; url: string; event_type: string; status: string; attempts: number; response_status: number | null; response_body_preview: string | null; error: string | null; created_at: string }
export interface Stats { total_orders: number; successful: number; failed: number; pending: number; cancelled: number; expired: number; reversed: number; volume: number; refunded: number; success_rate: number | null; recent: OrderView[] }
export interface ListOf<T> { data: T[] }
