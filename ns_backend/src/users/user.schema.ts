import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

import { HydratedDocument } from 'mongoose';

export type UserDocument = HydratedDocument<User>;

@Schema({ timestamps: true })
export class User {
    @Prop({ required: true, unique: true })
    firebaseUid: string;

    @Prop()
    displayName: string;

    @Prop()
    email: string;

    @Prop()
    photoURL: string;

    @Prop({ type: [String], default: [] })
    photoHistory: string[];

    @Prop()
    phone?: string;

    @Prop()
    birthday?: Date;

    @Prop({ type: [String], default: ['user'] })
    roles: string[];

    @Prop({
        type: Object,
        default: {
            favoriteTheaters: [],
            favoriteGenres: [],
            language: 'th',
            notifications: true,
        },
    })
    preferences: {
        favoriteTheaters: string[];
        favoriteGenres: number[];
        language: string;
        notifications: boolean;
    };

    @Prop({ type: [Number], default: [] })
    favorites: number[];

    @Prop({ type: [Number], default: [] })
    watchlist: number[];
}

export const UserSchema = SchemaFactory.createForClass(User);
