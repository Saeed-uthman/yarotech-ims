import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { UserAccount, UserRole, LoginInput, RegisterInput, AuthResponse } from '../types';
import { authService } from '../services/authService';

const AUTH_STORAGE_KEY = 'stitch_pharmacy_current_user';
const TOKEN_STORAGE_KEY = 'stitch_pharmacy_auth_token';

export interface AuthContextType {
  user: UserAccount | null;
  role: UserRole;
  isAuthenticated: boolean;
  isLoading: boolean;
  pendingCount: number;
  login: (input: LoginInput) => Promise<AuthResponse>;
  register: (input: RegisterInput) => Promise<AuthResponse>;
  logout: () => void;
  switchRole: (newRole: UserRole) => void;
  refreshUser: () => Promise<void>;
  refreshPendingCount: () => Promise<void>;
  setUserDirectly: (user: UserAccount | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserAccount | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [pendingCount, setPendingCount] = useState<number>(0);

  // Load session from storage on boot
  const loadSavedSession = useCallback(async () => {
    try {
      setIsLoading(true);
      const savedUserJson = localStorage.getItem(AUTH_STORAGE_KEY);
      const savedToken = localStorage.getItem(TOKEN_STORAGE_KEY);

      if (savedUserJson && savedToken) {
        const parsedUser: UserAccount = JSON.parse(savedUserJson);
        // Verify current status from repository
        const res = await authService.getUserById(parsedUser.id);
        if (res.success && res.data && res.data.status === 'ACTIVE') {
          setUser(res.data);
          localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(res.data));
        } else {
          // If user was suspended/rejected while logged in, clear session
          localStorage.removeItem(AUTH_STORAGE_KEY);
          localStorage.removeItem(TOKEN_STORAGE_KEY);
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } catch (err) {
      console.error('Failed to restore auth session:', err);
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
    refreshPendingCount();
  }, [loadSavedSession, refreshPendingCount]);

  const login = useCallback(
    async (input: LoginInput): Promise<AuthResponse> => {
      setIsLoading(true);
      try {
        const response = await authService.login(input);
        if (response.success && response.user && response.token) {
          setUser(response.user);
          localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(response.user));
          localStorage.setItem(TOKEN_STORAGE_KEY, response.token);
          refreshPendingCount();
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
        if (response.success) {
          refreshPendingCount();
        }
        return response;
      } finally {
        setIsLoading(false);
      }
    },
    [refreshPendingCount]
  );

  const logout = useCallback(() => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setUser(null);
  }, []);

  // Quick switch role (updates current user role for rapid development/testing)
  const switchRole = useCallback((newRole: UserRole) => {
    setUser((prev) => {
      if (!prev) return null;
      const updated = { ...prev, role: newRole };
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

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
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(newUser));
      localStorage.setItem(TOKEN_STORAGE_KEY, `mock_token_${newUser.id}_${Date.now()}`);
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      localStorage.removeItem(TOKEN_STORAGE_KEY);
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
        login,
        register,
        logout,
        switchRole,
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
