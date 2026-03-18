import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type BookingDocument = HydratedDocument<Booking>;

@Schema({ timestamps: true })
export class Booking {
    @Prop({ type: Types.ObjectId, ref: 'Screening', required: true })
    screeningId: Types.ObjectId;

    @Prop({ required: true })
    userId: string; // Firebase UID

    @Prop({ type: [String], required: true })
    seats: string[]; // e.g. ["A-5", "A-6"]

    @Prop({ required: true })
    totalPrice: number;

    @Prop({
        type: [
            {
                promoId: Number,
                name: String,
                qty: Number,
                price: Number,
                total: Number,
            },
        ],
        default: [],
    })
    promotions: Array<{
        promoId: number;
        name: string;
        qty: number;
        price: number;
        total: number;
    }>;

    @Prop({ default: 0 })
    seatTotal: number;

    @Prop({ default: 0 })
    promoTotal: number;

    @Prop()
    selectedCinema?: string;

    @Prop()
    paymentId: string; // mock payment transaction ID

    @Prop({ default: 'confirmed', enum: ['confirmed', 'cancelled'] })
    status: string;
}

export const BookingSchema = SchemaFactory.createForClass(Booking);
