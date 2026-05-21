import React, { createContext, useContext, useState, useCallback } from 'react';

export interface AuthUser {
  userId: string;
  email: string;
  role: string;
}

type Resource = 'projects' | 'backers' | 'monitoring' | 'reports' | 'ai' | 'admin';

const ROLE_RESOURCES: Record<string, Resource[]> = {
  super_admin: ['projects', 'backers', 'monitoring', 'reports', 'ai', 'admin'],
  analyst: ['projects', 'backers', 'monitoring', 'reports', 'ai'],
  business_user: ['projects', 'monitoring', 'reports'],
  guest: ['projects'],
  api_client: ['projects'],
};

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  login: (token: string, user: AuthUser) => void;
  logout: () => void;
  canAccess: (resource: Resource) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('token'));
  const [user, setUser] = useState<AuthUser | null>(() => {
    const stored = localStorage.getItem('user');
    return stored ? JSON.parse(stored) : null;
  });

  const login = useCallback((newToken: string, newUser: AuthUser) => {
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  }, []);

  const canAccess = useCallback(
    (resource: Resource): boolean => {
      if (!user) return false;
      return (ROLE_RESOURCES[user.role] ?? []).includes(resource);
    },
    [user]
  );

  return (
    <AuthContext.Provider value={{ user, token, login, logout, canAccess }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
