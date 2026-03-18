import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './user.schema';

@Injectable()
export class UsersService {
    constructor(
        @InjectModel(User.name) private userModel: Model<UserDocument>,
    ) { }

    /** Find existing user or create a new one from Firebase data */
    async findOrCreate(
        firebaseUid: string,
        data: {
            displayName?: string;
            email?: string;
            photoURL?: string;
            phone?: string;
            birthday?: Date;
        },
    ): Promise<UserDocument> {
        let user = await this.userModel.findOne({ firebaseUid });
        if (user) {
            // Keep profile ownership with the user:
            // - never overwrite displayName/photoURL on every social login
            // - only backfill when those fields are empty (migration-like behavior)
            let changed = false;
            if (!user.displayName && data.displayName) {
                user.displayName = data.displayName;
                changed = true;
            }
            if (data.email && user.email !== data.email) {
                user.email = data.email;
                changed = true;
            }
            if (!user.photoURL && data.photoURL) {
                user.photoURL = data.photoURL;
                changed = true;
            }
            if (data.phone && user.phone !== data.phone) {
                user.phone = data.phone;
                changed = true;
            }
            if (data.birthday && user.birthday !== data.birthday) {
                user.birthday = data.birthday;
                changed = true;
            }

            if (changed) {
                await user.save();
            }
            return user;
        }

        // Create new user (schema defaults will handle roles, preferences, etc.)
        return this.userModel.create({
            firebaseUid,
            displayName: data.displayName || '',
            email: data.email || '',
            photoURL: data.photoURL || '',
            phone: data.phone,
            birthday: data.birthday,
        });
    }

    /** Update only the profile photo */
    async updatePhoto(
        firebaseUid: string,
        photoURL: string,
    ): Promise<UserDocument | null> {
        const normalizedNewPhoto = String(photoURL || '').trim();
        if (!normalizedNewPhoto) {
            return this.userModel.findOne({ firebaseUid });
        }

        let user = await this.userModel.findOne({ firebaseUid });
        if (!user) {
            user = await this.userModel.create({
                firebaseUid,
                photoURL: normalizedNewPhoto,
                photoHistory: [],
            });
            return user;
        }

        const currentPhoto = String(user.photoURL || '').trim();
        const baseHistory = Array.isArray(user.photoHistory) ? user.photoHistory : [];
        const normalizedHistory = baseHistory
            .map((item) => String(item || '').trim())
            .filter(Boolean);

        const nextHistory: string[] = [];

        if (currentPhoto && currentPhoto !== normalizedNewPhoto) {
            nextHistory.push(currentPhoto);
        }

        for (const item of normalizedHistory) {
            if (item === normalizedNewPhoto) continue;
            if (nextHistory.includes(item)) continue;
            nextHistory.push(item);
            if (nextHistory.length >= 12) break;
        }

        user.photoURL = normalizedNewPhoto;
        user.photoHistory = nextHistory;
        await user.save();
        return user;
    }

    /** Get a user by Firebase UID */
    async findByUid(firebaseUid: string): Promise<UserDocument | null> {
        return this.userModel.findOne({ firebaseUid });
    }

    /** Find existing user by email (case-insensitive) */
    async findByEmail(email: string): Promise<UserDocument | null> {
        const normalized = email.trim();
        if (!normalized) return null;
        return this.userModel.findOne({
            email: { $regex: `^${this.escapeRegex(normalized)}$`, $options: 'i' },
        });
    }

    private escapeRegex(value: string): string {
        return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
}
