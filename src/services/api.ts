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
  (import.meta.env as any).VITE_API_BASE_URL ||
  (import.meta.env as any).VITE_API_URL ||
  "https://stylus-backend-dbsi.onrender.com";

// ============================================================
// API ERROR
// ============================================================

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number, data?: any) {
    super(message);

    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

// ============================================================
// API CALL HELPER
// ============================================================

export async function apiCall(endpoint: string, options: RequestInit = {}) {
  const base = API_BASE_URL.replace(/\/+$/, "").replace(/\/api$/, "");

  const path = endpoint.startsWith("/api") ? endpoint : `/api${endpoint}`;

  const url = `${base}${path}`;

  // ----------------------------------------------------------
  // AUTH TOKEN
  // ----------------------------------------------------------

  const token = localStorage.getItem("authToken");

  // ----------------------------------------------------------
  // HEADERS
  // ----------------------------------------------------------

  const headers = new Headers(options.headers);

  if (options.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  console.log(`[Stylus API] ${options.method || "GET"} ${url}`);

  // ----------------------------------------------------------
  // REQUEST
  // ----------------------------------------------------------

  let response: Response;

  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch (error) {
    console.error("[Stylus API] Network error:", error);

    throw new ApiError(
      "Unable to connect to the Stylus server. Please check your internet connection and try again.",
      0,
      error,
    );
  }

  // ----------------------------------------------------------
  // RESPONSE
  // ----------------------------------------------------------

  const responseText = await response.text();

  let data: any = null;

  if (responseText) {
    try {
      data = JSON.parse(responseText);
    } catch {
      data = responseText;
    }
  }

  // ----------------------------------------------------------
  // ERROR RESPONSE
  // ----------------------------------------------------------

  if (!response.ok) {
    let message = `API request failed (${response.status})`;

    if (typeof data === "object" && data !== null) {
      message =
        data.error || data.message || data.details || data.msg || message;
    } else if (typeof data === "string" && data.trim()) {
      message = data;
    }

    console.error("[Stylus API] Error:", {
      status: response.status,
      url,
      message,
      data,
    });

    throw new ApiError(message, response.status, data);
  }

  return data;
}

// ============================================================
// AUTH APIs
// ============================================================

export const authAPI = {
  // ----------------------------------------------------------
  // REGISTER
  // POST /api/auth/register
  // ----------------------------------------------------------

  register: (data: {
    email: string;
    password: string;
    name: string;
    phone?: string;
    address?: string;
    role?: "User" | "Partner" | "Admin";
    location?: string;
  }) =>
    apiCall("/auth/register", {
      method: "POST",
      body: JSON.stringify({
        ...data,
        name: data.name.trim(),
        email: data.email.trim().toLowerCase(),
      }),
    }),

  // ----------------------------------------------------------
  // LOGIN
  // POST /api/auth/login
  // ----------------------------------------------------------

  login: (data: { email: string; password: string }) =>
    apiCall("/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: data.email.trim().toLowerCase(),
        password: data.password,
      }),
    }),

  // ----------------------------------------------------------
  // CURRENT USER
  // GET /api/auth/me
  // ----------------------------------------------------------

  getCurrentUser: () => apiCall("/auth/me"),

  // ----------------------------------------------------------
  // CHANGE PASSWORD
  // POST /api/auth/change-password
  // ----------------------------------------------------------

  changePassword: (data: { oldPassword: string; newPassword: string }) =>
    apiCall("/auth/change-password", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  // ----------------------------------------------------------
  // LOGOUT
  // POST /api/auth/logout
  // ----------------------------------------------------------

  logout: () =>
    apiCall("/auth/logout", {
      method: "POST",
    }),
};

// ============================================================
// USER APIs
// ============================================================

export const userAPI = {
  getAll: () => apiCall("/users"),

  getById: (id: number) => apiCall(`/users/${id}`),

  create: (data: any) =>
    apiCall("/users", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (id: number, data: any) =>
    apiCall(`/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  updateStatus: (id: number, status: string, reason?: string) =>
    apiCall(`/users/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({
        status,
        reason,
      }),
    }),

  updateRole: (id: number, role: string) =>
    apiCall(`/users/${id}/role`, {
      method: "PATCH",
      body: JSON.stringify({
        role,
      }),
    }),

  submitVerification: (id: number, docs: any) =>
    apiCall(`/users/${id}/verify`, {
      method: "POST",
      body: JSON.stringify(docs),
    }),

  approveVerification: (id: number) =>
    apiCall(`/users/${id}/approve-verification`, {
      method: "POST",
    }),

  rejectVerification: (id: number, reason: string) =>
    apiCall(`/users/${id}/reject-verification`, {
      method: "POST",
      body: JSON.stringify({
        reason,
      }),
    }),

  updateWallet: (id: number, amount: number) =>
    apiCall(`/users/${id}/wallet`, {
      method: "PATCH",
      body: JSON.stringify({
        amount,
      }),
    }),

  delete: (id: number) =>
    apiCall(`/users/${id}`, {
      method: "DELETE",
    }),
};

// ============================================================
// PRODUCT APIs
// ============================================================

export const productAPI = {
  getAll: (filters?: any) => {
    const params = new URLSearchParams();

    if (filters?.category) {
      params.append("category", filters.category);
    }

    if (filters?.searchQuery) {
      params.append("searchQuery", filters.searchQuery);
    }

    if (filters?.maxPrice) {
      params.append("maxPrice", String(filters.maxPrice));
    }

    if (filters?.sortBy) {
      params.append("sortBy", filters.sortBy);
    }

    const query = params.toString();

    return apiCall(`/products${query ? `?${query}` : ""}`);
  },

  getById: (id: string) => apiCall(`/products/${id}`),

  create: (data: any) =>
    apiCall("/products", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (id: string, data: any) =>
    apiCall(`/products/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  incrementRental: (id: string) =>
    apiCall(`/products/${id}/increment-rental`, {
      method: "PATCH",
    }),

  delete: (id: string) =>
    apiCall(`/products/${id}`, {
      method: "DELETE",
    }),

  getByOwner: (ownerId: number) => apiCall(`/products/owner/${ownerId}`),
};

// ============================================================
// ORDER APIs
// ============================================================

export const orderAPI = {
  getAll: () => apiCall("/orders"),

  getById: (id: string) => apiCall(`/orders/${id}`),

  getByUserId: (userId: number) => apiCall(`/orders/user/${userId}`),

  create: (data: any) =>
    apiCall("/orders", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateStatus: (id: string, status: string) =>
    apiCall(`/orders/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({
        status,
      }),
    }),

  updateItemStatus: (orderId: string, itemId: string, status: string) =>
    apiCall(`/orders/${orderId}/item/${itemId}/status`, {
      method: "PATCH",
      body: JSON.stringify({
        status,
      }),
    }),

  delete: (id: string) =>
    apiCall(`/orders/${id}`, {
      method: "DELETE",
    }),
};

// ============================================================
// CART APIs
// ============================================================

export const cartAPI = {
  getCart: (userId: number) => apiCall(`/cart/${userId}`),

  addItem: (userId: number, data: any) =>
    apiCall(`/cart/${userId}/add`, {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateItem: (userId: number, cartItemId: string, data: any) =>
    apiCall(`/cart/${userId}/item/${cartItemId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
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
// WISHLIST APIs
// ============================================================

export const wishlistAPI = {
  getWishlist: (userId: number) => apiCall(`/wishlist/${userId}`),

  addItem: (userId: number, productId: string) =>
    apiCall(`/wishlist/${userId}/add`, {
      method: "POST",
      body: JSON.stringify({
        productId,
      }),
    }),

  removeItem: (userId: number, productId: string) =>
    apiCall(`/wishlist/${userId}/remove/${productId}`, {
      method: "DELETE",
    }),

  isInWishlist: (userId: number, productId: string) =>
    apiCall(`/wishlist/${userId}/contains/${productId}`),
};

// ============================================================
// REVIEW APIs
// ============================================================

export const reviewAPI = {
  getProductReviews: (productId: string) =>
    apiCall(`/reviews/product/${productId}`),

  create: (data: any) =>
    apiCall("/reviews", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (id: string, data: any) =>
    apiCall(`/reviews/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    apiCall(`/reviews/${id}`, {
      method: "DELETE",
    }),
};

// ============================================================
// TRANSACTION APIs
// ============================================================

export const transactionAPI = {
  getAll: () => apiCall("/transactions"),

  getByUserId: (userId: number) => apiCall(`/transactions/user/${userId}`),

  create: (data: any) =>
    apiCall("/transactions", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  updateStatus: (id: string, status: string) =>
    apiCall(`/transactions/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({
        status,
      }),
    }),

  requestWithdrawal: (data: any) =>
    apiCall("/transactions/withdrawal/request", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  processWithdrawal: (id: string) =>
    apiCall(`/transactions/${id}/withdrawal/process`, {
      method: "POST",
    }),

  transfer: (data: any) =>
    apiCall("/transactions/transfer", {
      method: "POST",
      body: JSON.stringify(data),
    }),
};

// ============================================================
// ADMIN APIs
// ============================================================

export const adminAPI = {
  getOverview: () => apiCall("/admin/overview"),

  getUsers: () => apiCall("/admin/users"),

  updateUser: (id: number | string, data: any) =>
    apiCall(`/admin/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  getProducts: () => apiCall("/admin/products"),

  updateProduct: (id: number | string, data: any) =>
    apiCall(`/admin/products/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  getOrders: () => apiCall("/admin/orders"),

  updateOrderStatus: (id: string, data: any) =>
    apiCall(`/admin/orders/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify(data),
    }),

  deleteOrder: (id: string) =>
    apiCall(`/admin/orders/${id}`, {
      method: "DELETE",
    }),
};

// ============================================================
// WAITLIST APIs
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
      body: JSON.stringify({
        ...data,
        name: data.name.trim(),
        email: data.email.trim().toLowerCase(),
      }),
    }),

  getAll: () => apiCall("/waitlist"),
};
