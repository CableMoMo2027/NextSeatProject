import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { InternalProxyService } from './internal-proxy.service';
import { InternalProxyController } from './internal-proxy.controller';

@Module({
    imports: [
        HttpModule.registerAsync({
            imports: [ConfigModule],
            useFactory: (config: ConfigService) => ({
                baseURL: config.get<string>('PAYMENT_SERVICE_URL') ?? 'http://localhost:3002',
                timeout: 10000,
            }),
            inject: [ConfigService],
        }),
    ],
    controllers: [InternalProxyController],
    providers: [InternalProxyService],
})
export class InternalProxyModule {}
