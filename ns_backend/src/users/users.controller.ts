import {
    Controller,
    Post,
    Put,
    Get,
    Body,
    Param,
    UseInterceptors,
    UploadedFile,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname, join } from 'path';
import { UsersService } from './users.service';

@Controller('users')
export class UsersController {
    constructor(private readonly usersService: UsersService) { }

    /** POST /users/sync — sync Firebase user → MongoDB after login/signup */
    @Post('sync')
    async syncUser(
        @Body()
        body: {
            firebaseUid: string;
            displayName?: string;
            email?: string;
            photoURL?: string;
            phone?: string;
            birthday?: Date;
        },
    ) {
        const user = await this.usersService.findOrCreate(body.firebaseUid, {
            displayName: body.displayName,
            email: body.email,
            photoURL: body.photoURL,
            phone: body.phone,
            birthday: body.birthday ? new Date(body.birthday) : undefined,
        });
        return user;
    }

    /** PUT /users/:uid/photo — upload avatar file OR set URL */
    @Put(':uid/photo')
    @UseInterceptors(
        FileInterceptor('avatar', {
            storage: diskStorage({
                destination: join(process.cwd(), 'uploads', 'avatars'),
                filename: (_req, file, cb) => {
                    // Use the uid from params as filename
                    const uid = _req.params.uid;
                    const ext = extname(file.originalname) || '.jpg';
                    cb(null, `${uid}${ext}`);
                },
            }),
            limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
            fileFilter: (_req, file, cb) => {
                if (file.mimetype.startsWith('image/')) {
                    cb(null, true);
                } else {
                    cb(new Error('Only image files are allowed'), false);
                }
            },
        }),
    )
    async updatePhoto(
        @Param('uid') uid: string,
        @UploadedFile() file: Express.Multer.File,
        @Body() body: { photoURL?: string },
    ) {
        let photoURL: string;

        if (file) {
            // File was uploaded via FormData → store path
            photoURL = `/uploads/avatars/${file.filename}`;
        } else if (body.photoURL) {
            // Check if it's a base64 image → save as file
            if (body.photoURL.startsWith('data:image/')) {
                const matches = body.photoURL.match(/^data:image\/(\w+);base64,(.+)$/);
                if (matches) {
                    const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
                    const buffer = Buffer.from(matches[2], 'base64');
                    const filename = `${uid}.${ext}`;
                    const filePath = join(process.cwd(), 'uploads', 'avatars', filename);
                    const { writeFileSync } = require('fs');
                    writeFileSync(filePath, buffer);
                    photoURL = `/uploads/avatars/${filename}`;
                } else {
                    photoURL = body.photoURL;
                }
            } else {
                // External URL (e.g., avatar preset)
                photoURL = body.photoURL;
            }
        } else {
            return { error: 'No file or photoURL provided' };
        }

        const user = await this.usersService.updatePhoto(uid, photoURL);
        return user;
    }

    /** GET /users/:uid — get user by Firebase UID */
    @Get(':uid')
    async getUser(@Param('uid') uid: string) {
        const user = await this.usersService.findByUid(uid);
        return user;
    }
}
