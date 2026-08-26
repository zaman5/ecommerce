import { PATTERNS } from '../middleware/validator.js';

/**
 * ─────────────────────────────────────────────────────────────
 * AUTHENTICATION SCHEMAS
 * ─────────────────────────────────────────────────────────────
 */

export const registerSchema = {
  required: true,
  strict: true,
  properties: {
    name: {
      type: 'string',
      required: true,
      minLength: 2,
      maxLength: 100,
    },
    email: {
      type: 'string',
      required: true,
      minLength: 5,
      maxLength: 254,
      pattern: PATTERNS.EMAIL,
      patternMessage: 'Please enter a valid email address.',
    },
    password: {
      type: 'string',
      required: true,
      minLength: 8,
      maxLength: 128,
      pattern: PATTERNS.PASSWORD,
      patternMessage: 'Password must be at least 8 characters long and contain both letters and numbers.',
    },
    phone: {
      type: 'string',
      required: true,
      minLength: 8,
      maxLength: 25,
      pattern: PATTERNS.PHONE,
      patternMessage: 'Please enter a valid phone number (at least 8 digits).',
    },
  },
};

export const loginSchema = {
  required: true,
  strict: true,
  properties: {
    email: {
      type: 'string',
      required: true,
      minLength: 3,
      maxLength: 254,
      pattern: PATTERNS.EMAIL,
      patternMessage: 'Please enter a valid email address.',
    },
    password: {
      type: 'string',
      required: true,
      minLength: 1,
      maxLength: 128,
    },
  },
};

export const updateProfileSchema = {
  required: true,
  strict: true,
  properties: {
    name: {
      type: 'string',
      required: false,
      minLength: 2,
      maxLength: 100,
    },
    phone: {
      type: 'string',
      required: false,
      minLength: 7,
      maxLength: 25,
      pattern: PATTERNS.PHONE,
      patternMessage: 'Please enter a valid phone number.',
    },
    address: {
      type: 'object',
      required: false,
      strict: true,
      properties: {
        line1: { type: 'string', required: false, maxLength: 300 },
        city: { type: 'string', required: false, maxLength: 100 },
        province: { type: 'string', required: false, maxLength: 100 },
        postalCode: { type: 'string', required: false, maxLength: 20 },
        phone: { type: 'string', required: false, maxLength: 25 },
      },
    },
  },
};

/**
 * ─────────────────────────────────────────────────────────────
 * ORDER & CHECKOUT SCHEMAS
 * ─────────────────────────────────────────────────────────────
 */

export const placeOrderSchema = {
  required: true,
  strict: true,
  properties: {
    items: {
      type: 'array',
      required: true,
      minItems: 1,
      maxItems: 100,
      items: {
        type: 'object',
        required: true,
        strict: true,
        properties: {
          product: { type: 'string', required: true, maxLength: 100 },
          qty: { type: 'integer', required: true, min: 1, max: 1000 },
          color: { type: 'string', required: false, maxLength: 60 },
        },
      },
    },
    shippingAddress: {
      type: 'object',
      required: true,
      strict: true,
      properties: {
        fullName: { type: 'string', required: true, minLength: 2, maxLength: 100 },
        line1: { type: 'string', required: true, minLength: 5, maxLength: 300 },
        line2: { type: 'string', required: false, maxLength: 300 },
        city: { type: 'string', required: true, minLength: 2, maxLength: 100 },
        province: { type: 'string', required: false, maxLength: 100 },
        postalCode: { type: 'string', required: false, maxLength: 20 },
        phone: {
          type: 'string',
          required: true,
          minLength: 8,
          maxLength: 25,
          pattern: PATTERNS.PHONE,
          patternMessage: 'Please enter a valid shipping contact phone number.',
        },
      },
    },
    paymentMethod: {
      type: 'string',
      required: true,
      enum: ['cod', 'jazzcash'],
    },
    email: {
      type: 'string',
      required: false,
      maxLength: 254,
      pattern: PATTERNS.EMAIL,
      patternMessage: 'Please provide a valid email address for order confirmation.',
    },
    paymentScreenshot: {
      type: 'string',
      required: false,
      maxLength: 500,
    },
  },
};

export const lookupOrderSchema = {
  required: true,
  strict: true,
  properties: {
    orderNumber: {
      type: 'string',
      required: true,
      minLength: 3,
      maxLength: 50,
    },
    email: {
      type: 'string',
      required: true,
      minLength: 5,
      maxLength: 254,
      pattern: PATTERNS.EMAIL,
      patternMessage: 'Please enter a valid email address.',
    },
  },
};

export const updateOrderStatusSchema = {
  required: true,
  strict: true,
  properties: {
    status: {
      type: 'string',
      required: true,
      enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled'],
    },
    note: {
      type: 'string',
      required: false,
      maxLength: 500,
    },
  },
};

export const verifyPaymentSchema = {
  required: false,
  strict: true,
  properties: {
    status: {
      type: 'string',
      required: false,
      enum: ['paid', 'failed', 'pending'],
    },
    transactionId: {
      type: 'string',
      required: false,
      maxLength: 100,
    },
    note: {
      type: 'string',
      required: false,
      maxLength: 500,
    },
  },
};

/**
 * ─────────────────────────────────────────────────────────────
 * PRODUCT SCHEMAS
 * ─────────────────────────────────────────────────────────────
 */

export const productSchema = {
  required: true,
  strict: true,
  properties: {
    name: { type: 'string', required: true, minLength: 2, maxLength: 250 },
    slug: { type: 'string', required: false, maxLength: 250 },
    brand: { type: 'string', required: false, maxLength: 100 },
    description: { type: 'string', required: false, maxLength: 20000 },
    richDescription: { type: 'string', required: false, maxLength: 60000 },
    price: { type: 'number', required: true, min: 0, max: 10000000 },
    compareAtPrice: { type: 'number', required: false, min: 0, max: 10000000 },
    costPrice: { type: 'number', required: false, min: 0, max: 10000000 },
    category: { type: 'string', required: false, minLength: 1, maxLength: 100 },
    categoryId: { type: 'string', required: false, minLength: 1, maxLength: 100 },
    stock: { type: 'integer', required: true, min: 0, max: 1000000 },
    sku: { type: 'string', required: false, maxLength: 100 },
    barcode: { type: 'string', required: false, maxLength: 100 },
    images: {
      type: 'array',
      required: false,
      maxItems: 30,
      items: { type: 'string', maxLength: 500 },
    },
    videoUrl: { type: 'string', required: false, maxLength: 500 },
    video: { type: 'string', required: false, maxLength: 1000 },
    colors: {
      type: 'array',
      required: false,
      maxItems: 50,
      items: {
        type: 'object',
        required: true,
        strict: true,
        properties: {
          name: { type: 'string', required: true, minLength: 1, maxLength: 60 },
          hex: { type: 'string', required: true, maxLength: 20 },
          image: { type: 'string', required: false, maxLength: 500 },
        },
      },
    },
    featured: { type: 'boolean', required: false },
    isFeatured: { type: 'boolean', required: false },
    onSale: { type: 'boolean', required: false },
    flashSale: { type: 'boolean', required: false },
    isFlashSale: { type: 'boolean', required: false },
    isActive: { type: 'boolean', required: false },
    badge: { type: 'string', required: false, maxLength: 60 },
    postToFacebook: { type: 'boolean', required: false },
    postToInstagram: { type: 'boolean', required: false },
    socialCaption: { type: 'string', required: false, maxLength: 2000 },
    socialCustomMessage: { type: 'string', required: false, maxLength: 2000 },
    metaTitle: { type: 'string', required: false, maxLength: 500 },
    metaDescription: { type: 'string', required: false, maxLength: 5000 },
    keywords: {
      type: 'array',
      required: false,
      maxItems: 100,
      items: { type: 'string', maxLength: 100 },
    },
    tags: {
      type: 'array',
      required: false,
      maxItems: 100,
      items: { type: 'string', maxLength: 100 },
    },
  },
};

export const updateProductSchema = {
  required: true,
  strict: true,
  properties: {
    name: { type: 'string', required: false, minLength: 2, maxLength: 250 },
    slug: { type: 'string', required: false, maxLength: 250 },
    brand: { type: 'string', required: false, maxLength: 100 },
    description: { type: 'string', required: false, maxLength: 20000 },
    richDescription: { type: 'string', required: false, maxLength: 60000 },
    price: { type: 'number', required: false, min: 0, max: 10000000 },
    compareAtPrice: { type: 'number', required: false, min: 0, max: 10000000 },
    costPrice: { type: 'number', required: false, min: 0, max: 10000000 },
    category: { type: 'string', required: false, minLength: 1, maxLength: 100 },
    categoryId: { type: 'string', required: false, minLength: 1, maxLength: 100 },
    stock: { type: 'integer', required: false, min: 0, max: 1000000 },
    sku: { type: 'string', required: false, maxLength: 100 },
    barcode: { type: 'string', required: false, maxLength: 100 },
    images: {
      type: 'array',
      required: false,
      maxItems: 30,
      items: { type: 'string', maxLength: 500 },
    },
    videoUrl: { type: 'string', required: false, maxLength: 500 },
    video: { type: 'string', required: false, maxLength: 1000 },
    colors: {
      type: 'array',
      required: false,
      maxItems: 50,
      items: {
        type: 'object',
        required: true,
        strict: true,
        properties: {
          name: { type: 'string', required: true, minLength: 1, maxLength: 60 },
          hex: { type: 'string', required: true, maxLength: 20 },
          image: { type: 'string', required: false, maxLength: 500 },
        },
      },
    },
    featured: { type: 'boolean', required: false },
    isFeatured: { type: 'boolean', required: false },
    onSale: { type: 'boolean', required: false },
    flashSale: { type: 'boolean', required: false },
    isFlashSale: { type: 'boolean', required: false },
    isActive: { type: 'boolean', required: false },
    badge: { type: 'string', required: false, maxLength: 60 },
    postToFacebook: { type: 'boolean', required: false },
    postToInstagram: { type: 'boolean', required: false },
    socialCaption: { type: 'string', required: false, maxLength: 2000 },
    socialCustomMessage: { type: 'string', required: false, maxLength: 2000 },
    metaTitle: { type: 'string', required: false, maxLength: 500 },
    metaDescription: { type: 'string', required: false, maxLength: 5000 },
    keywords: {
      type: 'array',
      required: false,
      maxItems: 100,
      items: { type: 'string', maxLength: 100 },
    },
    tags: {
      type: 'array',
      required: false,
      maxItems: 100,
      items: { type: 'string', maxLength: 100 },
    },
  },
};

export const shareProductSocialSchema = {
  required: true,
  strict: true,
  properties: {
    networks: {
      type: 'array',
      required: true,
      minItems: 1,
      maxItems: 5,
      items: { type: 'string', enum: ['facebook', 'instagram', 'whatsapp', 'twitter'] },
    },
    caption: { type: 'string', required: false, maxLength: 2000 },
  },
};

/**
 * ─────────────────────────────────────────────────────────────
 * CATEGORY SCHEMAS
 * ─────────────────────────────────────────────────────────────
 */

export const categorySchema = {
  required: true,
  strict: true,
  properties: {
    name: { type: 'string', required: true, minLength: 2, maxLength: 120 },
    slug: { type: 'string', required: false, minLength: 2, maxLength: 120 },
    description: { type: 'string', required: false, maxLength: 1000 },
    parent: { type: 'string', required: false, maxLength: 120 },
    parentId: { type: 'string', required: false, maxLength: 120 },
    image: { type: 'string', required: false, maxLength: 500 },
    icon: { type: 'string', required: false, maxLength: 100 },
    displayOrder: { type: 'integer', required: false, min: 0, max: 10000 },
  },
};

/**
 * ─────────────────────────────────────────────────────────────
 * BANNER SCHEMAS
 * ─────────────────────────────────────────────────────────────
 */

export const bannerSchema = {
  required: true,
  strict: true,
  properties: {
    title: { type: 'string', required: true, minLength: 2, maxLength: 200 },
    subtitle: { type: 'string', required: false, maxLength: 300 },
    tag: { type: 'string', required: false, maxLength: 60 },
    image: { type: 'string', required: false, maxLength: 500 },
    imageUrl: { type: 'string', required: false, maxLength: 500 },
    link: { type: 'string', required: false, maxLength: 500 },
    linkUrl: { type: 'string', required: false, maxLength: 500 },
    ctaLabel: { type: 'string', required: false, maxLength: 60 },
    theme: { type: 'string', required: false, enum: ['dark', 'light'] },
    order: { type: 'integer', required: false, min: 0, max: 10000 },
    sortOrder: { type: 'integer', required: false, min: 0, max: 10000 },
    active: { type: 'boolean', required: false },
    isActive: { type: 'boolean', required: false },
  },
};

/**
 * ─────────────────────────────────────────────────────────────
 * REVIEW SCHEMAS
 * ─────────────────────────────────────────────────────────────
 */

export const reviewSchema = {
  required: true,
  strict: true,
  properties: {
    rating: { type: 'integer', required: true, min: 1, max: 5 },
    comment: { type: 'string', required: true, minLength: 3, maxLength: 3000 },
    images: {
      type: 'array',
      required: false,
      maxItems: 5,
      items: { type: 'string', maxLength: 500 },
    },
  },
};

/**
 * ─────────────────────────────────────────────────────────────
 * CONTACT MESSAGE SCHEMAS
 * ─────────────────────────────────────────────────────────────
 */

export const messageSchema = {
  required: true,
  strict: true,
  properties: {
    name: { type: 'string', required: true, minLength: 2, maxLength: 100 },
    email: {
      type: 'string',
      required: true,
      minLength: 5,
      maxLength: 254,
      pattern: PATTERNS.EMAIL,
      patternMessage: 'Please enter a valid email address.',
    },
    phone: { type: 'string', required: false, maxLength: 25 },
    orderNumber: { type: 'string', required: false, maxLength: 50 },
    subject: { type: 'string', required: true, minLength: 2, maxLength: 200 },
    message: { type: 'string', required: false, maxLength: 5000 },
    body: { type: 'string', required: false, maxLength: 5000 },
  },
};

/**
 * ─────────────────────────────────────────────────────────────
 * FLASH SALE SCHEMAS
 * ─────────────────────────────────────────────────────────────
 */

export const flashSaleSchema = {
  required: true,
  strict: true,
  properties: {
    isEnabled: { type: 'boolean', required: true },
    title: { type: 'string', required: false, maxLength: 100 },
    timerLabel: { type: 'string', required: false, maxLength: 60 },
    ctaLabel: { type: 'string', required: false, maxLength: 60 },
    ctaLink: { type: 'string', required: false, maxLength: 250 },
    countdownMode: {
      type: 'string',
      required: false,
      enum: ['none', 'dailyMidnight', 'midnight', 'endsAt'],
    },
    endsAt: { type: 'string', required: false, maxLength: 60 },
    limit: { type: 'integer', required: false, min: 1, max: 50 },
    sort: {
      type: 'string',
      required: false,
      enum: ['popular', 'newest', 'priceLow', 'priceHigh', 'rating'],
    },
  },
};

/**
 * ─────────────────────────────────────────────────────────────
 * JAZZCASH SETTINGS SCHEMAS
 * ─────────────────────────────────────────────────────────────
 */

export const jazzCashSettingsSchema = {
  required: false,
  strict: true,
  properties: {
    phone: { type: 'string', required: false, minLength: 8, maxLength: 25 },
    qrImage: { type: 'string', required: false, maxLength: 500 },
    accountTitle: { type: 'string', required: false, minLength: 2, maxLength: 100 },
    accountNumber: { type: 'string', required: false, minLength: 8, maxLength: 25 },
    qrCodeUrl: { type: 'string', required: false, maxLength: 500 },
    instructions: { type: 'string', required: false, maxLength: 2000 },
    isEnabled: { type: 'boolean', required: false },
  },
};

/**
 * ─────────────────────────────────────────────────────────────
 * SHOP MANAGER SCHEMAS
 * ─────────────────────────────────────────────────────────────
 */

export const shopManagerCreateSchema = {
  required: true,
  strict: true,
  properties: {
    name: { type: 'string', required: true, minLength: 2, maxLength: 100 },
    email: {
      type: 'string',
      required: true,
      minLength: 5,
      maxLength: 254,
      pattern: PATTERNS.EMAIL,
      patternMessage: 'Please enter a valid email address.',
    },
    password: {
      type: 'string',
      required: true,
      minLength: 8,
      maxLength: 128,
      pattern: PATTERNS.PASSWORD,
      patternMessage: 'Password must be at least 8 characters long and contain both letters and numbers.',
    },
    phone: { type: 'string', required: false, maxLength: 25 },
    assignedCategories: {
      type: 'array',
      required: false,
      maxItems: 100,
      items: { type: 'string', maxLength: 100 },
    },
    assignedProducts: {
      type: 'array',
      required: false,
      maxItems: 500,
      items: { type: 'string', maxLength: 100 },
    },
  },
};

export const shopManagerUpdateSchema = {
  required: true,
  strict: true,
  properties: {
    name: { type: 'string', required: false, minLength: 2, maxLength: 100 },
    password: {
      type: 'string',
      required: false,
      minLength: 8,
      maxLength: 128,
      pattern: PATTERNS.PASSWORD,
      patternMessage: 'Password must be at least 8 characters long and contain both letters and numbers.',
    },
    phone: { type: 'string', required: false, maxLength: 25 },
    assignedCategories: {
      type: 'array',
      required: false,
      maxItems: 100,
      items: { type: 'string', maxLength: 100 },
    },
    assignedProducts: {
      type: 'array',
      required: false,
      maxItems: 500,
      items: { type: 'string', maxLength: 100 },
    },
  },
};

/**
 * ─────────────────────────────────────────────────────────────
 * STORE SETTINGS SCHEMAS
 * ─────────────────────────────────────────────────────────────
 */

export const contactSettingsSchema = {
  required: false,
  strict: true,
  properties: {
    uan: { type: 'string', required: false, minLength: 1, maxLength: 50 },
    supportEmail: {
      type: 'string',
      required: false,
      minLength: 5,
      maxLength: 254,
      pattern: PATTERNS.EMAIL,
      patternMessage: 'Please enter a valid support email address.',
    },
    supportHours: { type: 'string', required: false, maxLength: 120 },
  },
};

export const generalSettingsSchema = {
  required: false,
  strict: true,
  properties: {
    siteName: { type: 'string', required: false, minLength: 1, maxLength: 100 },
    logoUrl: { type: 'string', required: false, maxLength: 1000 },
    uan: { type: 'string', required: false, maxLength: 50 },
    supportEmail: {
      type: 'string',
      required: false,
      maxLength: 254,
      pattern: PATTERNS.EMAIL,
      patternMessage: 'Please enter a valid support email address.',
    },
    supportHours: { type: 'string', required: false, maxLength: 120 },
  },
};

export const socialSettingsSchema = {
  required: false,
  strict: true,
  properties: {
    facebookPageId: { type: 'string', required: false, maxLength: 100 },
    facebookPageAccessToken: { type: 'string', required: false, maxLength: 5000 },
    facebookAutoPost: { type: 'boolean', required: false },
    instagramAccountId: { type: 'string', required: false, maxLength: 100 },
    instagramAutoPost: { type: 'boolean', required: false },
    socialPostTemplate: { type: 'string', required: false, maxLength: 2000 },
  },
};

/**
 * ─────────────────────────────────────────────────────────────
 * EMAIL TEMPLATE SCHEMAS
 * ─────────────────────────────────────────────────────────────
 */

export const emailTemplateUpdateSchema = {
  required: false,
  strict: true,
  properties: {
    title: { type: 'string', required: false, maxLength: 200 },
    subject: { type: 'string', required: false, maxLength: 300 },
    heading: { type: 'string', required: false, maxLength: 200 },
    subtitle: { type: 'string', required: false, maxLength: 300 },
    customMessage: { type: 'string', required: false, maxLength: 10000 },
    closingMessage: { type: 'string', required: false, maxLength: 2000 },
    footerText: { type: 'string', required: false, maxLength: 2000 },
    brandColor: { type: 'string', required: false, maxLength: 30 },
    headerBanner: { type: 'string', required: false, maxLength: 1000 },
    attachments: {
      type: 'array',
      required: false,
      maxItems: 10,
      items: {
        type: 'object',
        required: false,
        properties: {
          name: { type: 'string', required: true, maxLength: 200 },
          url: { type: 'string', required: true, maxLength: 1000 },
          size: { type: 'number', required: false },
        },
      },
    },
    isActive: { type: 'boolean', required: false },
  },
};

export const emailTestSendSchema = {
  required: true,
  strict: true,
  properties: {
    to: {
      type: 'string',
      required: true,
      minLength: 5,
      maxLength: 254,
      pattern: PATTERNS.EMAIL,
      patternMessage: 'Please enter a valid recipient email address.',
    },
    type: {
      type: 'string',
      required: true,
      enum: ['order_confirmation', 'order_shipped', 'order_delivered'],
    },
    template: {
      type: 'object',
      required: false,
    },
  },
};

export const updateMessageSchema = {
  required: true,
  strict: true,
  properties: {
    isRead: { type: 'boolean', required: true },
  },
};

export const forgotPasswordSchema = {
  required: true,
  strict: true,
  properties: {
    email: {
      type: 'string',
      required: true,
      minLength: 5,
      maxLength: 254,
      pattern: PATTERNS.EMAIL,
      patternMessage: 'Please enter a valid email address.',
    },
  },
};

export const resetPasswordSchema = {
  required: true,
  strict: true,
  properties: {
    email: {
      type: 'string',
      required: true,
      minLength: 5,
      maxLength: 254,
      pattern: PATTERNS.EMAIL,
      patternMessage: 'Please enter a valid email address.',
    },
    token: {
      type: 'string',
      required: true,
      minLength: 6,
      maxLength: 128,
    },
    password: {
      type: 'string',
      required: true,
      minLength: 8,
      maxLength: 128,
      pattern: PATTERNS.PASSWORD,
      patternMessage: 'Password must be at least 8 characters long and contain both letters and numbers.',
    },
  },
};

export const changePasswordSchema = {
  required: true,
  strict: true,
  properties: {
    currentPassword: {
      type: 'string',
      required: true,
      minLength: 1,
      maxLength: 128,
    },
    newPassword: {
      type: 'string',
      required: true,
      minLength: 8,
      maxLength: 128,
      pattern: PATTERNS.PASSWORD,
      patternMessage: 'New password must be at least 8 characters long and contain both letters and numbers.',
    },
  },
};

/**
 * ─────────────────────────────────────────────────────────────
 * QUERY & PARAMETER SCHEMAS
 * ─────────────────────────────────────────────────────────────
 */

export const listProductsQuerySchema = {
  strict: false,
  properties: {
    category: { type: 'string', required: false, maxLength: 100 },
    color: { type: 'string', required: false, maxLength: 50 },
    minPrice: { type: 'number', required: false, min: 0, max: 10000000 },
    maxPrice: { type: 'number', required: false, min: 0, max: 10000000 },
    sort: {
      type: 'string',
      required: false,
      enum: ['newest', 'price-asc', 'price-desc', 'rating', 'popular', 'featured'],
    },
    search: { type: 'string', required: false, maxLength: 200 },
    page: { type: 'integer', required: false, min: 1, max: 10000 },
    limit: { type: 'integer', required: false, min: 1, max: 200 },
    deals: { type: 'boolean', required: false },
    inStock: { type: 'boolean', required: false },
    brand: { type: 'string', required: false, maxLength: 100 },
  },
};

export const idParamSchema = {
  strict: false,
  properties: {
    id: { type: 'string', required: true, minLength: 1, maxLength: 50 },
  },
};

export const slugParamSchema = {
  strict: false,
  properties: {
    slug: { type: 'string', required: true, minLength: 1, maxLength: 250 },
  },
};

