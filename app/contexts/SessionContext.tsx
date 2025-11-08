"use client";
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

type SessionState = {
  username: string;
  role: string;
  lastRefresh: string | null;
  refreshCount: number;
};

type SessionContextType = SessionState & {
  setSession: (s: Partial<SessionState>) => void;
  resetSession: () => void;
};

const SessionContext = createContext<SessionContextType | undefined>(undefined);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSessionState] = useState<SessionState>({
    username: "unknown",
    role: "guest",
    lastRefresh: null,
    refreshCount: 0,
  });

  const setSession = (data: Partial<SessionState>) =>
    setSessionState((prev) => ({ ...prev, ...data }));

  const resetSession = () =>
    setSessionState({
      username: "unknown",
      role: "guest",
      lastRefresh: null,
      refreshCount: 0,
    });

  // Persist ringan di sessionStorage
  useEffect(() => {
    sessionStorage.setItem("session", JSON.stringify(session));
  }, [session]);

  return (
    <SessionContext.Provider value={{ ...session, setSession, resetSession }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within a SessionProvider");
  return ctx;
}
