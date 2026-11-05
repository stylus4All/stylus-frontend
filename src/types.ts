import { Images } from "lucide-react";


export enum Category {
  WOMEN = 'Women',
  MEN = 'Men',
  ACCESSORIES = 'Accessories',
  WATCHES = 'Watches',
  BAGS = 'Bags'
}

export type SortOption = 'newest' | 'price_asc' | 'price_desc';
export type Role = 'User' | 'Partner' | 'Admin';
export type VerificationStatus = 'Unverified' | 'Pending' | 'Verified' | 'Rejected';
export type OrderStatus = 'Processing' | 'Pending Approval' | 'Accepted' | 'Shipped' | 'Completed' | 'Returned' | 'Cancelled' | 'Rejected';

export interface Review {
  id: string;
  author: string;
  rating: number;
  comment: string;
  date: string;
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

// export interface Product {
//   id: string;
//   name: string;
//   brand: string;
//   category: Category;
//   rentalPrice: number;
//   retailPrice: number;
//   buyPrice?: number;
//   isForSale?: boolean;
//   ownerId?: string;
//   images: string[];
//   description: string;
//   availableSizes: string[];
//   color: string;
//   occasion: string;
//   condition?: string;
//   reviews: Review[];
//   rentalCount?: number;
//   autoSellAfterRentals?: number;
//   rentalDuration?: number;
//   approval?: {
//     images?: 'Pending' | 'Approved' | 'Rejected';
//     price?: 'Pending' | 'Approved' | 'Rejected';
//     description?: 'Pending' | 'Approved' | 'Rejected';
//     status?: 'Pending' | 'Approved' | 'Rejected';
//     notes?: string;
//   };
// }

export interface ProductFilter {
  category: Category | 'All';
  searchQuery: string;
  color: string;
  size: string;
  occasion: string;
  maxPrice: number;
  sortBy: SortOption;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
}

export interface Transaction {
  id: string;
  userId: string;
  userName: string;
  type: 'Credit' | 'Debit' | 'Withdrawal' | 'Fee';
  amount: number;
  description: string;
  date: string;
  status: 'Pending' | 'Completed' | 'Failed';
  paymentMethod?: string; // e.g. "Wallet", "Bank Transfer", "Card ending ****"
}

export interface UserProfile {
  name: string;
  memberSince: string;
  subscriptionTier: 'Gold' | 'Platinum' | 'Diamond';
  activeRentals: number;
}