import { Controller, Get, Post, Put, Patch, Delete, Param, Body, Query } from '@nestjs/common';
import { OrderService } from './order.service';
import { Order } from './order.schema';

// DTO for creating order
interface CreateOrderDto {
    userId?: string;
    customerName: string;
    customerEmail?: string;
    customerPhone: string;
    items: {
        productId: string;
        name: string;
        price: number;
        quantity: number;
        image?: string;
    }[];
    shippingInfo: {
        name: string;
        phone: string;
        address: string;
        city: string;
        postalCode: string;
    };
    paymentMethod: 'cod' | 'promptpay' | 'transfer';
    subtotal: number;
    shippingFee: number;
    total: number;
    notes?: string;
}

@Controller('order')
export class OrderController {
    constructor(private readonly orderService: OrderService) { }

    // Create new order
    @Post()
    async createOrder(@Body() createOrderDto: CreateOrderDto): Promise<Order> {
        return this.orderService.create(createOrderDto);
    }

    // Get all orders
    @Get()
    async getAllOrders(): Promise<Order[]> {
        return this.orderService.findAll();
    }

    // Get order by MongoDB ID
    @Get(':id')
    async getOrderById(@Param('id') id: string): Promise<Order | null> {
        return this.orderService.findById(id);
    }

    // Get order by orderId (e.g., MO-XXX-XXX)
    @Get('number/:orderId')
    async getOrderByOrderId(@Param('orderId') orderId: string): Promise<Order | null> {
        return this.orderService.findByOrderId(orderId);
    }

    // Get orders by user
    @Get('user/:userId')
    async getOrdersByUser(@Param('userId') userId: string): Promise<Order[]> {
        return this.orderService.findByUserId(userId);
    }

    // Update order
    @Put(':id')
    async updateOrder(
        @Param('id') id: string,
        @Body() updateData: Partial<Order>
    ): Promise<Order | null> {
        return this.orderService.update(id, updateData);
    }

    // Update payment status
    @Patch(':orderId/status')
    async updatePaymentStatus(
        @Param('orderId') orderId: string,
        @Body('status') status: string
    ): Promise<Order | null> {
        return this.orderService.updatePaymentStatus(orderId, status);
    }

    // Delete order
    @Delete(':id')
    async deleteOrder(@Param('id') id: string): Promise<Order | null> {
        return this.orderService.delete(id);
    }
}
