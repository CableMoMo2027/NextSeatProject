// import { Module } from '@nestjs/common';
// import { MulterModule } from '@nestjs/platform-express';
// import { memoryStorage } from 'multer';
// import { PaymentController } from './payment.controller';
// import { PaymentService } from './payment.service';
// import { OrderModule } from '../order/order.module';

// @Module({
//     imports: [
//         // Configure Multer for file uploads
//         MulterModule.register({
//             storage: memoryStorage(),
//             limits: {
//                 fileSize: 5 * 1024 * 1024, // 5MB max
//             },
//             fileFilter: (req, file, callback) => {
//                 if (!file.mimetype.match(/\/(jpg|jpeg|png|gif)$/)) {
//                     return callback(new Error('Only image files are allowed!'), false);
//                 }
//                 callback(null, true);
//             },
//         }),
//         OrderModule,
//     ],
//     controllers: [PaymentController],
//     providers: [PaymentService],
//     exports: [PaymentService],
// })
// export class PaymentModule { }



import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { Order, OrderSchema } from '../order/order.schema';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Order.name, schema: OrderSchema }]),
  ],
  controllers: [PaymentController],
  providers: [PaymentService],
  exports: [PaymentService],
})
export class PaymentModule {}
