import axios, {
  AxiosError,
  AxiosRequestConfig,
  InternalAxiosRequestConfig,
} from "axios";

type ApiRequestConfig = AxiosRequestConfig & {
  body?: unknown;
};

// ============================================================
// API BASE URL
// ============================================================

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  import.meta.env.VITE_API_URL ||
  "https://stylus-backend-dbsi.onrender.com";

// ============================================================
// Axios Client
// ============================================================

const apiClient = axios.create({
  baseURL: `${API_BASE_URL.replace(/\/+$/, "").replace(/\/api$/, "")}/api`,
  headers: {
    "Content-Type": "application/json",
  },
});

// ============================================================
// Request Interceptor
// ============================================================

apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem("authToken");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Allow FormData uploads.
    // The browser must set the multipart boundary automatically.
    if (config.data instanceof FormData) {
      delete config.headers["Content-Type"];
    }

    return config;
  },
  (error) => Promise.reject(error),
);

// ============================================================
// Response / Error Helper
// ============================================================

function getApiErrorMessage(
  error: AxiosError<{
    error?: string;
    message?: string;
  }>,
): string {
  const responseData = error.response?.data;

  if (typeof responseData === "string") {
    return responseData;
  }

  if (responseData?.error) {
    return responseData.error;
  }

  if (responseData?.message) {
    return responseData.message;
  }

  if (error.response?.status) {
    return `API error: ${error.response.status}`;
  }

  return "Network error. Please check your connection and try again.";
}

// ============================================================
// Generic API Request
// ============================================================

export async function apiCall<T = unknown>(
  endpoint: string,
  config: ApiRequestConfig = {},
): Promise<T> {
  try {
    const path = endpoint.startsWith("/api")
      ? endpoint.slice("/api".length)
      : endpoint;

    const { body, ...axiosConfig } = config;

    const response = await apiClient.request<T>({
      ...axiosConfig,
      url: path,
      ...(body !== undefined ? { data: body } : {}),
    });

    return response.data;
  } catch (error: unknown) {
    if (axios.isAxiosError(error)) {
      throw new Error(
        getApiErrorMessage(
          error as AxiosError<{
            error?: string;
            message?: string;
          }>,
        ),
      );
    }

    if (error instanceof Error) {
      throw error;
    }

    throw new Error("An unexpected error occurred.");
  }
}

// ============================================================
// Authentication Types
// ============================================================

export interface AuthUserResponse {
  id: number;
  email: string;
  name: string;

  phone?: string | null;
  address?: string | null;

  role: "User" | "Partner" | "Admin";

  tier?: string;

  status: "Active" | "Suspended";

  verificationStatus: "Verified" | "Unverified" | "Pending" | "Rejected";

  walletBalance?: number;

  location?: string | null;

  joined?: string;
  lastActive?: string;

  avgSpend?: number | string;

  rentalHistoryCount?: number;

  searchHistory?: string[] | string;

  suspensionReason?: string | null;

  adminNotes?: string | null;

  createdAt: string;
  updatedAt: string;

  verificationDocs?: unknown;
}

export interface AuthResponse {
  user: AuthUserResponse;
  token: string;
}

export interface CurrentUserResponse {
  user: AuthUserResponse;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface AdminDashboardMetrics {
  users: number;
  partners: number;
  products: number;
  orders: number;
  rentals: number;
  transactions: number;
}

export interface AdminUserUpdate {
  role?: "User" | "Partner" | "Admin";
  status?: "Active" | "Suspended";
  reason?: string;
  adminNotes?: string;
}

export interface PartnerVerificationUpdate {
  verificationStatus?: "Pending" | "Verified" | "Rejected";
  adminNotes?: string;
}

// ============================================================
// Auth APIs
// ============================================================

export const authAPI = {
  register: (data: {
    email: string;
    password: string;
    name: string;
    phone?: string;
    address?: string;
    role?: "User" | "Partner" | "Admin";
    location?: string;
  }) =>
    apiCall<AuthResponse>("/auth/register", {
      method: "POST",
      body: data,
    }),

  login: (data: { email: string; password: string }) =>
    apiCall<AuthResponse>("/auth/login", {
      method: "POST",
      body: data,
    }),

  getCurrentUser: () => apiCall<CurrentUserResponse>("/auth/me"),

  changePassword: (data: { oldPassword: string; newPassword: string }) =>
    apiCall<{ message: string }>("/auth/change-password", {
      method: "POST",
      body: data,
    }),

  logout: () =>
    apiCall<{ message: string }>("/auth/logout", {
      method: "POST",
    }),
};

// ============================================================
// User APIs
// ============================================================

export const userAPI = {
  getAll: () => apiCall<AuthUserResponse[]>("/users"),

  getById: (id: number) => apiCall<AuthUserResponse>(`/users/${id}`),

  create: (data: Record<string, unknown>) =>
    apiCall<AuthUserResponse>("/users", {
      method: "POST",
      body: data,
    }),

  update: (id: number, data: Record<string, unknown>) =>
    apiCall<AuthUserResponse>(`/users/${id}`, {
      method: "PATCH",
      body: data,
    }),

  updateStatus: (id: number, status: "Active" | "Suspended", reason?: string) =>
    apiCall<AuthUserResponse>(`/users/${id}/status`, {
      method: "PATCH",
      body: {
        status,
        ...(reason ? { reason } : {}),
      },
    }),

  updateRole: (id: number, role: "User" | "Partner" | "Admin") =>
    apiCall<AuthUserResponse>(`/users/${id}/role`, {
      method: "PATCH",
      body: { role },
    }),

  submitVerification: (id: number, docs: Record<string, unknown>) =>
    apiCall<AuthUserResponse>(`/users/${id}/verify`, {
      method: "POST",
      body: docs,
    }),

  approveVerification: (id: number) =>
    apiCall<AuthUserResponse>(`/users/${id}/approve-verification`, {
      method: "POST",
    }),

  rejectVerification: (id: number, reason: string) =>
    apiCall<AuthUserResponse>(`/users/${id}/reject-verification`, {
      method: "POST",
      body: { reason },
    }),

  updateWallet: (id: number, amount: number) =>
    apiCall<AuthUserResponse>(`/users/${id}/wallet`, {
      method: "PATCH",
      body: { amount },
    }),

  delete: (id: number) =>
    apiCall<{ message: string }>(`/users/${id}`, {
      method: "DELETE",
    }),
};

// ============================================================
// Product APIs
// ============================================================

export interface Product {
  id: string;
  ownerId: number;
  name: string;
  brand: string;
  category: string;

  rentalPrice: number;
  retailPrice: number;
  buyPrice: number;

  description?: string | null;
  color?: string | null;
  occasion?: string | null;

  availableSizes: string[];
  images: string[];

  isForSale: boolean;

  autoSellAfterRentals: number;
  rentalCount: number;

  status: "Pending" | "Approved" | "Rejected";
  rejectionReason?: string | null;

  createdAt: string;
  updatedAt: string;

  owner?: {
    id: number;
    name: string;
    email: string;
  };

  reviews?: ProductReview[];
}

export interface ProductReview {
  id: string;
  rating?: number;
  comment?: string | null;

  user?: {
    id: number;
    name: string;
  };
}

export interface CreateProductData {
  ownerId: number;
  name: string;
  brand: string;
  category: string;
  rentalPrice: number;
  retailPrice: number;

  buyPrice?: number;
  description?: string;
  color?: string;
  occasion?: string;

  availableSizes?: string[];

  isForSale?: boolean;
  autoSellAfterRentals?: number;
}

export interface UpdateProductData {
  name?: string;
  brand?: string;
  category?: string;

  rentalPrice?: number;
  retailPrice?: number;
  buyPrice?: number;

  description?: string;
  color?: string;
  occasion?: string;

  availableSizes?: string[];
  images?: string[];

  isForSale?: boolean;
  autoSellAfterRentals?: number;

  rentalCount?: number;

  status?: "Pending" | "Approved" | "Rejected";

  rejectionReason?: string | null;
}

export interface ProductFilters {
  category?: string;
  searchQuery?: string;
  maxPrice?: number;
  sortBy?: string;
}

/**
 * ============================================================
 * PRODUCT API
 * ============================================================
 */

export const productAPI = {
  /**
   * Get approved products.
   */
  getAll: (filters?: ProductFilters): Promise<Product[]> => {
    const params = new URLSearchParams();

    if (filters?.category && filters.category !== "All") {
      params.append("category", filters.category);
    }

    if (filters?.searchQuery) {
      params.append("searchQuery", filters.searchQuery);
    }

    if (filters?.maxPrice !== undefined) {
      params.append("maxPrice", String(filters.maxPrice));
    }

    if (filters?.sortBy) {
      params.append("sortBy", filters.sortBy);
    }

    const query = params.toString();

    return apiCall<Product[]>(`/products${query ? `?${query}` : ""}`);
  },

  /**
   * Get one product.
   */
  getById: (id: string): Promise<Product> =>
    apiCall<Product>(`/products/${id}`),

  /** Create a product and optionally upload its image files in the same request. */
  create: (data: CreateProductData, files: File[] = []): Promise<Product> => {
    if (files.length === 0) {
      return apiCall<Product>("/products", {
        method: "POST",
        body: data,
      });
    }

    const formData = new FormData();

    Object.entries(data).forEach(([key, value]) => {
      if (value === undefined || value === null) return;
      formData.append(
        key,
        Array.isArray(value) ? JSON.stringify(value) : String(value),
      );
    });

    files.forEach((file) => formData.append("images", file));

    return apiCall<Product>("/products", {
      method: "POST",
      body: formData,
    });
  },

  /**
   * Update product information.
   */
  update: (id: string, data: UpdateProductData): Promise<Product> =>
    apiCall<Product>(`/products/${id}`, {
      method: "PATCH",
      body: data,
    }),

  /**
   * Upload product images.
   *
   * IMPORTANT:
   * Backend Multer expects:
   *
   * FormData field = "images"
   */
  uploadImages: (productId: string, files: File[]): Promise<unknown> => {
    const formData = new FormData();

    files.forEach((file) => {
      formData.append("images", file);
    });

    return apiCall<unknown>(`/products/${productId}/upload-images`, {
      method: "POST",
      body: formData,
    });
  },

  /**
   * Increment rental count.
   */
  incrementRental: (id: string): Promise<Product> =>
    apiCall<Product>(`/products/${id}/increment-rental`, {
      method: "PATCH",
    }),

  /**
   * Delete product.
   */
  delete: (id: string): Promise<{ message?: string }> =>
    apiCall<{ message?: string }>(`/products/${id}`, {
      method: "DELETE",
    }),

  /**
   * Get products belonging to a user/partner.
   */
  getByOwner: (ownerId: number): Promise<Product[]> =>
    apiCall<Product[]>(`/products/owner/${ownerId}`),
};

// ============================================================
// Order APIs
// ============================================================

export const orderAPI = {
  getAll: () => apiCall("/orders"),

  getById: (id: string) => apiCall(`/orders/${id}`),

  getByUserId: (userId: number) => apiCall(`/orders/user/${userId}`),

  create: (data: Record<string, unknown>) =>
    apiCall("/orders", {
      method: "POST",
      body: data,
    }),

  updateStatus: (id: string, status: string) =>
    apiCall(`/orders/${id}/status`, {
      method: "PATCH",
      body: { status },
    }),

  updateItemStatus: (orderId: string, itemId: string, status: string) =>
    apiCall(`/orders/${orderId}/item/${itemId}/status`, {
      method: "PATCH",
      body: { status },
    }),

  delete: (id: string) =>
    apiCall(`/orders/${id}`, {
      method: "DELETE",
    }),
};

// ============================================================
// Cart APIs
// ============================================================

export const cartAPI = {
  getCart: (userId: number) => apiCall(`/cart/${userId}`),

  addItem: (userId: number, data: Record<string, unknown>) =>
    apiCall(`/cart/${userId}/add`, {
      method: "POST",
      body: data,
    }),

  updateItem: (
    userId: number,
    cartItemId: string,
    data: Record<string, unknown>,
  ) =>
    apiCall(`/cart/${userId}/item/${cartItemId}`, {
      method: "PATCH",
      body: data,
    }),

  removeItem: (userId: number, productId: string) =>
    apiCall(`/cart/${userId}/remove/${productId}`, {
      method: "DELETE",
    }),

  clearCart: (userId: number) =>
    apiCall(`/cart/${userId}/clear`, {
      method: "DELETE",
    }),
};

// ============================================================
// Wishlist APIs
// ============================================================

export const wishlistAPI = {
  getWishlist: (userId: number) => apiCall(`/wishlist/${userId}`),

  addItem: (userId: number, productId: string) =>
    apiCall(`/wishlist/${userId}/add`, {
      method: "POST",
      body: { productId },
    }),

  removeItem: (userId: number, productId: string) =>
    apiCall(`/wishlist/${userId}/remove/${productId}`, {
      method: "DELETE",
    }),

  isInWishlist: (userId: number, productId: string) =>
    apiCall(`/wishlist/${userId}/contains/${productId}`),
};

// ============================================================
// Review APIs
// ============================================================

export const reviewAPI = {
  getProductReviews: (productId: string) =>
    apiCall(`/reviews/product/${productId}`),

  create: (data: Record<string, unknown>) =>
    apiCall("/reviews", {
      method: "POST",
      body: data,
    }),

  update: (id: string, data: Record<string, unknown>) =>
    apiCall(`/reviews/${id}`, {
      method: "PATCH",
      body: data,
    }),

  delete: (id: string) =>
    apiCall(`/reviews/${id}`, {
      method: "DELETE",
    }),
};

// ============================================================
// Transaction APIs
// ============================================================

export const transactionAPI = {
  getAll: () => apiCall("/transactions"),

  getByUserId: (userId: number) => apiCall(`/transactions/user/${userId}`),

  create: (data: Record<string, unknown>) =>
    apiCall("/transactions", {
      method: "POST",
      body: data,
    }),

  updateStatus: (id: string, status: string) =>
    apiCall(`/transactions/${id}/status`, {
      method: "PATCH",
      body: { status },
    }),

  requestWithdrawal: (data: Record<string, unknown>) =>
    apiCall("/transactions/withdrawal/request", {
      method: "POST",
      body: data,
    }),

  processWithdrawal: (id: string) =>
    apiCall(`/transactions/${id}/withdrawal/process`, {
      method: "POST",
    }),

  transfer: (data: Record<string, unknown>) =>
    apiCall("/transactions/transfer", {
      method: "POST",
      body: data,
    }),
};

// ============================================================
// Admin APIs
// ============================================================

export const adminAPI = {
  getDashboard: () => apiCall<AdminDashboardMetrics>("/admin/dashboard"),

  getOverview: () => apiCall<AdminDashboardMetrics>("/admin/overview"),

  getUsers: (page = 1, limit = 20) =>
    apiCall<PaginatedResponse<AuthUserResponse>>(
      `/admin/users?page=${page}&limit=${Math.min(limit, 100)}`,
    ),

  getUser: (id: number | string) =>
    apiCall<AuthUserResponse>(`/admin/users/${id}`),

  updateUser: (id: number | string, data: AdminUserUpdate) =>
    apiCall<AuthUserResponse>(`/admin/users/${id}`, {
      method: "PATCH",
      body: data,
    }),

  getPartners: (page = 1, limit = 20) =>
    apiCall<PaginatedResponse<AuthUserResponse>>(
      `/admin/partners?page=${page}&limit=${Math.min(limit, 100)}`,
    ),

  verifyPartner: (id: number | string, data: PartnerVerificationUpdate = {}) =>
    apiCall<AuthUserResponse>(`/admin/partners/${id}/verify`, {
      method: "PATCH",
      body: data,
    }),

  getProducts: () => apiCall("/admin/products"),

  updateProduct: (id: number | string, data: Record<string, unknown>) =>
    apiCall(`/admin/products/${id}`, {
      method: "PATCH",
      body: data,
    }),

  getOrders: () => apiCall("/admin/orders"),

  updateOrderStatus: (id: string, data: Record<string, unknown>) =>
    apiCall(`/admin/orders/${id}/status`, {
      method: "PATCH",
      body: data,
    }),

  deleteOrder: (id: string) =>
    apiCall(`/admin/orders/${id}`, {
      method: "DELETE",
    }),

  getWaitlist: (page = 1, limit = 20) =>
    apiCall<PaginatedResponse<Record<string, unknown>>>(
      `/admin/waitlist?page=${page}&limit=${Math.min(limit, 100)}`,
    ),
};

// ============================================================
// Waitlist APIs
// ============================================================

export const waitlistAPI = {
  join: (data: {
    name: string;
    email: string;
    location?: string;
    audience?: string;
  }) =>
    apiCall("/waitlist", {
      method: "POST",
      body: data,
    }),

  getAll: () => apiCall("/waitlist"),
};
