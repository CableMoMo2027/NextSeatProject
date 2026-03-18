import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type OrderDocument = HydratedDocument<Order>;

// Embedded schema for order items
export class OrderItem {
    @Prop({ required: true })
    productId: string;

    @Prop({ required: true })
    name: string;

    @Prop({ required: true })
    price: number;

    @Prop({ required: true })
    quantity: number;

    @Prop()
    image?: string;
}

// Embedded schema for shipping info
export class ShippingInfo {
    @Prop({ required: true })
    name: string;

    @Prop({ required: true })
    phone: string;

    @Prop({ required: true })
    address: string;

    @Prop({ required: true })
    city: string;

    @Prop({ required: true })
    postalCode: string;
}

// Embedded schema for slip verification
export class SlipVerification {
    @Prop()
    verified: boolean;

    @Prop()
    transactionId?: string;

    @Prop()
    amount?: number;

    @Prop()
    senderName?: string;

    @Prop()
    receiverName?: string;

    @Prop()
    transferDate?: Date;

    @Prop()
    errorMessage?: string;
}

@Schema({ timestamps: true })
export class Order {
    @Prop({ required: true, unique: true })
    orderId: string;

    @Prop()
    userId?: string;

    @Prop({ required: true })
    customerName: string;

    @Prop()
    customerEmail?: string;

    @Prop({ required: true })
    customerPhone: string;

    @Prop({ type: [Object], required: true })
    items: OrderItem[];

    @Prop({ type: Object, required: true })
    shippingInfo: ShippingInfo;

    @Prop({ required: true, enum: ['cod', 'promptpay', 'transfer'] })
    paymentMethod: string;

    @Prop({ required: true, enum: ['pending', 'paid', 'failed', 'cancelled'], default: 'pending' })
    paymentStatus: string;

    @Prop()
    qrCodeData?: string;

    @Prop()
    paymentExpiry?: Date;

    @Prop()
    transactionId?: string;

    @Prop()
    slipFingerprint?: string;

    @Prop()
    paidAt?: Date;

    @Prop()
    slipImageUrl?: string;

    @Prop()
    slipUrl?: string;

    @Prop({ type: Object })
    slipVerification?: SlipVerification;

    @Prop({ required: true })
    subtotal: number;

    @Prop({ default: 0 })
    shippingFee: number;

    @Prop({ required: true })
    total: number;

    @Prop()
    notes?: string;
}

export const OrderSchema = SchemaFactory.createForClass(Order);
