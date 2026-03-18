import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export type SeatHoldDocument = HydratedDocument<SeatHold>;

@Schema({ timestamps: true })
export class SeatHold {
    @Prop({ type: Types.ObjectId, ref: 'Screening', required: true })
    screeningId: Types.ObjectId;

    @Prop({ required: true })
    seatLabel: string; // e.g. "A-5"

    @Prop({ required: true })
    userId: string; // Firebase UID

    @Prop({ required: true })
    expireAt: Date; // TTL field
}

export const SeatHoldSchema = SchemaFactory.createForClass(SeatHold);

// ============================================================
//  INDEXES — critical for preventing double booking & auto-expiry
// ============================================================

// 1) Unique compound index: same seat in same screening can only be held once
SeatHoldSchema.index({ screeningId: 1, seatLabel: 1 }, { unique: true });

// 2) TTL index: MongoDB automatically deletes docs when `expireAt` passes
SeatHoldSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });
