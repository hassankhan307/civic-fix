'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, setStoredToken, removeStoredToken, getStoredToken } from '../lib/api';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'CITIZEN' | 'ADMIN' | 'FIELD_STAFF';
  phone?: string;
  profile?: any;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isStaff: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => void;
  quickLogin: (role: 'citizen' | 'admin' | 'staff') => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const savedToken = getStoredToken();
    if (savedToken) {
      setToken(savedToken);
      api.auth
        .getMe()
        .then((res) => {
          if (res.data) setUser(res.data);
        })
        .catch(() => {
          removeStoredToken();
          setToken(null);
          setUser(null);
        })
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await api.auth.login({ email, password });
      const { user: loggedInUser, accessToken } = res.data;
      setStoredToken(accessToken);
      setToken(accessToken);
      setUser(loggedInUser);
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (userData: any) => {
    setIsLoading(true);
    try {
      const res = await api.auth.register(userData);
      const { user: registeredUser, accessToken } = res.data;
      setStoredToken(accessToken);
      setToken(accessToken);
      setUser(registeredUser);
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    removeStoredToken();
    setToken(null);
    setUser(null);
  };

  const quickLogin = async (role: 'citizen' | 'admin' | 'staff') => {
    const credentials = {
      admin: { email: 'admin@civicfix.org', password: 'Admin123!' },
      staff: { email: 'worker.electrical@civicfix.org', password: 'Worker123!' },
      citizen: { email: 'citizen@civicfix.org', password: 'Citizen123!' },
    };
    await login(credentials[role].email, credentials[role].password);
  };

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    isAuthenticated: Boolean(user),
    isAdmin: user?.role === 'ADMIN',
    isStaff: user?.role === 'FIELD_STAFF' || user?.role === 'ADMIN',
    login,
    register,
    logout,
    quickLogin,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
