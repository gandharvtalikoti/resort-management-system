'use client';

import { useState, useEffect } from 'react';
import { getBookingCapacity, createBooking } from '@/lib/api';
import { AmenitySlot } from '@/lib/types';

interface BookAmenitiesProps {
  roomId: string;
  onClose: () => void;
}

const AMENITIES = [
  { id: 'kayaking', name: 'Kayaking', icon: '🛶', description: 'Paddle through serene waters.', price: 1500 },
  { id: 'boating', name: 'Boating', icon: '🚤', description: 'Enjoy a relaxing boat ride.', price: 1500 },
  { id: 'fishing', name: 'Fishing', icon: '🎣', description: 'Catch local fish in quiet spots.', price: 1500 },
  { id: 'bonfire', name: 'Bonfire', icon: '🔥', description: 'Warm up by the evening fire.', price: 0 },
  { id: 'pool_table', name: 'Pool Table', icon: '🎱', description: 'Classic billiards experience.', price: 500 },
  { id: 'foosball', name: 'Foosball', icon: '⚽', description: 'Table football fun.', price: 300 },
  { id: 'swimming_pool', name: 'Swimming Pool', icon: '🏊‍♂️', description: 'Refreshing swim in our pool.', price: 0 },
  { id: 'celebration_lake', name: 'Lake Side', icon: '🌅', description: 'Instant celebration by the lake.', price: 1000 },
  { id: 'celebration_lounge', name: 'Lounge Area', icon: '🛋️', description: 'Cozy instant celebration lounge.', price: 1000 },
  { id: 'celebration_amphitheater', name: 'Amphitheater', icon: '🏛️', description: 'Grand celebration amphitheater.', price: 1000 },
];

const TIME_SLOTS = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00"];

export default function BookAmenities({ roomId, onClose }: BookAmenitiesProps) {
  const [capacities, setCapacities] = useState<AmenitySlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAmenity, setSelectedAmenity] = useState<string>('kayaking');
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [duration, setDuration] = useState<number>(1);
  const [bookingStatus, setBookingStatus] = useState<'idle' | 'booking' | 'success'>('idle');
  const [bookingError, setBookingError] = useState<string | null>(null);

  const fetchCapacity = async () => {
    try {
      const data = await getBookingCapacity();
      setCapacities(data);
    } catch (error) {
      console.error("Failed to load capacities", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCapacity();
  }, []);

  const handleBook = async () => {
    if (!selectedSlot) return;
    setBookingStatus('booking');
    setBookingError(null);
    try {
      await createBooking(roomId, selectedAmenity, selectedSlot, duration);
      setBookingStatus('success');
      await fetchCapacity();
      setTimeout(() => {
        setBookingStatus('idle');
        setSelectedSlot(null);
        setDuration(1);
      }, 3000);
    } catch (error: any) {
      console.error("Failed to book", error);
      let errMsg = "Failed to create booking.";
      try {
        if (error.message && error.message.includes('{')) {
          const jsonStr = error.message.substring(error.message.indexOf('{'));
          const parsed = JSON.parse(jsonStr);
          if (parsed.error) errMsg = parsed.error;
        } else {
           errMsg = error.message;
        }
      } catch (e) {}
      setBookingError(errMsg);
      setBookingStatus('idle');
    }
  };

  const currentAmenityCapacities = capacities.filter(c => c.amenity_type === selectedAmenity);

  return (
    <div className="space-y-6">
      {/* ── Header ───────────────────────────────────────────── */}
      <div>
        <h2 className="font-display text-2xl text-foreground">Book Amenities</h2>
        <p className="text-sm text-foreground-muted mt-1">
          Reserve a time slot for our signature experiences
        </p>
      </div>

      <div className="space-y-8">
        {/* Amenity Selection */}
        <div className="flex space-x-4 overflow-x-auto pb-4 scrollbar-hide">
          {AMENITIES.map(amenity => (
            <button
              key={amenity.id}
              onClick={() => { setSelectedAmenity(amenity.id); setSelectedSlot(null); setDuration(1); setBookingError(null); }}
              className={`flex flex-col items-center p-4 min-w-[120px] rounded-2xl transition-all ${selectedAmenity === amenity.id ? 'bg-gold-dark text-background shadow-lg scale-105' : 'bg-surface text-foreground hover:bg-surface-hover border border-surface'}`}
            >
              <span className="text-3xl mb-2">{amenity.icon}</span>
              <span className="text-sm font-medium">{amenity.name}</span>
            </button>
          ))}
        </div>

        {/* Selected Amenity Info */}
        {AMENITIES.map(amenity => amenity.id === selectedAmenity && (
          <div key={amenity.id} className="glass-panel p-6">
            <div className="flex justify-between items-start mb-2">
              <h3 className="text-xl font-display font-medium">{amenity.name}</h3>
              <span className="text-sm font-semibold text-gold">
                {amenity.price > 0 ? `₹${amenity.price.toLocaleString()} pp` : 'Free'}
              </span>
            </div>
            <p className="text-foreground-muted mb-6">{amenity.description}</p>

            <h4 className="font-medium text-sm text-foreground-muted uppercase tracking-wider mb-4">Reservation Details</h4>
            
            {loading ? (
              <div className="h-12 skeleton rounded-xl w-full" />
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-foreground-muted uppercase tracking-wider mb-2">Start Time</label>
                    <select 
                      value={selectedSlot || ''} 
                      onChange={(e) => { setSelectedSlot(e.target.value); setBookingError(null); }}
                      className="w-full bg-surface border border-surface rounded-xl p-3 text-foreground focus:outline-none focus:border-gold-dark"
                    >
                      <option value="" disabled>Select Time</option>
                      {TIME_SLOTS.map(slot => {
                        const cap = currentAmenityCapacities.find(c => c.time_slot === slot);
                        const isFull = cap ? cap.remaining === 0 : false;
                        return (
                          <option key={slot} value={slot} disabled={isFull}>
                            {slot} {isFull ? '(Full)' : ''}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-foreground-muted uppercase tracking-wider mb-2">Duration</label>
                    <select 
                      value={duration} 
                      onChange={(e) => { setDuration(Number(e.target.value)); setBookingError(null); }}
                      className="w-full bg-surface border border-surface rounded-xl p-3 text-foreground focus:outline-none focus:border-gold-dark"
                    >
                      <option value={1}>1 Hour</option>
                      <option value={2}>2 Hours</option>
                      <option value={3}>3 Hours</option>
                      <option value={4}>4 Hours</option>
                    </select>
                  </div>
                </div>

                {selectedSlot && (
                  <div className="bg-surface p-4 rounded-xl flex justify-between items-center border border-surface-hover mt-4">
                    <span className="text-foreground-muted">Total Price</span>
                    <span className="text-xl font-semibold text-gold-dark">
                      {amenity.price > 0 ? `₹${(amenity.price * duration).toLocaleString()}` : 'Free'}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {bookingError && (
          <div className="bg-red-500/10 text-red-500 p-4 rounded-xl flex items-start border border-red-500/20">
            <span className="text-xl mr-3 mt-0.5">⚠️</span>
            <div>
              <p className="font-medium">Booking Failed</p>
              <p className="text-sm opacity-90 mt-1">{bookingError}</p>
            </div>
          </div>
        )}

        {bookingStatus === 'success' && (
          <div className="bg-emerald-500/10 text-emerald-500 p-4 rounded-xl flex items-center border border-emerald-500/20">
            <span className="text-2xl mr-3">✨</span>
            <div>
              <p className="font-medium">Booking Confirmed!</p>
              <p className="text-sm opacity-90">Your spot has been reserved.</p>
            </div>
          </div>
        )}
      </div>

      <div className="pt-4">
        <button
          onClick={handleBook}
          disabled={!selectedSlot || bookingStatus === 'booking' || bookingStatus === 'success'}
          className={`w-full py-4 rounded-xl font-medium text-lg transition-all shadow-lg ${!selectedSlot || bookingStatus === 'success' ? 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none' : 'bg-gold-dark text-background hover:bg-gold-dark/90 hover:shadow-xl'}`}
        >
          {bookingStatus === 'booking' ? 'Confirming...' : bookingStatus === 'success' ? 'Booked' : 'Book Now'}
        </button>
      </div>
    </div>
  );
}
