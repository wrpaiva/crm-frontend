import { createContext, useEffect, useMemo, useState } from 'react';
import { loginRequest, meRequest } from '../services/auth.service';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  async function login(email, password) {
    const data = await loginRequest({ email, password });

    localStorage.setItem('crm_token', data.token);
    setUser(data.user);

    return data.user;
  }

  function logout() {
    localStorage.removeItem('crm_token');
    setUser(null);
  }

  async function loadUser() {
    const token = localStorage.getItem('crm_token');

    if (!token) {
      setLoading(false);
      return;
    }

    try {
      const me = await meRequest();
      setUser(me);
    } catch (error) {
      localStorage.removeItem('crm_token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadUser();
  }, []);

  async function refreshUser() {
    try {
      const me = await meRequest();
      setUser(me);
    } catch (error) {
      // silent fail
    }
  }

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: !!user,
      login,
      logout,
      refreshUser
    }),
    [user, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}