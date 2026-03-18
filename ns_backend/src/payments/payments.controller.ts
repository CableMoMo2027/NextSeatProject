import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import type { CreateIntentDto } from './payments.service';

@Controller('payments')
export class PaymentsController {
    constructor(private readonly paymentsService: PaymentsService) {}

    @Get()
    list(@Query('bookingId') bookingId?: string, @Query('status') status?: string) {
        return this.paymentsService.list(bookingId, status);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.paymentsService.findById(id);
    }

    @Post('intent')
    createIntent(@Body() body: CreateIntentDto) {
        return this.paymentsService.createIntent(body);
    }

    @Post(':id/confirm')
    confirm(@Param('id') id: string) {
        return this.paymentsService.confirm(id);
    }

    @Post(':id/refund')
    refund(@Param('id') id: string) {
        return this.paymentsService.refund(id);
    }

    /**
     * Backward-compatible endpoint for frontend that still calls /payments/pay
     * Body: { amount, userId, bookingId? }
     */
    @Post('pay')
    pay(@Body() body: { amount: number; userId: string; bookingId?: string }) {
        return this.paymentsService.processPayment(
            body.amount,
            body.userId,
            body.bookingId,
        );
    }
}
