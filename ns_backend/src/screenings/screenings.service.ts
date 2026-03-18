import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Screening, ScreeningDocument } from './screening.schema';

// We'll import these from sibling module via forwardRef / module exports
import { SeatHold, SeatHoldDocument } from '../bookings/seat-hold.schema';
import { Booking, BookingDocument } from '../bookings/booking.schema';

export interface SeatInfo {
    label: string; // e.g. "A-5"
    row: string;
    number: number;
    status: 'available' | 'held' | 'booked';
    heldByCurrentUser?: boolean;
    holdExpireAt?: string;
}

@Injectable()
export class ScreeningsService {
    private readonly TICKET_PRICE_THB = 1;

    constructor(
        @InjectModel(Screening.name)
        private screeningModel: Model<ScreeningDocument>,
        @InjectModel(SeatHold.name)
        private seatHoldModel: Model<SeatHoldDocument>,
        @InjectModel(Booking.name)
        private bookingModel: Model<BookingDocument>,
    ) { }

    /** Create a new screening */
    async create(data: {
        movieId: number;
        movieTitle: string;
        posterPath?: string;
        theater: string;
        showtime: Date;
        price: number;
        rows?: number;
        seatsPerRow?: number;
    }): Promise<ScreeningDocument> {
        return this.screeningModel.create({
            ...data,
            price: this.TICKET_PRICE_THB,
        });
    }

    /** List all screenings */
    async findAll(): Promise<ScreeningDocument[]> {
        return this.screeningModel.find().sort({ showtime: 1 }).exec();
    }

    /** Find one screening by ID */
    async findById(id: string): Promise<ScreeningDocument> {
        const screening = await this.screeningModel.findById(id).exec();
        if (!screening) {
            throw new NotFoundException(`Screening ${id} not found`);
        }
        return screening;
    }

    /** Build the seat map (2D grid) with availability status */
    async getSeatMap(
        screeningId: string,
        currentUserId?: string,
    ): Promise<{ screening: ScreeningDocument; seats: SeatInfo[][] }> {
        const screening = await this.findById(screeningId);

        const screeningObjId = new Types.ObjectId(screeningId);

        // Get all active holds for this screening
        const holds = await this.seatHoldModel
            .find({ screeningId: screeningObjId })
            .exec();

        // Get all confirmed bookings for this screening
        const bookings = await this.bookingModel
            .find({ screeningId: screeningObjId, status: 'confirmed' })
            .exec();

        // Build lookup sets
        const heldSeats = new Map<string, { userId: string; expireAt: Date }>(); // seatLabel -> hold info
        for (const hold of holds) {
            heldSeats.set(hold.seatLabel, { userId: hold.userId, expireAt: hold.expireAt });
        }

        const bookedSeats = new Set<string>();
        for (const booking of bookings) {
            for (const seat of booking.seats) {
                bookedSeats.add(seat);
            }
        }

        // Generate the 2D seat grid
        const rowLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        const seats: SeatInfo[][] = [];

        for (let r = 0; r < screening.rows; r++) {
            const row: SeatInfo[] = [];
            const rowLetter = rowLetters[r];

            for (let s = 1; s <= screening.seatsPerRow; s++) {
                const label = `${rowLetter}-${s}`;

                let status: SeatInfo['status'] = 'available';
                let heldByCurrentUser = false;
                let holdExpireAt: string | undefined;

                if (bookedSeats.has(label)) {
                    status = 'booked';
                } else if (heldSeats.has(label)) {
                    status = 'held';
                    const holdInfo = heldSeats.get(label);
                    holdExpireAt = holdInfo?.expireAt?.toISOString();
                    if (currentUserId && holdInfo?.userId === currentUserId) {
                        heldByCurrentUser = true;
                    }
                }

                row.push({
                    label,
                    row: rowLetter,
                    number: s,
                    status,
                    heldByCurrentUser,
                    holdExpireAt,
                });
            }

            seats.push(row);
        }

        return { screening, seats };
    }
}
