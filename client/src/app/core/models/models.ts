export interface User {
  id: string;
  name: string;
  email: string;
  role: 'client' | 'admin' | 'shopmanager';
  phone?: string;
  address?: Address;
  createdAt?: string;
  /** Only present for shop managers. */
  assignedCategories?: string[];
  assignedProducts?: string[];
  isActive?: boolean;
}

export interface Address {
  line1?: string;
  city?: string;
  province?: string;
  postalCode?: string;
  phone?: string;
}

/** Populated shop manager as returned by /api/shop-managers */
export interface ShopManager {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'shopmanager';
  assignedCategories: { _id: string; name: string; slug: string }[];
  assignedProducts: { _id: string; name: string; slug: string; images: string[] }[];
  isActive: boolean;
  createdAt: string;
}

export interface Category {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  /** Slug of the parent department, or null for a top-level one. */
  parent?: string | null;
  parentId?: number | string | null;
  /** For a department this includes everything in its sub-categories. */
  productCount?: number;
}

/** Settings for the home page's Flash Sale strip, from Admin → Flash Sale. */
export interface FlashSale {
  isEnabled: boolean;
  title: string;
  /** 'midnight' resets daily; 'endsAt' targets a fixed moment; 'none' hides the timer. */
  countdownMode: 'midnight' | 'endsAt' | 'none';
  timerLabel: string;
  endsAt: string | null;
  ctaLabel: string;
  ctaLink: string;
  limit: number;
  sort: 'popular' | 'newest' | 'priceLow' | 'priceHigh' | 'rating';
}

/** A message sent through the Contact us form, read in Admin → Messages. */
export interface ContactMessage {
  _id: string;
  name: string;
  email: string;
  subject: string;
  body: string;
  orderNumber?: string;
  isRead: boolean;
  /** Populated when a signed-in customer sent it; null for a guest. */
  user?: { _id: string; name: string; email: string } | null;
  createdAt: string;
}

/** A slide in the home page carousel, managed from Admin → Banners. */
export interface Banner {
  _id: string;
  title: string;
  subtitle?: string;
  image: string;
  /** Internal route ("/shop?deals=true") or an absolute URL. */
  link?: string;
  ctaLabel?: string;
  /** 'dark' paints light text for a dark photo; 'light' does the reverse. */
  theme?: 'dark' | 'light';
  isActive?: boolean;
  order?: number;
}

export interface ProductColor {
  name: string;
  hex: string;
  /** Photo of the product in this colour; empty when not photographed yet. */
  image?: string;
}

/** A colour offered somewhere in the catalogue, with how many products use it. */
export interface ColorOption extends ProductColor {
  count: number;
}

export interface Product {
  _id: string;
  name: string;
  slug: string;
  description: string;
  brand: string;
  category: Category | string;
  price: number;
  compareAtPrice: number;
  images: string[];
  video?: string;
  /** Empty (or absent on older products) means no colour choice. */
  colors?: ProductColor[];
  stock: number;
  rating: number;
  numReviews: number;
  unitsSold: number;
  isFeatured: boolean;
  /** Opted in to the home page Flash Sale strip; needs a live discount to show. */
  isFlashSale?: boolean;
  isActive: boolean;
  createdAt?: string;
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
  /** Chosen colour name, '' when the product has no colour choice. */
  color: string;
  colorHex: string;
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
  /** `slug` is snapshotted at checkout; orders placed before that lack it. */
  items: { product: string; name: string; slug?: string; image: string; color?: string; price: number; qty: number }[];
  shippingAddress: {
    fullName: string; line1: string; city: string; province: string; postalCode: string; phone: string;
  };
  itemsTotal: number;
  shippingFee: number;
  grandTotal: number;
  paymentMethod: string;
  paymentScreenshot?: string;
  paymentStatus: string;
  status: string;
  tracking: TrackingEvent[];
  createdAt: string;
}

export interface ContactSettings {
  uan: string;
  supportEmail: string;
  supportHours: string;
}

export interface PublicSettings {
  siteName: string;
  logoUrl: string;
  uan: string;
  supportEmail: string;
  supportHours: string;
  jazzcashPhone: string;
  jazzcashQrImage: string;
}

export interface JazzCashSettings {
  phone: string;
  qrImage: string;
}

export interface SocialSettings {
  facebookPageId: string;
  facebookPageAccessToken: string;
  facebookAutoPost: boolean;
  instagramAccountId: string;
  instagramAutoPost: boolean;
  socialPostTemplate: string;
  isConfigured?: boolean;
}

export interface SocialTestResponse {
  success: boolean;
  message: string;
  page?: {
    id: string;
    name: string;
    username?: string;
    link?: string;
    pictureUrl?: string;
  };
  instagram?: {
    id: string;
    name: string;
    username?: string;
    pictureUrl?: string;
  };
  instagramError?: string;
}

export interface SocialPostResponse {
  success: boolean;
  message: string;
  results?: {
    facebook?: { success: boolean; id: string; message: string };
    instagram?: { success: boolean; id: string; message: string };
    errors?: string[];
  };
}

export interface EmailAttachment {
  _id?: string;
  name: string;
  url: string;
  path?: string;
  size?: number;
}

export interface EmailTemplate {
  _id?: string;
  type: 'order_confirmation' | 'order_shipped' | 'order_delivered';
  title: string;
  subject: string;
  heading?: string;
  subtitle?: string;
  customMessage?: string;
  closingMessage?: string;
  footerText?: string;
  brandColor?: string;
  headerBanner?: string;
  attachments?: EmailAttachment[];
  isActive?: boolean;
  updatedAt?: string;
}
