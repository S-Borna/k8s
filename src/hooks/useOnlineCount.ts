import { useEffect, useRef, useState } from "react";

const WS_URL =
  (import.meta.env.VITE_PRESENCE_WS as string | undefined) ??
  "wss://k8s-presence.said-ebadi.workers.dev/ws";

const RECONNECT_MIN = 1000;
const RECONNECT_MAX = 15_000;

export function useOnlineCount(): { count: number | null; connected: boolean } {
  const [count, setCount] = useState<number | null>(null);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectDelayRef = useRef(RECONNECT_MIN);
  const closedRef = useRef(false);

  useEffect(() => {
    if (!WS_URL) return;

    function connect() {
      if (closedRef.current) return;
      let ws: WebSocket;
      try {
        ws = new WebSocket(WS_URL);
      } catch {
        scheduleReconnect();
        return;
      }
      wsRef.current = ws;

      ws.addEventListener("open", () => {
        setConnected(true);
        reconnectDelayRef.current = RECONNECT_MIN;
      });

      ws.addEventListener("message", (event) => {
        try {
          const data = JSON.parse(String(event.data));
          if (typeof data.count === "number") {
            setCount(data.count);
          }
        } catch {
          /* ignore */
        }
      });

      ws.addEventListener("close", () => {
        setConnected(false);
        wsRef.current = null;
        scheduleReconnect();
      });

      ws.addEventListener("error", () => {
        try {
          ws.close();
        } catch {
          /* ignore */
        }
      });
    }

    function scheduleReconnect() {
      if (closedRef.current) return;
      const delay = reconnectDelayRef.current;
      reconnectDelayRef.current = Math.min(delay * 2, RECONNECT_MAX);
      setTimeout(connect, delay);
    }

    closedRef.current = false;
    connect();

    return () => {
      closedRef.current = true;
      const ws = wsRef.current;
      wsRef.current = null;
      if (ws) {
        try {
          ws.close(1000, "unmount");
        } catch {
          /* ignore */
        }
      }
    };
  }, []);

  return { count, connected };
}
