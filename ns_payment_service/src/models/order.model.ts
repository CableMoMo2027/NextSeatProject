import { Model, Schema, model, models } from 'mongoose';
import { OrderPaymentMethod, OrderPaymentStatus } from '../types/order.types';

interface OrderItemDoc {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
}

interface ShippingInfoDoc {
  name: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
}

export interface OrderDoc {
  id: string;
  orderId: string;
  userId?: string;
  customerName: string;
  customerEmail?: string;
  customerPhone: string;
  items: OrderItemDoc[];
  shippingInfo: ShippingInfoDoc;
  paymentMethod: OrderPaymentMethod;
  paymentStatus: OrderPaymentStatus;
  subtotal: number;
  shippingFee: number;
  total: number;
  notes?: string;
  qrCodeData?: string;
  paymentExpiry?: Date;
  transactionId?: string;
  slipFingerprint?: string;
  slipImageUrl?: string;
  paidAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const OrderItemSchema = new Schema<OrderItemDoc>(
  {
    productId: { type: String, required: true, trim: true },
    name: { type: String, required: true, trim: true },
    price: { type: Number, required: true, min: 0 },
    quantity: { type: Number, required: true, min: 1 },
    image: { type: String, trim: true },
  },
  { _id: false },
);

const ShippingInfoSchema = new Schema<ShippingInfoDoc>(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    postalCode: { type: String, required: true, trim: true },
  },
  { _id: false },
);

const OrderSchema = new Schema<OrderDoc>(
  {
    id: { type: String, required: true, unique: true, index: true, trim: true },
    orderId: { type: String, required: true, unique: true, index: true, trim: true },
    userId: { type: String, index: true, trim: true },
    customerName: { type: String, required: true, trim: true },
    customerEmail: { type: String, trim: true },
    customerPhone: { type: String, required: true, trim: true },
    items: { type: [OrderItemSchema], required: true, validate: [(v: unknown[]) => v.length > 0, 'items must not be empty'] },
    shippingInfo: { type: ShippingInfoSchema, required: true },
    paymentMethod: { type: String, enum: ['cod', 'promptpay', 'transfer'], required: true },
    paymentStatus: { type: String, enum: ['pending', 'paid', 'failed', 'cancelled'], required: true, default: 'pending', index: true },
    subtotal: { type: Number, required: true, min: 0 },
    shippingFee: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 },
    notes: { type: String, trim: true },
    qrCodeData: { type: String },
    paymentExpiry: { type: Date },
    transactionId: { type: String, trim: true, index: true },
    slipFingerprint: { type: String, trim: true, index: true },
    slipImageUrl: { type: String, trim: true },
    paidAt: { type: Date },
  },
  {
    timestamps: true,
    versionKey: false,
  },
);

export const OrderModel: Model<OrderDoc> = (
  models.Order as Model<OrderDoc> | undefined
) || model<OrderDoc>('Order', OrderSchema);
