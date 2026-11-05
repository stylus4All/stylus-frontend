import React, {
  createContext,
  useContext,
  useState,
  useEffect,
} from 'react';

import {
  Role,
  VerificationStatus,
  Transaction,
} from '../types';

import {
  authAPI,
  userAPI,
} from '../services/api';

// ============================================================
// USER INTERFACE
// ============================================================

export interface RegisteredUser {
  id: string;
  email: string;
  name: string;

  phone: string;
  address: string;

  role: Role;
  tier?: string;
  status: 'Active' | 'Suspended';

  verificationStatus: VerificationStatus;

  verificationDocs?: {
    bvn?: string;
    idType?: string;
    govIdUrl?: string;
    state?: string;
    lga?: string;
    cacNumber?: string;
    businessName?: string;
    cacCertUrl?: string;
  };

  walletBalance: number;

  suspensionReason?: string;
  adminNotes?: string;

  joined: string;

  lastActive: string;

  avgSpend: string;

  rentalHistoryCount: number;

  searchHistory: string[];

  location?: string;
}

// ============================================================
// AUTH CONTEXT TYPE
// ============================================================

interface AuthContextType {
  isAuthenticated: boolean;
  isAdmin: boolean;

  currentUser: RegisteredUser | null;

  registeredUsers: RegisteredUser[];

  transactions: Transaction[];

  login: (
    email: string,
    password?: string
  ) => Promise<boolean>;

  logout: () => void;

  registerUser: (
    name: string,
    email: string,
    password: string,
    role?: Role
  ) => Promise<void>;

  updateUserStatus: (
    id: string,
    newStatus:
      | 'Active'
      | 'Suspended',
    reason?: string
  ) => void;

  updateUserRole: (
    id: string,
    newRole: Role
  ) => void;

  updateUserNotes: (
    id: string,
    notes: string
  ) => void;

  submitVerification: (
    id: string,
    docs: Partial<
      RegisteredUser['verificationDocs']
    >
  ) => Promise<void>;

  approveVerification: (
    id: string
  ) => void;

  rejectVerification: (
    id: string,
    reason: string
  ) => void;

  updateWallet: (
    id: string,
    amount: number,
    description: string,
    type?: Transaction['type']
  ) => Promise<void>;

  transferFunds: (
    fromId: string,
    toId: string,
    amount: number,
    description: string
  ) => void;

  requestWithdrawal: (
    id: string,
    amount: number,
    bankDetails: string
  ) => void;

  processWithdrawal: (
    transactionId: string
  ) => void;

  deleteUser: (
    id: string
  ) => void;

  refreshUserFromBackend: (
    id: string
  ) => Promise<void>;

  addToSearchHistory: (
    query: string
  ) => void;
}

// ============================================================
// CONTEXT
// ============================================================

const AuthContext =
  createContext<AuthContextType>({
    isAuthenticated: false,
    isAdmin: false,

    currentUser: null,

    registeredUsers: [],

    transactions: [],

    login: async () => false,

    logout: () => { },

    registerUser:
      async () => { },

    updateUserStatus:
      () => { },

    updateUserRole:
      () => { },

    updateUserNotes:
      () => { },

    submitVerification:
      async () => { },

    approveVerification:
      () => { },

    rejectVerification:
      () => { },

    updateWallet:
      async () => { },

    transferFunds:
      () => { },

    requestWithdrawal:
      () => { },

    processWithdrawal:
      () => { },

    deleteUser:
      () => { },

    refreshUserFromBackend:
      async () => { },

    addToSearchHistory:
      () => { },
  });

// ============================================================
// HOOK
// ============================================================

export const useAuth = () =>
  useContext(AuthContext);

// ============================================================
// MAP BACKEND USER
// ============================================================

const mapBackendUserToRegisteredUser = (
  backendUser: any
): RegisteredUser => {
  if (!backendUser) {
    throw new Error(
      'Invalid user data received from the server.'
    );
  }

  // ----------------------------------------------------------
  // VERIFICATION DOCUMENTS
  // ----------------------------------------------------------

  let verificationDocs: any = {};

  if (
    typeof backendUser.verificationDocs ===
    'string'
  ) {
    try {
      verificationDocs =
        JSON.parse(
          backendUser.verificationDocs ||
          '{}'
        );
    } catch {
      verificationDocs = {};
    }
  } else {
    verificationDocs =
      backendUser.verificationDocs ||
      {};
  }

  // ----------------------------------------------------------
  // SEARCH HISTORY
  // ----------------------------------------------------------

  let searchHistory: string[] = [];

  if (
    typeof backendUser.searchHistory ===
    'string'
  ) {
    try {
      searchHistory =
        JSON.parse(
          backendUser.searchHistory ||
          '[]'
        );
    } catch {
      searchHistory = [];
    }
  } else if (
    Array.isArray(
      backendUser.searchHistory
    )
  ) {
    searchHistory =
      backendUser.searchHistory;
  }

  // ----------------------------------------------------------
  // DATES
  // ----------------------------------------------------------

  const createdAt =
    backendUser.createdAt ||
    new Date().toISOString();

  let joined = 'Just now';

  try {
    joined =
      new Date(
        createdAt
      ).toLocaleDateString(
        'en-US',
        {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        }
      );
  } catch {
    joined = 'Just now';
  }

  let lastActive = 'Just now';

  if (backendUser.lastActive) {
    try {
      lastActive =
        new Date(
          backendUser.lastActive
        ).toLocaleDateString();
    } catch {
      lastActive = 'Just now';
    }
  }

  // ----------------------------------------------------------
  // RETURN NORMALIZED USER
  // ----------------------------------------------------------

  return {
    id: String(
      backendUser.id
    ),

    name:
      backendUser.name || '',

    email:
      backendUser.email || '',

    phone:
      backendUser.phone || '',

    address:
      backendUser.address || '',

    tier:
      backendUser.tier ||
      'Gold',

    role:
      backendUser.role ||
      'User',

    status:
      backendUser.status ||
      'Active',

    verificationStatus:
      backendUser.verificationStatus ||
      'Unverified',

    verificationDocs,

    walletBalance:
      Number(
        backendUser.walletBalance ||
        0
      ),

    suspensionReason:
      backendUser.suspensionReason,

    adminNotes:
      backendUser.adminNotes,

    joined,

    lastActive,

    avgSpend:
      backendUser.avgSpend ||
      '$0',

    rentalHistoryCount:
      Number(
        backendUser.rentalHistoryCount ||
        0
      ),

    searchHistory,

    location:
      backendUser.location ||
      '',
  };
};

// ============================================================
// AUTH PROVIDER
// ============================================================

export const AuthProvider: React.FC<{
  children: React.ReactNode;
}> = ({
  children,
}) => {

    const [
      isAuthenticated,
      setIsAuthenticated,
    ] = useState(false);

    const [
      isAdmin,
      setIsAdmin,
    ] = useState(false);

    const [
      currentUser,
      setCurrentUser,
    ] =
      useState<RegisteredUser | null>(
        null
      );

    const [
      registeredUsers,
      setRegisteredUsers,
    ] = useState<
      RegisteredUser[]
    >([]);

    const [
      transactions,
      setTransactions,
    ] = useState<
      Transaction[]
    >([]);

    const [
      isInitializing,
      setIsInitializing,
    ] = useState(true);

    // ==========================================================
    // INITIALIZE AUTHENTICATION
    // ==========================================================

    useEffect(() => {

      const initializeAuth =
        async () => {

          const token =
            localStorage.getItem(
              'authToken'
            );

          if (!token) {
            setIsInitializing(
              false
            );
            return;
          }

          try {

            const response =
              await authAPI.getCurrentUser();

            const backendUser =
              response?.user ||
              response;

            if (!backendUser) {
              throw new Error(
                'No user returned by server.'
              );
            }

            const mappedUser =
              mapBackendUserToRegisteredUser(
                backendUser
              );

            setCurrentUser(
              mappedUser
            );

            setIsAuthenticated(
              true
            );

            setIsAdmin(
              mappedUser.role ===
              'Admin'
            );

            setRegisteredUsers(
              prev => {

                const exists =
                  prev.some(
                    user =>
                      user.id ===
                      mappedUser.id
                  );

                if (exists) {
                  return prev.map(
                    user =>
                      user.id ===
                        mappedUser.id
                        ? mappedUser
                        : user
                  );
                }

                return [
                  ...prev,
                  mappedUser,
                ];
              }
            );

          } catch (error) {

            console.warn(
              'Stored authentication is no longer valid:',
              error
            );

            localStorage.removeItem(
              'authToken'
            );

            localStorage.removeItem(
              'stylus_auth'
            );

            localStorage.removeItem(
              'stylus_user_id'
            );

            setIsAuthenticated(
              false
            );

            setIsAdmin(false);

            setCurrentUser(null);

          } finally {

            setIsInitializing(
              false
            );
          }
        };

      initializeAuth();

    }, []);

    // ==========================================================
    // LOGIN
    // ==========================================================

    const login = async (
      email: string,
      password?: string
    ): Promise<boolean> => {

      if (
        !email.trim() ||
        !password
      ) {
        return false;
      }

      try {

        const response =
          await authAPI.login({
            email:
              email.trim(),
            password,
          });

        console.log(
          'Login response:',
          response
        );

        const token =
          response?.token ||
          response?.accessToken;

        const backendUser =
          response?.user;

        if (!backendUser) {
          throw new Error(
            response?.message ||
            'Login succeeded but the server did not return user information.'
          );
        }

        if (!token) {
          throw new Error(
            'Login succeeded but the server did not return an authentication token.'
          );
        }

        const mappedUser =
          mapBackendUserToRegisteredUser(
            backendUser
          );

        // --------------------------------------------------------
        // SAVE AUTHENTICATION
        // --------------------------------------------------------

        localStorage.setItem(
          'authToken',
          token
        );

        localStorage.setItem(
          'stylus_auth',
          'true'
        );

        localStorage.setItem(
          'stylus_user_id',
          mappedUser.id
        );

        // --------------------------------------------------------
        // UPDATE STATE
        // --------------------------------------------------------

        setCurrentUser(
          mappedUser
        );

        setIsAuthenticated(
          true
        );

        setIsAdmin(
          mappedUser.role ===
          'Admin'
        );

        setRegisteredUsers(
          prev => {

            const exists =
              prev.some(
                user =>
                  user.id ===
                  mappedUser.id
              );

            if (exists) {
              return prev.map(
                user =>
                  user.id ===
                    mappedUser.id
                    ? mappedUser
                    : user
              );
            }

            return [
              ...prev,
              mappedUser,
            ];
          }
        );

        return true;

      } catch (error) {

        console.error(
          'Login failed:',
          error
        );

        return false;
      }
    };

    // ==========================================================
    // REGISTER
    //
    // IMPORTANT:
    // Registration does NOT automatically authenticate the user.
    // The user must log in after registration.
    // ==========================================================

    const registerUser = async (
      name: string,
      email: string,
      password: string,
      role: Role = 'User'
    ): Promise<void> => {

      if (!name.trim()) {
        throw new Error(
          'Please enter your name.'
        );
      }

      if (!email.trim()) {
        throw new Error(
          'Please enter your email address.'
        );
      }

      if (!password) {
        throw new Error(
          'Please enter a password.'
        );
      }

      try {

        const response =
          await authAPI.register({
            name:
              name.trim(),

            email:
              email
                .trim()
                .toLowerCase(),

            password,

            role,
          });

        console.log(
          'Registration response:',
          response
        );

        /*
         * We intentionally DO NOT:
         *
         * - save a token
         * - set isAuthenticated(true)
         * - set currentUser
         * - redirect to dashboard
         *
         * Registration only creates the account.
         */

        if (
          response?.success === false
        ) {
          throw new Error(
            response?.message ||
            'Registration failed.'
          );
        }

        return;

      } catch (error: any) {

        console.error(
          'Registration failed:',
          error
        );

        throw new Error(
          error?.message ||
          'Registration failed. Please try again.'
        );
      }
    };

    // ==========================================================
    // LOGOUT
    // ==========================================================

    const logout = () => {

      // --------------------------------------------------------
      // Clear local authentication immediately.
      // --------------------------------------------------------

      localStorage.removeItem(
        'authToken'
      );

      localStorage.removeItem(
        'stylus_auth'
      );

      localStorage.removeItem(
        'stylus_user_id'
      );

      setIsAuthenticated(
        false
      );

      setIsAdmin(false);

      setCurrentUser(null);

      // --------------------------------------------------------
      // Notify backend.
      // --------------------------------------------------------

      authAPI
        .logout()
        .catch(error => {
          console.warn(
            'Backend logout request failed:',
            error
          );
        });
    };

    // ==========================================================
    // UPDATE USER STATUS
    // ==========================================================

    const updateUserStatus = (
      id: string,
      newStatus:
        | 'Active'
        | 'Suspended',
      reason?: string
    ) => {

      const updatedUsers =
        registeredUsers.map(
          user =>
            user.id === id
              ? {
                ...user,
                status:
                  newStatus,
                suspensionReason:
                  reason,
              }
              : user
        );

      setRegisteredUsers(
        updatedUsers
      );

      if (
        currentUser?.id === id
      ) {

        const updatedUser =
          updatedUsers.find(
            user =>
              user.id === id
          );

        if (updatedUser) {
          setCurrentUser(
            updatedUser
          );
        }
      }
    };

    // ==========================================================
    // UPDATE USER ROLE
    // ==========================================================

    const updateUserRole = (
      id: string,
      newRole: Role
    ) => {

      const updatedUsers =
        registeredUsers.map(
          user =>
            user.id === id
              ? {
                ...user,
                role:
                  newRole,
              }
              : user
        );

      setRegisteredUsers(
        updatedUsers
      );

      if (
        currentUser?.id === id
      ) {

        const updatedUser =
          updatedUsers.find(
            user =>
              user.id === id
          );

        if (updatedUser) {

          setCurrentUser(
            updatedUser
          );

          setIsAdmin(
            updatedUser.role ===
            'Admin'
          );
        }
      }
    };

    // ==========================================================
    // UPDATE USER NOTES
    // ==========================================================

    const updateUserNotes = (
      id: string,
      notes: string
    ) => {

      setRegisteredUsers(
        prev =>
          prev.map(
            user =>
              user.id === id
                ? {
                  ...user,
                  adminNotes:
                    notes,
                }
                : user
          )
      );
    };

    // ==========================================================
    // SUBMIT VERIFICATION
    // ==========================================================

    const submitVerification =
      async (
        id: string,
        docs: Partial<
          RegisteredUser['verificationDocs']
        >
      ) => {

        try {

          const response =
            await userAPI.submitVerification(
              Number(id),
              docs
            );

          const backendUser =
            response?.user ||
            response;

          const updatedUser =
            mapBackendUserToRegisteredUser(
              backendUser
            );

          setRegisteredUsers(
            prev =>
              prev.map(
                user =>
                  user.id === id
                    ? updatedUser
                    : user
              )
          );

          if (
            currentUser?.id === id
          ) {
            setCurrentUser(
              updatedUser
            );
          }

        } catch (error) {

          console.error(
            'Verification submission failed:',
            error
          );

          throw error;
        }
      };

    // ==========================================================
    // APPROVE VERIFICATION
    // ==========================================================

    const approveVerification = (
      id: string
    ) => {

      const updatedUsers =
        registeredUsers.map(
          user =>
            user.id === id
              ? {
                ...user,
                verificationStatus:
                  'Verified' as VerificationStatus,
              }
              : user
        );

      setRegisteredUsers(
        updatedUsers
      );

      if (
        currentUser?.id === id
      ) {

        const updatedUser =
          updatedUsers.find(
            user =>
              user.id === id
          );

        if (updatedUser) {
          setCurrentUser(
            updatedUser
          );
        }
      }
    };

    // ==========================================================
    // REJECT VERIFICATION
    // ==========================================================

    const rejectVerification = (
      id: string,
      reason: string
    ) => {

      const updatedUsers =
        registeredUsers.map(
          user =>
            user.id === id
              ? {
                ...user,
                verificationStatus:
                  'Rejected' as VerificationStatus,
                adminNotes:
                  reason,
              }
              : user
        );

      setRegisteredUsers(
        updatedUsers
      );

      if (
        currentUser?.id === id
      ) {

        const updatedUser =
          updatedUsers.find(
            user =>
              user.id === id
          );

        if (updatedUser) {
          setCurrentUser(
            updatedUser
          );
        }
      }
    };

    // ==========================================================
    // UPDATE WALLET
    // ==========================================================

    const updateWallet = async (
      id: string,
      amount: number,
      description: string,
      type:
        Transaction['type'] =
        amount > 0
          ? 'Credit'
          : 'Debit'
    ) => {

      try {

        const response =
          await userAPI.updateWallet(
            Number(id),
            amount
          );

        const backendUser =
          response?.user ||
          response;

        const updatedUser =
          mapBackendUserToRegisteredUser(
            backendUser
          );

        setRegisteredUsers(
          prev =>
            prev.map(
              user =>
                user.id === id
                  ? updatedUser
                  : user
            )
        );

        const newTransaction:
          Transaction = {

          id:
            `tx-${Date.now()}`,

          userId:
            id,

          userName:
            updatedUser.name,

          type,

          amount:
            Math.abs(amount),

          description,

          date:
            new Date()
              .toLocaleDateString(),

          status:
            'Completed',

          paymentMethod:
            'Wallet',
        };

        setTransactions(
          prev => [
            newTransaction,
            ...prev,
          ]
        );

        if (
          currentUser?.id === id
        ) {
          setCurrentUser(
            updatedUser
          );
        }

      } catch (error) {

        console.error(
          'Wallet update failed:',
          error
        );

        throw error;
      }
    };

    // ==========================================================
    // TRANSFER FUNDS
    // ==========================================================

    const transferFunds = (
      fromId: string,
      toId: string,
      amount: number,
      description: string
    ) => {

      updateWallet(
        fromId,
        -amount,
        `Payment Out: ${description}`,
        'Debit'
      ).catch(console.error);

      updateWallet(
        toId,
        amount,
        `Payment In: ${description}`,
        'Credit'
      ).catch(console.error);
    };

    // ==========================================================
    // REQUEST WITHDRAWAL
    // ==========================================================

    const requestWithdrawal = (
      id: string,
      amount: number,
      bankDetails: string
    ) => {

      const updatedUsers =
        registeredUsers.map(
          user =>
            user.id === id
              ? {
                ...user,
                walletBalance:
                  user.walletBalance -
                  amount,
              }
              : user
        );

      setRegisteredUsers(
        updatedUsers
      );

      const user =
        registeredUsers.find(
          item =>
            item.id === id
        );

      const withdrawalTx:
        Transaction = {

        id:
          `tx-wd-${Date.now()}`,

        userId:
          id,

        userName:
          user?.name ||
          'Unknown',

        type:
          'Withdrawal',

        amount,

        description:
          `Withdrawal to ${bankDetails}`,

        date:
          new Date()
            .toLocaleDateString(),

        status:
          'Pending',

        paymentMethod:
          'Bank Transfer',
      };

      setTransactions(
        prev => [
          withdrawalTx,
          ...prev,
        ]
      );

      if (
        currentUser?.id === id
      ) {

        const updatedUser =
          updatedUsers.find(
            user =>
              user.id === id
          );

        if (updatedUser) {
          setCurrentUser(
            updatedUser
          );
        }
      }
    };

    // ==========================================================
    // PROCESS WITHDRAWAL
    // ==========================================================

    const processWithdrawal = (
      transactionId: string
    ) => {

      setTransactions(
        prev =>
          prev.map(
            transaction =>
              transaction.id ===
                transactionId
                ? {
                  ...transaction,
                  status:
                    'Completed',
                }
                : transaction
          )
      );
    };

    // ==========================================================
    // DELETE USER
    // ==========================================================

    const deleteUser = (
      id: string
    ) => {

      setRegisteredUsers(
        prev =>
          prev.filter(
            user =>
              user.id !== id
          )
      );

      if (
        currentUser?.id === id
      ) {
        logout();
      }
    };

    // ==========================================================
    // REFRESH USER
    // ==========================================================

    const refreshUserFromBackend =
      async (
        id: string
      ) => {

        try {

          const response =
            await userAPI.getById(
              Number(id)
            );

          const backendUser =
            response?.user ||
            response;

          const mapped =
            mapBackendUserToRegisteredUser(
              backendUser
            );

          setRegisteredUsers(
            prev =>
              prev.map(
                user =>
                  user.id === id
                    ? mapped
                    : user
              )
          );

          if (
            currentUser?.id === id
          ) {
            setCurrentUser(
              mapped
            );
          }

        } catch (error) {

          console.error(
            'Failed to refresh user from backend:',
            error
          );

          throw error;
        }
      };

    // ==========================================================
    // SEARCH HISTORY
    // ==========================================================

    const addToSearchHistory = (
      query: string
    ) => {

      if (!currentUser) {
        return;
      }

      const history =
        currentUser.searchHistory ||
        [];

      const newHistory =
        [
          query,
          ...history.filter(
            item =>
              item !== query
          ),
        ].slice(0, 5);

      const updatedUsers =
        registeredUsers.map(
          user =>
            user.id ===
              currentUser.id
              ? {
                ...user,
                searchHistory:
                  newHistory,
              }
              : user
        );

      setRegisteredUsers(
        updatedUsers
      );

      setCurrentUser({
        ...currentUser,
        searchHistory:
          newHistory,
      });
    };

    // ==========================================================
    // CONTEXT VALUE
    // ==========================================================

    const contextValue:
      AuthContextType = {

      isAuthenticated,

      isAdmin,

      currentUser,

      registeredUsers,

      transactions,

      login,

      logout,

      registerUser,

      updateUserStatus,

      updateUserRole,

      updateUserNotes,

      submitVerification,

      approveVerification,

      rejectVerification,

      updateWallet,

      transferFunds,

      requestWithdrawal,

      processWithdrawal,

      deleteUser,

      refreshUserFromBackend,

      addToSearchHistory,
    };

    // ==========================================================
    // PROVIDER
    // ==========================================================

    return (
      <AuthContext.Provider
        value={contextValue}
      >
        {children}
      </AuthContext.Provider>
    );
  };

