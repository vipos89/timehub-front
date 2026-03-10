import { useEffect, useRef, useState, useCallback } from 'react';

type WebSocketOptions = {
  onOpen?: (event: Event) => void;
  onMessage?: (event: MessageEvent) => void;
  onClose?: (event: CloseEvent) => void;
  onError?: (event: Event) => void;
  reconnectAttempts?: number;
  reconnectInterval?: number;
};

export const useWebSocket = (url: string, options: WebSocketOptions = {}) => {
  const [isConnected, setIsConnected] = useState(false);
  const ws = useRef<WebSocket | null>(null);
  const reconnectCount = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isConnecting = useRef(false);
  const unmounted = useRef(false);

  // Use refs for options to prevent unnecessary re-connects when options object changes
  const optionsRef = useRef(options);
  useEffect(() => {
    optionsRef.current = options;
  }, [options]);

  const connectRef = useRef<() => void>(() => {});

  const connect = useCallback(() => {
    if (!url || unmounted.current) return;

    // If already connected or connecting, don't start another attempt
    if (ws.current && (ws.current.readyState === WebSocket.OPEN || ws.current.readyState === WebSocket.CONNECTING)) {
      return;
    }

    if (isConnecting.current) return;

    isConnecting.current = true;
    
    // Clear any pending reconnect timers
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    console.log(`WebSocket: connecting to ${url}...`);

    try {
      const socket = new WebSocket(url);
      ws.current = socket;

      socket.onopen = (event) => {
        if (unmounted.current) return;
        console.log('WebSocket: connected');
        setIsConnected(true);
        isConnecting.current = false;
        reconnectCount.current = 0;
        
        // Safety: clear any timeout again upon success
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }

        if (optionsRef.current.onOpen) {
          optionsRef.current.onOpen(event);
        }
      };

      socket.onmessage = (event) => {
        if (optionsRef.current.onMessage) {
          optionsRef.current.onMessage(event);
        }
      };

      socket.onerror = (event) => {
        if (unmounted.current) return;
        if (reconnectCount.current === 0) {
          console.warn('WebSocket: connection error');
        }
        if (optionsRef.current.onError) {
          optionsRef.current.onError(event);
        }
      };

      socket.onclose = (event) => {
        if (unmounted.current) return;
        
        setIsConnected(false);
        isConnecting.current = false;
        
        if (optionsRef.current.onClose) {
          optionsRef.current.onClose(event);
        }

        // Handle Reconnection
        const maxAttempts = optionsRef.current.reconnectAttempts || 10;
        const baseInterval = optionsRef.current.reconnectInterval || 2000;

        // If it was a clean close by us (component unmount), don't reconnect
        if (unmounted.current) return;

        if (reconnectCount.current < maxAttempts) {
          const delay = Math.min(30000, baseInterval * Math.pow(2, reconnectCount.current));
          
          if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
          
          console.log(`WebSocket: reconnecting in ${delay}ms... (Attempt ${reconnectCount.current + 1}/${maxAttempts})`);
          
          reconnectTimeoutRef.current = setTimeout(() => {
            if (!unmounted.current) {
              reconnectCount.current++;
              connectRef.current();
            }
          }, delay);
        } else {
          console.error('WebSocket: max reconnection attempts reached');
        }
      };
    } catch (err) {
      isConnecting.current = false;
      console.error('WebSocket: failed to create socket', err);
    }
  }, [url]);

  useEffect(() => {
    connectRef.current = connect;
  }, [connect]);

  useEffect(() => {
    unmounted.current = false;
    connect();

    return () => {
      unmounted.current = true;
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [url, connect]);

  const sendMessage = useCallback((message: string) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(message);
    } else {
      console.warn('WebSocket: cannot send message, socket not connected');
    }
  }, []);

  return { isConnected, sendMessage };
};
