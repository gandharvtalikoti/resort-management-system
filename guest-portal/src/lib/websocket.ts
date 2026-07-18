'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { WebSocketEvent } from './types';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080/ws/buddha-village';
const MAX_MESSAGES = 50;
const MAX_BACKOFF_MS = 30_000;

export function useWebSocket() {
  const [messages, setMessages] = useState<WebSocketEvent[]>([]);
  const [lastMessage, setLastMessage] = useState<WebSocketEvent | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const backoffRef = useRef(1000);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const connect = useCallback(() => {
    if (!mountedRef.current) return;

    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!mountedRef.current) return;
        setIsConnected(true);
        backoffRef.current = 1000; // reset backoff on successful connection
      };

      ws.onmessage = (event) => {
        if (!mountedRef.current) return;
        try {
          const parsed: WebSocketEvent = JSON.parse(event.data);
          setLastMessage(parsed);
          setMessages((prev) => {
            const updated = [...prev, parsed];
            return updated.slice(-MAX_MESSAGES);
          });
        } catch {
          // Silently ignore non-JSON messages
        }
      };

      ws.onclose = () => {
        if (!mountedRef.current) return;
        setIsConnected(false);
        scheduleReconnect();
      };

      ws.onerror = () => {
        if (!mountedRef.current) return;
        ws.close();
      };
    } catch {
      scheduleReconnect();
    }
  }, []);

  const scheduleReconnect = useCallback(() => {
    if (!mountedRef.current) return;

    const delay = backoffRef.current;
    backoffRef.current = Math.min(delay * 2, MAX_BACKOFF_MS);

    reconnectTimerRef.current = setTimeout(() => {
      connect();
    }, delay);
  }, [connect]);

  useEffect(() => {
    mountedRef.current = true;
    connect();

    return () => {
      mountedRef.current = false;

      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
      }

      if (wsRef.current) {
        wsRef.current.onclose = null; // prevent reconnect on intentional close
        wsRef.current.close();
      }
    };
  }, [connect]);

  return { messages, lastMessage, isConnected };
}
