import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Screening, ScreeningSchema } from './screening.schema';
import { SeatHold, SeatHoldSchema } from '../bookings/seat-hold.schema';
import { Booking, BookingSchema } from '../bookings/booking.schema';
import { ScreeningsService } from './screenings.service';
import { ScreeningsController } from './screenings.controller';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Screening.name, schema: ScreeningSchema },
            { name: SeatHold.name, schema: SeatHoldSchema },
            { name: Booking.name, schema: BookingSchema },
        ]),
    ],
    controllers: [ScreeningsController],
    providers: [ScreeningsService],
    exports: [ScreeningsService, MongooseModule],
})
export class ScreeningsModule { }
