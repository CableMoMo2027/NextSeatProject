import mongoose, { Schema, Document } from 'mongoose';

export interface IShowtime extends Document {
    cinemaId: string;   // references Cinema.id
    hall: string;       // e.g. "PARAGON-IMAX"
    movieId: number;    // TMDB movie ID
    movieTitle: string;
    posterPath: string; // TMDB poster path
    showtime: Date;     // exact showtime in UTC (display in +07:00)
    price: number;      // THB
    screenType: string; // "IMAX", "4DX", "Standard", etc.
    totalSeats: number;
    availableSeats: number;
    language: string;   // "TH" | "EN" | "TH-SUB"
    is3D: boolean;
}

const ShowtimeSchema = new Schema<IShowtime>(
    {
        cinemaId: { type: String, required: true, index: true },
        hall: { type: String, required: true },
        movieId: { type: Number, required: true, index: true },
        movieTitle: { type: String, required: true },
        posterPath: { type: String, default: '' },
        showtime: { type: Date, required: true, index: true },
        price: { type: Number, required: true },
        screenType: { type: String, default: 'Standard' },
        totalSeats: { type: Number, default: 150 },
        availableSeats: { type: Number, default: 150 },
        language: { type: String, default: 'TH' },
        is3D: { type: Boolean, default: false },
    },
    { timestamps: true },
);

// Compound index for efficient cinema+date queries
ShowtimeSchema.index({ cinemaId: 1, showtime: 1 });
ShowtimeSchema.index({ movieId: 1, showtime: 1 });

export const Showtime = mongoose.model<IShowtime>('Showtime', ShowtimeSchema);
