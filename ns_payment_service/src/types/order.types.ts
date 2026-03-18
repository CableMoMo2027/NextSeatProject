export type OrderPaymentMethod = 'cod' | 'promptpay' | 'transfer';
export type OrderPaymentStatus = 'pending' | 'paid' | 'failed' | 'cancelled';

export interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
  image?: string;
}

export interface ShippingInfo {
  name: string;
  phone: string;
  address: string;
  city: string;
  postalCode: string;
}

export interface OrderRecord {
  id: string;
  orderId: string;
  userId?: string;
  customerName: string;
  customerEmail?: string;
  customerPhone: string;
  items: OrderItem[];
  shippingInfo: ShippingInfo;
  paymentMethod: OrderPaymentMethod;
  paymentStatus: OrderPaymentStatus;
  subtotal: number;
  shippingFee: number;
  total: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrderInput {
  userId?: string;
  customerName: string;
  customerEmail?: string;
  customerPhone: string;
  items: OrderItem[];
  shippingInfo: ShippingInfo;
  paymentMethod: OrderPaymentMethod;
  subtotal: number;
  shippingFee?: number;
  total?: number;
  notes?: string;
}
