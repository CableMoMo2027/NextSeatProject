import {
    Injectable,
    ConflictException,
    BadRequestException,
    NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { SeatHold, SeatHoldDocument } from './seat-hold.schema';
import { Booking, BookingDocument } from './booking.schema';
import { Screening, ScreeningDocument } from '../screenings/screening.schema';
import { PaymentsService } from '../payments/payments.service';

@Injectable()
export class BookingsService {
    /** How long a hold lasts (milliseconds) */
    private readonly HOLD_TTL_MS = 10 * 60 * 1000; // 10 minutes
    private readonly TICKET_PRICE_THB = 1;

    constructor(
        @InjectModel(SeatHold.name)
        private seatHoldModel: Model<SeatHoldDocument>,
        @InjectModel(Booking.name)
        private bookingModel: Model<BookingDocument>,
        @InjectModel(Screening.name)
        private screeningModel: Model<ScreeningDocument>,
        private readonly paymentsService: PaymentsService,
    ) { }

    // ─── Hold Seats ─────────────────────────────────────────────
    async holdSeats(
        screeningId: string,
        seats: string[],
        userId: string,
    ): Promise<{ held: string[]; expireAt: Date }> {
        // Verify screening exists
        const screening = await this.screeningModel.findById(screeningId).exec();
        if (!screening) {
            throw new NotFoundException(`Screening ${screeningId} not found`);
        }

        // Validate seat labels
        this.validateSeats(seats, screening);

        const expireAt = new Date(Date.now() + this.HOLD_TTL_MS);
        const screeningObjId = new Types.ObjectId(screeningId);

        // Check if any seats are already booked
        const bookedConflicts = await this.bookingModel
            .find({
                screeningId: screeningObjId,
                status: 'confirmed',
                seats: { $in: seats },
            })
            .exec();

        if (bookedConflicts.length > 0) {
            const taken = bookedConflicts.flatMap((b) =>
                b.seats.filter((s) => seats.includes(s)),
            );
            throw new ConflictException(
                `Seats already booked: ${[...new Set(taken)].join(', ')}`,
            );
        }

        // Try to insert holds – unique index will reject duplicates
        const docs = seats.map((seatLabel) => ({
            screeningId: screeningObjId,
            seatLabel,
            userId,
            expireAt,
        }));

        try {
            await this.seatHoldModel.insertMany(docs, { ordered: false });
        } catch (err: any) {
            // Duplicate key error code = 11000
            if (err.code === 11000 || err.writeErrors) {
                // Extract which seats failed
                const failedSeats = this.extractDuplicateSeats(err, seats);
                throw new ConflictException(
                    `Seats already held by another user: ${failedSeats.join(', ')}`,
                );
            }
            throw err;
        }

        return { held: seats, expireAt };
    }

    // ─── Release Held Seats ─────────────────────────────────────
    async releaseSeats(
        screeningId: string,
        seats: string[],
        userId: string,
    ): Promise<{ released: number }> {
        const result = await this.seatHoldModel.deleteMany({
            screeningId: new Types.ObjectId(screeningId),
            seatLabel: { $in: seats },
            userId,
        });
        return { released: result.deletedCount };
    }

    // ─── Checkout ───────────────────────────────────────────────
    async checkout(
        screeningId: string,
        userId: string,
        selectedCinema?: string,
        selectedPromotions?: Array<{
            id?: number;
            promoId?: number;
            name?: string;
            qty?: number;
            price?: number;
        }>,
    ): Promise<BookingDocument> {
        const screeningObjId = new Types.ObjectId(screeningId);

        // 1. Find all holds for this user + screening
        const holds = await this.seatHoldModel
            .find({ screeningId: screeningObjId, userId })
            .exec();

        if (holds.length === 0) {
            throw new BadRequestException(
                'No held seats found. Your holds may have expired.',
            );
        }

        // 2. Get screening for price
        const screening = await this.screeningModel.findById(screeningId).exec();
        if (!screening) {
            throw new NotFoundException('Screening not found');
        }

        const seatLabels = holds.map((h) => h.seatLabel);
        const seatTotal = seatLabels.length * this.TICKET_PRICE_THB;
        const promotions = Array.isArray(selectedPromotions)
            ? selectedPromotions
                .map((p) => {
                    const qty = Number(p?.qty || 0);
                    const price = Number(p?.price || 0);
                    const promoId = Number(
                        Number.isFinite(Number(p?.promoId))
                            ? p?.promoId
                            : p?.id,
                    );
                    if (
                        qty <= 0 ||
                        price < 0 ||
                        !Number.isFinite(qty) ||
                        !Number.isFinite(price)
                    ) {
                        return null;
                    }
                    return {
                        promoId: Number.isFinite(promoId) ? promoId : 0,
                        name: String(p?.name || '').trim(),
                        qty,
                        price,
                        total: qty * price,
                    };
                })
                .filter((p): p is NonNullable<typeof p> => Boolean(p))
            : [];
        const promoTotal = promotions.reduce((sum, p) => sum + p.total, 0);
        const totalPrice = seatTotal + promoTotal;
        const bookingObjectId = new Types.ObjectId();
        const bookingId = bookingObjectId.toHexString();

        // 3. Process payment with booking reference for traceability
        const payment = await this.paymentsService.processPayment(
            totalPrice,
            userId,
            bookingId,
        );

        if (!payment.success) {
            throw new BadRequestException('Payment failed');
        }

        // 4. Create booking
        const booking = await this.bookingModel.create({
            _id: bookingObjectId,
            screeningId: screeningObjId,
            userId,
            seats: seatLabels,
            totalPrice,
            seatTotal,
            promoTotal,
            promotions,
            selectedCinema: selectedCinema?.trim() || undefined,
            paymentId: payment.transactionId,
            status: 'confirmed',
        });

        // 5. Remove holds (seats are now booked)
        await this.seatHoldModel.deleteMany({
            screeningId: screeningObjId,
            userId,
        });

        return booking;
    }

    // ─── My Bookings ────────────────────────────────────────────
    async getMyBookings(userId: string): Promise<BookingDocument[]> {
        return this.bookingModel
            .find({ userId })
            .populate('screeningId')
            .sort({ createdAt: -1 })
            .exec();
    }

    // ─── Cancel Booking ─────────────────────────────────────────
    async cancelBooking(
        bookingId: string,
        userId: string,
    ): Promise<BookingDocument> {
        const booking = await this.bookingModel.findById(bookingId).exec();

        if (!booking) {
            throw new NotFoundException('Booking not found');
        }
        if (booking.userId !== userId) {
            throw new BadRequestException('This booking does not belong to you');
        }
        if (booking.status === 'cancelled') {
            throw new BadRequestException('Booking already cancelled');
        }

        booking.status = 'cancelled';
        await booking.save();
        return booking;
    }

    // ─── Helpers ────────────────────────────────────────────────
    private validateSeats(seats: string[], screening: ScreeningDocument): void {
        const rowLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        for (const seat of seats) {
            const [rowStr, numStr] = seat.split('-');
            const rowIndex = rowLetters.indexOf(rowStr);
            const seatNum = parseInt(numStr, 10);

            if (
                rowIndex < 0 ||
                rowIndex >= screening.rows ||
                isNaN(seatNum) ||
                seatNum < 1 ||
                seatNum > screening.seatsPerRow
            ) {
                throw new BadRequestException(`Invalid seat label: ${seat}`);
            }
        }
    }

    private extractDuplicateSeats(err: any, requestedSeats: string[]): string[] {
        if (err.writeErrors && Array.isArray(err.writeErrors)) {
            return err.writeErrors.map(
                (we: any) => requestedSeats[we.index] || 'unknown',
            );
        }
        // Fallback: return all requested seats
        return requestedSeats;
    }
}
