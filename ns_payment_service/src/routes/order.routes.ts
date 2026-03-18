import { Request, Response, Router } from 'express';
import { OrderService } from '../services/order.service';
import { OrderPaymentStatus } from '../types/order.types';

const router = Router();
const orderService = new OrderService();

function parsePaymentStatus(val: unknown): OrderPaymentStatus | undefined {
  const allowed: OrderPaymentStatus[] = ['pending', 'paid', 'failed', 'cancelled'];
  if (typeof val !== 'string') return undefined;
  return allowed.includes(val as OrderPaymentStatus)
    ? (val as OrderPaymentStatus)
    : undefined;
}

router.get('/orders', async (req: Request, res: Response) => {
  try {
    const userId = typeof req.query.userId === 'string' ? req.query.userId : undefined;
    const paymentStatus = parsePaymentStatus(req.query.paymentStatus);
    const data = await orderService.list({ userId, paymentStatus });
    res.json({ success: true, count: data.length, data });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to list orders' });
  }
});

router.get('/orders/:id', async (req: Request, res: Response) => {
  try {
    const found = await orderService.findById(req.params.id);
    if (!found) {
      res.status(404).json({ success: false, message: 'Order not found' });
      return;
    }
    res.json({ success: true, data: found });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to get order' });
  }
});

router.get('/orders/number/:orderId', async (req: Request, res: Response) => {
  try {
    const found = await orderService.findByOrderId(req.params.orderId);
    if (!found) {
      res.status(404).json({ success: false, message: 'Order not found' });
      return;
    }
    res.json({ success: true, data: found });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to get order by orderId' });
  }
});

router.post('/orders', async (req: Request, res: Response) => {
  try {
    const body = req.body || {};
    const subtotal = Number(body.subtotal);
    const shippingFee = Number(body.shippingFee || 0);
    const total = body.total !== undefined ? Number(body.total) : subtotal + shippingFee;

    if (!body.customerName || !body.customerPhone || !Array.isArray(body.items)) {
      res.status(400).json({
        success: false,
        message: 'customerName, customerPhone and items are required',
      });
      return;
    }
    if (!Number.isFinite(subtotal) || subtotal < 0) {
      res.status(400).json({ success: false, message: 'subtotal must be a valid number' });
      return;
    }
    if (!Number.isFinite(total) || total < 0) {
      res.status(400).json({ success: false, message: 'total must be a valid number' });
      return;
    }
    if (!['cod', 'promptpay', 'transfer'].includes(String(body.paymentMethod))) {
      res.status(400).json({ success: false, message: 'paymentMethod is invalid' });
      return;
    }

    const created = await orderService.create({
      userId: body.userId,
      customerName: body.customerName,
      customerEmail: body.customerEmail,
      customerPhone: body.customerPhone,
      items: body.items,
      shippingInfo: body.shippingInfo,
      paymentMethod: body.paymentMethod,
      subtotal,
      shippingFee,
      total,
      notes: body.notes,
    });

    res.status(201).json({ success: true, data: created });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to create order' });
  }
});

router.patch('/orders/:orderId/status', async (req: Request, res: Response) => {
  try {
    const status = parsePaymentStatus(req.body?.status);
    if (!status) {
      res.status(400).json({ success: false, message: 'status is invalid' });
      return;
    }
    const updated = await orderService.updatePaymentStatus(req.params.orderId, status);
    if (!updated) {
      res.status(404).json({ success: false, message: 'Order not found' });
      return;
    }
    res.json({ success: true, data: updated });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to update order status' });
  }
});

router.delete('/orders/:id', async (req: Request, res: Response) => {
  try {
    const deleted = await orderService.delete(req.params.id);
    if (!deleted) {
      res.status(404).json({ success: false, message: 'Order not found' });
      return;
    }
    res.json({ success: true, data: deleted });
  } catch {
    res.status(500).json({ success: false, message: 'Failed to delete order' });
  }
});

export default router;
