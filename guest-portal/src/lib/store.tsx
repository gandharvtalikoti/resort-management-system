'use client';

import {
  createContext,
  useContext,
  useCallback,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { CartItem, MenuItem } from './types';

interface CartContextValue {
  items: CartItem[];
  addItem: (menuItem: MenuItem, quantity?: number, notes?: string) => void;
  removeItem: (menuItemId: string) => void;
  updateQuantity: (menuItemId: string, quantity: number) => void;
  updateNotes: (menuItemId: string, notes: string) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  const addItem = useCallback(
    (menuItem: MenuItem, quantity = 1, notes = '') => {
      setItems((prev) => {
        const existing = prev.find((ci) => ci.menuItem.id === menuItem.id);
        if (existing) {
          return prev.map((ci) =>
            ci.menuItem.id === menuItem.id
              ? { ...ci, quantity: ci.quantity + quantity }
              : ci,
          );
        }
        return [...prev, { menuItem, quantity, notes }];
      });
    },
    [],
  );

  const removeItem = useCallback((menuItemId: string) => {
    setItems((prev) => prev.filter((ci) => ci.menuItem.id !== menuItemId));
  }, []);

  const updateQuantity = useCallback((menuItemId: string, quantity: number) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((ci) => ci.menuItem.id !== menuItemId));
      return;
    }
    setItems((prev) =>
      prev.map((ci) =>
        ci.menuItem.id === menuItemId ? { ...ci, quantity } : ci,
      ),
    );
  }, []);

  const updateNotes = useCallback((menuItemId: string, notes: string) => {
    setItems((prev) =>
      prev.map((ci) =>
        ci.menuItem.id === menuItemId ? { ...ci, notes } : ci,
      ),
    );
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  const totalItems = useMemo(
    () => items.reduce((sum, ci) => sum + ci.quantity, 0),
    [items],
  );

  const totalPrice = useMemo(
    () => items.reduce((sum, ci) => sum + ci.menuItem.price * ci.quantity, 0),
    [items],
  );

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      addItem,
      removeItem,
      updateQuantity,
      updateNotes,
      clearCart,
      totalItems,
      totalPrice,
    }),
    [items, addItem, removeItem, updateQuantity, updateNotes, clearCart, totalItems, totalPrice],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
