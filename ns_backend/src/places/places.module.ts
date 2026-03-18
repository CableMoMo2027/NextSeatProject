import { Module } from '@nestjs/common';
import { PlacesController } from './places.controller';
import { PlacesService } from './places.service';
import { CinemasProxyModule } from '../cinemas/cinemas-proxy.module';

@Module({
  imports: [CinemasProxyModule],
  controllers: [PlacesController],
  providers: [PlacesService],
})
export class PlacesModule { }
