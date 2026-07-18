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
   * Clears storage and resets context state.
   */
  const logout = useCallback(() => {
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
