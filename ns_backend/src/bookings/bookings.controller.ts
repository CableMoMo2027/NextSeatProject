import { Controller, Post, Get, Patch, Body, Param } from '@nestjs/common';
import { BookingsService } from './bookings.service';

@Controller('bookings')
export class BookingsController {
    constructor(private readonly bookingsService: BookingsService) { }

    /**
     * Hold seats for a screening.
     * Body: { screeningId, seats: ["A-1","A-2"], userId }
     */
    @Post('hold')
    holdSeats(
        @Body() body: { screeningId: string; seats: string[]; userId: string },
    ) {
        return this.bookingsService.holdSeats(
            body.screeningId,
            body.seats,
            body.userId,
        );
    }

    /**
     * Release held seats manually (before timeout).
     * Body: { screeningId, seats: ["A-1","A-2"], userId }
     */
    @Post('release')
    releaseSeats(
        @Body() body: { screeningId: string; seats: string[]; userId: string },
    ) {
        return this.bookingsService.releaseSeats(
            body.screeningId,
            body.seats,
            body.userId,
        );
    }

    /**
     * Checkout – pay and confirm booking for all held seats.
     * Body: { screeningId, userId, selectedCinema?, selectedPromotions? }
     */
    @Post('checkout')
    checkout(
        @Body()
        body: {
            screeningId: string;
            userId: string;
            selectedCinema?: string;
            selectedPromotions?: Array<{
                id?: number;
                promoId?: number;
                name?: string;
                qty?: number;
                price?: number;
            }>;
        },
    ) {
        return this.bookingsService.checkout(
            body.screeningId,
            body.userId,
            body.selectedCinema,
            body.selectedPromotions,
        );
    }

    /** Get current user's bookings */
    @Get('my/:userId')
    getMyBookings(@Param('userId') userId: string) {
        return this.bookingsService.getMyBookings(userId);
    }

    /** Cancel a booking */
    @Patch(':id/cancel')
    cancelBooking(
        @Param('id') id: string,
        @Body() body: { userId: string },
    ) {
        return this.bookingsService.cancelBooking(id, body.userId);
    }
}
