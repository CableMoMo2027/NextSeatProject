import { Injectable, NotFoundException, BadRequestException, ServiceUnavailableException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';

@Injectable()
export class CinemasProxyService {
    private readonly baseUrl: string;

    constructor(
        private readonly http: HttpService,
        private readonly config: ConfigService,
    ) {
        this.baseUrl = this.config.get<string>('CINEMA_SERVICE_URL') ?? 'http://localhost:3001';
    }

    private async get<T>(path: string, params?: Record<string, unknown>): Promise<T> {
        try {
            const { data } = await firstValueFrom(
                this.http.get<T>(`${this.baseUrl}${path}`, { params }),
            );
            return data;
        } catch (err) {
            const axiosErr = err as AxiosError;
            if (axiosErr.response?.status === 404) {
                throw new NotFoundException((axiosErr.response.data as { message?: string })?.message ?? 'Not found');
            }
            if (axiosErr.response?.status === 400) {
                throw new BadRequestException((axiosErr.response.data as { message?: string })?.message ?? 'Bad request');
            }
            throw new ServiceUnavailableException('Cinema service is unavailable. Please try again later.');
        }
    }

    /** GET /internal/cinemas */
    async listCinemas(params: {
        chain?: string;
        province?: string;
        query?: string;
        lat?: string;
        lon?: string;
        radiusM?: string;
    }) {
        return this.get('/internal/cinemas', params);
    }

    /** GET /internal/cinemas/chains */
    async getChainSummary() {
        return this.get('/internal/cinemas/chains');
    }

    /** GET /internal/cinemas/chain/:chain */
    async getCinemasByChain(chain: string) {
        return this.get(`/internal/cinemas/chain/${chain}`);
    }

    /** GET /internal/cinemas/province/:province */
    async getCinemasByProvince(province: string) {
        return this.get(`/internal/cinemas/province/${encodeURIComponent(province)}`);
    }

    /** GET /internal/cinemas/nearby */
    async findNearby(params: { lat: string; lon: string; radiusM?: string }) {
        return this.get('/internal/cinemas/nearby', params);
    }

    /** GET /internal/cinemas/:id */
    async getCinemaById(id: string) {
        return this.get(`/internal/cinemas/${id}`);
    }

    /** GET /internal/cinemas/:id/showtimes */
    async getCinemaShowtimes(id: string, date?: string) {
        return this.get(`/internal/cinemas/${id}/showtimes`, date ? { date } : undefined);
    }

    /** GET /internal/movies/:movieId/showtimes */
    async getMovieShowtimes(movieId: string, params: { date?: string; chain?: string }) {
        return this.get(`/internal/movies/${movieId}/showtimes`, params);
    }
}
