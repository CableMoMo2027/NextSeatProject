import { Controller, Get, Param, Query } from '@nestjs/common';
import { CinemasProxyService } from './cinemas-proxy.service';

@Controller('cinemas')
export class CinemasProxyController {
    constructor(private readonly cinemasProxy: CinemasProxyService) { }

    /**
     * GET /cinemas
     * List all cinemas with optional filters.
     * Query: chain (major|sf), province, query, lat, lon, radiusM
     */
    @Get()
    listCinemas(
        @Query('chain') chain?: string,
        @Query('province') province?: string,
        @Query('query') query?: string,
        @Query('lat') lat?: string,
        @Query('lon') lon?: string,
        @Query('radiusM') radiusM?: string,
    ) {
        return this.cinemasProxy.listCinemas({ chain, province, query, lat, lon, radiusM });
    }

    /**
     * GET /cinemas/chains
     * Summary statistics for each chain.
     */
    @Get('chains')
    getChainSummary() {
        return this.cinemasProxy.getChainSummary();
    }

    /**
     * GET /cinemas/chain/:chain
     * All branches of a specific chain (major or sf).
     */
    @Get('chain/:chain')
    getCinemasByChain(@Param('chain') chain: string) {
        return this.cinemasProxy.getCinemasByChain(chain);
    }

    /**
     * GET /cinemas/province/:province
     * All cinemas in a province (e.g., กรุงเทพมหานคร, นนทบุรี).
     */
    @Get('province/:province')
    getCinemasByProvince(@Param('province') province: string) {
        return this.cinemasProxy.getCinemasByProvince(province);
    }

    /**
     * GET /cinemas/nearby
     * Cinemas near a location.
     * Query: lat (required), lon (required), radiusM (optional, default 10000)
     */
    @Get('nearby')
    findNearby(
        @Query('lat') lat: string,
        @Query('lon') lon: string,
        @Query('radiusM') radiusM?: string,
    ) {
        return this.cinemasProxy.findNearby({ lat, lon, radiusM });
    }

    /**
     * GET /cinemas/movies/:movieId/showtimes
     * All showtimes for a movie across all cinemas.
     * Query: date (YYYY-MM-DD), chain (major|sf)
     */
    @Get('movies/:movieId/showtimes')
    getMovieShowtimes(
        @Param('movieId') movieId: string,
        @Query('date') date?: string,
        @Query('chain') chain?: string,
    ) {
        return this.cinemasProxy.getMovieShowtimes(movieId, { date, chain });
    }

    /**
     * GET /cinemas/:id
     * Single cinema details.
     */
    @Get(':id')
    getCinemaById(@Param('id') id: string) {
        return this.cinemasProxy.getCinemaById(id);
    }

    /**
     * GET /cinemas/:id/showtimes
     * Showtimes for a specific cinema.
     * Query: date (YYYY-MM-DD, defaults to today Bangkok time)
     */
    @Get(':id/showtimes')
    getCinemaShowtimes(
        @Param('id') id: string,
        @Query('date') date?: string,
    ) {
        return this.cinemasProxy.getCinemaShowtimes(id, date);
    }
}
