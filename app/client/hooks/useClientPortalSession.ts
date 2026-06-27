"use client";

import { useCallback, useEffect, useState } from "react";
import type { ClientPortalSession } from "@/lib/clientPortals/clientSession";
import {
  clearClientPortalSession,
  readClientPortalSession,
  writeClientPortalSession,
} from "@/lib/clientPortals/clientSession";

export function useClientPortalSession(slug: string | null) {
  const [session, setSessionState] = useState<ClientPortalSession | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!slug) {
      setSessionState(null);
      setReady(false);
      return;
    }

    setSessionState(readClientPortalSession(slug));
    setReady(true);
  }, [slug]);

  const setSession = useCallback(
    (nextSession: ClientPortalSession) => {
      writeClientPortalSession(nextSession);
      setSessionState(nextSession);
    },
    []
  );

  const clearSession = useCallback(() => {
    if (!slug) return;

    clearClientPortalSession(slug);
    setSessionState(null);
  }, [slug]);

  return {
    session,
    ready,
    setSession,
    clearSession,
  };
}
