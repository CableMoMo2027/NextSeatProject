import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SeatHold, SeatHoldSchema } from './seat-hold.schema';
import { Booking, BookingSchema } from './booking.schema';
import { Screening, ScreeningSchema } from '../screenings/screening.schema';
import { BookingsService } from './bookings.service';
import { BookingsController } from './bookings.controller';
import { PaymentsModule } from '../payments/payments.module';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: SeatHold.name, schema: SeatHoldSchema },
            { name: Booking.name, schema: BookingSchema },
            { name: Screening.name, schema: ScreeningSchema },
        ]),
        PaymentsModule,
    ],
    controllers: [BookingsController],
    providers: [BookingsService],
    exports: [BookingsService],
})
export class BookingsModule { }
