'use client';

import { useState, useEffect, useMemo } from 'react';
import { getBill, BillResponse, postTicket } from '@/lib/api';

const AMENITIES = [
  { id: 'kayaking', name: 'Kayaking', price: 1500 },
  { id: 'boating', name: 'Boating', price: 1500 },
  { id: 'fishing', name: 'Fishing', price: 1500 },
  { id: 'bonfire', name: 'Bonfire', price: 0 },
  { id: 'pool_table', name: 'Pool Table', price: 500 },
  { id: 'foosball', name: 'Foosball', price: 300 },
  { id: 'swimming_pool', name: 'Swimming Pool', price: 0 },
  { id: 'celebration_lake', name: 'Lake Side Celebration', price: 1000 },
  { id: 'celebration_lounge', name: 'Lounge Area Celebration', price: 1000 },
  { id: 'celebration_amphitheater', name: 'Amphitheater Celebration', price: 1000 },
];

interface ViewBillProps {
  roomId: string;
  onClose: () => void;
}

export default function ViewBill({ roomId, onClose }: ViewBillProps) {
  const [bill, setBill] = useState<BillResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCheckoutConfirm, setShowCheckoutConfirm] = useState(false);
  const [showEbillConfirm, setShowEbillConfirm] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const [ebillSent, setEbillSent] = useState(false);
  const [email, setEmail] = useState('');

  useEffect(() => {
    async function fetchBill() {
      try {
        const data = await getBill(roomId);
        setBill(data);
      } catch (error) {
        console.error("Failed to fetch bill", error);
      } finally {
        setLoading(false);
      }
    }
    fetchBill();
  }, [roomId]);

  const totalAmount = useMemo(() => {
    if (!bill) return 0;
    const ordersTotal = bill.orders
      .filter(order => order.status !== 'cancelled')
      .reduce((sum, order) => sum + order.total, 0);

    const bookingsTotal = bill.bookings.reduce((sum, booking) => {
      const amenity = AMENITIES.find(a => a.id === booking.amenity_type);
      return sum + (amenity ? amenity.price : 0);
    }, 0);

    return ordersTotal + bookingsTotal;
  }, [bill]);

  const handleCheckout = async () => {
    try {
      await postTicket(
        roomId,
        'bill_request' as any,
        'normal',
        'Guest has requested the bill.'
      );
      setShowCheckoutConfirm(false);
      setRequestSent(true);
    } catch (err) {
      console.error(err);
    }
  };

  const handleEbillRequest = async () => {
    try {
      // Create backend ticket for staff record
      await postTicket(
        roomId,
        'ebill_request' as any,
        'normal',
        email ? `Guest requested E-Bill to be sent to ${email}` : 'Guest requested an E-Bill.'
      );

      // Send the email via Resend if email is provided
      if (email && bill) {
        await fetch('/api/ebill', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ room_id: roomId, email, bill })
        });
      }

      setShowEbillConfirm(false);
      setEbillSent(true);
    } catch (err) {
      console.error(err);
    }
  };

  // Removed the full screen "Waiter Called" block so the bill stays visible

  return (
    <div className="space-y-6">
      {/* ── Header ───────────────────────────────────────────── */}
      <div>
        <h2 className="font-display text-2xl text-foreground">Your Bill</h2>
        <p className="text-sm text-foreground-muted mt-1">
          Review your charges and services
        </p>
      </div>

      <div className="space-y-6">
        {loading ? (
          <div className="space-y-4">
            <div className="h-24 skeleton rounded-2xl" />
            <div className="h-48 skeleton rounded-2xl" />
          </div>
        ) : (
          <>
            {/* Total Summary */}
            <div className="glass-panel p-8 text-center rounded-2xl border border-gold/20 shadow-[0_0_15px_rgba(255,203,43,0.1)] relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-gold/5 to-transparent pointer-events-none" />
              <p className="text-sm font-medium text-foreground-muted uppercase tracking-widest mb-2 relative">Total Balance</p>
              <div className="text-5xl font-display font-medium text-foreground flex justify-center items-start relative">
                <span className="text-2xl mt-1 mr-1 text-gold-dark">₹</span>
                {totalAmount.toFixed(2)}
              </div>
            </div>

            {/* Food & Beverage Orders */}
            {bill && bill.orders.length > 0 && (
              <div className="mt-8">
                <h3 className="font-medium text-foreground-muted uppercase tracking-widest text-xs mb-4">Food & Beverages</h3>
                <div className="glass-panel rounded-2xl overflow-hidden divide-y divide-white/5">
                  {bill.orders.map(order => {
                    const isCancelled = order.status === 'cancelled';
                    return (
                    <div key={order.id} className={`p-4 bg-transparent transition-colors ${isCancelled ? 'opacity-50' : 'hover:bg-white/5'}`}>
                      <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center space-x-2">
                          <span className="text-xs font-mono text-foreground-muted">{new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          {isCancelled && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-500/20 text-red-500 uppercase tracking-wider">Cancelled</span>
                          )}
                        </div>
                        <span className={`font-medium ${isCancelled ? 'text-foreground-muted line-through' : 'text-gold-dark'}`}>₹{order.total.toFixed(2)}</span>
                      </div>
                      <div className={`space-y-2 ${isCancelled ? 'line-through text-foreground-muted' : ''}`}>
                        {order.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between text-sm">
                            <span className={isCancelled ? 'text-foreground-muted' : 'text-foreground/90'}>{item.quantity}x {item.name}</span>
                            <span className="text-foreground-muted">₹{(item.price * item.quantity).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )})}
                </div>
              </div>
            )}

            {/* Services */}
            {bill && bill.tickets.length > 0 && (
              <div className="mt-8">
                <h3 className="font-medium text-foreground-muted uppercase tracking-widest text-xs mb-4">Services</h3>
                <div className="glass-panel rounded-2xl overflow-hidden divide-y divide-white/5">
                  {bill.tickets.map(ticket => (
                    <div key={ticket.id} className="p-4 bg-transparent hover:bg-white/5 transition-colors flex justify-between items-center">
                      <div>
                        <p className="capitalize text-foreground/90">{ticket.type}</p>
                        <p className="text-xs font-mono text-foreground-muted mt-1">{new Date(ticket.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                      </div>
                      <span className="text-xs font-medium text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2 py-1 rounded-md">Complimentary</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Bookings */}
            {bill && bill.bookings && bill.bookings.length > 0 && (
              <div className="mt-8">
                <h3 className="font-medium text-foreground-muted uppercase tracking-widest text-xs mb-4">Amenities & Activities</h3>
                <div className="glass-panel rounded-2xl overflow-hidden divide-y divide-white/5">
                  {bill.bookings.map(booking => {
                    const amenity = AMENITIES.find(a => a.id === booking.amenity_type);
                    const price = amenity ? amenity.price : 0;
                    return (
                      <div key={booking.id} className="p-4 bg-transparent hover:bg-white/5 transition-colors flex justify-between items-center">
                        <div>
                          <p className="capitalize text-foreground/90">{amenity ? amenity.name : booking.amenity_type}</p>
                          <p className="text-xs font-mono text-foreground-muted mt-1">Slot: {booking.time_slot}</p>
                        </div>
                        <span className={`font-medium ${price > 0 ? 'text-gold-dark' : 'text-emerald-400'}`}>
                          {price > 0 ? `₹${price.toFixed(2)}` : 'Complimentary'}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {(!bill || (bill.orders.length === 0 && bill.tickets.length === 0 && (!bill.bookings || bill.bookings.length === 0))) && (
              <div className="text-center py-12">
                <div className="text-4xl mb-4 opacity-50">🍃</div>
                <p className="text-foreground-muted">No charges on your room yet.</p>
              </div>
            )}
          </>
        )}
      </div>

      <div className="pt-4 flex flex-col sm:flex-row gap-3">
        <button
          onClick={() => setShowCheckoutConfirm(true)}
          disabled={requestSent}
          className={`flex-1 py-4 rounded-xl font-medium text-lg shadow-lg transition-colors ${
            requestSent 
              ? 'bg-emerald-600 text-white cursor-default' 
              : 'bg-foreground text-background hover:bg-black hover:text-white'
          }`}
        >
          {requestSent ? '✓ Waiter Called' : 'Call Waiter'}
        </button>
        <button
          onClick={() => setShowEbillConfirm(true)}
          disabled={ebillSent}
          className={`flex-1 py-4 rounded-xl font-medium text-lg shadow-lg transition-colors ${
            ebillSent 
              ? 'bg-emerald-600 text-white cursor-default' 
              : 'bg-gold-dark text-background hover:bg-gold-dark/90'
          }`}
        >
          {ebillSent ? '✓ E-Bill Requested' : 'Request E-Bill'}
        </button>
      </div>

      {/* Checkout Confirmation Modal */}
      {showCheckoutConfirm && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-6 animate-fade-in">
          <div className="bg-background border border-surface rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-slide-up">
            <h3 className="font-display text-2xl font-semibold mb-2 text-foreground">Call Waiter</h3>
            <p className="text-foreground-muted mb-8">Waiter will get the bill breakdown for your room.</p>
            <div className="flex space-x-3">
              <button 
                onClick={() => setShowCheckoutConfirm(false)}
                className="flex-1 py-3 bg-gray-100 text-foreground rounded-xl font-medium hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleCheckout}
                className="flex-1 py-3 bg-gold-dark text-background rounded-xl font-medium shadow-md hover:bg-gold-dark/90 transition-colors"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* E-Bill Confirmation Modal */}
      {showEbillConfirm && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-6 animate-fade-in">
          <div className="bg-background border border-surface rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-slide-up">
            <h3 className="font-display text-2xl font-semibold mb-2 text-foreground">Request E-Bill</h3>
            <p className="text-foreground-muted mb-6">We will send the digital bill to your email address.</p>
            
            <div className="mb-8">
              <label className="block text-sm text-foreground-muted mb-2">Email Address</label>
              <input 
                type="email" 
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Enter your email..."
                className="w-full bg-surface border border-surface-hover text-foreground p-3 rounded-xl focus:outline-none focus:ring-1 focus:ring-gold"
              />
            </div>

            <div className="flex space-x-3">
              <button 
                onClick={() => setShowEbillConfirm(false)}
                className="flex-1 py-3 bg-gray-100 text-foreground rounded-xl font-medium hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button 
                onClick={handleEbillRequest}
                className="flex-1 py-3 bg-gold-dark text-background rounded-xl font-medium shadow-md hover:bg-gold-dark/90 transition-colors"
              >
                Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
