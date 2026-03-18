import {
    Injectable,
    BadRequestException,
    NotFoundException,
    ServiceUnavailableException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';

@Injectable()
export class InternalProxyService {
    private readonly baseUrl: string;

    constructor(
        private readonly http: HttpService,
        private readonly config: ConfigService,
    ) {
        this.baseUrl = this.config.get<string>('PAYMENT_SERVICE_URL') ?? 'http://localhost:3002';
    }

    private handleError(err: unknown): never {
        const axiosErr = err as AxiosError<{ message?: string }>;
        const status = axiosErr.response?.status;
        const message = axiosErr.response?.data?.message ?? 'Payment service error';
        if (status === 404) throw new NotFoundException(message);
        if (status === 400) throw new BadRequestException(message);
        throw new ServiceUnavailableException('Payment service is unavailable. Please try again later.');
    }

    async get<T>(path: string, params?: Record<string, unknown>): Promise<T> {
        try {
            const { data } = await firstValueFrom(
                this.http.get<T>(`${this.baseUrl}/internal${path}`, { params }),
            );
            return data;
        } catch (err) {
            this.handleError(err);
        }
    }

    async post<T>(path: string, body?: unknown): Promise<T> {
        try {
            const { data } = await firstValueFrom(
                this.http.post<T>(`${this.baseUrl}/internal${path}`, body),
            );
            return data;
        } catch (err) {
            this.handleError(err);
        }
    }

    async patch<T>(path: string, body?: unknown): Promise<T> {
        try {
            const { data } = await firstValueFrom(
                this.http.patch<T>(`${this.baseUrl}/internal${path}`, body),
            );
            return data;
        } catch (err) {
            this.handleError(err);
        }
    }

    async delete<T>(path: string): Promise<T> {
        try {
            const { data } = await firstValueFrom(
                this.http.delete<T>(`${this.baseUrl}/internal${path}`),
            );
            return data;
        } catch (err) {
            this.handleError(err);
        }
    }
}
