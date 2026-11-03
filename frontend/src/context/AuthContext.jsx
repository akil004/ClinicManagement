import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const AuthContext = createContext(null);

const STORAGE_KEYS = ['token', 'id', 'name', 'email', 'role', 'mustChangePassword'];

const readFromStorage = () => {
  const token = localStorage.getItem('token');
  if (!token) return null;
  return {
    token,
    id:                 localStorage.getItem('id')    ?? '',
    name:               localStorage.getItem('name')  ?? '',
    email:              localStorage.getItem('email') ?? '',
    role:               localStorage.getItem('role')  ?? '',
    mustChangePassword: localStorage.getItem('mustChangePassword') === 'true',
  };
};

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  // Hydrate from localStorage on mount
  useEffect(() => {
    setUser(readFromStorage());
    setLoading(false);
  }, []);

  // ── Cross-tab sync ───────────────────────────────────────
  // localStorage is shared by every tab on this origin. If a different
  // account logs in (or this one logs out) in another tab, this tab's
  // React state would otherwise keep showing stale user info while the
  // axios interceptor silently starts sending the *new* tab's token —
  // causing confusing "Access denied" errors on write actions even though
  // the UI still looks logged in as the original user. Re-sync immediately
  // whenever another tab changes the auth keys.
  useEffect(() => {
    const handleStorageChange = (event) => {
      if (!STORAGE_KEYS.includes(event.key)) return;
      setUser(readFromStorage());
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  /**
   * Call after a successful login API response.
   * Persists to localStorage and updates context state.
   */
  const login = useCallback((token, userData) => {
    const { id, name, email, role, mustChangePassword } = userData;
    localStorage.setItem('token', token);
    localStorage.setItem('id',    id);
    localStorage.setItem('name',  name);
    localStorage.setItem('email', email);
    localStorage.setItem('role',  role);
    localStorage.setItem('mustChangePassword', String(Boolean(mustChangePassword)));
    setUser({ token, id, name, email, role, mustChangePassword: Boolean(mustChangePassword) });
  }, []);

  /**
   * Call after a successful password change to clear the forced-change flag
   * without requiring the user to log in again.
   */
  const clearMustChangePassword = useCallback(() => {
    localStorage.setItem('mustChangePassword', 'false');
    setUser((prev) => (prev ? { ...prev, mustChangePassword: false } : prev));
  }, []);

  /**
   * Clears storage and resets context state. Fires a best-effort call to
   * /api/auth/logout first so a doctor is marked offline immediately
   * rather than waiting for the inactivity timeout to catch up.
   */
  const logout = useCallback(() => {
    const token = localStorage.getItem('token');
    if (token) {
      const base = import.meta.env.VITE_API_URL ?? 'http://localhost:5000/api';
      fetch(`${base}/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        keepalive: true,
      }).catch(() => {});
    }
    STORAGE_KEYS.forEach((k) => localStorage.removeItem(k));
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout, loading, clearMustChangePassword }}>
      {children}
    </AuthContext.Provider>
  );
}

/** Hook — access auth context anywhere in the tree */
export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
};
