import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { join } from 'path';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { MoviesModule } from './movies/movies.module';
import { TranslateModule } from './translate/translate.module';
import { UsersModule } from './users/users.module';
import { ScreeningsModule } from './screenings/screenings.module';
import { BookingsModule } from './bookings/bookings.module';
import { PaymentsModule } from './payments/payments.module';
import { PlacesModule } from './places/places.module';
import { CinemasProxyModule } from './cinemas/cinemas-proxy.module';
import { InternalProxyModule } from './internal-proxy/internal-proxy.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // Support running from both `ns_backend` dir and repository root.
      envFilePath: ['.env', join(process.cwd(), 'ns_backend', '.env')],
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>('MONGODB_URI'),
      }),
      inject: [ConfigService],
    }),
    MoviesModule,
    TranslateModule,
    UsersModule,
    ScreeningsModule,
    BookingsModule,
    PaymentsModule,
    PlacesModule,
    CinemasProxyModule,
    InternalProxyModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }


