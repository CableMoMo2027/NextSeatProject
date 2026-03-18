import { Controller, Post, Body } from '@nestjs/common';
import { TranslateService } from './translate.service';

@Controller('translate')
export class TranslateController {
    constructor(private readonly translateService: TranslateService) { }

    @Post()
    async translate(@Body() body: { text: string; targetLang?: string }) {
        const translated = await this.translateService.translate(
            body.text,
            body.targetLang || 'th',
        );
        return { translated, success: translated !== body.text };
    }

    @Post('batch')
    async translateBatch(
        @Body() body: { texts: string[]; targetLang?: string },
    ) {
        const translations = await this.translateService.translateBatch(
            body.texts,
            body.targetLang || 'th',
        );
        return { translations };
    }
}
