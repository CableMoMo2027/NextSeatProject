import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Order, OrderDocument } from './order.schema';

@Injectable()
export class OrderService {
    constructor(
        @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    ) { }

    // Generate unique order ID
    private generateOrderId(): string {
        const timestamp = Date.now().toString(36).toUpperCase();
        const random = Math.random().toString(36).substring(2, 6).toUpperCase();
        return `MO-${timestamp}-${random}`;
    }

    // Create new order
    async create(orderData: Partial<Order>): Promise<Order> {
        const orderId = this.generateOrderId();
        const subtotal = Number(orderData.subtotal || 0);
        const newOrder = new this.orderModel({
            ...orderData,
            orderId,
            shippingFee: 0,
            total: subtotal,
            paymentStatus: 'pending',
        });
        return newOrder.save();
    }

    // Find all orders
    async findAll(): Promise<Order[]> {
        return this.orderModel.find().sort({ createdAt: -1 }).exec();
    }

    // Find order by ID
    async findById(id: string): Promise<Order | null> {
        return this.orderModel.findById(id).exec();
    }

    // Find order by orderId
    async findByOrderId(orderId: string): Promise<Order | null> {
        return this.orderModel.findOne({ orderId }).exec();
    }

    // Find orders by userId
    async findByUserId(userId: string): Promise<Order[]> {
        return this.orderModel.find({ userId }).sort({ createdAt: -1 }).exec();
    }

    // Update order
    async update(id: string, updateData: Partial<Order>): Promise<Order | null> {
        return this.orderModel.findByIdAndUpdate(id, updateData, { new: true }).exec();
    }

    // Update payment status
    async updatePaymentStatus(orderId: string, status: string): Promise<Order | null> {
        return this.orderModel.findOneAndUpdate(
            { orderId },
            { paymentStatus: status },
            { new: true }
        ).exec();
    }

    // Save slip URL and verification result
    async saveSlipVerification(orderId: string, slipUrl: string, verification: any): Promise<Order | null> {
        const paymentStatus = verification.verified ? 'paid' : 'pending';
        return this.orderModel.findOneAndUpdate(
            { orderId },
            {
                slipUrl,
                slipVerification: verification,
                paymentStatus,
            },
            { new: true }
        ).exec();
    }

    // Delete order
    async delete(id: string): Promise<Order | null> {
        return this.orderModel.findByIdAndDelete(id).exec();
    }
}
