# Express Payment Adapter

ชุดไฟล์นี้ไว้ย้ายระบบ payment จาก Nest ไป Express โดยรองรับ:
- Generate PromptPay QR
- ตรวจสถานะชำระเงิน
- ยืนยัน/ยกเลิกชำระเงิน
- ตรวจสลิปจาก URL หรือการอัปโหลดไฟล์

## Files
- `payment.service.js` : business logic
- `payment.routes.js` : express router
- `index.js` : helper สร้างโฟลเดอร์ runtime

## Required env
- `PORT=3000`
- `BASE_URL=https://api.cableskr.space`
- `PROMPTPAY_ID=0981058216`
- `BANK_ACCOUNT_NUMBER=1002917308`
- `BANK_CODE=011`

## Usage
```js
const express = require('express');
const mongoose = require('mongoose');
const { createPaymentRouter } = require('./express-payment/payment.routes');
const { ensurePaymentFolders } = require('./express-payment');
const { OrderModel } = require('./models/order.model');

const app = express();
app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));
app.use('/uploads', express.static('uploads'));

ensurePaymentFolders();
app.use('/api/payments', createPaymentRouter({ orderModel: OrderModel }));
```

## Dependencies
```bash
npm i multer axios promptpay-qr qrcode promptparse sharp jimp jsqr tesseract.js
```

## Required order fields
`orderId`, `total`, `paymentMethod`, `paymentStatus`, `paymentExpiry`, `transactionId`, `paidAt`, `slipFingerprint`, `slipImageUrl`, `qrCodeData`
