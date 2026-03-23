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

  // Rehidrasi dari sessionStorage saat mount (nama user tampil segera setelah pernah login)
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("session");
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<SessionState>;
      const updates: Partial<SessionState> = {};
      if (parsed?.username && parsed.username !== "unknown") updates.username = parsed.username;
      if (parsed?.role) updates.role = parsed.role;
      if (Object.keys(updates).length > 0) {
        setSessionState((prev) => ({ ...prev, ...updates }));
      }
    } catch {
      // ignore
    }
  }, []);

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
