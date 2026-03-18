import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class MoviesService {
  private readonly apiKey: string;
  private readonly baseUrl = 'https://api.themoviedb.org/3';

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.apiKey = this.configService.get<string>('TMDB_API')!;
  }

  async getTrending(lang = 'en-US'): Promise<any> {
    const { data } = await firstValueFrom(
      this.httpService.get(
        `${this.baseUrl}/trending/movie/week?api_key=${this.apiKey}&language=${lang}`,
      ),
    );
    return data;
  }

  async getNowPlaying(lang = 'en-US'): Promise<any> {
    const { data } = await firstValueFrom(
      this.httpService.get(
        `${this.baseUrl}/movie/now_playing?api_key=${this.apiKey}&language=${lang}`,
      ),
    );
    return data;
  }

  async getUpcoming(lang = 'en-US'): Promise<any> {
    const { data } = await firstValueFrom(
      this.httpService.get(
        `${this.baseUrl}/movie/upcoming?api_key=${this.apiKey}&language=${lang}`,
      ),
    );
    return data;
  }

  async getGenreList(lang = 'en-US'): Promise<any> {
    const { data } = await firstValueFrom(
      this.httpService.get(
        `${this.baseUrl}/genre/movie/list?api_key=${this.apiKey}&language=${lang}`,
      ),
    );
    return data;
  }

  async getMoviesByGenre(genreId: number, page = 1, lang = 'en-US'): Promise<any> {
    const { data } = await firstValueFrom(
      this.httpService.get(
        `${this.baseUrl}/discover/movie?api_key=${this.apiKey}&language=${lang}&with_genres=${genreId}&sort_by=popularity.desc&page=${page}`,
      ),
    );
    return data;
  }

  async getMovieDetails(movieId: number, lang = 'en-US'): Promise<any> {
    const { data } = await firstValueFrom(
      this.httpService.get(
        `${this.baseUrl}/movie/${movieId}?api_key=${this.apiKey}&language=${lang}&append_to_response=videos,credits,release_dates`,
      ),
    );
    return data;
  }

  async getMovieVideos(movieId: number): Promise<any> {
    const { data } = await firstValueFrom(
      this.httpService.get(
        `${this.baseUrl}/movie/${movieId}/videos?api_key=${this.apiKey}`,
      ),
    );
    return data;
  }

  async getMovieCertification(movieId: number): Promise<any> {
    const { data } = await firstValueFrom(
      this.httpService.get(
        `${this.baseUrl}/movie/${movieId}/release_dates?api_key=${this.apiKey}`,
      ),
    );
    const results = data.results || [];
    // Try TH first, then US as fallback
    const th = results.find((r: any) => r.iso_3166_1 === 'TH');
    const us = results.find((r: any) => r.iso_3166_1 === 'US');
    const entry = th || us;
    const cert = entry?.release_dates?.find((rd: any) => rd.certification)?.certification || 'N/A';
    return { certification: cert };
  }
}
