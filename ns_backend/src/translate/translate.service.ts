import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Injectable()
export class TranslateService {
    private readonly logger = new Logger(TranslateService.name);
    private readonly genAI: GoogleGenerativeAI;
    private readonly model: any;
    private readonly cache = new Map<string, string>();

    constructor(private readonly configService: ConfigService) {
        const apiKey = this.configService.get<string>('GEMINI_API')!;
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    }

    async translate(text: string, targetLang = 'th'): Promise<string> {
        // NOTE: Gemini API paused temporarily — returning original text
        return text;

        // const cacheKey = `${targetLang}:${text}`;
        // if (this.cache.has(cacheKey)) return this.cache.get(cacheKey)!;
        // const maxRetries = 3;
        // for (let attempt = 0; attempt < maxRetries; attempt++) {
        //     try {
        //         const prompt = `Translate the following text to Thai. Return ONLY the translated text, no explanations, no quotes:\n\n${text}`;
        //         const result = await this.model.generateContent(prompt);
        //         const translated = result.response.text().trim();
        //         this.cache.set(cacheKey, translated);
        //         return translated;
        //     } catch (error) {
        //         this.logger.warn(`Translation attempt ${attempt + 1} failed: ${error.message}`);
        //         if (attempt < maxRetries - 1) {
        //             const delay = Math.pow(2, attempt + 1) * 1000;
        //             await new Promise(resolve => setTimeout(resolve, delay));
        //         } else {
        //             this.logger.error(`Translation failed after ${maxRetries} attempts`);
        //             return text;
        //         }
        //     }
        // }
        // return text;
    }

    async translateBatch(texts: string[], targetLang = 'th'): Promise<string[]> {
        // NOTE: Gemini API paused temporarily — returning original texts
        return texts;

        // if (!texts || texts.length === 0) return [];
        // const results: string[] = new Array(texts.length);
        // const uncachedIndices: number[] = [];
        // const uncachedTexts: string[] = [];
        // for (let i = 0; i < texts.length; i++) {
        //     const cacheKey = `${targetLang}:${texts[i]}`;
        //     if (this.cache.has(cacheKey)) {
        //         results[i] = this.cache.get(cacheKey)!;
        //     } else {
        //         uncachedIndices.push(i);
        //         uncachedTexts.push(texts[i]);
        //     }
        // }
        // if (uncachedTexts.length === 0) return results;
        // try {
        //     const numbered = uncachedTexts.map((t, i) => `[${i}] ${t}`).join('\n');
        //     const prompt = `Translate each numbered line to Thai. Return ONLY translations in the same [number] format, no extra text:\n\n${numbered}`;
        //     const result = await this.model.generateContent(prompt);
        //     const responseText = result.response.text().trim();
        //     const lines = responseText.split('\n').filter(l => l.trim());
        //     for (const line of lines) {
        //         const match = line.match(/^\[(\d+)\]\s*(.+)$/);
        //         if (match) {
        //             const idx = parseInt(match[1]);
        //             const translated = match[2].trim();
        //             if (idx >= 0 && idx < uncachedTexts.length) {
        //                 const originalIdx = uncachedIndices[idx];
        //                 results[originalIdx] = translated;
        //                 this.cache.set(`${targetLang}:${texts[originalIdx]}`, translated);
        //             }
        //         }
        //     }
        //     for (let i = 0; i < results.length; i++) {
        //         if (!results[i]) results[i] = texts[i];
        //     }
        //     return results;
        // } catch (error) {
        //     this.logger.error(`Batch translation error: ${error.message}`);
        //     return texts.map((t, i) => results[i] || t);
        // }
    }
}
