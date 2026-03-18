import { HttpService } from '@nestjs/axios';
import {
    BadGatewayException,
    Injectable,
    InternalServerErrorException,
    NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AxiosError } from 'axios';
import { firstValueFrom } from 'rxjs';

export interface PaymentResult {
    success: boolean;
    transactionId: string;
    amount: number;
    userId: string;
    paidAt: string;
    method: string;
}

export interface CreateIntentDto {
    bookingId: string;
    amount: number;
    currency?: string;
    method?: string;
    metadata?: Record<string, unknown>;
}

@Injectable()
export class PaymentsService {
    private readonly paymentBaseUrl: string;

    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
    ) {
        this.paymentBaseUrl =
            this.configService.get<string>('BACKEND_URI') ||
            'http://localhost:3002/internal';
    }

    async list(bookingId?: string, status?: string) {
        const response = await firstValueFrom(
            this.httpService.get(`${this.paymentBaseUrl}/payments`, {
                params: { bookingId, status },
            }),
        ).catch((error: AxiosError) => {
            throw this.handleError(error);
        });
        return response.data;
    }

    async findById(id: string) {
        const response = await firstValueFrom(
            this.httpService.get(`${this.paymentBaseUrl}/payments/${id}`),
        ).catch((error: AxiosError) => {
            throw this.handleError(error);
        });
        return response.data;
    }

    async createIntent(input: CreateIntentDto) {
        const response = await firstValueFrom(
            this.httpService.post(`${this.paymentBaseUrl}/payments/intent`, input),
        ).catch((error: AxiosError) => {
            throw this.handleError(error);
        });
        return response.data;
    }

    async confirm(id: string) {
        const response = await firstValueFrom(
            this.httpService.post(`${this.paymentBaseUrl}/payments/${id}/confirm`, {}),
        ).catch((error: AxiosError) => {
            throw this.handleError(error);
        });
        return response.data;
    }

    async refund(id: string) {
        const response = await firstValueFrom(
            this.httpService.post(`${this.paymentBaseUrl}/payments/${id}/refund`, {}),
        ).catch((error: AxiosError) => {
            throw this.handleError(error);
        });
        return response.data;
    }

    async processPayment(
        amount: number,
        userId: string,
        bookingId?: string,
    ): Promise<PaymentResult> {
        const intentResult = await this.createIntent({
            bookingId: bookingId || userId,
            amount,
            currency: 'THB',
            method: 'unknown',
        });

        const paymentId = intentResult?.data?.id;
        if (!paymentId) {
            throw new InternalServerErrorException(
                'Payment service returned invalid intent payload',
            );
        }

        const confirmResult = await this.confirm(paymentId);
        const paymentData = confirmResult?.data;
        if (!paymentData) {
            throw new InternalServerErrorException(
                'Payment service returned invalid confirm payload',
            );
        }

        return {
            success: paymentData.status === 'succeeded',
            transactionId: paymentData.id,
            amount: paymentData.amount,
            userId,
            paidAt: paymentData.updatedAt || new Date().toISOString(),
            method: paymentData.method,
        };
    }

    private handleError(error: AxiosError) {
        const status = error.response?.status;
        const data = error.response?.data as { message?: string } | undefined;
        const message = data?.message || error.message || 'Payment service unavailable';

        if (status === 404) {
            return new NotFoundException(message);
        }

        return new BadGatewayException(message);
    }
}
