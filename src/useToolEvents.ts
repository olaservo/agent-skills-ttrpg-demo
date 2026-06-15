import { useEffect, useRef } from "react";
import { SERVER_BASE } from "./serverBase";
import type { ToolEvent } from "./types";

/**
 * Subscribe to the server's `/events` SSE stream. Calls `onEvent` for each tool
 * activity broadcast. EventSource auto-reconnects on transient network drops.
 * `onEvent` is held in a ref so the subscription isn't torn down on every render.
 */
export function useToolEvents(onEvent: (evt: ToolEvent) => void): void {
  const cb = useRef(onEvent);
  useEffect(() => {
    cb.current = onEvent;
  });

  useEffect(() => {
    const es = new EventSource(`${SERVER_BASE}/events`);
    es.onmessage = (e) => {
      try {
        cb.current(JSON.parse(e.data) as ToolEvent);
      } catch {
        /* ignore malformed frames (e.g. heartbeats are comments, not data) */
      }
    };
    return () => es.close();
  }, []);
}
