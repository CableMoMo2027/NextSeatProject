import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CinemasProxyService } from './cinemas-proxy.service';
import { CinemasProxyController } from './cinemas-proxy.controller';

@Module({
    imports: [
        HttpModule.registerAsync({
            imports: [ConfigModule],
            useFactory: (config: ConfigService) => ({
                baseURL: config.get<string>('CINEMA_SERVICE_URL') ?? 'http://localhost:3001',
                timeout: 5000,
            }),
            inject: [ConfigService],
        }),
    ],
    controllers: [CinemasProxyController],
    providers: [CinemasProxyService],
    exports: [CinemasProxyService],
})
export class CinemasProxyModule { }
