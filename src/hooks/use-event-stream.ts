"use client";

import { useEffect, useRef, useCallback, useState } from "react";

interface EventStreamOptions {
  workspaceId: string | null;
  onEvent?: (event: any) => void;
}

export function useEventStream({ workspaceId, onEvent }: EventStreamOptions) {
  const [connected, setConnected] = useState(false);
  const eventSourceRef = useRef<EventSource | null>(null);
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  const connect = useCallback(() => {
    if (!workspaceId) return;

    const es = new EventSource(`/api/events?workspaceId=${workspaceId}`);
    eventSourceRef.current = es;

    es.onopen = () => setConnected(true);

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onEventRef.current?.(data);
      } catch {
        // Ignore parse errors
      }
    };

    es.onerror = () => {
      setConnected(false);
      es.close();
      // Reconnect after 3 seconds
      setTimeout(connect, 3000);
    };

    return () => {
      es.close();
      setConnected(false);
    };
  }, [workspaceId]);

  useEffect(() => {
    const cleanup = connect();
    return cleanup;
  }, [connect]);

  return { connected };
}
