import React, { createContext, useContext, useState, useEffect } from 'react';
import { CartItem, Product, ProductVariation, ProductFlavor, SelectedExtra, DeliveryType } from '../types/store';
import { getStoreSettings } from '../services/storeService';

interface CartContextType {
  items: CartItem[];
  addItem: (
    product: Product,
    selectedSize?: ProductVariation,
    selectedFlavor?: ProductFlavor,
    selectedExtras?: SelectedExtra[],
    notes?: string,
    quantity?: number
  ) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, newQuantity: number) => void;
  clearCart: () => void;
  totalCount: number;
  subtotal: number;
  deliveryFee: number;
  total: (deliveryType: DeliveryType) => number;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  isCheckoutOpen: boolean;
  setIsCheckoutOpen: (open: boolean) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = 'sabor_no_pote_cart_items_v1';

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [deliveryFee, setDeliveryFee] = useState<number>(() => getStoreSettings().deliveryFee);

  // Sync with store settings changes
  useEffect(() => {
    const handleSettingsUpdate = () => {
      setDeliveryFee(getStoreSettings().deliveryFee);
    };
    window.addEventListener('store_settings_updated', handleSettingsUpdate);
    return () => window.removeEventListener('store_settings_updated', handleSettingsUpdate);
  }, []);

  // Save cart items to local storage
  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
    } catch {
      // storage unavailable or full
    }
  }, [items]);

  const addItem = (
    product: Product,
    selectedSize?: ProductVariation,
    selectedFlavor?: ProductFlavor,
    selectedExtras: SelectedExtra[] = [],
    notes: string = '',
    quantity: number = 1
  ) => {
    // Calculate unit price: product.basePrice + size differential + extras
    const sizePriceDiff = selectedSize ? selectedSize.price : 0;
    const extrasTotal = selectedExtras.reduce(
      (sum, item) => sum + item.extra.price * item.quantity,
      0
    );
    const unitPrice = product.basePrice + sizePriceDiff + extrasTotal;
    const totalPrice = unitPrice * quantity;

    // Unique ID for item configuration
    const instanceId = `${product.id}-${selectedSize?.id || 'default'}-${selectedFlavor?.id || 'none'}-${Date.now()}`;

    const newItem: CartItem = {
      id: instanceId,
      productId: product.id,
      productName: product.name,
      productImage: product.imageUrl,
      selectedSize,
      selectedFlavor,
      selectedExtras,
      notes: notes.trim(),
      quantity,
      unitPrice,
      totalPrice,
    };

    setItems((prev) => [...prev, newItem]);
    setIsCartOpen(true);
  };

  const removeItem = (itemId: string) => {
    setItems((prev) => prev.filter((item) => item.id !== itemId));
  };

  const updateQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeItem(itemId);
      return;
    }
    setItems((prev) =>
      prev.map((item) => {
        if (item.id === itemId) {
          return {
            ...item,
            quantity: newQuantity,
            totalPrice: item.unitPrice * newQuantity,
          };
        }
        return item;
      })
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  const totalCount = items.reduce((sum, item) => sum + item.quantity, 0);

  const subtotal = items.reduce((sum, item) => sum + item.totalPrice, 0);

  const total = (deliveryType: DeliveryType) => {
    return subtotal + (deliveryType === 'delivery' ? deliveryFee : 0);
  };

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        totalCount,
        subtotal,
        deliveryFee,
        total,
        isCartOpen,
        setIsCartOpen,
        isCheckoutOpen,
        setIsCheckoutOpen,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
