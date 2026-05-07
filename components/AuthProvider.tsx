import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import {
  clearTrainerSession,
  getStoredTrainerSession,
  loginTrainerByName,
  type TrainerSession,
} from "@/lib/auth";

type AuthContextValue = {
  session: TrainerSession | null;
  isLoading: boolean;
  login: (trainerName: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<TrainerSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        const stored = await getStoredTrainerSession();
        if (mounted) setSession(stored);
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      isLoading,
      login: async (trainerName: string) => {
        const next = await loginTrainerByName(trainerName);
        setSession(next);
      },
      logout: async () => {
        await clearTrainerSession();
        setSession(null);
      },
    }),
    [session, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
