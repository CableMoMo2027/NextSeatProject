import { Injectable, NotFoundException } from '@nestjs/common';
import { CinemasProxyService } from '../cinemas/cinemas-proxy.service';

type PlaceItem = {
  id?: string;
  chain?: string;          // 'major' | 'sf' — used by frontend for logo resolution
  name?: string;
  address?: string;
  lat?: number;
  lon?: number;
  distance?: number;
  halls?: string[];
};

@Injectable()
export class PlacesService {
  private readonly MAX_NEARBY_DISTANCE_M = 10000;

  constructor(private readonly cinemasProxy: CinemasProxyService) { }

  private normalizeKeyword(value?: string): string {
    return String(value || '').trim().toLowerCase();
  }

  private mapCinemaToPlaceItem(cinema: any): PlaceItem {
    return {
      id: cinema?.id,
      chain: cinema?.chain || '',   // ← include chain so frontend can show logo
      name: cinema?.nameEn || cinema?.nameTh || '',
      address: cinema?.address || '',
      lat: Number(cinema?.lat),
      lon: Number(cinema?.lon),
      distance: Number.isFinite(Number(cinema?.distanceM)) ? Number(cinema.distanceM) : undefined,
      halls: Array.isArray(cinema?.halls) ? cinema.halls : [],
    };
  }

  async searchCinemas(params: { lat?: number; lon?: number; query?: string }) {
    const hasLocation = typeof params.lat === 'number' && typeof params.lon === 'number';
    const query = this.normalizeKeyword(params.query);
    const response = await this.cinemasProxy.listCinemas({
      lat: hasLocation ? String(params.lat) : undefined,
      lon: hasLocation ? String(params.lon) : undefined,
      radiusM: hasLocation ? String(this.MAX_NEARBY_DISTANCE_M) : undefined,
      query: query || undefined,
    }) as any;

    const data = Array.isArray(response?.data) ? response.data : [];
    return data.map((cinema: any) => this.mapCinemaToPlaceItem(cinema)).slice(0, 20);
  }

  async getCinemaById(id: string, _params: { lat?: number; lon?: number; query?: string } = {}) {
    const response = await this.cinemasProxy.getCinemaById(id) as any;
    if (!response?.data) throw new NotFoundException(`Cinema ${id} not found`);
    return this.mapCinemaToPlaceItem(response.data);
  }

  async getCinemaShowtimes(
    id: string,
    params: { date?: string; lat?: number; lon?: number; query?: string } = {},
  ) {
    const response = await this.cinemasProxy.getCinemaShowtimes(id, params.date) as any;
    const payload = response?.data;
    if (!payload?.cinema) throw new NotFoundException(`Cinema ${id} not found`);

    const movies = Array.isArray(payload?.movies) ? payload.movies : [];
    const screenings = movies.flatMap((movie: any) => {
      const showtimes = Array.isArray(movie?.showtimes) ? movie.showtimes : [];
      return showtimes.map((st: any) => ({
        _id: st?._id,
        movieId: st?.movieId,
        movieTitle: st?.movieTitle || movie?.movieTitle || '',
        posterPath: st?.posterPath || movie?.posterPath || '',
        theater: st?.hall || '',
        showtime: st?.showtime,
        price: st?.price,
      }));
    });

    return {
      cinema: this.mapCinemaToPlaceItem(payload.cinema),
      date: payload?.date,
      count: screenings.length,
      showtimes: screenings,
    };
  }

  async getChainStats() {
    const response = await this.cinemasProxy.getChainSummary() as any;
    return response?.data ?? response;
  }
}
