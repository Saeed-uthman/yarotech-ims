import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
  UserAccount,
  UserRole,
  LoginInput,
  RegisterInput,
  AuthResponse,
  SessionTimeout,
} from '../types';
import { authService } from '../services/authService';
import { getAccessToken, clearTokens, setTokens } from '../services/apiClient';

const AUTH_STORAGE_KEY = 'stitch_pharmacy_current_user';

export interface AuthContextType {
  user: UserAccount | null;
  role: UserRole;
  isAuthenticated: boolean;
  isLoading: boolean;
  pendingCount: number;
  sessionNotice: string | null;
  login: (input: LoginInput) => Promise<AuthResponse>;
  register: (input: RegisterInput) => Promise<AuthResponse>;
  logout: () => void;
  logoutForInactivity: (timeout: SessionTimeout) => void;
  refreshUser: () => Promise<void>;
  refreshPendingCount: () => Promise<void>;
  setUserDirectly: (user: UserAccount | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserAccount | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [sessionNotice, setSessionNotice] = useState<string | null>(null);

  // Load session from storage on boot
  const loadSavedSession = useCallback(async () => {
    try {
      setIsLoading(true);
      const token = getAccessToken();

      if (token) {
        const res = await authService.getCurrentUser();
        if (res.success && res.data && res.data.status === 'ACTIVE') {
          setUser(res.data);
          localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(res.data));
        } else {
          localStorage.removeItem(AUTH_STORAGE_KEY);
          clearTokens();
          setUser(null);
        }
      } else {
        localStorage.removeItem(AUTH_STORAGE_KEY);
        setUser(null);
      }
    } catch (err) {
      console.error('Failed to restore auth session:', err);
      localStorage.removeItem(AUTH_STORAGE_KEY);
      clearTokens();
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshPendingCount = useCallback(async () => {
    try {
      const count = await authService.getPendingUserCount();
      setPendingCount(count);
    } catch (err) {
      console.error('Failed to load pending user count:', err);
    }
  }, []);

  useEffect(() => {
    loadSavedSession();
  }, [loadSavedSession]);

  const login = useCallback(
    async (input: LoginInput): Promise<AuthResponse> => {
      setSessionNotice(null);
      setIsLoading(true);
      try {
        const response = await authService.login(input);
        if (response.success && response.user && response.token) {
          setUser(response.user);
          localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(response.user));
          if (response.user.role === 'admin') {
            refreshPendingCount();
          }
        }
        return response;
      } finally {
        setIsLoading(false);
      }
    },
    [refreshPendingCount]
  );

  const register = useCallback(
    async (input: RegisterInput): Promise<AuthResponse> => {
      setIsLoading(true);
      try {
        const response = await authService.register(input);
        return response;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const endSession = useCallback((notice: string | null) => {
    setSessionNotice(notice);
    localStorage.removeItem(AUTH_STORAGE_KEY);
    setUser(null);
    void authService.logout();
  }, []);

  const logout = useCallback(() => {
    endSession(null);
  }, [endSession]);

  const logoutForInactivity = useCallback(
    (timeout: SessionTimeout) => {
      const duration = timeout === '15m' ? '15 minutes' : timeout === '60m' ? '1 hour' : '30 minutes';
      endSession(`You were signed out after ${duration} of inactivity. Sign in again to continue.`);
    },
    [endSession]
  );

  const refreshUser = useCallback(async () => {
    if (!user) return;
    try {
      const res = await authService.getUserById(user.id);
      if (res.success && res.data) {
        if (res.data.status === 'ACTIVE') {
          setUser(res.data);
          localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(res.data));
        } else {
          logout();
        }
      }
    } catch (err) {
      console.error('Error refreshing user state:', err);
    }
  }, [user, logout]);

  const setUserDirectly = useCallback((newUser: UserAccount | null) => {
    setUser(newUser);
    if (newUser) {
      setSessionNotice(null);
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(newUser));
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      clearTokens();
    }
  }, []);

  const currentRole: UserRole = user?.role || 'cashier';
  const isAuthenticated = !!user && user.status === 'ACTIVE';

  return (
    <AuthContext.Provider
      value={{
        user,
        role: currentRole,
        isAuthenticated,
        isLoading,
        pendingCount,
        sessionNotice,
        login,
        register,
        logout,
        logoutForInactivity,
        refreshUser,
        refreshPendingCount,
        setUserDirectly,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
