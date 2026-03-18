import { Controller, Get, Post, Param, Body, Query } from '@nestjs/common';
import { ScreeningsService } from './screenings.service';

@Controller('screenings')
export class ScreeningsController {
    constructor(private readonly screeningsService: ScreeningsService) { }

    @Post()
    create(
        @Body()
        body: {
            movieId: number;
            movieTitle: string;
            posterPath?: string;
            theater: string;
            showtime: string; // ISO string
            price: number;
            rows?: number;
            seatsPerRow?: number;
        },
    ) {
        return this.screeningsService.create({
            ...body,
            showtime: new Date(body.showtime),
        });
    }

    @Get()
    findAll() {
        return this.screeningsService.findAll();
    }

    @Get(':id')
    findById(@Param('id') id: string) {
        return this.screeningsService.findById(id);
    }

    @Get(':id/seat-map')
    getSeatMap(
        @Param('id') id: string,
        @Query('userId') userId?: string,
    ) {
        return this.screeningsService.getSeatMap(id, userId);
    }
}
