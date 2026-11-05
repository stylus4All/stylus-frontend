import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import { Role, Transaction, VerificationStatus } from "../types";

import {
  authAPI,
  AuthUserResponse,
  transactionAPI,
  userAPI,
} from "../services/api";

// ============================================================
// Frontend User Type
// ============================================================

export interface RegisteredUser {
  id: string;
  email: string;
  name: string;

  phone: string;
  address: string;

  role: Role;

  tier: string;

  status: "Active" | "Suspended";

  verificationStatus: VerificationStatus;

  walletBalance: number;

  location?: string;

  joined: string;

  lastActive: string;

  avgSpend: string;

  rentalHistoryCount: number;

  searchHistory: string[];

  suspensionReason?: string | null;

  adminNotes?: string | null;

  createdAt?: string;
  updatedAt?: string;
}

// ============================================================
// Registration Data
// ============================================================

export interface RegisterUserData {
  email: string;
  password: string;
  name: string;

  phone?: string;
  address?: string;
  role?: "User" | "Partner" | "Admin";
  location?: string;
}

// ============================================================
// Auth Context Type
// ============================================================

interface AuthContextType {
  isAuthenticated: boolean;
  isAdmin: boolean;
  currentUser: RegisteredUser | null;
  registeredUsers: RegisteredUser[];
  transactions: Transaction[];

  login: (email: string, password: string) => Promise<RegisteredUser>;
  registerUser: (data: RegisterUserData) => Promise<RegisteredUser>;
  changePassword: (oldPassword: string, newPassword: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshCurrentUser: () => Promise<RegisteredUser | null>;
  deleteUser: (id: string | number) => Promise<void>;
  approveVerification: (id: string | number) => Promise<void>;
  rejectVerification: (id: string | number, reason?: string) => Promise<void>;
  updateUserStatus: (id: string | number, status: "Active" | "Suspended", reason?: string) => Promise<void>;
  updateUserRole: (id: string | number, role: Role) => Promise<void>;
  submitVerification: (id: string | number, data: Record<string, unknown>) => Promise<void>;
  refreshUserFromBackend: (id: string | number) => Promise<void>;
  updateWallet: (id: string | number, amount: number, description?: string, type?: Transaction["type"]) => Promise<void>;
  requestWithdrawal: (id: string | number, amount: number, details: string) => Promise<void>;
  processWithdrawal: (id: string | number) => Promise<void>;
  transferFunds: (fromId: string | number, toId: string | number, amount: number, description?: string) => Promise<void>;
  addToSearchHistory: (term: string) => void;
}

// ============================================================
// Context
// ============================================================

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ============================================================
// Hook
// ============================================================

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside an AuthProvider");
  }

  return context;
};

// ============================================================
// Safe JSON Helpers
// ============================================================

function parseDate(value: unknown): string {
  if (!value) {
    return "";
  }

  const date = new Date(String(value));

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toISOString();
}

// ============================================================
// Backend User → Frontend User
// ============================================================

const mapBackendUserToRegisteredUser = (
  backendUser: AuthUserResponse,
): RegisteredUser => {
  return {
    id: String(backendUser.id),
    email: backendUser.email,
    name: backendUser.name,
    phone: backendUser.phone ?? "",
    address: backendUser.address ?? "",
    role: backendUser.role as Role,
    tier: backendUser.tier ?? "Gold",
    status: backendUser.status,
    verificationStatus: backendUser.verificationStatus as VerificationStatus,
    walletBalance: Number(backendUser.walletBalance ?? 0),
    location: backendUser.location ?? undefined,
    joined: parseDate(backendUser.joined ?? backendUser.createdAt),
    lastActive: parseDate(backendUser.lastActive),
    avgSpend: String(backendUser.avgSpend ?? "$0"),
    rentalHistoryCount: Number(backendUser.rentalHistoryCount ?? 0),
    searchHistory: Array.isArray(backendUser.searchHistory)
      ? backendUser.searchHistory
      : typeof backendUser.searchHistory === "string"
        ? backendUser.searchHistory.split(",").map((term) => term.trim()).filter(Boolean)
        : [],
    suspensionReason: backendUser.suspensionReason ?? null,
    adminNotes: backendUser.adminNotes ?? null,
    createdAt: backendUser.createdAt ? String(backendUser.createdAt) : undefined,
    updatedAt: backendUser.updatedAt ? String(backendUser.updatedAt) : undefined,
  };
};

// ============================================================
// Storage Helpers
// ============================================================

const AUTH_TOKEN_KEY = "authToken";
const AUTH_STATE_KEY = "stylus_auth";
const USER_ID_KEY = "stylus_user_id";

const clearStoredSession = (): void => {
  localStorage.removeItem(AUTH_TOKEN_KEY);
  localStorage.removeItem(AUTH_STATE_KEY);
  localStorage.removeItem(USER_ID_KEY);
};

const storeSession = (user: AuthUserResponse, token: string): void => {
  localStorage.setItem(AUTH_TOKEN_KEY, token);
  localStorage.setItem(AUTH_STATE_KEY, "true");
  localStorage.setItem(USER_ID_KEY, String(user.id));
};

// ============================================================
// Provider
// ============================================================

export const AuthProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [currentUser, setCurrentUser] = useState<RegisteredUser | null>(null);
  const [registeredUsers, setRegisteredUsers] = useState<RegisteredUser[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  const syncUserRecord = useCallback((user: RegisteredUser) => {
    setRegisteredUsers((previous) => {
      const next = previous.filter((entry) => entry.id !== user.id);
      return [user, ...next];
    });
  }, []);

  const applyAuthenticatedUser = useCallback(
    (backendUser: AuthUserResponse): RegisteredUser => {
      const mappedUser = mapBackendUserToRegisteredUser(backendUser);

      setCurrentUser(mappedUser);
      setIsAuthenticated(true);
      setIsAdmin(backendUser.role === "Admin");
      syncUserRecord(mappedUser);

      return mappedUser;
    },
    [syncUserRecord],
  );

  const clearAuthentication = useCallback(() => {
    clearStoredSession();
    setIsAuthenticated(false);
    setIsAdmin(false);
    setCurrentUser(null);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const restoreSession = async (): Promise<void> => {
      const token = localStorage.getItem(AUTH_TOKEN_KEY);

      if (!token) {
        return;
      }

      try {
        const response = await authAPI.getCurrentUser();

        if (cancelled) {
          return;
        }

        applyAuthenticatedUser(response.user);
        localStorage.setItem(AUTH_STATE_KEY, "true");
        localStorage.setItem(USER_ID_KEY, String(response.user.id));
      } catch (error) {
        if (cancelled) {
          return;
        }

        console.warn("Stored authentication token is invalid or expired.", error);
        clearAuthentication();
      }
    };

    void restoreSession();

    return () => {
      cancelled = true;
    };
  }, [applyAuthenticatedUser, clearAuthentication]);

  const login = async (email: string, password: string): Promise<RegisteredUser> => {
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      throw new Error("Email is required.");
    }

    if (!password) {
      throw new Error("Password is required.");
    }

    try {
      const response = await authAPI.login({ email: trimmedEmail, password });
      storeSession(response.user, response.token);
      return applyAuthenticatedUser(response.user);
    } catch (error) {
      clearAuthentication();
      throw error;
    }
  };

  const registerUser = async (data: RegisterUserData): Promise<RegisteredUser> => {
    const name = data.name.trim();
    const email = data.email.trim();

    if (!email) {
      throw new Error("Email is required.");
    }

    if (!passwordIsValid(data.password)) {
      throw new Error("Password must be at least 6 characters long.");
    }

    if (!name) {
      throw new Error("Name is required.");
    }

    const role = data.role ?? "User";

    if (!["User", "Partner", "Admin"].includes(role)) {
      throw new Error('Role must be "User", "Partner", or "Admin".');
    }

    try {
      const response = await authAPI.register({
        email,
        password: data.password,
        name,
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.address !== undefined && { address: data.address }),
        role,
        ...(data.location !== undefined && { location: data.location }),
      });

      const registeredUser = mapBackendUserToRegisteredUser(response.user);
      syncUserRecord(registeredUser);
      return registeredUser;
    } catch (error) {
      clearAuthentication();
      throw error;
    }
  };

  const changePassword = async (oldPassword: string, newPassword: string): Promise<void> => {
    if (!oldPassword) {
      throw new Error("Old password is required.");
    }

    if (!newPassword) {
      throw new Error("New password is required.");
    }

    if (!passwordIsValid(newPassword)) {
      throw new Error("New password must be at least 6 characters long.");
    }

    await authAPI.changePassword({ oldPassword, newPassword });
  };

  const refreshCurrentUser = async (): Promise<RegisteredUser | null> => {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);

    if (!token) {
      clearAuthentication();
      return null;
    }

    try {
      const response = await authAPI.getCurrentUser();
      return applyAuthenticatedUser(response.user);
    } catch (error) {
      clearAuthentication();
      throw error;
    }
  };

  const deleteUser = async (id: string | number): Promise<void> => {
    try {
      await userAPI.delete(Number(id));
      setRegisteredUsers((previous) => previous.filter((user) => user.id !== String(id)));
      if (currentUser?.id === String(id)) {
        clearAuthentication();
      }
    } catch (error) {
      console.error("Delete user failed.", error);
      throw error;
    }
  };

  const approveVerification = async (id: string | number): Promise<void> => {
    const userId = String(id);
    await userAPI.approveVerification(Number(id));
    setRegisteredUsers((previous) => previous.map((user) =>
      user.id === userId ? { ...user, verificationStatus: "Verified" } : user,
    ));
    setCurrentUser((current) => current && current.id === userId ? { ...current, verificationStatus: "Verified" } : current);
  };

  const rejectVerification = async (id: string | number, reason = "No reason provided"): Promise<void> => {
    const userId = String(id);
    await userAPI.rejectVerification(Number(id), reason);
    setRegisteredUsers((previous) => previous.map((user) =>
      user.id === userId ? { ...user, verificationStatus: "Rejected", adminNotes: reason } : user,
    ));
    setCurrentUser((current) => current && current.id === userId ? { ...current, verificationStatus: "Rejected", adminNotes: reason } : current);
  };

  const updateUserStatus = async (id: string | number, status: "Active" | "Suspended", reason?: string): Promise<void> => {
    const userId = String(id);
    await userAPI.updateStatus(Number(id), status, reason);
    setRegisteredUsers((previous) => previous.map((user) =>
      user.id === userId ? { ...user, status, suspensionReason: reason ?? user.suspensionReason ?? null } : user,
    ));
    setCurrentUser((current) => current && current.id === userId ? { ...current, status, suspensionReason: reason ?? current.suspensionReason ?? null } : current);
  };

  const updateUserRole = async (id: string | number, role: Role): Promise<void> => {
    const userId = String(id);
    await userAPI.updateRole(Number(id), role);
    setRegisteredUsers((previous) => previous.map((user) =>
      user.id === userId ? { ...user, role } : user,
    ));
    setCurrentUser((current) => current && current.id === userId ? { ...current, role } : current);
  };

  const submitVerification = async (id: string | number, data: Record<string, unknown>): Promise<void> => {
    await userAPI.submitVerification(Number(id), data);
    setRegisteredUsers((previous) => previous.map((user) =>
      user.id === String(id) ? { ...user, verificationStatus: "Pending" } : user,
    ));
    setCurrentUser((current) => current && current.id === String(id) ? { ...current, verificationStatus: "Pending" } : current);
  };

  const refreshUserFromBackend = async (id: string | number): Promise<void> => {
    const response = await userAPI.getById(Number(id));
    const mappedUser = mapBackendUserToRegisteredUser(response);
    syncUserRecord(mappedUser);
    if (currentUser?.id === mappedUser.id) {
      setCurrentUser(mappedUser);
    }
  };

  const updateWallet = async (
    id: string | number,
    amount: number,
    description = "Wallet update",
    type: Transaction["type"] = amount >= 0 ? "Credit" : "Debit",
  ): Promise<void> => {
    const userId = String(id);
    const nextAmount = Number(amount);

    await userAPI.updateWallet(Number(id), nextAmount);

    setRegisteredUsers((previous) => previous.map((user) =>
      user.id === userId ? { ...user, walletBalance: Number((user.walletBalance + nextAmount).toFixed(2)) } : user,
    ));

    setCurrentUser((current) => current && current.id === userId
      ? { ...current, walletBalance: Number((current.walletBalance + nextAmount).toFixed(2)) }
      : current);

    setTransactions((previous) => [{
      id: `${Date.now()}`,
      userId: userId,
      userName: currentUser?.name ?? "User",
      type,
      amount: Math.abs(nextAmount),
      description,
      date: new Date().toISOString(),
      status: "Completed",
    }, ...previous]);
  };

  const requestWithdrawal = async (id: string | number, amount: number, details: string): Promise<void> => {
    await transactionAPI.requestWithdrawal({
      userId: Number(id),
      amount,
      details,
    });

    setTransactions((previous) => [{
      id: `${Date.now()}`,
      userId: String(id),
      userName: currentUser?.name ?? "User",
      type: "Withdrawal",
      amount: Math.abs(amount),
      description: details,
      date: new Date().toISOString(),
      status: "Pending",
    }, ...previous]);
  };

  const processWithdrawal = async (id: string | number): Promise<void> => {
    await transactionAPI.processWithdrawal(String(id));
  };

  const transferFunds = async (
    fromId: string | number,
    toId: string | number,
    amount: number,
    description = "Transfer",
  ): Promise<void> => {
    await transactionAPI.transfer({
      fromId: Number(fromId),
      toId: Number(toId),
      amount,
      description,
    });

    setTransactions((previous) => [{
      id: `${Date.now()}`,
      userId: String(fromId),
      userName: currentUser?.name ?? "User",
      type: "Debit",
      amount: Math.abs(amount),
      description,
      date: new Date().toISOString(),
      status: "Completed",
    }, ...previous]);
  };

  const addToSearchHistory = useCallback((term: string) => {
    const trimmed = term.trim();
    if (!trimmed || !currentUser) {
      return;
    }

    setCurrentUser((previous) => {
      if (!previous) {
        return previous;
      }

      const searchHistory = [trimmed, ...previous.searchHistory.filter((entry) => entry !== trimmed)].slice(0, 10);
      const next = { ...previous, searchHistory };
      setRegisteredUsers((users) => users.map((user) => (user.id === previous.id ? next : user)));
      return next;
    });
  }, [currentUser]);

  const logout = async (): Promise<void> => {
    try {
      const token = localStorage.getItem(AUTH_TOKEN_KEY);
      if (token) {
        await authAPI.logout();
      }
    } catch (error) {
      console.warn("Backend logout request failed. Clearing local session.", error);
    } finally {
      clearAuthentication();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        isAdmin,
        currentUser,
        registeredUsers,
        transactions,
        login,
        registerUser,
        changePassword,
        logout,
        refreshCurrentUser,
        deleteUser,
        approveVerification,
        rejectVerification,
        updateUserStatus,
        updateUserRole,
        submitVerification,
        refreshUserFromBackend,
        updateWallet,
        requestWithdrawal,
        processWithdrawal,
        transferFunds,
        addToSearchHistory,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

function passwordIsValid(password: string): boolean {
  return password.length >= 6;
}