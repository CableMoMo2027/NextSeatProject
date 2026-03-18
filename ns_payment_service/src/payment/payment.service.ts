// import { Injectable } from '@nestjs/common';
// import * as QRCode from 'qrcode';
// import axios from 'axios';
// import FormData from 'form-data';

// // Using promptpay-qr library
// const generatePayload = require('promptpay-qr');

// @Injectable()
// export class PaymentService {
//     // Default PromptPay ID - can be phone number or national ID
//     // TODO: Move to environment variable
//     private readonly PROMPTPAY_ID = process.env.PROMPTPAY_ID || '0981058216';

//     /**
//      * Generate PromptPay QR Code as base64 image
//      */
//     async generatePromptPayQR(amount: number, phoneNumber?: string): Promise<{ qrCode: string; payload: string; promptpayId: string }> {
//         const phone = phoneNumber || this.PROMPTPAY_ID;

//         // Generate PromptPay payload using promptpay-qr library
//         const payload = generatePayload(phone, { amount });

//         try {
//             const qrCode = await QRCode.toDataURL(payload, {
//                 width: 300,
//                 margin: 2,
//                 color: {
//                     dark: '#000000',
//                     light: '#FFFFFF',
//                 },
//             });

//             return {
//                 qrCode,
//                 payload,
//                 promptpayId: phone,
//             };
//         } catch (error) {
//             throw new Error('Failed to generate QR code');
//         }
//     }

//     /**
//      * Verify slip using SlipOK API
//      * Documentation: https://slipok.com/docs
//      */
//     async verifySlip(slipImage: Buffer, expectedAmount: number): Promise<any> {
//         const SLIPOK_API_KEY = process.env.SLIPOK_API_KEY;
//         const SLIPOK_BRANCH_ID = process.env.SLIPOK_BRANCH_ID || 'default';

//         if (!SLIPOK_API_KEY) {
//             // Return mock verification for development
//             console.log('SlipOK API key not configured - using mock verification');
//             return {
//                 verified: false,
//                 message: 'SlipOK API not configured. Please set SLIPOK_API_KEY in environment.',
//                 mockMode: true,
//             };
//         }

//         try {
//             const formData = new FormData();
//             formData.append('files', slipImage, { filename: 'slip.jpg' });
//             formData.append('amount', expectedAmount.toString());

//             const response = await axios.post(
//                 `https://api.slipok.com/api/line/apikey/${SLIPOK_BRANCH_ID}`,
//                 formData,
//                 {
//                     headers: {
//                         ...formData.getHeaders(),
//                         'x-authorization': SLIPOK_API_KEY,
//                     },
//                 }
//             );

//             const data = response.data;

//             return {
//                 verified: data.success === true,
//                 transactionId: data.data?.transRef,
//                 amount: data.data?.amount,
//                 senderName: data.data?.sender?.name,
//                 receiverName: data.data?.receiver?.name,
//                 transferDate: data.data?.transDate,
//                 errorMessage: data.message,
//             };
//         } catch (error: any) {
//             console.error('SlipOK API error:', error);
//             return {
//                 verified: false,
//                 errorMessage: error.message || 'Failed to verify slip',
//             };
//         }
//     }
// }








import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
const generatePayload = require('promptpay-qr');
import * as QRCode from 'qrcode';
import { Order, OrderDocument } from '../order/order.schema';
let slipVerify:
  | ((qrData: string) => {
    transRef?: string;
    transDate?: string;
    transTime?: string;
    sendingBank?: string;
    receivingBank?: string;
    isValid?: boolean;
    [key: string]: any;
  })
  | undefined;
try {
  ({ slipVerify } = require('promptparse/validate'));
} catch (error) {
  slipVerify = undefined;
}
const { Jimp } = require('jimp');
const jsQR = require('jsqr');
const sharp = require('sharp');
import * as fs from 'fs';
import * as path from 'path';
import { createHash } from 'crypto';
const axios = require('axios');
const Tesseract = require('tesseract.js');

@Injectable()
export class PaymentService {
  // เบอร์ PromptPay ของร้านค้า (สามารถเปลี่ยนเป็นเบอร์ของคุณได้)
  private readonly promptpayId = '0981058216'; // เปลี่ยนเป็นเบอร์จริงของคุณ

  // ข้อมูลบัญชีธนาคารสำหรับ Bill Payment
  private readonly bankAccount = {
    accountNumber: '1002917308', // เลขบัญชี (เอาขีดออก)
    bankCode: '011', // 011': 'ธนาคารทหารไทยธนชาต (TTB)
    accountName: 'นาย สุคีรินทร์ คีรินทร์นนท์', // ชื่อบัญชี
  };

  // ถ้าต้องการบังคับว่าตรวจปลายทางไม่ได้ให้ fail ด้วย ให้เปลี่ยนเป็น true
  private readonly strictDestinationValidation = false;

  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
  ) { }

  /**
   * สร้าง QR Code สำหรับการชำระเงิน (PromptPay)
   */
  async generateQRCode(orderId: string, amount: number): Promise<{
    qrCodeDataURL: string;
    qrCodeText: string;
    expiresAt: Date;
  }> {
    // ตรวจสอบว่า order มีอยู่จริงหรือไม่
    const order = await this.orderModel.findOne({ orderId }).exec();
    if (!order) {
      throw new BadRequestException(`Order ${orderId} not found`);
    }

    // สร้าง payload สำหรับ PromptPay QR Code
    const payload = generatePayload(this.promptpayId, { amount });

    // แปลง payload เป็น QR Code รูปภาพ (Data URL) ด้วย options ที่เหมาะสมสำหรับการ scan
    const qrCodeDataURL = await QRCode.toDataURL(payload, {
      width: 400,
      margin: 4,
      errorCorrectionLevel: 'M',
      color: { dark: '#000000', light: '#FFFFFF' },
    });

    // กำหนดเวลาหมดอายุของ QR Code (10 นาที)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);

    // บันทึกข้อมูล QR Code และสถานะการชำระเงินลงใน Order
    order.qrCodeData = qrCodeDataURL;
    order.paymentExpiry = expiresAt;
    order.paymentStatus = 'pending';
    await order.save();

    return {
      qrCodeDataURL,
      qrCodeText: payload,
      expiresAt,
    };
  }

  /**
   * สร้าง QR Code Bill Payment (โอนเข้าบัญชีธนาคาร)
   * ใช้ PromptPay QR แบบ Bank Account
   * 
   * หมายเหตุ: บัญชีธนาคารต้องลงทะเบียน PromptPay ก่อนถึงจะใช้งานได้
   * วิธีลงทะเบียน (KBANK):
   * 1. เปิดแอพ K PLUS
   * 2. ไปที่เมนู "PromptPay" > "ลงทะเบียน"
   * 3. เลือก "เลขที่บัญชี" และเลือกบัญชี 038-3-87041-0
   * 4. ยืนยันการลงทะเบียน
   */
  async generateBillPaymentQR(orderId: string, amount: number): Promise<{
    qrCodeDataURL: string;
    qrCodeText: string;
    expiresAt: Date;
    accountInfo: {
      accountNumber: string;
      bankName: string;
      accountName: string;
    };
  }> {
    // ตรวจสอบว่า order มีอยู่จริงหรือไม่
    const order = await this.orderModel.findOne({ orderId }).exec();
    if (!order) {
      throw new BadRequestException(`Order ${orderId} not found`);
    }

    // สร้าง PromptPay QR Code โดยใช้เลขบัญชีธนาคาร (ต้องลงทะเบียน PromptPay ก่อน)
    // เลขบัญชี KBANK: 038-3-87041-0 (เอาขีดออก = 0383870410)
    const accountNumber = this.bankAccount.accountNumber; // 0383870410

    // สร้าง payload สำหรับ PromptPay QR Code
    // PromptPay จะแสดงชื่อบัญชีและธนาคารอัตโนมัติจากระบบลงทะเบียน
    const payload = generatePayload(accountNumber, { amount });

    // แปลง payload เป็น QR Code รูปภาพ
    const qrCodeDataURL = await QRCode.toDataURL(payload);

    // กำหนดเวลาหมดอายุของ QR Code (10 นาที)
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 10);

    // บันทึกข้อมูล QR Code และสถานะการชำระเงินลงใน Order
    order.qrCodeData = qrCodeDataURL;
    order.paymentExpiry = expiresAt;
    order.paymentStatus = 'pending';
    order.paymentMethod = 'transfer'; // ต้องตรงกับ enum ใน Order schema
    await order.save();

    return {
      qrCodeDataURL,
      qrCodeText: payload,
      expiresAt,
      accountInfo: {
        accountNumber: '038-3-87041-0',
        bankName: 'ธนาคารกสิกรไทย (KBANK)',
        accountName: this.bankAccount.accountName,
      },
    };
  }

  /**
   * ตรวจสอบสถานะการชำระเงิน
   */
  async checkPaymentStatus(orderId: string): Promise<{
    status: string;
    order: Order;
  }> {
    const order = await this.orderModel.findOne({ orderId }).exec();
    if (!order) {
      throw new BadRequestException(`Order ${orderId} not found`);
    }

    return {
      status: order.paymentStatus || 'pending',
      order,
    };
  }

  /**
   * ยืนยันการชำระเงิน (สำหรับ webhook หรือการยืนยันด้วยตัวเอง)
   */
  async confirmPayment(orderId: string, transactionId: string): Promise<Order> {
    const order = await this.orderModel.findOne({ orderId }).exec();
    if (!order) {
      throw new BadRequestException(`Order ${orderId} not found`);
    }

    // ตรวจสอบว่า QR Code หมดอายุหรือไม่
    if (order.paymentExpiry && new Date() > order.paymentExpiry) {
      throw new BadRequestException('QR Code has expired');
    }

    // อัพเดทสถานะการชำระเงิน
    order.paymentStatus = 'paid';
    order.transactionId = transactionId;
    order.paidAt = new Date();

    return order.save();
  }

  /**
   * ยกเลิกการชำระเงิน
   */
  async cancelPayment(orderId: string): Promise<Order> {
    const order = await this.orderModel.findOne({ orderId }).exec();
    if (!order) {
      throw new BadRequestException(`Order ${orderId} not found`);
    }

    order.paymentStatus = 'cancelled';
    return order.save();
  }

  /**
   * ตรวจสอบความถูกต้องของสลิปโอนเงิน
   * ใช้ promptparse/validate เหมือน Discord Bot
   */
  async verifySlip(imageUrl: string, orderId: string): Promise<{
    success: boolean;
    message: string;
    data?: any;
  }> {
    try {
      // ดาวน์โหลดรูปภาพจาก URL
      const imagePath = await this.downloadImage(imageUrl);

      if (!imagePath) {
        return {
          success: false,
          message: 'ไม่สามารถดาวน์โหลดรูปภาพได้',
        };
      }

      // แปลง webp เป็น jpg ถ้าจำเป็น
      const convertedPath = await this.convertToJpeg(imagePath);

      // อ่าน QR Code จากรูปภาพ
      const qrData = await this.readQRFromImage(convertedPath);

      if (!qrData) {
        // ลบไฟล์ที่ดาวน์โหลดมา
        this.cleanupFile(imagePath);
        this.cleanupFile(convertedPath);

        return {
          success: false,
          message: 'ไม่พบ QR Code ในรูปภาพ กรุณาตรวจสอบว่าเป็นสลิปที่ถูกต้อง',
        };
      }

      console.log('=== QR CODE VERIFICATION DEBUG ===');
      console.log('QR Data:', qrData);

      // ตรวจสอบความถูกต้องของสลิปด้วย promptparse
      const slipData = slipVerify
        ? slipVerify(qrData)
        : {
          transRef: undefined,
          transDate: undefined,
          transTime: undefined,
          sendingBank: this.bankAccount.bankCode,
          receivingBank: this.bankAccount.bankCode,
          isValid: false,
        };

      console.log('Slip Data from promptparse:', JSON.stringify(slipData, null, 2));
      console.log('slipData.isValid:', slipData?.isValid);
      console.log('Available fields:', Object.keys(slipData || {}));

      if (!slipData || !slipData.transRef) {
        this.cleanupFile(imagePath);
        this.cleanupFile(convertedPath);

        return {
          success: false,
          message: 'ไม่สามารถอ่านข้อมูลจากสลิปได้ กรุณาใช้สลิปที่แสดงผลการโอนเงินสำเร็จ (ไม่ใช่ QR Code สำหรับโอนเงิน)',
        };
      }

      // ใช้วันที่/เวลาจาก promptparse ก่อน ถ้าไม่มีค่อย fallback
      let transDate = slipData.transDate;
      let transTime = slipData.transTime;
      if (!transDate || !transTime) {
        const qrPayload = this.parseQRPayload(qrData);
        transDate = transDate || qrPayload.transDate || this.formatDateYYYYMMDD(new Date());
        transTime = transTime || qrPayload.transTime || this.formatTimeHHmmss(new Date());
      }

      // อ่านจำนวนเงินจากรูปภาพด้วย OCR
      const amount = await this.extractAmountFromImage(imageUrl);

      // ดึงข้อมูลธนาคาร
      const bankName = this.getBankName(
        slipData.sendingBank || this.bankAccount.bankCode,
      );

      // ตรวจสอบ Order
      const order = await this.orderModel.findOne({ orderId }).exec();
      if (!order) {
        this.cleanupFile(imagePath);
        this.cleanupFile(convertedPath);

        return {
          success: false,
          message: `ไม่พบ Order ${orderId}`,
        };
      }

      const slipFingerprint = this.generateSlipFingerprint(
        qrData,
        slipData.transRef,
      );

      // ตรวจสอบว่าสลิปนี้ถูกใช้งานไปแล้วหรือไม่ (เช็คทั้ง transRef และ fingerprint)
      const duplicateSlip = await this.orderModel
        .findOne({
          orderId: { $ne: orderId }, // ไม่นับ order ปัจจุบัน
          $or: [
            { transactionId: slipData.transRef },
            { slipFingerprint: slipFingerprint },
          ],
        })
        .exec();

      if (duplicateSlip) {
        this.cleanupFile(imagePath);
        this.cleanupFile(convertedPath);

        return {
          success: false,
          message: 'สลิปนี้ถูกใช้งานไปแล้ว ไม่สามารถใช้ซ้ำได้',
          data: {
            sendingBank: bankName,
            receivingBank: slipData.receivingBank,
            transRef: slipData.transRef,
            transDate: transDate,
            transTime: transTime,
            amount: amount,
            isValid: false,
            reason: 'duplicate_slip',
          },
        };
      }

      // ตรวจสอบว่าปลายทางเป็นบัญชี/PromptPay ของร้านหรือไม่
      const destinationValidation = this.validateSlipDestination(slipData, qrData);
      if (!destinationValidation.valid) {
        this.cleanupFile(imagePath);
        this.cleanupFile(convertedPath);

        return {
          success: false,
          message: 'ปลายทางการโอนไม่ตรงกับบัญชีหรือ PromptPay ของร้าน',
          data: {
            sendingBank: bankName,
            receivingBank: slipData.receivingBank || 'N/A',
            transRef: slipData.transRef,
            transDate: transDate,
            transTime: transTime,
            destinationValidation,
            isValid: false,
            reason: 'invalid_receiver',
          },
        };
      }

      // ตรวจสอบจำนวนเงิน (ต้องตรงกับยอดรวมคำสั่งซื้อ รวมค่าส่ง)
      const expectedAmount = order.total;
      const tolerance = 0.01; // อนุญาตให้ต่างได้ 0.01 บาท
      const parsedAmount = this.parseMoneyAmount(amount);

      // ตรวจสอบว่ามียอดเงินในสลิปหรือไม่
      if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
        this.cleanupFile(imagePath);
        this.cleanupFile(convertedPath);

        return {
          success: false,
          message: 'ไม่สามารถอ่านยอดเงินจากสลิปได้ กรุณาใช้สลิปที่แสดงผลการโอนเงินสำเร็จ (ไม่ใช่ QR Code สำหรับโอนเงิน)',
          data: {
            sendingBank: bankName,
            receivingBank: slipData.receivingBank || 'N/A',
            transRef: slipData.transRef,
            transDate: transDate,
            transTime: transTime,
            amount: amount,
            expectedAmount: expectedAmount,
            isValid: false,
            reason: 'no_amount_data',
          },
        };
      }

      const amountMatch = Math.abs(parsedAmount - expectedAmount) < tolerance;

      if (!amountMatch) {
        this.cleanupFile(imagePath);
        this.cleanupFile(convertedPath);

        return {
          success: false,
          message: `จำนวนเงินไม่ตรงกับคำสั่งซื้อ (คาดหวัง ${expectedAmount.toFixed(2)} บาท แต่ได้รับ ${parsedAmount.toFixed(2)} บาท)`,
          data: {
            sendingBank: bankName,
            receivingBank: slipData.receivingBank,
            transRef: slipData.transRef,
            transDate: transDate,
            transTime: transTime,
            amount: amount,
            expectedAmount: expectedAmount,
            isValid: false,
            reason: 'amount_mismatch',
          },
        };
      }

      // สร้าง transDateTime สำหรับบันทึกข้อมูล (ไม่ได้ใช้ตรวจสอบอีกต่อไป)
      let transDateTime = this.parseTransactionDateTime(transDate, transTime);
      if (!transDateTime) {
        console.log('Cannot parse transaction datetime, using current time as fallback');
        transDateTime = new Date();
      }

      // ตรวจสอบแค่จำนวนเงินถูกต้องเท่านั้น (ไม่เช็ค structure และ time range)
      // เพราะ promptparse verify ใช้งานไม่ได้กับสลิปบางประเภท
      const isSlipValid = amountMatch;

      console.log('=== VALIDATION RESULTS ===');
      console.log('Amount Match:', amountMatch, `(${amount} ≈ ${expectedAmount})`);
      console.log('Is Slip Valid:', isSlipValid);

      // บันทึกข้อมูลสลิปลงใน Order
      order.transactionId = slipData.transRef;
      order.slipFingerprint = slipFingerprint;
      order.paymentStatus = isSlipValid ? 'paid' : 'pending';
      order.paidAt = isSlipValid ? new Date() : undefined;
      order.slipImageUrl = imageUrl; // บันทึก URL ของรูปสลิป
      await order.save();

      // ลบไฟล์ที่ดาวน์โหลดมา
      this.cleanupFile(imagePath);
      this.cleanupFile(convertedPath);

      return {
        success: isSlipValid,
        message: isSlipValid
          ? '✅ สลิปถูกต้อง ชำระเงินสำเร็จ!'
          : !amountMatch
            ? `ยอดเงินไม่ตรงกับคำสั่งซื้อ (คาดหวัง ${expectedAmount.toFixed(2)} บาท แต่ได้รับ ${parsedAmount.toFixed(2)} บาท)`
            : 'สลิปไม่ถูกต้อง',
        data: {
          sendingBank: bankName,
          receivingBank: slipData.receivingBank || 'N/A',
          transRef: slipData.transRef,
          transDate: transDate,
          transTime: transTime,
          transactionDateTime: transDateTime.toISOString(),
          amount: amount,
          expectedAmount: expectedAmount,
          isValid: isSlipValid,
          orderId: orderId,
          imageUrl: imageUrl,
          validations: {
            qrCodeFound: true,
            amountMatch: amountMatch,
            destinationValid: destinationValidation.valid,
            destinationVerified: destinationValidation.verified,
            withinTimeRange: true, // ไม่ตรวจสอบอีกต่อไป
            notDuplicate: true,
            slipStructureValid: true, // ไม่ตรวจสอบอีกต่อไป
          },
        },
      };
    } catch (error) {
      return {
        success: false,
        message: `เกิดข้อผิดพลาด: ${error.message}`,
      };
    }
  }

  /**
   * แปลง transDate และ transTime เป็น Date object
   * Format: transDate = "20250105", transTime = "143025" (HHmmss)
   */
  private parseTransactionDateTime(transDate: string, transTime: string): Date | null {
    try {
      // transDate format: YYYYMMDD (20250105)
      // transTime format: HHmmss (143025)

      if (!transDate || !transTime) {
        return null;
      }

      const year = parseInt(transDate.substring(0, 4));
      const month = parseInt(transDate.substring(4, 6)) - 1; // JavaScript months are 0-indexed
      const day = parseInt(transDate.substring(6, 8));

      const hours = parseInt(transTime.substring(0, 2));
      const minutes = parseInt(transTime.substring(2, 4));
      const seconds = parseInt(transTime.substring(4, 6));

      const dateTime = new Date(year, month, day, hours, minutes, seconds);

      // ตรวจสอบว่า Date object ที่ได้ถูกต้องหรือไม่
      if (isNaN(dateTime.getTime())) {
        return null;
      }

      return dateTime;
    } catch (error) {
      return null;
    }
  }

  /**
   * Parse ข้อมูลจาก QR Code Payload เพื่อดึงวันที่และเวลา
   * PromptPay QR Format มี field ต่างๆ เช่น:
   * - transRef (เลขที่อ้างอิง)
   * - transDate (วันที่ YYYYMMDD)
   * - transTime (เวลา HHmmss)
   */
  private parseQRPayload(qrData: string): { transDate?: string; transTime?: string; transRef?: string } {
    try {
      const result: { transDate?: string; transTime?: string; transRef?: string } = {};

      // QR Code ของ PromptPay มีโครงสร้างแบบ EMV
      // Tag 62 = Additional Data Field Template

      // หา Tag 62 (Additional Data) - format: 62[length][data]
      const tag62Pattern = /62(\d{2})([^\d{2}\d{2}]+)/;
      const tag62Match = qrData.match(tag62Pattern);

      if (tag62Match) {
        const tag62Data = tag62Match[2];
        console.log('Tag 62 Data:', tag62Data);

        // หา Tag 05 (Reference ID)
        const refMatch = tag62Data.match(/05(\d{2})(.{1,}?)(?=\d{2}|$)/);
        if (refMatch) {
          const refLength = parseInt(refMatch[1]);
          result.transRef = refMatch[2].substring(0, refLength);
          console.log('Transaction Ref:', result.transRef);
        }

        // หา Tag 07 (Transaction Date) - format: 0708YYYYMMDD
        const dateMatch = tag62Data.match(/07(\d{2})(\d{8})/);
        if (dateMatch) {
          result.transDate = dateMatch[2]; // YYYYMMDD
          console.log('Transaction Date:', result.transDate);
        }

        // หา Tag 08 (Transaction Time) - format: 0806HHmmss
        const timeMatch = tag62Data.match(/08(\d{2})(\d{6})/);
        if (timeMatch) {
          result.transTime = timeMatch[2]; // HHmmss
          console.log('Transaction Time:', result.transTime);
        }
      }

      // ถ้าไม่มีวันที่/เวลา ใช้เวลาปัจจุบันแทน
      if (!result.transDate || !result.transTime) {
        const now = new Date();
        result.transDate = result.transDate || this.formatDateYYYYMMDD(now);
        result.transTime = result.transTime || this.formatTimeHHmmss(now);
      }

      return result;
    } catch (error) {
      console.error('Parse QR Payload error:', error.message);

      // ใช้เวลาปัจจุบันเป็น fallback
      const now = new Date();
      return {
        transDate: this.formatDateYYYYMMDD(now),
        transTime: this.formatTimeHHmmss(now),
      };
    }
  }

  /**
   * Format Date เป็น YYYYMMDD
   */
  private formatDateYYYYMMDD(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  }

  /**
   * Format Time เป็น HHmmss
   */
  private formatTimeHHmmss(date: Date): string {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${hours}${minutes}${seconds}`;
  }

  /**
   * Parse จำนวนเงินจากข้อความ OCR เช่น "1,234.00 บาท"
   */
  private parseMoneyAmount(amountText: string): number {
    if (!amountText) return NaN;
    const normalized = amountText.replace(/,/g, '').replace(/[^\d.]/g, '');
    return parseFloat(normalized);
  }

  /**
   * สร้าง fingerprint ของสลิปสำหรับตรวจซ้ำ
   */
  private generateSlipFingerprint(qrData: string, transRef: string): string {
    return createHash('sha256')
      .update(`${qrData}|${transRef}`)
      .digest('hex');
  }

  /**
   * ตรวจสอบปลายทางรับเงินว่าตรงบัญชีหรือ PromptPay ของร้านหรือไม่
   */
  private validateSlipDestination(
    slipData: Record<string, any>,
    qrData: string,
  ): {
    valid: boolean;
    verified: boolean;
    matchedBy?: 'bank' | 'account' | 'promptpay';
    details?: string;
  } {
    const expectedBankCode = this.bankAccount.bankCode;
    const expectedAccount = this.normalizeDigits(this.bankAccount.accountNumber);
    const expectedPromptPay = this.normalizeDigits(this.promptpayId);
    const expectedPromptPay66 = expectedPromptPay.startsWith('0')
      ? `66${expectedPromptPay.slice(1)}`
      : expectedPromptPay;

    const receivingBank = this.normalizeDigits(String(slipData.receivingBank || ''));
    const possibleReceiverValues = [
      slipData.receivingAccount,
      slipData.receivingAccNo,
      slipData.receiverAccount,
      slipData.receiverAccNo,
      slipData.toAccount,
      slipData.targetAccount,
      slipData.payeeAccount,
      slipData.receivingPromptPayId,
      slipData.receiverPromptPayId,
      slipData.promptPayId,
      slipData.proxyId,
      slipData.payeeProxyId,
    ]
      .filter(Boolean)
      .map((v) => this.normalizeDigits(String(v)));

    // เช็คธนาคารปลายทาง ถ้ามีข้อมูลแล้วไม่ตรงให้ fail ทันที
    if (receivingBank) {
      if (receivingBank === expectedBankCode) {
        return { valid: true, verified: true, matchedBy: 'bank' };
      }
      return {
        valid: false,
        verified: true,
        details: `receivingBank ${receivingBank} != expected ${expectedBankCode}`,
      };
    }

    // เช็คเลขบัญชี/PromptPay จากข้อมูลที่พอมี
    const hasReceiverData = possibleReceiverValues.length > 0;
    const accountMatch = possibleReceiverValues.some((v) => v.includes(expectedAccount));
    const promptPayMatch = possibleReceiverValues.some(
      (v) => v.includes(expectedPromptPay) || v.includes(expectedPromptPay66),
    );

    if (accountMatch) {
      return { valid: true, verified: true, matchedBy: 'account' };
    }
    if (promptPayMatch) {
      return { valid: true, verified: true, matchedBy: 'promptpay' };
    }

    if (hasReceiverData) {
      return {
        valid: false,
        verified: true,
        details: 'receiver data exists but does not match merchant account/promptpay',
      };
    }

    if (this.strictDestinationValidation) {
      return {
        valid: false,
        verified: false,
        details: 'cannot verify destination from slip data',
      };
    }

    return {
      valid: true,
      verified: false,
      details: 'destination data not available in slip payload',
    };
  }

  private normalizeDigits(value: string): string {
    return (value || '').replace(/\D/g, '');
  }

  /**
   * ดาวน์โหลดรูปภาพจาก URL
   */
  private async downloadImage(url: string): Promise<string | null> {
    try {
      const response = await axios({
        url: url,
        method: 'GET',
        responseType: 'arraybuffer',
      });

      const directory = path.join(__dirname, '../../cache/receipt');
      if (!fs.existsSync(directory)) {
        fs.mkdirSync(directory, { recursive: true });
      }

      const filename = `receipt_${Date.now()}.webp`;
      const filePath = path.join(directory, filename);

      fs.writeFileSync(filePath, Buffer.from(response.data));
      return filePath;
    } catch (error) {
      console.error(`ดาวน์โหลดรูปภาพล้มเหลว: ${error.message}`);
      return null;
    }
  }

  /**
   * แปลง webp เป็น jpg
   */
  private async convertToJpeg(inputPath: string): Promise<string> {
    try {
      const outputPath = inputPath.replace(/\.(webp|png)$/, '.jpg');
      await sharp(inputPath).jpeg().toFile(outputPath);
      return outputPath;
    } catch (error) {
      console.error(`แปลงรูปภาพล้มเหลว: ${error.message}`);
      return inputPath;
    }
  }

  /**
   * อ่าน QR Code จากรูปภาพ
   */
  private async readQRFromImage(imagePath: string): Promise<string | null> {
    try {
      const image = await Jimp.read(imagePath);
      const metadata = await sharp(imagePath).metadata();

      const width = metadata.width;
      const height = metadata.height;
      const imageData = new Uint8ClampedArray(image.bitmap.data.buffer);

      const qrCode = jsQR(imageData, width, height);
      return qrCode ? qrCode.data : null;
    } catch (error) {
      console.error(`อ่าน QR Code ล้มเหลว: ${error.message}`);
      return null;
    }
  }

  /**
   * ดึงจำนวนเงินจากรูปภาพด้วย OCR
   */
  private async extractAmountFromImage(imageUrl: string): Promise<string> {
    try {
      const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
      if (!response.data) return 'ไม่พบจำนวนเงิน';

      const imageBuffer = Buffer.from(response.data);
      const processedBuffers = await this.buildOcrImageVariants(imageBuffer);

      for (const buffer of processedBuffers) {
        const {
          data: { text },
        } = await Tesseract.recognize(buffer, 'tha+eng', {
          tessedit_pageseg_mode: '6',
        });

        const amount = this.extractAmountFromOcrText(text);
        if (amount) {
          return `${amount.toFixed(2)} บาท`;
        }
      }

      return 'ไม่พบจำนวนเงิน';
    } catch (error) {
      console.error(`ดึงจำนวนเงินล้มเหลว: ${error.message}`);
      return 'ไม่พบจำนวนเงิน';
    }
  }

  /**
   * เตรียมรูปหลายแบบเพื่อเพิ่มโอกาสอ่าน OCR สำเร็จ
   */
  private async buildOcrImageVariants(imageBuffer: Buffer): Promise<Buffer[]> {
    const variants: Buffer[] = [imageBuffer];

    const normalized = await sharp(imageBuffer)
      .grayscale()
      .normalize()
      .sharpen()
      .toBuffer();
    variants.push(normalized);

    const enlarged = await sharp(imageBuffer)
      .resize({ width: 1600, withoutEnlargement: false })
      .grayscale()
      .normalize()
      .sharpen()
      .toBuffer();
    variants.push(enlarged);

    const thresholded = await sharp(imageBuffer)
      .resize({ width: 1600, withoutEnlargement: false })
      .grayscale()
      .threshold(170)
      .toBuffer();
    variants.push(thresholded);

    return variants;
  }

  /**
   * ดึงจำนวนเงินจากข้อความ OCR แล้วคืนเป็น number
   */
  private extractAmountFromOcrText(text: string): number | null {
    if (!text) return null;

    const normalizedText = text.replace(/\s+/g, ' ');
    const keywordPattern =
      /(?:จำนวนเงิน|ยอดเงิน|total|amount|รวม)\s*[:：]?\s*([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]{2})?)/gi;
    const decimalPattern = /([0-9]{1,3}(?:,[0-9]{3})*\.[0-9]{2})/g;

    const keywordMatches: number[] = [];
    let keywordMatch: RegExpExecArray | null;
    while ((keywordMatch = keywordPattern.exec(normalizedText)) !== null) {
      const value = parseFloat(keywordMatch[1].replace(/,/g, ''));
      if (Number.isFinite(value) && value > 0) {
        keywordMatches.push(value);
      }
    }
    if (keywordMatches.length > 0) {
      return Math.max(...keywordMatches);
    }

    const decimalMatches: number[] = [];
    let decimalMatch: RegExpExecArray | null;
    while ((decimalMatch = decimalPattern.exec(normalizedText)) !== null) {
      const value = parseFloat(decimalMatch[1].replace(/,/g, ''));
      if (Number.isFinite(value) && value > 0) {
        decimalMatches.push(value);
      }
    }
    if (decimalMatches.length > 0) {
      return Math.max(...decimalMatches);
    }

    return null;
  }

  /**
   * แปลง Bank Code เป็นชื่อธนาคาร
   */
  private getBankName(bankCode: string): string {
    const bankMap = {
      '002': 'ธนาคารกรุงเทพ (BBL)',
      '004': 'ธนาคารกสิกรไทย (KBANK)',
      '006': 'ธนาคารกรุงไทย (KTB)',
      '011': 'ธนาคารทหารไทยธนชาต (TTB)',
      '014': 'ธนาคารไทยพาณิชย์ (SCB)',
      '025': 'ธนาคารกรุงศรีอยุธยา (BAY)',
      '030': 'ธนาคารออมสิน (GSB)',
      '034': 'ธนาคารเพื่อการเกษตรและสหกรณ์การเกษตร (BAAC)',
      '065': 'ธนาคารธนชาต (TBANK)',
      '066': 'ธนาคารอิสลามแห่งประเทศไทย (ISBT)',
      '067': 'ธนาคารทิสโก้ (TISCO)',
      '069': 'ธนาคารเกียรตินาคินภัทร (KKP)',
      '070': 'ธนาคารไอซีบีซี (ไทย) (ICBC)',
      '071': 'ธนาคารยูโอบี (UOB)',
      '073': 'ธนาคารแลนด์ แอนด์ เฮ้าส์ (LH Bank)',
      '098': 'ธนาคารพัฒนาวิสาหกิจขนาดกลางและขนาดย่อมแห่งประเทศไทย (SME Bank)',
    };

    return bankMap[bankCode] || `ธนาคารไม่ทราบ (${bankCode})`;
  }

  /**
   * ลบไฟล์
   */
  private cleanupFile(filePath: string): void {
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      console.error(`ลบไฟล์ล้มเหลว: ${error.message}`);
    }
  }
}

