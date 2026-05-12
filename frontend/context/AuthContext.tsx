import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { fetchAPI } from '../constants/api';

interface User {
  id: string;
  username: string;
  role: string;
  display_name: string;
  department: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  isLoading: true,
  login: async () => {},
  logout: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  async function checkAuth() {
    try {
      const token = await AsyncStorage.getItem('auth_token');
      if (token) {
        const userData = await fetchAPI('/auth/me');
        setUser(userData);
      }
    } catch {
      await AsyncStorage.removeItem('auth_token');
    } finally {
      setIsLoading(false);
    }
  }

  const login = useCallback(async (username: string, password: string) => {
    const response = await fetchAPI('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    await AsyncStorage.setItem('auth_token', response.token);
    setUser(response.user);
  }, []);

  const logout = useCallback(async () => {
    // Call server-side logout for audit trail (best effort)
    try {
      await fetchAPI('/auth/logout', { method: 'POST' });
    } catch {
      // Ignore - token may already be invalid
    }

    // Clear local auth state
    await AsyncStorage.removeItem('auth_token');
    setUser(null);

    // Force redirect to login on web (React state changes alone may not trigger navigation)
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.location.href = '/';
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
