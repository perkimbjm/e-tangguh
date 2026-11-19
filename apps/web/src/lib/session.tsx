import type { LoginRequest, MeResponse, SessionUser } from '@etangguh/shared';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { ApiError, api, setCsrfToken } from './api-client';

interface SessionState {
  user: SessionUser | null;
  loading: boolean;
  login(input: LoginRequest): Promise<SessionUser>;
  logout(): Promise<void>;
}

const SessionContext = createContext<SessionState | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ctrl = new AbortController();
    api
      .get<MeResponse>('/auth/me', ctrl.signal)
      .then((me) => {
        setCsrfToken(me.csrfToken);
        setUser(me.user);
      })
      .catch((err: unknown) => {
        if (!(err instanceof ApiError) || err.status !== 401) console.warn('Gagal memuat sesi');
      })
      .finally(() => setLoading(false));
    return () => ctrl.abort();
  }, []);

  const login = useCallback(async (input: LoginRequest) => {
    const me = await api.post<MeResponse>('/auth/login', input);
    setCsrfToken(me.csrfToken);
    setUser(me.user);
    return me.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      setCsrfToken(null);
      setUser(null);
    }
  }, []);

  const value = useMemo(() => ({ user, loading, login, logout }), [user, loading, login, logout]);
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionState {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession harus dipakai di dalam SessionProvider');
  return ctx;
}
