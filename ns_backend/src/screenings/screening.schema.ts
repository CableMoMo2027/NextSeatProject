import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ScreeningDocument = HydratedDocument<Screening>;

@Schema({ timestamps: true })
export class Screening {
    @Prop({ required: true })
    movieId: number; // TMDB movie ID

    @Prop({ required: true })
    movieTitle: string;

    @Prop()
    posterPath: string; // TMDB poster path e.g. "/abc123.jpg"

    @Prop({ required: true })
    theater: string; // e.g. "HALL A"

    @Prop({ required: true })
    showtime: Date;

    @Prop({ required: true })
    price: number; // THB per seat

    @Prop({ default: 8 })
    rows: number;

    @Prop({ default: 12 })
    seatsPerRow: number;
}

export const ScreeningSchema = SchemaFactory.createForClass(Screening);
