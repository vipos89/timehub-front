import { useEffect, useRef, useState } from 'react';

type WebSocketOptions = {
  onOpen?: (event: Event) => void;
  onMessage?: (event: MessageEvent) => void;
  onClose?: (event: CloseEvent) => void;
  onError?: (event: Event) => void;
};

export const useWebSocket = (url: string, options: WebSocketOptions = {}) => {
  const [isConnected, setIsConnected] = useState(false);
  const ws = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (!url) {
      return;
    }

    ws.current = new WebSocket(url);

    ws.current.onopen = (event) => {
      console.log('WebSocket connected');
      setIsConnected(true);
      if (options.onOpen) {
        options.onOpen(event);
      }
    };

    ws.current.onmessage = (event) => {
      if (options.onMessage) {
        options.onMessage(event);
      }
    };

    ws.current.onerror = (event) => {
      console.error('WebSocket error:', event);
      if (options.onError) {
        options.onError(event);
      }
    };

    ws.current.onclose = (event) => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
      if (options.onClose) {
        options.onClose(event);
      }
    };

    // Cleanup on unmount
    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [url]);

  const sendMessage = (message: string) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(message);
    } else {
      console.error('WebSocket is not connected.');
    }
  };

  return { isConnected, sendMessage };
};
