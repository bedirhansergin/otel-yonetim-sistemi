import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

const USERS: Record<string, string> = {
  bedirhan: 'bedo2544',
  turgut: 'turgut1412',
};

interface AuthContextValue {
  isAuthenticated: boolean;
  username: string | null;
  login: (username: string, password: string) => boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [username, setUsername] = useState<string | null>(() => {
    return localStorage.getItem('otel_auth_user');
  });

  const isAuthenticated = username !== null;

  const login = useCallback((user: string, pass: string): boolean => {
    const expectedPass = USERS[user];
    if (expectedPass && expectedPass === pass) {
      setUsername(user);
      localStorage.setItem('otel_auth_user', user);
      return true;
    }
    return false;
  }, []);

  const logout = useCallback(() => {
    setUsername(null);
    localStorage.removeItem('otel_auth_user');
  }, []);

  return (
    <AuthContext.Provider value={{ isAuthenticated, username, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
