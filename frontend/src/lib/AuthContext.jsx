import { createContext, useContext, useEffect, useState } from 'react';
import { api } from './api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [business, setBusiness] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) { setLoading(false); return; }
    api.me().then(setBusiness).catch(() => localStorage.removeItem('token')).finally(() => setLoading(false));
  }, []);

  function login(token, biz) {
    localStorage.setItem('token', token);
    setBusiness(biz);
  }

  function logout() {
    localStorage.removeItem('token');
    setBusiness(null);
  }

  return (
    <AuthContext.Provider value={{ business, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
