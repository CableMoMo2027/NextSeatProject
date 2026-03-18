const express = require('express');
const multer = require('multer');
const path = require('path');
const { createPaymentService } = require('./payment.service');

const upload = multer({
  storage: multer.diskStorage({
    destination: './uploads/slips',
    filename: (req, file, cb) => {
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      cb(null, `slip-${uniqueSuffix}${path.extname(file.originalname)}`);
    },
  }),
  fileFilter: (req, file, cb) => {
    if (!file.mimetype.match(/\/(jpg|jpeg|png|webp)$/)) {
      return cb(new Error('Only image files are allowed')); 
    }
    cb(null, true);
  },
  limits: { fileSize: 5 * 1024 * 1024 },
});

function createPaymentRouter({ orderModel }) {
  const router = express.Router();
  const paymentService = createPaymentService({ orderModel });

  router.post('/generate-qr', async (req, res) => {
    try {
      const amount = Number(req.body.amount);
      const data = await paymentService.generateQRCode(req.body.orderId, amount);
      return res.status(200).json({ success: true, data });
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }
  });

  router.get('/status/:orderId', async (req, res) => {
    try {
      const data = await paymentService.checkPaymentStatus(req.params.orderId);
      return res.status(200).json({ success: true, data });
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }
  });

  router.post('/confirm', async (req, res) => {
    try {
      const data = await paymentService.confirmPayment(req.body.orderId, req.body.transactionId);
      return res.status(200).json({ success: true, message: 'Payment confirmed successfully', data });
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }
  });

  router.post('/cancel/:orderId', async (req, res) => {
    try {
      const data = await paymentService.cancelPayment(req.params.orderId);
      return res.status(200).json({ success: true, message: 'Payment cancelled', data });
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }
  });

  router.post('/verify-slip-upload', upload.single('slip'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'No file uploaded' });
      }

      const baseUrl = process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`;
      const imageUrl = `${baseUrl}/uploads/slips/${req.file.filename}`;
      const data = await paymentService.verifySlip(imageUrl, req.body.orderId);
      return res.status(200).json(data);
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }
  });

  router.post('/verify-slip', async (req, res) => {
    try {
      const data = await paymentService.verifySlip(req.body.imageUrl, req.body.orderId);
      return res.status(200).json(data);
    } catch (error) {
      return res.status(400).json({ success: false, message: error.message });
    }
  });

  return router;
}

module.exports = { createPaymentRouter };
