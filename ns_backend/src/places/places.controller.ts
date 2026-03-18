import { Controller, Get, Param, Query } from '@nestjs/common';
import { PlacesService } from './places.service';

@Controller('places')
export class PlacesController {
  constructor(private readonly placesService: PlacesService) { }

  @Get('stats/chains')
  getChainStats() {
    return this.placesService.getChainStats();
  }

  @Get('cinemas')
  searchCinemas(
    @Query('lat') lat?: string,
    @Query('lon') lon?: string,
    @Query('query') query?: string,
  ) {
    const parsedLat = lat ? Number(lat) : undefined;
    const parsedLon = lon ? Number(lon) : undefined;

    return this.placesService.searchCinemas({
      lat: Number.isFinite(parsedLat) ? parsedLat : undefined,
      lon: Number.isFinite(parsedLon) ? parsedLon : undefined,
      query,
    });
  }

  @Get('cinemas/:id')
  getCinemaById(
    @Param('id') id: string,
    @Query('lat') lat?: string,
    @Query('lon') lon?: string,
    @Query('query') query?: string,
  ) {
    const parsedLat = lat ? Number(lat) : undefined;
    const parsedLon = lon ? Number(lon) : undefined;
    return this.placesService.getCinemaById(id, {
      lat: Number.isFinite(parsedLat) ? parsedLat : undefined,
      lon: Number.isFinite(parsedLon) ? parsedLon : undefined,
      query,
    });
  }

  @Get('cinemas/:id/showtimes')
  getCinemaShowtimes(
    @Param('id') id: string,
    @Query('date') date?: string,
    @Query('lat') lat?: string,
    @Query('lon') lon?: string,
    @Query('query') query?: string,
  ) {
    const parsedLat = lat ? Number(lat) : undefined;
    const parsedLon = lon ? Number(lon) : undefined;
    return this.placesService.getCinemaShowtimes(id, {
      date,
      lat: Number.isFinite(parsedLat) ? parsedLat : undefined,
      lon: Number.isFinite(parsedLon) ? parsedLon : undefined,
      query,
    });
  }
}
