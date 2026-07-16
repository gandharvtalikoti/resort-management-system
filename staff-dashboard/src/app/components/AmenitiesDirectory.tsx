import React, { useMemo } from 'react';

interface Booking {
  id: string;
  room_id: string;
  guest_name: string;
  amenity_type: string;
  time_slot: string;
  created_at: string;
}

interface AmenitiesDirectoryProps {
  bookings: Booking[];
}

const AMENITIES = [
  { id: 'kayaking', name: 'Kayaking', icon: '🛶' },
  { id: 'boating', name: 'Boating', icon: '🚤' },
  { id: 'fishing', name: 'Fishing', icon: '🎣' },
  { id: 'bonfire', name: 'Bonfire', icon: '🔥' },
  { id: 'pool_table', name: 'Pool Table', icon: '🎱' },
  { id: 'foosball', name: 'Foosball', icon: '⚽' },
  { id: 'swimming_pool', name: 'Swimming Pool', icon: '🏊‍♂️' },
  { id: 'celebration_lake', name: 'Lake Side', icon: '🌅' },
  { id: 'celebration_lounge', name: 'Lounge Area', icon: '🛋️' },
  { id: 'celebration_amphitheater', name: 'Amphitheater', icon: '🏛️' },
];

export default function AmenitiesDirectory({ bookings }: AmenitiesDirectoryProps) {
  // Sort bookings by time_slot ascending, then by created_at
  const sortedBookings = useMemo(() => {
    return [...bookings].sort((a, b) => {
      if (a.time_slot !== b.time_slot) {
        return a.time_slot.localeCompare(b.time_slot);
      }
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });
  }, [bookings]);

  if (bookings.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-foreground-muted">
        <span className="text-4xl mb-4">🏖️</span>
        <h3 className="text-xl font-display font-medium text-foreground mb-2">No Bookings Yet</h3>
        <p className="max-w-sm mx-auto">There are no amenity reservations for today.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {sortedBookings.map(booking => {
        const amenity = AMENITIES.find(a => a.id === booking.amenity_type);
        const name = amenity ? amenity.name : booking.amenity_type;
        const icon = amenity ? amenity.icon : '🏖️';

        return (
          <div key={booking.id} className="glass-panel-heavy rounded-3xl p-6 border border-surface shadow-sm relative overflow-hidden group hover:border-gold/30 transition-colors">
            {/* Background accent */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-gold/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 group-hover:bg-gold/10 transition-colors" />
            
            <div className="flex justify-between items-start mb-6 relative">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 rounded-2xl bg-surface flex items-center justify-center text-2xl shadow-inner">
                  {icon}
                </div>
                <div>
                  <h3 className="font-semibold text-lg text-foreground capitalize">{name}</h3>
                  <p className="text-gold-dark font-medium text-sm">{booking.time_slot}</p>
                </div>
              </div>
            </div>

            <div className="bg-background/50 rounded-2xl p-4 border border-surface-hover relative">
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-xs text-foreground-muted uppercase tracking-widest mb-1">Guest</p>
                  <p className="font-medium text-foreground">{booking.guest_name || 'Guest'}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-foreground-muted uppercase tracking-widest mb-1">Room</p>
                  <p className="font-display font-semibold text-lg text-gold-dark">{booking.room_id}</p>
                </div>
              </div>
            </div>
            
            <div className="mt-4 flex justify-between items-center text-xs text-foreground-muted">
              <span>Booking ID: {booking.id.split('-')[0]}</span>
              <span>{new Date(booking.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
