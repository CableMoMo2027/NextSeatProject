import mongoose, { Schema, Document } from 'mongoose';

export interface ICinema extends Document {
    id: string;
    chain: 'major' | 'sf';
    nameEn: string;
    nameTh: string;
    province: string;
    district: string;
    address: string;
    lat: number;
    lon: number;
    halls: string[];
    screenTypes: string[];
    isActive: boolean;
}

const CinemaSchema = new Schema<ICinema>(
    {
        id: { type: String, required: true, unique: true, index: true },
        chain: { type: String, enum: ['major', 'sf'], required: true, index: true },
        nameEn: { type: String, required: true },
        nameTh: { type: String, required: true },
        province: { type: String, required: true, index: true },
        district: { type: String, required: true },
        address: { type: String, required: true },
        lat: { type: Number, required: true },
        lon: { type: Number, required: true },
        halls: { type: [String], default: [] },
        screenTypes: { type: [String], default: [] },
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true },
);

export const Cinema = mongoose.model<ICinema>('Cinema', CinemaSchema);
