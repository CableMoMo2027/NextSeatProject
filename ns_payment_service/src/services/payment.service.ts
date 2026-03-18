import { randomUUID, createHash } from 'crypto';
import QRCode from 'qrcode';
import {
  CreatePaymentInput,
  PaymentMethod,
  PaymentRecord,
  PaymentStatus,
} from '../types/payment.types';
import { PaymentDoc, PaymentModel } from '../models/payment.model';
import { OrderDoc, OrderModel } from '../models/order.model';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const generatePromptPayPayload = require('promptpay-qr');

type SlipVerifyResult = {
  transRef?: string;
  transDate?: string;
  transTime?: string;
  sendingBank?: string;
  receivingBank?: string;
  amount?: string | number;
  isValid?: boolean;
  [key: string]: unknown;
};

type SlipVerificationResponse = {
  success: boolean;
  message: string;
  data?: {
    sendingBank: string;
    receivingBank: string;
    transRef: string;
    transDate: string;
    transTime: string;
    transactionDateTime: string;
    amount: number;
    expectedAmount: number;
    isValid: boolean;
    orderId: string;
    imageUrl?: string;
    validations: {
      qrCodeFound: boolean;
      amountMatch: boolean;
      notDuplicate: boolean;
      slipStructureValid: boolean;
    };
  };
};

export class PaymentService {
  private readonly promptpayId =
    process.env.PROMPTPAY_ID ||
    process.env.MERCHANT_PROMPTPAY_ID ||
    process.env.MERCHANT_BANK_ACCOUNT ||
    '1002917308';

  private readonly bankAccount = {
    accountNumber: process.env.MERCHANT_BANK_ACCOUNT || '1002917308',
    bankCode: process.env.MERCHANT_BANK_CODE || '011',
    accountName: process.env.MERCHANT_ACCOUNT_NAME || 'Merchant',
  };

  private readonly requireAmountMatch =
    String(process.env.SLIP_REQUIRE_AMOUNT_MATCH || 'false').toLowerCase() === 'true';

  private slipVerify:
    | ((qrData: string) => SlipVerifyResult)
    | null = null;

  private sharp:
    | ((input: Buffer | string) => {
      ensureAlpha: () => {
        raw: () => {
          toBuffer: (opts: { resolveWithObject: true }) => Promise<{
            data: Buffer;
            info: { width: number; height: number };
          }>;
        };
      };
    })
    | null = null;

  private jsQR:
    | ((data: Uint8ClampedArray, width: number, height: number) => { data?: string } | null)
    | null = null;

  constructor() {
    this.loadVerifierDeps();
  }

  private toPaymentRecord(doc: PaymentDoc): PaymentRecord {
    return {
      id: doc.id,
      bookingId: doc.bookingId,
      amount: doc.amount,
      currency: doc.currency,
      method: doc.method,
      status: doc.status,
      metadata: doc.metadata || {},
      failureReason: doc.failureReason,
      createdAt: new Date(doc.createdAt).toISOString(),
      updatedAt: new Date(doc.updatedAt).toISOString(),
    };
  }

  async list(filters: { bookingId?: string; status?: PaymentStatus }): Promise<PaymentRecord[]> {
    const query: { bookingId?: string; status?: PaymentStatus } = {};
    if (filters.bookingId) query.bookingId = filters.bookingId;
    if (filters.status) query.status = filters.status;
    const docs = await PaymentModel.find(query).sort({ createdAt: -1 }).lean<PaymentDoc[]>();
    return docs.map((doc) => this.toPaymentRecord(doc));
  }

  async findById(id: string): Promise<PaymentRecord | null> {
    const doc = await PaymentModel.findOne({ id }).lean<PaymentDoc | null>();
    return doc ? this.toPaymentRecord(doc) : null;
  }

  async createIntent(input: CreatePaymentInput): Promise<PaymentRecord> {
    const doc = await PaymentModel.create({
      id: `pay_${randomUUID().replace(/-/g, '').slice(0, 24)}`,
      bookingId: input.bookingId,
      amount: input.amount,
      currency: (input.currency || 'THB').toUpperCase(),
      method: (input.method || 'unknown') as PaymentMethod,
      status: 'requires_confirmation',
      metadata: input.metadata || {},
    });

    return this.toPaymentRecord(doc.toObject());
  }

  async confirm(id: string): Promise<PaymentRecord | null> {
    const found = await PaymentModel.findOne({ id });
    if (!found) return null;

    if (found.amount <= 0) {
      found.status = 'failed';
      found.failureReason = 'amount_must_be_positive';
      await found.save();
      return this.toPaymentRecord(found.toObject());
    }

    found.status = 'succeeded';
    found.failureReason = undefined;
    await found.save();
    return this.toPaymentRecord(found.toObject());
  }

  async refund(id: string): Promise<PaymentRecord | null> {
    const found = await PaymentModel.findOne({ id });
    if (!found) return null;
    if (found.status !== 'succeeded') return this.toPaymentRecord(found.toObject());

    found.status = 'refunded';
    await found.save();
    return this.toPaymentRecord(found.toObject());
  }

  async generateQRCode(orderId: string, amount: number): Promise<{
    qrCodeDataURL: string;
    qrCodeText: string;
    expiresAt: string;
  }> {
    const order = await OrderModel.findOne({ orderId }).exec();
    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }

    const payload = generatePromptPayPayload(this.promptpayId, { amount });
    const qrCodeDataURL = await QRCode.toDataURL(payload, {
      width: 400,
      margin: 4,
      errorCorrectionLevel: 'M',
      color: { dark: '#000000', light: '#FFFFFF' },
    });

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);

    order.qrCodeData = qrCodeDataURL;
    order.paymentExpiry = expiresAt;
    order.paymentStatus = 'pending';
    await order.save();

    return {
      qrCodeDataURL,
      qrCodeText: payload,
      expiresAt: expiresAt.toISOString(),
    };
  }

  async generateBillPaymentQR(orderId: string, amount: number): Promise<{
    qrCodeDataURL: string;
    qrCodeText: string;
    expiresAt: string;
    accountInfo: {
      accountNumber: string;
      bankName: string;
      accountName: string;
    };
  }> {
    const order = await OrderModel.findOne({ orderId }).exec();
    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }

    const payload = generatePromptPayPayload(this.bankAccount.accountNumber, { amount });
    const qrCodeDataURL = await QRCode.toDataURL(payload, {
      width: 400,
      margin: 4,
      errorCorrectionLevel: 'M',
      color: { dark: '#000000', light: '#FFFFFF' },
    });

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);

    order.qrCodeData = qrCodeDataURL;
    order.paymentExpiry = expiresAt;
    order.paymentStatus = 'pending';
    order.paymentMethod = 'transfer';
    await order.save();

    return {
      qrCodeDataURL,
      qrCodeText: payload,
      expiresAt: expiresAt.toISOString(),
      accountInfo: {
        accountNumber: this.bankAccount.accountNumber,
        bankName: this.getBankName(this.bankAccount.bankCode),
        accountName: this.bankAccount.accountName,
      },
    };
  }

  async checkPaymentStatus(orderId: string): Promise<{
    status: string;
    order: OrderDoc;
  }> {
    const order = await OrderModel.findOne({ orderId }).lean<OrderDoc | null>();
    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }

    return {
      status: order.paymentStatus || 'pending',
      order,
    };
  }

  async confirmOrderPayment(orderId: string, transactionId: string): Promise<OrderDoc> {
    const order = await OrderModel.findOne({ orderId }).exec();
    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }

    if (order.paymentExpiry && new Date() > order.paymentExpiry) {
      throw new Error('QR Code has expired');
    }

    order.paymentStatus = 'paid';
    order.transactionId = transactionId;
    order.paidAt = new Date();
    await order.save();
    return order.toObject();
  }

  async cancelOrderPayment(orderId: string): Promise<OrderDoc> {
    const order = await OrderModel.findOne({ orderId }).exec();
    if (!order) {
      throw new Error(`Order ${orderId} not found`);
    }

    order.paymentStatus = 'cancelled';
    await order.save();
    return order.toObject();
  }

  async verifySlipFromImage(
    orderId: string,
    imageInput: Buffer,
    imageUrl?: string,
  ): Promise<SlipVerificationResponse> {
    if (!this.slipVerify || !this.sharp || !this.jsQR) {
      throw new Error(
        'Slip verification service is not ready (missing verifier dependencies: sharp/jsqr/promptparse).',
      );
    }

    const order = await OrderModel.findOne({ orderId }).exec();
    if (!order) {
      return {
        success: false,
        message: `ไม่พบ Order ${orderId}`,
      };
    }

    const qrData = await this.readQRFromImageBuffer(imageInput);
    if (!qrData) {
      return {
        success: false,
        message: 'ไม่พบ QR Code ในรูปภาพ กรุณาตรวจสอบว่าเป็นสลิปที่ถูกต้อง',
      };
    }

    const slipData = this.slipVerify(qrData);
    if (!slipData?.transRef) {
      return {
        success: false,
        message:
          'ไม่สามารถอ่านข้อมูลจากสลิปได้ กรุณาใช้สลิปที่แสดงผลการโอนเงินสำเร็จ (ไม่ใช่ QR Code สำหรับโอนเงิน)',
      };
    }

    const qrPayload = this.parseQRPayload(qrData);
    const transDate = slipData.transDate || qrPayload.transDate || this.formatDateYYYYMMDD(new Date());
    const transTime = slipData.transTime || qrPayload.transTime || this.formatTimeHHmmss(new Date());

    const duplicateSlip = await OrderModel.findOne({
      orderId: { $ne: orderId },
      $or: [
        { transactionId: slipData.transRef },
        { slipFingerprint: this.generateSlipFingerprint(qrData, slipData.transRef) },
      ],
    }).exec();

    if (duplicateSlip) {
      return {
        success: false,
        message: 'สลิปนี้ถูกใช้งานไปแล้ว ไม่สามารถใช้ซ้ำได้',
        data: {
          sendingBank: this.getBankName(String(slipData.sendingBank || this.bankAccount.bankCode)),
          receivingBank: String(slipData.receivingBank || 'N/A'),
          transRef: String(slipData.transRef),
          transDate,
          transTime,
          transactionDateTime: new Date().toISOString(),
          amount: 0,
          expectedAmount: Number(order.total),
          isValid: false,
          orderId,
          imageUrl,
          validations: {
            qrCodeFound: true,
            amountMatch: false,
            notDuplicate: false,
            slipStructureValid: true,
          },
        },
      };
    }

    const expectedAmount = Number(order.total);
    const amountFromQr = this.parsePromptPayAmountFromQr(qrData);
    const amountFromSlipData = this.extractAmountFromSlipData(slipData);
    const resolvedAmount = Number.isFinite(amountFromQr)
      ? Number(amountFromQr)
      : (Number.isFinite(amountFromSlipData) ? Number(amountFromSlipData) : NaN);
    const hasAmountData = Number.isFinite(resolvedAmount) && resolvedAmount > 0;

    if (!hasAmountData && this.requireAmountMatch) {
      return {
        success: false,
        message:
          'ไม่สามารถอ่านยอดเงินจากสลิปได้ กรุณาใช้สลิปที่แสดงผลการโอนเงินสำเร็จ (ไม่ใช่ QR Code สำหรับโอนเงิน)',
      };
    }

    const amount = hasAmountData ? resolvedAmount : expectedAmount;
    const amountMatch = hasAmountData
      ? Math.abs(amount - expectedAmount) < 0.01
      : true;
    if (!amountMatch) {
      return {
        success: false,
        message: `จำนวนเงินไม่ตรงกับคำสั่งซื้อ (คาดหวัง ${expectedAmount.toFixed(2)} บาท แต่ได้รับ ${amount.toFixed(2)} บาท)`,
      };
    }

    const transDateTime =
      this.parseTransactionDateTime(transDate, transTime) || new Date();

    order.transactionId = String(slipData.transRef);
    order.slipFingerprint = this.generateSlipFingerprint(qrData, String(slipData.transRef));
    order.paymentStatus = 'paid';
    order.paidAt = new Date();
    if (imageUrl) {
      order.slipImageUrl = imageUrl;
    }
    await order.save();

    return {
      success: true,
      message: '✅ สลิปถูกต้อง ชำระเงินสำเร็จ!',
      data: {
        sendingBank: this.getBankName(String(slipData.sendingBank || this.bankAccount.bankCode)),
        receivingBank: String(slipData.receivingBank || 'N/A'),
        transRef: String(slipData.transRef),
        transDate,
        transTime,
        transactionDateTime: transDateTime.toISOString(),
        amount,
        expectedAmount,
        isValid: true,
        orderId,
        imageUrl,
        validations: {
          qrCodeFound: true,
          amountMatch,
          notDuplicate: true,
          slipStructureValid: true,
        },
      },
    };
  }

  async verifySlipFromImageUrl(orderId: string, imageUrl: string): Promise<SlipVerificationResponse> {
    const response = await fetch(imageUrl);
    if (!response.ok) {
      throw new Error(`Cannot download image (${response.status})`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const imageBuffer = Buffer.from(arrayBuffer);
    return this.verifySlipFromImage(orderId, imageBuffer, imageUrl);
  }

  private async readQRFromImageBuffer(imageBuffer: Buffer): Promise<string | null> {
    if (!this.sharp || !this.jsQR) return null;
    const rawImage = await this.sharp(imageBuffer)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const qrResult = this.jsQR(
      new Uint8ClampedArray(rawImage.data),
      rawImage.info.width,
      rawImage.info.height,
    );

    return qrResult?.data || null;
  }

  private loadVerifierDeps(): void {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      this.sharp = require('sharp');
    } catch {
      this.sharp = null;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      this.jsQR = require('jsqr');
    } catch {
      this.jsQR = null;
    }

    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const promptParse = require('promptparse/validate');
      this.slipVerify = typeof promptParse?.slipVerify === 'function'
        ? promptParse.slipVerify
        : null;
    } catch {
      this.slipVerify = null;
    }
  }

  private parsePromptPayAmountFromQr(qrData: string): number | null {
    if (!qrData || qrData.length < 4) return null;

    let i = 0;
    while (i + 4 <= qrData.length) {
      const tag = qrData.slice(i, i + 2);
      const lengthStr = qrData.slice(i + 2, i + 4);
      if (!/^\d{2}$/.test(lengthStr)) break;

      const length = Number(lengthStr);
      const valueStart = i + 4;
      const valueEnd = valueStart + length;
      if (valueEnd > qrData.length) break;

      const value = qrData.slice(valueStart, valueEnd);
      if (tag === '54') {
        const amount = Number(value);
        return Number.isFinite(amount) ? amount : null;
      }

      i = valueEnd;
    }

    return null;
  }

  private parseQRPayload(
    qrData: string,
  ): { transDate?: string; transTime?: string; transRef?: string } {
    try {
      const result: { transDate?: string; transTime?: string; transRef?: string } = {};
      const tag62Pattern = /62(\d{2})([^\d{2}\d{2}]+)/;
      const tag62Match = qrData.match(tag62Pattern);

      if (tag62Match) {
        const tag62Data = tag62Match[2];

        const refMatch = tag62Data.match(/05(\d{2})(.{1,}?)(?=\d{2}|$)/);
        if (refMatch) {
          const refLength = parseInt(refMatch[1], 10);
          result.transRef = refMatch[2].substring(0, refLength);
        }

        const dateMatch = tag62Data.match(/07(\d{2})(\d{8})/);
        if (dateMatch) {
          result.transDate = dateMatch[2];
        }

        const timeMatch = tag62Data.match(/08(\d{2})(\d{6})/);
        if (timeMatch) {
          result.transTime = timeMatch[2];
        }
      }

      if (!result.transDate || !result.transTime) {
        const now = new Date();
        result.transDate = result.transDate || this.formatDateYYYYMMDD(now);
        result.transTime = result.transTime || this.formatTimeHHmmss(now);
      }

      return result;
    } catch {
      const now = new Date();
      return {
        transDate: this.formatDateYYYYMMDD(now),
        transTime: this.formatTimeHHmmss(now),
      };
    }
  }

  private parseTransactionDateTime(transDate: string, transTime: string): Date | null {
    if (!transDate || !transTime) {
      return null;
    }

    const year = parseInt(transDate.substring(0, 4), 10);
    const month = parseInt(transDate.substring(4, 6), 10) - 1;
    const day = parseInt(transDate.substring(6, 8), 10);
    const hours = parseInt(transTime.substring(0, 2), 10);
    const minutes = parseInt(transTime.substring(2, 4), 10);
    const seconds = parseInt(transTime.substring(4, 6), 10);

    const dateTime = new Date(year, month, day, hours, minutes, seconds);
    return Number.isNaN(dateTime.getTime()) ? null : dateTime;
  }

  private formatDateYYYYMMDD(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  }

  private formatTimeHHmmss(date: Date): string {
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${hours}${minutes}${seconds}`;
  }

  private parseNumericAmount(value: unknown): number {
    const text = String(value || '').replace(/,/g, '').replace(/[^\d.]/g, '');
    const amount = Number(text);
    return Number.isFinite(amount) ? amount : NaN;
  }

  private extractAmountFromSlipData(slipData: SlipVerifyResult): number {
    const directCandidates = [
      slipData.amount,
      (slipData as Record<string, unknown>).amt,
      (slipData as Record<string, unknown>).transferAmount,
      (slipData as Record<string, unknown>).transactionAmount,
      (slipData as Record<string, unknown>).txnAmount,
    ];

    for (const candidate of directCandidates) {
      const parsed = this.parseNumericAmount(candidate);
      if (Number.isFinite(parsed) && parsed > 0) {
        return parsed;
      }
    }

    // Fallback: scan nested payload for any numeric amount-like key.
    const stack: unknown[] = [slipData];
    while (stack.length > 0) {
      const current = stack.pop();
      if (!current || typeof current !== 'object') continue;
      const entries = Object.entries(current as Record<string, unknown>);
      for (const [key, value] of entries) {
        if (value && typeof value === 'object') {
          stack.push(value);
          continue;
        }
        if (!/(amount|amt|total|value)/i.test(key)) continue;
        const parsed = this.parseNumericAmount(value);
        if (Number.isFinite(parsed) && parsed > 0) {
          return parsed;
        }
      }
    }

    return NaN;
  }

  private generateSlipFingerprint(qrData: string, transRef: string): string {
    return createHash('sha256').update(`${qrData}|${transRef}`).digest('hex');
  }

  private getBankName(bankCode: string): string {
    const bankMap: Record<string, string> = {
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
}
