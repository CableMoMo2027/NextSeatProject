import { Request, Response, Router } from 'express';
import { readFile } from 'fs/promises';
import { mkdirSync } from 'fs';
import multer from 'multer';
import { extname, join } from 'path';
import orderRoutes from './order.routes';
import { PaymentService } from '../services/payment.service';
import { PaymentStatus } from '../types/payment.types';

const router = Router();
const paymentService = new PaymentService();
const slipsDir = join(process.cwd(), 'slips');
mkdirSync(slipsDir, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, slipsDir),
    filename: (_req, file, cb) => {
      const ext = extname(file.originalname || '').toLowerCase() || '.jpg';
      const token = Math.random().toString(36).slice(2, 8);
      cb(null, `slip_${Date.now()}_${token}${ext}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ok = /^image\/(jpeg|jpg|png|gif|webp)$/i.test(file.mimetype || '');
    if (!ok) {
      cb(new Error('Unsupported file type'));
      return;
    }
    cb(null, true);
  },
});

const uploadSlipFields = upload.fields([
  { name: 'slip', maxCount: 1 },
  { name: 'file', maxCount: 1 },
]);

function getUploadedSlip(req: Request): Express.Multer.File | null {
  const files = req.files as
    | { [fieldname: string]: Express.Multer.File[] }
    | undefined;

  if (!files) return null;
  return files.slip?.[0] || files.file?.[0] || null;
}

function parseStatus(val: unknown): PaymentStatus | undefined {
  const allowed: PaymentStatus[] = [
    'requires_payment_method',
    'requires_confirmation',
    'succeeded',
    'failed',
    'refunded',
  ];
  if (typeof val !== 'string') return undefined;
  return allowed.includes(val as PaymentStatus) ? (val as PaymentStatus) : undefined;
}

router.get('/payments', async (req: Request, res: Response) => {
  try {
    const bookingId = typeof req.query.bookingId === 'string' ? req.query.bookingId : undefined;
    const status = parseStatus(req.query.status);
    const data = await paymentService.list({ bookingId, status });
    res.json({ success: true, count: data.length, data });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to list payments' });
  }
});

router.get('/payments/:id', async (req: Request, res: Response) => {
  try {
    const found = await paymentService.findById(req.params.id);
    if (!found) {
      res.status(404).json({ success: false, message: 'Payment not found' });
      return;
    }
    res.json({ success: true, data: found });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to get payment' });
  }
});

router.post('/payments/intent', async (req: Request, res: Response) => {
  try {
    const bookingId = String(req.body?.bookingId || '').trim();
    const amount = Number(req.body?.amount);
    if (!bookingId) {
      res.status(400).json({ success: false, message: 'bookingId is required' });
      return;
    }
    if (!Number.isFinite(amount)) {
      res.status(400).json({ success: false, message: 'amount must be a number' });
      return;
    }
    if (amount <= 0) {
      res.status(400).json({ success: false, message: 'amount must be greater than 0' });
      return;
    }

    const created = await paymentService.createIntent({
      bookingId,
      amount,
      currency: req.body?.currency,
      method: req.body?.method,
      metadata: req.body?.metadata,
    });
    res.status(201).json({ success: true, data: created });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to create payment intent' });
  }
});

router.post('/payments/generate-qr', async (req: Request, res: Response) => {
  try {
    const orderId = String(req.body?.orderId || '').trim();
    const amount = Number(req.body?.amount);
    if (!orderId) {
      res.status(400).json({ success: false, message: 'orderId is required' });
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      res.status(400).json({ success: false, message: 'amount must be a number greater than 0' });
      return;
    }

    const result = await paymentService.generateQRCode(orderId, amount);
    res.json({ success: true, data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate QR';
    const statusCode = message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({ success: false, message });
  }
});

router.post('/payments/generate-bill-qr', async (req: Request, res: Response) => {
  try {
    const orderId = String(req.body?.orderId || '').trim();
    const amount = Number(req.body?.amount);
    if (!orderId) {
      res.status(400).json({ success: false, message: 'orderId is required' });
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      res.status(400).json({ success: false, message: 'amount must be a number greater than 0' });
      return;
    }

    const result = await paymentService.generateBillPaymentQR(orderId, amount);
    res.json({ success: true, data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to generate bill QR';
    const statusCode = message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({ success: false, message });
  }
});

router.get('/payments/status/:orderId', async (req: Request, res: Response) => {
  try {
    const result = await paymentService.checkPaymentStatus(req.params.orderId);
    res.json({ success: true, data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to get payment status';
    const statusCode = message.includes('not found') ? 404 : 500;
    res.status(statusCode).json({ success: false, message });
  }
});

router.post('/payments/confirm', async (req: Request, res: Response) => {
  try {
    const orderId = String(req.body?.orderId || '').trim();
    const transactionId = String(req.body?.transactionId || '').trim();

    if (!orderId || !transactionId) {
      res.status(400).json({
        success: false,
        message: 'orderId and transactionId are required',
      });
      return;
    }

    const updated = await paymentService.confirmOrderPayment(orderId, transactionId);
    res.json({
      success: true,
      message: 'Payment confirmed successfully',
      data: updated,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to confirm payment';
    const statusCode = message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({ success: false, message });
  }
});

router.post('/payments/cancel/:orderId', async (req: Request, res: Response) => {
  try {
    const updated = await paymentService.cancelOrderPayment(req.params.orderId);
    res.json({
      success: true,
      message: 'Payment cancelled',
      data: updated,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to cancel payment';
    const statusCode = message.includes('not found') ? 404 : 400;
    res.status(statusCode).json({ success: false, message });
  }
});

router.post('/payments/verify-slip-upload', uploadSlipFields, async (req: Request, res: Response) => {
  try {
    const orderId = String(req.body?.orderId || '').trim();
    if (!orderId) {
      res.status(400).json({ success: false, message: 'orderId is required' });
      return;
    }
    const uploadedSlip = getUploadedSlip(req);
    if (!uploadedSlip) {
      res.status(400).json({ success: false, message: 'slip file is required' });
      return;
    }

    const fileUrl = `/slips/${uploadedSlip.filename}`;
    const fileBuffer = await readFile(uploadedSlip.path);
    const result = await paymentService.verifySlipFromImage(orderId, fileBuffer, fileUrl);
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to verify slip';
    res.status(500).json({ success: false, message });
  }
});

router.post('/payments/verify-slip', uploadSlipFields, async (req: Request, res: Response) => {
  try {
    const orderId = String(req.body?.orderId || '').trim();
    if (!orderId) {
      res.status(400).json({ success: false, message: 'orderId is required' });
      return;
    }

    const uploadedSlip = getUploadedSlip(req);
    if (uploadedSlip?.path) {
      const fileUrl = `/slips/${uploadedSlip.filename}`;
      const fileBuffer = await readFile(uploadedSlip.path);
      const result = await paymentService.verifySlipFromImage(orderId, fileBuffer, fileUrl);
      res.json(result);
      return;
    }

    const imageUrl = String(req.body?.imageUrl || '').trim();
    if (!imageUrl) {
      res.status(400).json({ success: false, message: 'slip file or imageUrl is required' });
      return;
    }

    const result = await paymentService.verifySlipFromImageUrl(orderId, imageUrl);
    res.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to verify slip';
    res.status(500).json({ success: false, message });
  }
});

router.use(orderRoutes);

router.post('/payments/:id/confirm', async (req: Request, res: Response) => {
  try {
    const confirmed = await paymentService.confirm(req.params.id);
    if (!confirmed) {
      res.status(404).json({ success: false, message: 'Payment not found' });
      return;
    }
    res.json({ success: true, data: confirmed });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to confirm payment' });
  }
});

router.post('/payments/:id/refund', async (req: Request, res: Response) => {
  try {
    const refunded = await paymentService.refund(req.params.id);
    if (!refunded) {
      res.status(404).json({ success: false, message: 'Payment not found' });
      return;
    }
    res.json({ success: true, data: refunded });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to refund payment' });
  }
});

export default router;
