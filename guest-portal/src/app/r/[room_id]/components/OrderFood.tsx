'use client';

import { useState, useMemo, useEffect } from 'react';
import { useCart } from '@/lib/store';
import { postOrder, getMenuItems, cancelOrder } from '@/lib/api';
import type { MenuItem, Order } from '@/lib/types';

interface OrderFoodProps {
  roomId: string;
  onClose: () => void;
}

export default function OrderFood({ roomId }: OrderFoodProps) {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<{key: string, label: string, emoji: string}[]>([]);
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [itemQuantities, setItemQuantities] = useState<Record<string, number>>({});
  const [itemNotes, setItemNotes] = useState<Record<string, string>>({});
  const [cartOpen, setCartOpen] = useState(false);
  const [orderStatus, setOrderStatus] = useState<'idle' | 'placing' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  
  const [lastOrder, setLastOrder] = useState<Order | null>(null);
  const [undoTimer, setUndoTimer] = useState(0);

  const { items, addItem, removeItem, updateQuantity, updateNotes, clearCart, totalItems, totalPrice } = useCart();

  useEffect(() => {
    getMenuItems().then(items => {
      // only show available items
      const availableItems = items.filter(item => item.is_available);
      setMenuItems(availableItems);
      
      const uniqueCats = Array.from(new Set(availableItems.map(item => item.category)));
      const catList = uniqueCats.map(cat => ({
        key: cat,
        label: cat,
        emoji: cat === 'Drinks' ? '🍹' : cat === 'Momos' ? '🥟' : cat === 'Soups' ? '🍲' : cat === 'Dessert' ? '🍨' : '🍛'
      }));
      setCategories(catList);
      if (catList.length > 0) {
        setActiveCategory(catList[0].key);
      }
    });
  }, []);

  const filteredItems = useMemo(
    () => menuItems.filter((mi) => mi.category === activeCategory),
    [menuItems, activeCategory],
  );

  useEffect(() => {
    if (undoTimer > 0) {
      const timer = setTimeout(() => setUndoTimer(undoTimer - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setLastOrder(null);
    }
  }, [undoTimer]);

  const handleUndoOrder = async () => {
    if (!lastOrder) return;
    try {
      await cancelOrder(lastOrder.id);
      setUndoTimer(0);
      setLastOrder(null);
      alert('Order cancelled successfully.');
    } catch (err) {
      alert('Failed to cancel order.');
    }
  };

  function handleExpand(itemId: string) {
    setExpandedItem(expandedItem === itemId ? null : itemId);
    if (!itemQuantities[itemId]) {
      setItemQuantities((prev) => ({ ...prev, [itemId]: 1 }));
    }
  }

  function handleAddToCart(menuItem: MenuItem) {
    const qty = itemQuantities[menuItem.id] || 1;
    const notes = itemNotes[menuItem.id] || '';
    addItem(menuItem, qty, notes);
    setExpandedItem(null);
    setItemQuantities((prev) => ({ ...prev, [menuItem.id]: 1 }));
    setItemNotes((prev) => ({ ...prev, [menuItem.id]: '' }));
  }

  async function handlePlaceOrder() {
    if (items.length === 0) return;
    setOrderStatus('placing');
    setErrorMessage('');

    try {
      const orderItems = items.map((ci) => ({
        menu_item_id: ci.menuItem.id,
        name: ci.menuItem.name,
        quantity: ci.quantity,
        price: ci.menuItem.price,
        notes: ci.notes || undefined,
      }));

      const order = await postOrder(roomId, orderItems);
      setOrderStatus('success');
      clearCart();
      setCartOpen(false);
      setLastOrder(order);
      setUndoTimer(20);

      setTimeout(() => setOrderStatus('idle'), 3000);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to place order');
      setOrderStatus('error');
      setTimeout(() => setOrderStatus('idle'), 4000);
    }
  }

  /* ── Success overlay ─── */
  if (orderStatus === 'success') {
    return (
      <div className="glass-panel rounded-3xl p-8 text-center animate-fade-in">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-emerald-50 flex items-center justify-center">
          <svg className="w-8 h-8 text-emerald-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
            <path className="animate-check-draw" strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="font-display text-xl text-foreground mb-1">Order Placed!</h2>
        <p className="text-sm text-foreground-muted">Your order is being prepared with care.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* ── Notice ──────────────────────────────────────────── */}
      <div className="bg-surface border border-surface p-4 rounded-2xl text-center text-foreground text-sm font-medium leading-relaxed">
        Please make your way to the Cafe, have a seat in the lounge area and order food.
      </div>

      {/* ── Category Tabs ───────────────────────────────────── */}
      <div className="flex gap-2 overflow-x-auto hide-scrollbar pb-1">
        {categories.map((cat) => (
          <button
            key={cat.key}
            onClick={() => {
              setActiveCategory(cat.key);
              setExpandedItem(null);
            }}
            className={`
              flex-shrink-0 px-4 py-2 rounded-2xl text-sm font-medium transition-all duration-300
              ${
                activeCategory === cat.key
                  ? 'bg-foreground text-background shadow-lg shadow-foreground/10'
                  : 'bg-background-alt text-foreground-muted hover:bg-surface'
              }
            `}
          >
            <span className="mr-1.5">{cat.emoji}</span>
            {cat.label}
          </button>
        ))}
      </div>

      {/* ── Menu Grid ───────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        {filteredItems.map((item) => {
          const isExpanded = expandedItem === item.id;
          const qty = itemQuantities[item.id] || 1;
          const note = itemNotes[item.id] || '';

          return (
            <div
              key={item.id}
              className={`
                glass-panel rounded-2xl overflow-hidden transition-all duration-300
                ${isExpanded ? 'col-span-2' : ''}
              `}
            >
              <button
                onClick={() => handleExpand(item.id)}
                className="w-full p-4 text-left"
              >
                <span className="text-xs font-bold block mb-2">{item.is_veg ? '🟩 Veg' : '🟥 Non-Veg'}</span>
                <h3 className="font-display text-sm text-foreground leading-tight">
                  {item.name}
                </h3>
                <p className="text-[11px] text-foreground-muted mt-1 line-clamp-2 leading-relaxed">
                  {item.description}
                </p>
                <p className="text-sm font-semibold text-gold mt-2">
                  ₹{item.price}
                </p>
              </button>

              {/* Expanded Detail */}
              {isExpanded && (
                <div className="px-4 pb-4 pt-0 border-t border-border animate-slide-up">
                  {/* Quantity */}
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-xs text-foreground-muted">Quantity</span>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setItemQuantities((prev) => ({
                            ...prev,
                            [item.id]: Math.max(1, qty - 1),
                          }));
                        }}
                        className="w-8 h-8 rounded-full bg-surface text-foreground flex items-center justify-center text-lg font-medium hover:bg-surface-hover transition-colors"
                      >
                        −
                      </button>
                      <span className="text-lg font-display w-6 text-center tabular-nums">
                        {qty}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setItemQuantities((prev) => ({
                            ...prev,
                            [item.id]: qty + 1,
                          }));
                        }}
                        className="w-8 h-8 rounded-full bg-surface text-foreground flex items-center justify-center text-lg font-medium hover:bg-surface-hover transition-colors"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Notes */}
                  <textarea
                    value={note}
                    onChange={(e) =>
                      setItemNotes((prev) => ({ ...prev, [item.id]: e.target.value }))
                    }
                    placeholder="Special requests…"
                    rows={2}
                    className="w-full mt-3 px-3 py-2 bg-background-alt border border-surface rounded-xl text-xs text-foreground placeholder:text-foreground-muted/40 resize-none focus:outline-none focus:ring-1 focus:ring-gold/40"
                  />

                  {/* Add to Cart */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleAddToCart(item);
                    }}
                    className="w-full mt-3 py-2.5 rounded-xl bg-gold text-background text-sm font-medium hover:bg-gold-dark transition-colors duration-300 active:scale-[0.97]"
                  >
                    Add to Cart · ₹{item.price * qty}
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── Error Toast ─────────────────────────────────────── */}
      {orderStatus === 'error' && (
        <div className="fixed top-4 left-4 right-4 max-w-lg mx-auto z-50 toast-enter">
          <div className="glass-panel-heavy rounded-2xl p-4 border-red-500/50 border">
            <p className="text-sm text-foreground">{errorMessage}</p>
          </div>
        </div>
      )}

      {/* ── Floating Cart Bar ───────────────────────────────── */}
      {totalItems > 0 && !cartOpen && (
        <div className="fixed bottom-0 left-0 right-0 p-4 z-40 animate-slide-up">
          <button
            onClick={() => setCartOpen(true)}
            className="w-full max-w-lg mx-auto flex items-center justify-between py-3.5 px-5 rounded-2xl bg-foreground text-background shadow-xl shadow-foreground/20 active:scale-[0.98] transition-transform"
          >
            <div className="flex items-center gap-2">
              <span className="bg-gold text-background text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center">
                {totalItems}
              </span>
              <span className="text-sm">View Cart</span>
            </div>
            <span className="font-display text-lg">₹{totalPrice.toFixed(2)}</span>
          </button>
        </div>
      )}

      {/* ── Cart Drawer ─────────────────────────────────────── */}
      {cartOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-foreground/30 z-40 animate-fade-in"
            onClick={() => setCartOpen(false)}
          />

          {/* Drawer */}
          <div className="fixed bottom-0 left-0 right-0 z-50 animate-slide-up">
            <div className="glass-panel-heavy rounded-t-3xl max-w-lg mx-auto max-h-[80vh] flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between p-5 border-b border-border">
                <h2 className="font-display text-lg text-foreground">Your Cart</h2>
                <button
                  onClick={() => setCartOpen(false)}
                  className="text-foreground-muted hover:text-foreground transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Items */}
              <div className="overflow-y-auto flex-1 p-5 space-y-4">
                {items.map((ci) => (
                  <div key={ci.menuItem.id} className="flex gap-3">
                    <span className="text-2xl flex-shrink-0">{ci.menuItem.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <h3 className="text-sm font-medium text-foreground truncate">
                          {ci.menuItem.name}
                        </h3>
                        <button
                          onClick={() => removeItem(ci.menuItem.id)}
                          className="text-foreground-muted/50 hover:text-red-500 ml-2 transition-colors flex-shrink-0"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>

                      {/* Quantity adjuster */}
                      <div className="flex items-center gap-2 mt-2">
                        <button
                          onClick={() => updateQuantity(ci.menuItem.id, ci.quantity - 1)}
                          className="w-7 h-7 rounded-full bg-surface text-foreground flex items-center justify-center text-sm hover:bg-surface-hover transition-colors"
                        >
                          −
                        </button>
                        <span className="text-sm font-medium w-5 text-center tabular-nums">
                          {ci.quantity}
                        </span>
                        <button
                          onClick={() => updateQuantity(ci.menuItem.id, ci.quantity + 1)}
                          className="w-7 h-7 rounded-full bg-surface text-foreground flex items-center justify-center text-sm hover:bg-surface-hover transition-colors"
                        >
                          +
                        </button>
                        <span className="ml-auto text-sm font-semibold text-gold tabular-nums">
                          ₹{(ci.menuItem.price * ci.quantity).toFixed(2)}
                        </span>
                      </div>

                      {/* Notes editing */}
                      <input
                        type="text"
                        value={ci.notes}
                        onChange={(e) => updateNotes(ci.menuItem.id, e.target.value)}
                        placeholder="Add a note…"
                        className="w-full mt-2 px-2.5 py-1.5 bg-background-alt border border-surface rounded-lg text-[11px] text-foreground placeholder:text-foreground-muted/30 focus:outline-none focus:ring-1 focus:ring-gold/30"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Footer */}
              <div className="p-5 border-t border-border space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-foreground-muted">Total</span>
                  <span className="text-xl font-display text-foreground">₹{totalPrice.toFixed(2)}</span>
                </div>
                <button
                  onClick={handlePlaceOrder}
                  disabled={orderStatus === 'placing'}
                  className="w-full py-3.5 rounded-2xl bg-gold text-background font-medium text-sm hover:bg-gold-dark transition-all duration-300 active:scale-[0.97] disabled:opacity-60"
                >
                  {orderStatus === 'placing' ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Placing Order…
                    </span>
                  ) : (
                    'Place Order'
                  )}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Undo Toast */}
      {undoTimer > 0 && lastOrder && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-fade-in">
          <div className="bg-foreground text-background px-4 py-3 rounded-2xl shadow-xl shadow-foreground/20 flex items-center gap-4 border border-foreground/10">
            <div className="flex flex-col">
              <span className="text-sm font-medium">Order Placed</span>
              <span className="text-[11px] text-background/70">Undo available for {undoTimer}s</span>
            </div>
            <div className="w-[1px] h-8 bg-background/20" />
            <button
              onClick={handleUndoOrder}
              className="text-gold font-medium text-sm hover:text-gold-dark transition-colors px-2 py-1 active:scale-95"
            >
              Undo
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
