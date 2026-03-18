import { Controller, Get, Param, Query } from '@nestjs/common';
import { MoviesService } from './movies.service';

@Controller('movies')
export class MoviesController {
    constructor(private readonly moviesService: MoviesService) { }

    @Get('trending')
    getTrending(@Query('lang') lang?: string) {
        return this.moviesService.getTrending(lang || 'en-US');
    }

    @Get('now-playing')
    getNowPlaying(@Query('lang') lang?: string) {
        return this.moviesService.getNowPlaying(lang || 'en-US');
    }

    @Get('upcoming')
    getUpcoming(@Query('lang') lang?: string) {
        return this.moviesService.getUpcoming(lang || 'en-US');
    }

    @Get('genres/list')
    getGenreList(@Query('lang') lang?: string) {
        return this.moviesService.getGenreList(lang || 'en-US');
    }

    @Get('genre/:id')
    getMoviesByGenre(@Param('id') id: string, @Query('page') page?: string, @Query('lang') lang?: string) {
        return this.moviesService.getMoviesByGenre(+id, page ? +page : 1, lang || 'en-US');
    }

    @Get(':id/certification')
    getMovieCertification(@Param('id') id: string) {
        return this.moviesService.getMovieCertification(+id);
    }

    @Get(':id/videos')
    getMovieVideos(@Param('id') id: string) {
        return this.moviesService.getMovieVideos(+id);
    }

    @Get(':id')
    getMovieDetails(@Param('id') id: string, @Query('lang') lang?: string) {
        return this.moviesService.getMovieDetails(+id, lang || 'en-US');
    }
}
