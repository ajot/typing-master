import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

const API_BASE = import.meta.env.VITE_API_URL || '';

type Organizer = {
  id: string;
  email: string;
  name: string;
  is_active: boolean;
  created_at: string;
};

type AuthContextType = {
  organizer: Organizer | null;
  loading: boolean;
  login: (email: string) => Promise<{ success: boolean; message: string }>;
  verify: (token: string) => Promise<{ success: boolean; redirect?: string; error?: string }>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [organizer, setOrganizer] = useState<Organizer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/api/auth/me`, { credentials: 'include' })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.organizer) setOrganizer(data.organizer);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string) => {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
      credentials: 'include',
    });
    const data = await res.json();
    return { success: res.ok, message: data.message || data.error };
  };

  const verify = async (token: string) => {
    const res = await fetch(`${API_BASE}/api/auth/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: token.trim().replace(/\s+/g, '') }),
      credentials: 'include',
    });
    const data = await res.json();
    if (res.ok) {
      setOrganizer(data.organizer);
      return { success: true, redirect: data.redirect };
    }
    return { success: false, error: data.error };
  };

  const logout = async () => {
    await fetch(`${API_BASE}/api/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    });
    setOrganizer(null);
  };

  return (
    <AuthContext.Provider value={{ organizer, loading, login, verify, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
