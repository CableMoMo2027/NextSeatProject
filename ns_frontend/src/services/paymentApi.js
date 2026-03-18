import axios from 'axios';
import { PAYMENT_API_BASE } from '../config/runtime';

const API_BASE = PAYMENT_API_BASE;

const getAxiosMessage = (error, fallback) => {
  if (error?.message === 'Network Error') {
    return `Network Error calling ${API_BASE || '(same-origin)'}/internal/...`;
  }
  const message = error?.response?.data?.message
    || error?.response?.data?.error
    || error?.message;
  return String(message || fallback);
};

const post = async (path, payload, config = {}) => {
  try {
    const res = await axios.post(`${API_BASE}${path}`, payload, config);
    return { success: true, data: res?.data };
  } catch (error) {
    return {
      success: false,
      message: getAxiosMessage(error, `Unable to call payment API at ${path}`),
    };
  }
};

export const paymentApi = {
  async createOrder(payload) {
    const result = await post('/internal/orders', payload || {});
    if (!result.success) {
      return { success: false, message: result.message || 'Unable to create order' };
    }
    return result.data || { success: false, message: 'Invalid response' };
  },

  async generateQR(orderId, amount) {
    const numericAmount = Number(amount || 0);
    const normalizedAmount = Number.isFinite(numericAmount) ? Number(numericAmount.toFixed(2)) : 0;
    const result = await post('/internal/payments/generate-qr', {
      orderId: String(orderId || '').trim(),
      amount: normalizedAmount,
    });
    if (!result.success) {
      return { success: false, message: result.message || 'Unable to generate QR' };
    }
    return result.data || { success: false, message: 'Invalid response' };
  },

  async verifySlip(orderId, file) {
    const cleanOrderId = String(orderId || '').trim();
    const internalFormData = new FormData();
    internalFormData.append('orderId', cleanOrderId);
    internalFormData.append('file', file);

    const result = await post('/internal/payments/verify-slip', internalFormData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    if (!result.success) {
      return { success: false, message: result.message || 'Unable to verify slip' };
    }
    return result.data || { success: false, message: 'Invalid response' };
  },
};

export default paymentApi;
