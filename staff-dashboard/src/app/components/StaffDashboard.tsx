'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { toast } from 'react-hot-toast';
import { StaffRole, TaskItem, Order, ServiceTicket } from '@/lib/types';
import { getOrders, getTickets, updateOrderStatus, updateTicketStatus, getActiveSessions, getBookings } from '@/lib/api';
import { useWebSocket } from '@/lib/websocket';
import KanbanBoard from './KanbanBoard';
import RoomDirectory from './RoomDirectory';
import AmenitiesDirectory from './AmenitiesDirectory';
import LiveIndicator from './LiveIndicator';

// Global audio queue to prevent overlapping speech
const audioQueue: string[] = [];
let isPlayingAudio = false;

export default function StaffDashboard() {
  const [selectedRole, setSelectedRole] = useState<StaffRole>('all');
  const [orders, setOrders] = useState<Order[]>([]);
  const [tickets, setTickets] = useState<ServiceTicket[]>([]);
  const [activeSessions, setActiveSessions] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [newTaskIds, setNewTaskIds] = useState<Set<string>>(new Set());
  const { messages, isConnected } = useWebSocket();
  const lastProcessedId = useRef<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const [audioEnabled, setAudioEnabled] = useState(false);
  const [audioLang, setAudioLang] = useState<'en' | 'hi'>('en');
  const audioLangRef = useRef<'en' | 'hi'>('en');

  // Fetch initial data
  useEffect(() => {
    async function loadData() {
      try {
        const [ordersData, ticketsData, sessionsData, bookingsData] = await Promise.all([
          getOrders().catch(e => { console.error('Orders error:', e); return []; }),
          getTickets().catch(e => { console.error('Tickets error:', e); return []; }),
          getActiveSessions().catch(e => { console.error('Sessions error:', e); return []; }),
          getBookings().catch(e => { console.error('Bookings error:', e); return []; })
        ]);
        setOrders(ordersData);
        setTickets(ticketsData);
        setActiveSessions(sessionsData);
        setBookings(bookingsData);
      } catch (err) {
        console.error("Failed to fetch dashboard data:", err);
      }
    }
    loadData();
  }, []);

  const playNotification = async (text: string) => {
    toast.success(text, {
      duration: 5000,
      position: 'top-right',
      style: {
        background: '#333',
        color: '#fff',
        padding: '16px',
        borderRadius: '8px',
      },
    });

    if (!audioEnabled) return;

    audioQueue.push(text);
    processAudioQueue();
  };

  const processAudioQueue = async () => {
    if (isPlayingAudio || audioQueue.length === 0) return;
    isPlayingAudio = true;
    
    const text = audioQueue.shift()!;

    try {
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, language: audioLangRef.current })
      });

      if (!res.ok) throw new Error('TTS API failed');

      const audioBlob = await res.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      audio.playbackRate = 0.85;
      
      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        isPlayingAudio = false;
        processAudioQueue();
      };
      
      await audio.play();
    } catch (err) {
      console.warn('Falling back to browser TTS:', err);
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.95;
        utterance.pitch = 1.05;
        const voices = window.speechSynthesis.getVoices();
        const bestVoice = 
          voices.find(v => v.name.includes('Google UK English Female')) ||
          voices.find(v => v.name.includes('Google US English')) ||
          voices.find(v => v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Premium')) || 
          voices.find(v => v.lang.startsWith('en'));
        if (bestVoice) {
          utterance.voice = bestVoice;
        }
        utterance.onend = () => {
          isPlayingAudio = false;
          processAudioQueue();
        };
        utterance.onerror = () => {
          isPlayingAudio = false;
          processAudioQueue();
        };
        window.speechSynthesis.speak(utterance);
      } else {
        isPlayingAudio = false;
        processAudioQueue();
      }
    }
  };

  // Handle WebSocket updates
  useEffect(() => {
    if (messages.length === 0) return;
    const lastMsg = messages[messages.length - 1];
    
    // Create unique ID for the message payload to prevent re-running on state changes like audioEnabled
    const msgId = `${lastMsg.type}_${lastMsg.payload?.id || Date.now()}`;
    if (lastProcessedId.current === msgId) return;
    lastProcessedId.current = msgId;

    switch (lastMsg.type) {
      case 'new_order': {
        const order = lastMsg.payload as Order;
        const itemsText = order.items.map(i => `${i.quantity} ${i.name}`).join(', ');
        playNotification(`New order from room ${order.room_id}. Guest ${order.guest_name} has requested ${itemsText}.`);
        
        setOrders(prev => {
          if (prev.find(o => o.id === order.id)) return prev;
          setNewTaskIds(s => new Set(s).add(order.id as string));
          setTimeout(() => setNewTaskIds(s => {
            const next = new Set(s);
            next.delete(order.id as string);
            return next;
          }), 3000);
          
          return [...prev, order];
        });
        break;
      }
      case 'order_status_update':
        setOrders(prev => prev.map(o => o.id === lastMsg.payload.id ? lastMsg.payload as Order : o));
        break;
      case 'new_ticket': {
        const ticket = lastMsg.payload as ServiceTicket;
        if (ticket.type === 'bill_request') {
          playNotification(`Room ${ticket.room_id}. Guest ${ticket.guest_name} has requested the bill.`);
        } else if (ticket.type === 'ebill_request') {
          playNotification(`Room ${ticket.room_id}. Guest ${ticket.guest_name} has requested an E-Bill.`);
        } else {
          playNotification(`New service request from room ${ticket.room_id}. Guest ${ticket.guest_name} needs ${ticket.type}.`);
        }

        setTickets(prev => {
          if (prev.find(t => t.id === ticket.id)) return prev;
          setNewTaskIds(s => new Set(s).add(ticket.id as string));
          setTimeout(() => setNewTaskIds(s => {
            const next = new Set(s);
            next.delete(ticket.id as string);
            return next;
          }), 3000);

          return [...prev, ticket];
        });
        break;
      }
      case 'ticket_status_update':
        setTickets(prev => prev.map(t => t.id === lastMsg.payload.id ? lastMsg.payload as ServiceTicket : t));
        break;
      case 'new_booking': {
        const booking = lastMsg.payload;
        playNotification(`Room ${booking.room_id}. Guest ${booking.guest_name} booked ${booking.amenity_type} at ${booking.time_slot}.`);
        setBookings(prev => {
          if (prev.find(b => b.id === booking.id)) return prev;
          return [...prev, booking];
        });
        break;
      }
      case 'new_session': {
        const session = lastMsg.payload;
        setActiveSessions(prev => {
          if (prev.find(s => s.id === session.id)) return prev;
          return [...prev, session];
        });
        break;
      }
      case 'checkout_session': {
        const payload = lastMsg.payload;
        setActiveSessions(prev => prev.filter(s => s.room_id !== payload.room_id));
        break;
      }
    }
  }, [messages, audioEnabled]);

  // Convert to unified TaskItems
  const allTasks: TaskItem[] = useMemo(() => {
    const orderTasks: TaskItem[] = orders.map(o => ({
      id: o.id,
      type: 'order',
      roomId: o.room_id,
      guestName: o.guest_name,
      status: o.status,
      priority: 'normal',
      details: o.items.map(i => `${i.quantity}x ${i.name}`).join(', '),
      category: 'kitchen',
      createdAt: o.created_at,
      raw: o
    }));

    const ticketTasks: TaskItem[] = tickets.map(t => {
      let category = 'reception';
      if (t.type === 'cleaning' || t.type === 'towels') category = 'housekeeping';
      else if (t.type === 'emergency') category = 'maintenance';
      
      return {
        id: t.id,
        type: 'ticket',
        roomId: t.room_id,
        guestName: t.guest_name,
        status: t.status,
        priority: t.priority,
        assignee: t.assignee,
        details: t.notes || t.type,
        category: category,
        createdAt: t.created_at,
        raw: t
      };
    });

    return [...orderTasks, ...ticketTasks]
      .filter(t => t.status !== 'cancelled')
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [orders, tickets]);

  // Filter tasks based on role
  const filteredTasks = useMemo(() => {
    if (selectedRole === 'all') return allTasks;
    if (selectedRole === 'reception' || selectedRole === 'rooms') return allTasks; // Reception/Rooms sees everything
    return allTasks.filter(t => t.category === selectedRole);
  }, [allTasks, selectedRole]);

  // Handle status updates
  const handleUpdateStatus = async (id: string, type: 'order' | 'ticket', status: string, assignee?: string) => {
    try {
      if (type === 'order') {
        // Optimistic update
        setOrders(prev => prev.map(o => o.id === id ? { ...o, status: status as any } : o));
        await updateOrderStatus(id, status as any, assignee);
      } else {
        // Optimistic update
        setTickets(prev => prev.map(t => t.id === id ? { ...t, status: status as any, assignee } : t));
        await updateTicketStatus(id, status as any, assignee);
      }
    } catch (err) {
      console.error("Failed to update status", err);
      toast.error(`Failed to update task: ${err instanceof Error ? err.message : String(err)}`);
      // Revert optimistic update by refetching
      getOrders().then(setOrders).catch(console.error);
      getTickets().then(setTickets).catch(console.error);
    }
  };

  const getRoleIcon = (role: StaffRole) => {
    switch(role) {
      case 'all': return '📋';
      case 'reception': return '🛎️';
      case 'kitchen': return '👨‍🍳';
      case 'housekeeping': return '🧹';
      case 'maintenance': return '🔧';
      case 'rooms': return '🏨';
      case 'amenities': return '🏖️';
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-screen overflow-hidden bg-background animate-fade-in relative">
      {/* Mobile Top Bar */}
      <div className="md:hidden flex items-center justify-between p-4 bg-background-alt border-b border-surface shrink-0 z-20">
        <div className="flex items-center space-x-3">
          <img src="/logo.png" alt="Buddha Village Logo" className="h-10 w-auto object-contain" onError={(e) => (e.currentTarget.style.display = 'none')} />
          <p className="text-[10px] text-foreground-muted uppercase tracking-widest font-medium">Operations</p>
        </div>
        <button 
          onClick={() => setIsDrawerOpen(true)}
          className="text-foreground hover:text-gold transition-colors p-2"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16m-7 6h7" />
          </svg>
        </button>
      </div>

      {/* Mobile Backdrop */}
      {isDrawerOpen && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setIsDrawerOpen(false)}
        />
      )}

      {/* Sidebar Drawer */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-72 bg-background-alt border-r border-surface flex flex-col shadow-xl md:shadow-none
        transform transition-transform duration-300 ease-in-out
        md:relative md:translate-x-0
        ${isDrawerOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="p-4 md:p-6 border-b border-surface flex flex-col relative">
          <button 
            className="md:hidden absolute top-4 right-4 text-foreground-muted hover:text-foreground"
            onClick={() => setIsDrawerOpen(false)}
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          <div className="flex items-center space-x-3 mb-4">
            <img src="/logo.png" alt="Buddha Village Logo" className="h-12 md:h-16 w-auto object-contain" onError={(e) => (e.currentTarget.style.display = 'none')} />
            <div className="flex flex-col justify-center">
              <p className="text-[10px] md:text-xs text-foreground-muted uppercase tracking-widest font-medium">Operations Hub</p>
            </div>
          </div>
          <div className="mt-2">
            <LiveIndicator isConnected={isConnected} />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col space-y-2 hide-scrollbar">
          <p className="text-xs font-semibold text-foreground-muted uppercase tracking-widest mb-4 px-3">Departments</p>
          {(['all', 'rooms', 'amenities', 'reception', 'kitchen', 'housekeeping', 'maintenance'] as StaffRole[]).map(role => {
            let count = 0;
            if (role === 'amenities') {
              count = bookings.length;
            } else if (role === 'all' || role === 'reception' || role === 'rooms') {
              count = allTasks.filter(t => t.status !== 'completed').length;
            } else {
              count = allTasks.filter(t => t.category === role && t.status !== 'completed').length;
            }
              
            const isActive = selectedRole === role;
            
            return (
              <button
                key={role}
                onClick={() => {
                  setSelectedRole(role);
                  setIsDrawerOpen(false);
                }}
                className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${
                  isActive 
                    ? 'bg-gold text-background font-medium shadow-sm' 
                    : 'text-foreground-muted hover:bg-surface-hover/50 hover:text-foreground'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <span className="text-xl">{getRoleIcon(role)}</span>
                  <span className="capitalize text-sm md:text-base">{role}</span>
                </div>
                {count > 0 && (
                  <span className={`text-xs font-bold px-2 py-1 rounded-md ${
                    isActive ? 'bg-foreground text-gold' : 'bg-surface-hover text-foreground-muted'
                  }`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="p-4 md:p-6 border-t border-surface">
          <a
            href="/admin"
            className="flex items-center justify-center space-x-2 w-full p-3 rounded-xl text-foreground bg-surface hover:bg-surface-hover/50 transition-all font-medium"
          >
            <span className="text-xl">⚙️</span>
            <span>Admin Settings</span>
          </a>
        </div>
      </aside>

      {/* Main Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-hidden bg-background/50 relative">
        <header className="px-8 py-6 border-b border-surface bg-white/50 backdrop-blur-md flex justify-between items-center z-10 shrink-0">
          <div>
            <h2 className="text-2xl font-display font-semibold capitalize flex items-center">
              {getRoleIcon(selectedRole)} <span className="ml-3">{selectedRole} Dashboard</span>
            </h2>
            <p className="text-foreground-muted text-sm mt-1">
              Showing {filteredTasks.length} total active and completed requests
            </p>
          </div>
          
          <div className="flex space-x-4 items-center">
            <button 
              onClick={() => {
                setAudioEnabled(!audioEnabled);
                if (!audioEnabled) {
                  // Play a silent or test sound to initialize audio context on mobile/safari
                  const u = new SpeechSynthesisUtterance('Audio enabled');
                  u.volume = 0;
                  window.speechSynthesis.speak(u);
                  
                  // Also unlock HTML5 Audio context for our TTS proxy
                  const silentAudio = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA');
                  silentAudio.play().catch(() => {});
                  
                  toast.success("Audio notifications enabled");
                }
              }}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${audioEnabled ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-700'}`}
            >
              {audioEnabled ? '🔊 Audio On' : '🔇 Enable Audio'}
            </button>
            {audioEnabled && (
              <button
                onClick={() => {
                  const next = audioLang === 'en' ? 'hi' : 'en';
                  setAudioLang(next);
                  audioLangRef.current = next;
                  toast.success(next === 'hi' ? 'भाषा: हिन्दी' : 'Language: English');
                }}
                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-amber-100 text-amber-800 hover:bg-amber-200"
              >
                {audioLang === 'en' ? '🇬🇧 EN' : '🇮🇳 हिन्दी'}
              </button>
            )}
            <div className="glass-panel px-4 py-2 rounded-lg flex items-center space-x-2 text-sm">
              <span className="w-2 h-2 rounded-full bg-gold"></span>
              <span className="text-foreground-muted">New: {filteredTasks.filter(t => t.status === 'new').length}</span>
            </div>
            <div className="glass-panel px-4 py-2 rounded-lg flex items-center space-x-2 text-sm">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              <span className="text-foreground-muted">Active: {filteredTasks.filter(t => t.status === 'in_progress' || t.status === 'assigned').length}</span>
            </div>
          </div>
        </header>

        <div className={`flex-1 p-4 lg:p-8 ${
          selectedRole === 'rooms' || selectedRole === 'amenities'
            ? 'overflow-y-auto overflow-x-hidden'
            : 'overflow-x-auto overflow-y-hidden'
        }`}>
          {selectedRole === 'rooms' ? (
            <RoomDirectory tasks={filteredTasks} onUpdateStatus={handleUpdateStatus} newTaskIds={newTaskIds} activeSessions={activeSessions} />
          ) : selectedRole === 'amenities' ? (
            <AmenitiesDirectory bookings={bookings} />
          ) : (
            <KanbanBoard tasks={filteredTasks} onUpdateStatus={handleUpdateStatus} newTaskIds={newTaskIds} />
          )}
        </div>
      </main>
    </div>
  );
}
