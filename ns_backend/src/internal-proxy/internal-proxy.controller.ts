import {
    Body,
    Controller,
    Delete,
    Get,
    Param,
    Patch,
    Post,
    Query,
    Req,
    Res,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { InternalProxyService } from './internal-proxy.service';

@Controller('internal')
export class InternalProxyController {
    private readonly baseUrl: string;

    constructor(
        private readonly proxy: InternalProxyService,
        private readonly http: HttpService,
        private readonly config: ConfigService,
    ) {
        this.baseUrl = this.config.get<string>('PAYMENT_SERVICE_URL') ?? 'http://localhost:3002';
    }

    // ─── Orders ───

    @Get('orders')
    listOrders(
        @Query('userId') userId?: string,
        @Query('paymentStatus') paymentStatus?: string,
    ) {
        return this.proxy.get('/orders', { userId, paymentStatus });
    }

    @Get('orders/number/:orderId')
    getOrderByNumber(@Param('orderId') orderId: string) {
        return this.proxy.get(`/orders/number/${orderId}`);
    }

    @Get('orders/:id')
    getOrder(@Param('id') id: string) {
        return this.proxy.get(`/orders/${id}`);
    }

    @Post('orders')
    createOrder(@Body() body: Record<string, unknown>) {
        return this.proxy.post('/orders', body);
    }

    @Patch('orders/:orderId/status')
    updateOrderStatus(
        @Param('orderId') orderId: string,
        @Body() body: Record<string, unknown>,
    ) {
        return this.proxy.patch(`/orders/${orderId}/status`, body);
    }

    @Delete('orders/:id')
    deleteOrder(@Param('id') id: string) {
        return this.proxy.delete(`/orders/${id}`);
    }

    // ─── Payments ───

    @Get('payments')
    listPayments(
        @Query('bookingId') bookingId?: string,
        @Query('status') status?: string,
    ) {
        return this.proxy.get('/payments', { bookingId, status });
    }

    @Get('payments/status/:orderId')
    getPaymentStatus(@Param('orderId') orderId: string) {
        return this.proxy.get(`/payments/status/${orderId}`);
    }

    @Get('payments/:id')
    getPayment(@Param('id') id: string) {
        return this.proxy.get(`/payments/${id}`);
    }

    @Post('payments/intent')
    createIntent(@Body() body: Record<string, unknown>) {
        return this.proxy.post('/payments/intent', body);
    }

    @Post('payments/generate-qr')
    generateQR(@Body() body: Record<string, unknown>) {
        return this.proxy.post('/payments/generate-qr', body);
    }

    @Post('payments/generate-bill-qr')
    generateBillQR(@Body() body: Record<string, unknown>) {
        return this.proxy.post('/payments/generate-bill-qr', body);
    }

    @Post('payments/confirm')
    confirmPayment(@Body() body: Record<string, unknown>) {
        return this.proxy.post('/payments/confirm', body);
    }

    @Post('payments/cancel/:orderId')
    cancelPayment(@Param('orderId') orderId: string) {
        return this.proxy.post(`/payments/cancel/${orderId}`);
    }

    @Post('payments/:id/confirm')
    confirmPaymentById(@Param('id') id: string) {
        return this.proxy.post(`/payments/${id}/confirm`);
    }

    @Post('payments/:id/refund')
    refundPayment(@Param('id') id: string) {
        return this.proxy.post(`/payments/${id}/refund`);
    }

    /**
     * Verify slip — streams the raw multipart request to the payment service
     * so file uploads are forwarded transparently.
     */
    @Post('payments/verify-slip')
    async verifySlip(@Req() req: Request, @Res() res: Response) {
        try {
            const resp = await firstValueFrom(
                this.http.post(
                    `${this.baseUrl}/internal/payments/verify-slip`,
                    req,
                    {
                        headers: {
                            'content-type': req.headers['content-type'] || 'application/octet-stream',
                        },
                        responseType: 'json',
                    },
                ),
            );
            res.status(resp.status).json(resp.data);
        } catch (err: any) {
            const status = err?.response?.status || 502;
            const body = err?.response?.data || { success: false, message: 'Payment service unavailable' };
            res.status(status).json(body);
        }
    }

    @Post('payments/verify-slip-upload')
    async verifySlipUpload(@Req() req: Request, @Res() res: Response) {
        try {
            const resp = await firstValueFrom(
                this.http.post(
                    `${this.baseUrl}/internal/payments/verify-slip-upload`,
                    req,
                    {
                        headers: {
                            'content-type': req.headers['content-type'] || 'application/octet-stream',
                        },
                        responseType: 'json',
                    },
                ),
            );
            res.status(resp.status).json(resp.data);
        } catch (err: any) {
            const status = err?.response?.status || 502;
            const body = err?.response?.data || { success: false, message: 'Payment service unavailable' };
            res.status(status).json(body);
        }
    }
}
