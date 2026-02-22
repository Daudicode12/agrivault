import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('agrovault_token'));
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    localStorage.removeItem('agrovault_token');
    setToken(null);
    setUser(null);
  }, []);

  // Load profile on mount if token exists
  useEffect(() => {
    if (!token) { setLoading(false); return; }
    authAPI.profile()
      .then((res) => setUser(res.data.user || res.data))
      .catch(() => logout())
      .finally(() => setLoading(false));
  }, [token, logout]);

  const login = async (credentials) => {
    const res = await authAPI.login(credentials);
    const t = res.data.token;
    localStorage.setItem('agrovault_token', t);
    setToken(t);
    setUser(res.data.user);
    return res.data;
  };

  const register = async (data) => {
    const res = await authAPI.register(data);
    const t = res.data.token;
    if (t) {
      localStorage.setItem('agrovault_token', t);
      setToken(t);
      setUser(res.data.user);
    }
    return res.data;
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
