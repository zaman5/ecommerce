export interface User {
  id: string;
  name: string;
  email: string;
  role: 'client' | 'admin';
  phone?: string;
  address?: Address;
  createdAt?: string;
}

export interface Address {
  line1?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  phone?: string;
}

export interface Category {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  productCount?: number;
}

export interface Product {
  _id: string;
  name: string;
  slug: string;
  description: string;
  brand: string;
  category: Category | string;
  ageGroup: string;
  price: number;
  compareAtPrice: number;
  images: string[];
  stock: number;
  rating: number;
  numReviews: number;
  unitsSold: number;
  isFeatured: boolean;
  isActive: boolean;
}

export interface ProductPage {
  items: Product[];
  page: number;
  pages: number;
  total: number;
}

export interface CartItem {
  product: string;
  slug: string;
  name: string;
  image: string;
  price: number;
  qty: number;
  stock: number;
}

export interface Review {
  _id: string;
  product: string;
  user: string;
  name: string;
  rating: number;
  comment: string;
  verifiedPurchase: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewSummary {
  reviews: Review[];
  average: number;
  total: number;
  breakdown: { star: number; count: number }[];
}

export interface TrackingEvent {
  status: string;
  note?: string;
  at: string;
}

/** An order a guest placed, remembered locally so they can track it later. */
export interface GuestOrderRef {
  id: string;
  orderNumber: string;
  token: string;
  placedAt: string;
}

export interface Order {
  _id: string;
  orderNumber: string;
  user: User | string | null;
  isGuest?: boolean;
  guestEmail?: string;
  /** Returned only in the checkout response, never on later fetches. */
  guestToken?: string;
  items: { product: string; name: string; image: string; price: number; qty: number }[];
  shippingAddress: {
    fullName: string; line1: string; city: string; province: string; postalCode: string; phone: string;
  };
  itemsTotal: number;
  shippingFee: number;
  grandTotal: number;
  paymentMethod: string;
  paymentStatus: string;
  status: string;
  tracking: TrackingEvent[];
  createdAt: string;
}
