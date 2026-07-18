'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { WebSocketEvent } from './types';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8080/ws/buddha-village';
const MAX_RECONNECT_DELAY = 30000;
const INITIAL_RECONNECT_DELAY = 1000;

export function useWebSocket() {
  const [messages, setMessages] = useState<WebSocketEvent[]>([]);
  const [lastMessage, setLastMessage] = useState<WebSocketEvent | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectDelayRef = useRef(INITIAL_RECONNECT_DELAY);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  const connect = useCallback(() => {
    if (!mountedRef.current) return;

    try {
      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;

      ws.onopen = () => {
        if (!mountedRef.current) return;
        setIsConnected(true);
        reconnectDelayRef.current = INITIAL_RECONNECT_DELAY;
      };

      ws.onmessage = (event) => {
        if (!mountedRef.current) return;
        try {
          const data: WebSocketEvent = JSON.parse(event.data);
          setLastMessage(data);
          setMessages((prev) => [...prev, data]);
        } catch {
          // Ignore malformed messages
        }
      };

      ws.onclose = () => {
        if (!mountedRef.current) return;
        setIsConnected(false);
        wsRef.current = null;

        const delay = Math.min(
          reconnectDelayRef.current,
          MAX_RECONNECT_DELAY
        );
        reconnectDelayRef.current = delay * 2;

        reconnectTimeoutRef.current = setTimeout(() => {
          connect();
        }, delay);
      };

      ws.onerror = () => {
        ws.close();
      };
    } catch {
      const delay = Math.min(
        reconnectDelayRef.current,
        MAX_RECONNECT_DELAY
      );
      reconnectDelayRef.current = delay * 2;
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, delay);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    connect();

    return () => {
      mountedRef.current = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  return { messages, lastMessage, isConnected };
}
