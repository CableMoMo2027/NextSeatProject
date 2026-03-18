export type PaymentMethod =
  | 'credit_card'
  | 'debit_card'
  | 'promptpay'
  | 'bank_transfer'
  | 'unknown';

export type PaymentStatus =
  | 'requires_payment_method'
  | 'requires_confirmation'
  | 'succeeded'
  | 'failed'
  | 'refunded';

export interface PaymentRecord {
  id: string;
  bookingId: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
  status: PaymentStatus;
  metadata: Record<string, unknown>;
  failureReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePaymentInput {
  bookingId: string;
  amount: number;
  currency?: string;
  method?: PaymentMethod;
  metadata?: Record<string, unknown>;
}
