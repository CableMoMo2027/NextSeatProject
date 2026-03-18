import { Model, Schema, model, models } from 'mongoose';
import { PaymentMethod, PaymentStatus } from '../types/payment.types';

export interface PaymentDoc {
  id: string;
  bookingId: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
  status: PaymentStatus;
  metadata: Record<string, unknown>;
  failureReason?: string;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<PaymentDoc>(
  {
    id: { type: String, required: true, unique: true, index: true, trim: true },
    bookingId: { type: String, required: true, index: true, trim: true },
    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, required: true, default: 'THB', uppercase: true, trim: true },
    method: {
      type: String,
      enum: ['credit_card', 'debit_card', 'promptpay', 'bank_transfer', 'unknown'],
      required: true,
      default: 'unknown',
    },
    status: {
      type: String,
      enum: ['requires_payment_method', 'requires_confirmation', 'succeeded', 'failed', 'refunded'],
      required: true,
      default: 'requires_confirmation',
      index: true,
    },
    metadata: { type: Schema.Types.Mixed, default: {} },
    failureReason: { type: String, trim: true },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export const PaymentModel: Model<PaymentDoc> = (
  models.Payment as Model<PaymentDoc> | undefined
) || model<PaymentDoc>('Payment', PaymentSchema);

