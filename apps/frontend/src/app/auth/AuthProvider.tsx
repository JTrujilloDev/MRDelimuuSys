import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { AuthState } from "./auth.service";
import {
  getCurrentSessionRequest,
  loginRequest,
  logoutRequest,
  selectContextRequest,
} from "./auth.service";

type AuthContextValue = {
  state: AuthState | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<AuthState>;
  selectContext: (storeId: number, terminalId: number) => Promise<AuthState>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refresh = async () => {
    try {
      setState(await getCurrentSessionRequest());
    } catch {
      setState(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    void getCurrentSessionRequest()
      .then((nextState) => {
        if (isMounted) setState(nextState);
      })
      .catch(() => {
        if (isMounted) setState(null);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      state,
      isLoading,
      login: async (email, password) => {
        const nextState = await loginRequest(email, password);
        setState(nextState);
        return nextState;
      },
      selectContext: async (storeId, terminalId) => {
        const nextState = await selectContextRequest(storeId, terminalId);
        setState(nextState);
        return nextState;
      },
      logout: async () => {
        try {
          await logoutRequest();
        } finally {
          setState(null);
        }
      },
      refresh,
    }),
    [isLoading, state],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
};

