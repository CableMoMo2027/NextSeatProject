const QRCode = require('qrcode');
const generatePayload = require('promptpay-qr');
const { Jimp } = require('jimp');
const jsQR = require('jsqr');
const sharp = require('sharp');
const axios = require('axios');
const Tesseract = require('tesseract.js');
const { createHash } = require('crypto');
const fs = require('fs');
const path = require('path');

let slipVerify;
try {
  ({ slipVerify } = require('promptparse/validate'));
} catch {
  slipVerify = undefined;
}

function createPaymentService({ orderModel }) {
  const promptpayId = process.env.PROMPTPAY_ID || '0981058216';
  const bankAccountNumber = (process.env.BANK_ACCOUNT_NUMBER || '1002917308').replace(/\D/g, '');
  const bankCode = process.env.BANK_CODE || '011';

  async function findOrderByOrderId(orderId) {
    const order = await orderModel.findOne({ orderId }).exec();
    if (!order) throw new Error(`Order ${orderId} not found`);
    return order;
  }

  async function generateQRCode(orderId, amount) {
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new Error('amount must be a positive number');
    }

    const order = await findOrderByOrderId(orderId);
    const payload = generatePayload(promptpayId, { amount });
    const qrCodeDataURL = await QRCode.toDataURL(payload, {
      width: 400,       // ขนาด 400px ทำให้ scan ได้ง่ายขึ้น
      margin: 4,        // Quiet zone อย่างน้อย 4 modules รอบ QR code (มาตรฐาน ISO)
      errorCorrectionLevel: 'M', // 15% error correction
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
    });

    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + 15);

    order.qrCodeData = qrCodeDataURL;
    order.paymentExpiry = expiresAt;
    order.paymentStatus = 'pending';
    await order.save();

    return { qrCodeDataURL, qrCodeText: payload, expiresAt };
  }

  async function checkPaymentStatus(orderId) {
    const order = await findOrderByOrderId(orderId);
    return { status: order.paymentStatus || 'pending', order };
  }

  async function confirmPayment(orderId, transactionId) {
    const order = await findOrderByOrderId(orderId);

    if (order.paymentExpiry && new Date() > order.paymentExpiry) {
      throw new Error('QR Code has expired');
    }

    order.paymentStatus = 'paid';
    order.transactionId = transactionId;
    order.paidAt = new Date();
    return order.save();
  }

  async function cancelPayment(orderId) {
    const order = await findOrderByOrderId(orderId);
    order.paymentStatus = 'cancelled';
    return order.save();
  }

  function cleanupFile(filePath) {
    if (!filePath) return;
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }

  async function downloadImage(url) {
    const response = await axios({ url, method: 'GET', responseType: 'arraybuffer' });
    const directory = path.join(process.cwd(), 'cache/receipt');
    if (!fs.existsSync(directory)) fs.mkdirSync(directory, { recursive: true });

    const filePath = path.join(directory, `receipt_${Date.now()}.webp`);
    fs.writeFileSync(filePath, Buffer.from(response.data));
    return filePath;
  }

  async function convertToJpeg(inputPath) {
    const outputPath = inputPath.replace(/\.(webp|png)$/i, '.jpg');
    await sharp(inputPath).jpeg().toFile(outputPath);
    return outputPath;
  }

  async function readQRFromImage(imagePath) {
    const image = await Jimp.read(imagePath);
    const metadata = await sharp(imagePath).metadata();
    const width = metadata.width;
    const height = metadata.height;
    const imageData = new Uint8ClampedArray(image.bitmap.data.buffer);
    const qrCode = jsQR(imageData, width, height);
    return qrCode ? qrCode.data : null;
  }

  function parseMoneyAmount(amountText) {
    if (!amountText) return NaN;
    const normalized = String(amountText).replace(/,/g, '').replace(/[^\d.]/g, '');
    return parseFloat(normalized);
  }

  async function extractAmountFromImage(imageUrl) {
    const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    const imageBuffer = Buffer.from(response.data);

    const variants = [
      imageBuffer,
      await sharp(imageBuffer).grayscale().normalize().sharpen().toBuffer(),
      await sharp(imageBuffer).resize({ width: 1600, withoutEnlargement: false }).grayscale().normalize().sharpen().toBuffer(),
      await sharp(imageBuffer).resize({ width: 1600, withoutEnlargement: false }).grayscale().threshold(170).toBuffer(),
    ];

    for (const buffer of variants) {
      const { data: { text } } = await Tesseract.recognize(buffer, 'tha+eng', { tessedit_pageseg_mode: '6' });
      const match = text.match(/([0-9]{1,3}(?:,[0-9]{3})*\.[0-9]{2})/g);
      if (match?.length) {
        const amount = Math.max(...match.map((m) => parseFloat(m.replace(/,/g, ''))).filter(Number.isFinite));
        if (Number.isFinite(amount)) return amount;
      }
    }

    return NaN;
  }

  function normalizeDigits(value) {
    return (value || '').replace(/\D/g, '');
  }

  function validateSlipDestination(slipData, qrData) {
    const expectedBankCode = bankCode;
    const expectedAccount = normalizeDigits(bankAccountNumber);
    const expectedPromptPay = normalizeDigits(promptpayId);
    const expectedPromptPay66 = expectedPromptPay.startsWith('0') ? `66${expectedPromptPay.slice(1)}` : expectedPromptPay;

    const receivingBank = normalizeDigits(String(slipData?.receivingBank || ''));
    if (receivingBank) {
      return receivingBank === expectedBankCode
        ? { valid: true, verified: true, matchedBy: 'bank' }
        : { valid: false, verified: true };
    }

    const values = [
      slipData?.receivingAccount,
      slipData?.receivingAccNo,
      slipData?.receiverAccount,
      slipData?.receiverAccNo,
      slipData?.toAccount,
      slipData?.targetAccount,
      slipData?.payeeAccount,
      slipData?.receivingPromptPayId,
      slipData?.receiverPromptPayId,
      slipData?.promptPayId,
      slipData?.proxyId,
      slipData?.payeeProxyId,
      qrData,
    ]
      .filter(Boolean)
      .map((v) => normalizeDigits(String(v)));

    if (values.some((v) => v.includes(expectedAccount))) return { valid: true, verified: true, matchedBy: 'account' };
    if (values.some((v) => v.includes(expectedPromptPay) || v.includes(expectedPromptPay66))) {
      return { valid: true, verified: true, matchedBy: 'promptpay' };
    }

    return { valid: false, verified: false };
  }

  function generateSlipFingerprint(qrData, transRef) {
    return createHash('sha256').update(`${qrData}|${transRef || ''}`).digest('hex');
  }

  async function verifySlip(imageUrl, orderId) {
    const order = await findOrderByOrderId(orderId);

    const imagePath = await downloadImage(imageUrl);
    let convertedPath = imagePath;

    try {
      convertedPath = await convertToJpeg(imagePath);
      const qrData = await readQRFromImage(convertedPath);
      if (!qrData) return { success: false, message: 'ไม่พบ QR Code ในรูปภาพ' };

      const slipData = slipVerify ? slipVerify(qrData) : {};
      if (!slipData?.transRef) {
        return { success: false, message: 'ไม่สามารถอ่านข้อมูลจากสลิปได้' };
      }

      const destinationValidation = validateSlipDestination(slipData, qrData);
      if (!destinationValidation.valid) {
        return { success: false, message: 'ปลายทางการโอนไม่ตรงกับบัญชีร้าน' };
      }

      const duplicate = await orderModel.findOne({
        orderId: { $ne: orderId },
        $or: [
          { transactionId: slipData.transRef },
          { slipFingerprint: generateSlipFingerprint(qrData, slipData.transRef) },
        ],
      }).exec();

      if (duplicate) {
        return { success: false, message: 'สลิปนี้ถูกใช้งานไปแล้ว' };
      }

      const amount = await extractAmountFromImage(imageUrl);
      if (!Number.isFinite(amount) || amount <= 0) {
        return { success: false, message: 'ไม่สามารถอ่านยอดเงินจากสลิปได้' };
      }

      const expectedAmount = Number(order.total || 0);
      const amountMatch = Math.abs(amount - expectedAmount) < 0.01;
      if (!amountMatch) {
        return {
          success: false,
          message: `จำนวนเงินไม่ตรงกับคำสั่งซื้อ (คาดหวัง ${expectedAmount.toFixed(2)} บาท แต่ได้รับ ${amount.toFixed(2)} บาท)`,
        };
      }

      order.transactionId = slipData.transRef;
      order.slipFingerprint = generateSlipFingerprint(qrData, slipData.transRef);
      order.paymentStatus = 'paid';
      order.paidAt = new Date();
      order.slipImageUrl = imageUrl;
      await order.save();

      return {
        success: true,
        message: 'ชำระเงินสำเร็จ',
        data: {
          orderId,
          transRef: slipData.transRef,
          amount: amount.toFixed(2),
          expectedAmount,
        },
      };
    } finally {
      cleanupFile(imagePath);
      if (convertedPath !== imagePath) cleanupFile(convertedPath);
    }
  }

  return {
    generateQRCode,
    checkPaymentStatus,
    confirmPayment,
    cancelPayment,
    verifySlip,
    parseMoneyAmount,
  };
}

module.exports = { createPaymentService };
