export interface Category {
  id: string;
  name: string;
  description?: string;
  displayOrder: number;
  active: boolean;
}

export interface ProductVariation {
  id: string;
  name: string;
  price: number;
  description?: string;
}

export interface ProductFlavor {
  id: string;
  name: string;
  available: boolean;
}

export interface ProductExtra {
  id: string;
  name: string;
  price: number;
  available: boolean;
  maxQuantity?: number;
}

export interface Product {
  id: string;
  categoryId: string;
  name: string;
  description: string;
  basePrice: number;
  imageUrl?: string;
  available: boolean;
  sizes?: ProductVariation[];
  flavors?: ProductFlavor[];
  extras?: ProductExtra[];
  tags?: string[];
}

export interface SelectedExtra {
  extra: ProductExtra;
  quantity: number;
}

export interface CartItem {
  id: string; // unique item instance id
  productId: string;
  productName: string;
  productImage?: string;
  selectedSize?: ProductVariation;
  selectedFlavor?: ProductFlavor;
  selectedExtras: SelectedExtra[];
  notes?: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export type DeliveryType = 'delivery' | 'pickup';

export interface DeliveryAddress {
  cep: string;
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  referencePoint?: string;
}

export type PaymentMethod = 'pix' | 'money' | 'debit' | 'credit';

export interface CustomerData {
  name: string;
  phone: string;
}

export interface OrderCheckout {
  customer: CustomerData;
  deliveryType: DeliveryType;
  address?: DeliveryAddress;
  paymentMethod: PaymentMethod;
  needsCashChange?: boolean;
  cashChangeFor?: string;
  orderNotes?: string;
}

export interface StoreSettings {
  storeName: string;
  whatsappNumber: string | null; // e.g. "5511999999999" (empty initially per spec)
  instagramHandle: string | null;
  openingHours: string | null;
  address: string | null;
  deliveryFee: number;
  isDeliveryAvailable: boolean;
  isPickupAvailable: boolean;
}

export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'ready' | 'delivered' | 'cancelled';

export interface OrderItemRecord {
  id?: string;
  productName: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  configuration?: {
    size?: string;
    flavor?: string;
    extras?: string[];
    notes?: string;
  };
}

export interface OrderRecord {
  id: string;
  customerName: string;
  customerPhone: string;
  deliveryType: DeliveryType;
  addressData?: DeliveryAddress | null;
  paymentMethod: PaymentMethod;
  needsCashChange?: boolean;
  cashChangeFor?: number | null;
  subtotal: number;
  deliveryFee: number;
  totalPrice: number;
  status: OrderStatus;
  orderNotes?: string | null;
  createdAt: string;
  updatedAt: string;
  items?: OrderItemRecord[];
}
