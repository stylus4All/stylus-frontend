// Example: Updated AuthContext.tsx using real API
// This is a reference implementation - copy relevant parts to your AuthContext.tsx

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { authAPI, AuthUserResponse } from './src/services/api';

// User interface matching backend User model
export interface RegisteredUser {
  id: number;
  email: string;
  name: string;
  phone?: string;
  address?: string;
  role: 'User' | 'Partner' | 'Admin';
  tier: 'Gold' | 'Platinum' | 'Diamond';
  status: 'Active' | 'Suspended';
  verificationStatus: 'Unverified' | 'Pending' | 'Verified' | 'Rejected';
  walletBalance: number;
  location?: string;
  joined: string;
  lastActive: string;
  avgSpend: number;
  rentalHistoryCount: number;
}

const normalizeTier = (tier?: string): RegisteredUser['tier'] => {
  if (tier === 'Platinum') return 'Platinum';
  if (tier === 'Diamond') return 'Diamond';
  return 'Gold';
};

const mapUser = (user: AuthUserResponse): RegisteredUser => ({
  id: user.id,
  email: user.email,
  name: user.name,
  phone: user.phone ?? '',
  address: user.address ?? '',
  role: user.role,
  tier: normalizeTier(user.tier),
  status: user.status,
  verificationStatus: user.verificationStatus,
  walletBalance: Number(user.walletBalance ?? 0),
  location: user.location ?? undefined,
  joined: user.joined ?? user.createdAt ?? '',
  lastActive: user.lastActive ?? user.updatedAt ?? '',
  avgSpend: Number(user.avgSpend ?? 0),
  rentalHistoryCount: Number(user.rentalHistoryCount ?? 0),
});

interface AuthContextType {
  isAuthenticated: boolean;
  user: RegisteredUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, role?: 'User' | 'Partner' | 'Admin') => Promise<void>;
  logout: () => void;
  updateUser: (updates: Partial<RegisteredUser>) => void;
  changePassword: (oldPassword: string, newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<RegisteredUser | null>(null);
  const [loading, setLoading] = useState(true);

  // On mount, check if user has a valid token and fetch user data
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('authToken');
      if (token) {
        try {
          const response = await authAPI.getCurrentUser();
          setUser(mapUser(response.user));
          setIsAuthenticated(true);
        } catch (error) {
          console.error('Token validation failed:', error);
          localStorage.removeItem('authToken');
        }
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const result = await authAPI.login({ email, password });
      localStorage.setItem('authToken', result.token);
      setUser(mapUser(result.user));
      setIsAuthenticated(true);
    } catch (error: any) {
      throw new Error(error.message || 'Login failed');
    }
  };

  const register = async (
    email: string,
    password: string,
    name: string,
    role: 'User' | 'Partner' | 'Admin' = 'User'
  ) => {
    try {
      const result = await authAPI.register({
        email,
        password,
        name,
        role
      });
      localStorage.setItem('authToken', result.token);
      setUser(mapUser(result.user));
      setIsAuthenticated(true);
    } catch (error: any) {
      throw new Error(error.message || 'Registration failed');
    }
  };

  const logout = () => {
    // Call logout endpoint (optional - mainly for logging)
    authAPI.logout().catch(() => { });

    // Clear local state
    localStorage.removeItem('authToken');
    setUser(null);
    setIsAuthenticated(false);
  };

  const updateUser = (updates: Partial<RegisteredUser>) => {
    if (user) {
      setUser({ ...user, ...updates });
    }
  };

  const changePassword = async (oldPassword: string, newPassword: string) => {
    try {
      await authAPI.changePassword({ oldPassword, newPassword });
    } catch (error: any) {
      throw new Error(error.message || 'Password change failed');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        user,
        loading,
        login,
        register,
        logout,
        updateUser,
        changePassword
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
