import { randomUUID } from 'crypto';
import { CreateOrderInput, OrderPaymentStatus, OrderRecord } from '../types/order.types';
import { OrderDoc, OrderModel } from '../models/order.model';

export class OrderService {
  private generateOrderId(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `MO-${timestamp}-${random}`;
  }

  private toOrderRecord(doc: OrderDoc): OrderRecord {
    return {
      id: doc.id,
      orderId: doc.orderId,
      userId: doc.userId,
      customerName: doc.customerName,
      customerEmail: doc.customerEmail,
      customerPhone: doc.customerPhone,
      items: doc.items,
      shippingInfo: doc.shippingInfo,
      paymentMethod: doc.paymentMethod,
      paymentStatus: doc.paymentStatus,
      subtotal: doc.subtotal,
      shippingFee: doc.shippingFee,
      total: doc.total,
      notes: doc.notes,
      createdAt: new Date(doc.createdAt).toISOString(),
      updatedAt: new Date(doc.updatedAt).toISOString(),
    };
  }

  async list(filters: { userId?: string; paymentStatus?: OrderPaymentStatus }): Promise<OrderRecord[]> {
    const query: { userId?: string; paymentStatus?: OrderPaymentStatus } = {};
    if (filters.userId) query.userId = filters.userId;
    if (filters.paymentStatus) query.paymentStatus = filters.paymentStatus;
    const docs = await OrderModel.find(query).sort({ createdAt: -1 }).lean<OrderDoc[]>();
    return docs.map((doc) => this.toOrderRecord(doc));
  }

  async findById(id: string): Promise<OrderRecord | null> {
    const doc = await OrderModel.findOne({ id }).lean<OrderDoc | null>();
    return doc ? this.toOrderRecord(doc) : null;
  }

  async findByOrderId(orderId: string): Promise<OrderRecord | null> {
    const doc = await OrderModel.findOne({ orderId }).lean<OrderDoc | null>();
    return doc ? this.toOrderRecord(doc) : null;
  }

  async create(input: CreateOrderInput): Promise<OrderRecord> {
    const shippingFee = Number.isFinite(input.shippingFee) ? Number(input.shippingFee) : 0;
    const subtotal = Number(input.subtotal);
    const total = Number.isFinite(input.total) ? Number(input.total) : subtotal + shippingFee;

    const doc = await OrderModel.create({
      id: `ord_${randomUUID().replace(/-/g, '').slice(0, 24)}`,
      orderId: this.generateOrderId(),
      userId: input.userId,
      customerName: input.customerName,
      customerEmail: input.customerEmail,
      customerPhone: input.customerPhone,
      items: input.items,
      shippingInfo: input.shippingInfo,
      paymentMethod: input.paymentMethod,
      paymentStatus: 'pending',
      subtotal,
      shippingFee,
      total,
      notes: input.notes,
    });

    return this.toOrderRecord(doc.toObject());
  }

  async updatePaymentStatus(orderId: string, paymentStatus: OrderPaymentStatus): Promise<OrderRecord | null> {
    const updated = await OrderModel.findOneAndUpdate(
      { orderId },
      { paymentStatus },
      { new: true },
    ).lean<OrderDoc | null>();
    return updated ? this.toOrderRecord(updated) : null;
  }

  async delete(id: string): Promise<OrderRecord | null> {
    const deleted = await OrderModel.findOneAndDelete({ id }).lean<OrderDoc | null>();
    return deleted ? this.toOrderRecord(deleted) : null;
  }
}
