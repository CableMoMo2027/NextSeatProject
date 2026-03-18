import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { User, UserSchema } from './user.schema';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { UsersPublicController } from './users-public.controller';
import { EmailValidationService } from './email-validation.service';

@Module({
    imports: [
        MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    ],
    controllers: [UsersController, UsersPublicController],
    providers: [UsersService, EmailValidationService],
    exports: [UsersService],
})
export class UsersModule { }
