
import React, { createContext, useContext, useState, useEffect } from 'react';
import { CartItem } from './CartContext';
import { OrderStatus } from '../types';
import { orderAPI } from '../services/api';
import { useAuth } from './AuthContext';

// Extended Item interface for Orders to track status per item
export interface OrderItem extends CartItem {
  status: OrderStatus;
}

export interface Order {
  id: string;
  userId: string; // Track who placed the order
  userName: string;
  date: string;
  items: OrderItem[];
  total: number;
  // Order level status (derived or general)
  status: OrderStatus;
}

interface OrderContextType {
  orders: Order[];
  addOrder: (items: CartItem[], total: number, userId: string, userName: string) => Promise<Order>;
  updateOrderStatus: (orderId: string, status: OrderStatus) => void; // Legacy/Global
  updateOrderItemStatus: (orderId: string, itemId: string, status: OrderStatus) => Promise<void>;
}

const OrderContext = createContext<OrderContextType>({
  orders: [],
  addOrder: async () => { throw new Error('Order provider is unavailable.'); },
  updateOrderStatus: () => { },
  updateOrderItemStatus: async () => { },
});

const unwrapOrder = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== 'object') return {};
  const record = value as Record<string, unknown>;
  if (record.order && typeof record.order === 'object') return record.order as Record<string, unknown>;
  if (record.data && typeof record.data === 'object') return record.data as Record<string, unknown>;
  return record;
};

const normalizeOrder = (value: unknown, fallback?: Partial<Order>): Order => {
  const record = unwrapOrder(value);
  const rawItems = Array.isArray(record.items) ? record.items : fallback?.items ?? [];
  const items = rawItems.map((rawItem, index) => {
    const item = rawItem && typeof rawItem === 'object' ? rawItem as Record<string, unknown> : {};
    const fallbackItem = fallback?.items?.[index];
    return {
      ...fallbackItem,
      ...item,
      id: String(item.id ?? item._id ?? fallbackItem?.id ?? `${Date.now()}-${index}`),
      product: (item.product && typeof item.product === 'object' ? item.product : fallbackItem?.product) as CartItem['product'],
      status: (item.status as OrderStatus | undefined) ?? fallbackItem?.status ?? 'Pending Approval',
    } as OrderItem;
  });

  return {
    id: String(record.id ?? record._id ?? fallback?.id ?? `ORD-${Date.now()}`),
    userId: String(record.userId ?? fallback?.userId ?? ''),
    userName: String(record.userName ?? fallback?.userName ?? ''),
    date: String(record.date ?? fallback?.date ?? new Date().toLocaleDateString()),
    items,
    total: Number(record.total ?? fallback?.total ?? 0),
    status: (record.status as OrderStatus | undefined) ?? fallback?.status ?? 'Processing',
  };
};

export const useOrders = () => useContext(OrderContext);

export const OrderProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    const storedOrders = localStorage.getItem('stylus_order_history');
    if (storedOrders) {
      try {
        setOrders(JSON.parse(storedOrders));
      } catch (e) {
        console.error("Failed to parse order history", e);
      }
    }

  }, []);

  useEffect(() => {
    if (!currentUser) return;

    let cancelled = false;
    orderAPI.getAll()
      .then(response => {
        const envelope = response && typeof response === 'object'
          ? response as Record<string, unknown>
          : {};
        const data = envelope.data && typeof envelope.data === 'object'
          ? envelope.data as Record<string, unknown>
          : {};
        const rows = Array.isArray(response)
          ? response
          : Array.isArray(envelope.orders)
            ? envelope.orders
            : Array.isArray(envelope.data)
              ? envelope.data
              : Array.isArray(data.orders)
                ? data.orders
                : [];
        if (!cancelled) setOrders(rows.map(order => normalizeOrder(order)));
      })
      .catch(error => console.error('Failed to load orders.', error));

    return () => {
      cancelled = true;
    };
  }, [currentUser?.id]);

  useEffect(() => {
    localStorage.setItem('stylus_order_history', JSON.stringify(orders));
  }, [orders]);

  const addOrder = async (items: CartItem[], total: number, userId: string, userName: string) => {
    const date = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const fallbackOrder: Order = {
      id: `ORD-${Date.now().toString().slice(-6)}`,
      userId,
      userName,
      date,
      items: items.map(item => ({ ...item, status: 'Pending Approval' })),
      total,
      status: 'Processing',
    };
    const response = await orderAPI.create({
      userId: Number(userId),
      userName,
      date,
      total,
      status: 'Processing',
      items: items.map(item => ({
        productId: item.product.id,
        selectedSize: item.selectedSize,
        type: item.type,
        duration: item.duration,
        startDate: item.startDate,
        endDate: item.endDate,
        price: item.price,
        status: 'Pending Approval',
      })),
    });
    const createdOrder = normalizeOrder(response, fallbackOrder);
    setOrders(previous => [createdOrder, ...previous]);
    return createdOrder;
  };

  const updateOrderStatus = (orderId: string, status: OrderStatus) => {
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
  };

  const updateOrderItemStatus = async (orderId: string, itemId: string, status: OrderStatus) => {
    await orderAPI.updateItemStatus(orderId, itemId, status);
    setOrders(prev => prev.map(order => {
      if (order.id !== orderId) return order;

      // Update the specific item
      const updatedItems = order.items.map(item =>
        item.id === itemId ? { ...item, status } : item
      );

      // Optional: Check if all items are handled to update main order status
      const allComplete = updatedItems.every(i => ['Accepted', 'Shipped', 'Completed', 'Returned', 'Cancelled', 'Rejected'].includes(i.status));

      return {
        ...order,
        items: updatedItems,
        status: allComplete ? 'Completed' : order.status
      };
    }));
  };

  return (
    <OrderContext.Provider value={{ orders, addOrder, updateOrderStatus, updateOrderItemStatus }}>
      {children}
    </OrderContext.Provider>
  );
};
