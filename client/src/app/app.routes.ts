import { Routes } from '@angular/router';
import { adminGuard, shopManagerGuard } from './core/guards/guards';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./pages/home/home.component').then((m) => m.HomeComponent) },
  { path: 'shop', loadComponent: () => import('./pages/shop/shop.component').then((m) => m.ShopComponent) },
  { path: 'product/:slug', loadComponent: () => import('./pages/product-detail/product-detail.component').then((m) => m.ProductDetailComponent) },
  { path: 'cart', loadComponent: () => import('./pages/cart/cart.component').then((m) => m.CartComponent) },
  { path: 'saved', loadComponent: () => import('./pages/saved/saved.component').then((m) => m.SavedComponent) },
  { path: 'contact', loadComponent: () => import('./pages/contact/contact.component').then((m) => m.ContactComponent) },
  { path: 'about', loadComponent: () => import('./pages/legal/about.component').then((m) => m.AboutComponent) },
  { path: 'about-us', redirectTo: 'about' },
  { path: 'faq', loadComponent: () => import('./pages/legal/faq.component').then((m) => m.FaqComponent) },
  { path: 'faqs', redirectTo: 'faq' },
  { path: 'privacy', loadComponent: () => import('./pages/legal/privacy.component').then((m) => m.PrivacyComponent) },
  { path: 'privacy-policy', redirectTo: 'privacy' },
  { path: 'terms', loadComponent: () => import('./pages/legal/terms.component').then((m) => m.TermsComponent) },
  { path: 'returns', loadComponent: () => import('./pages/legal/returns.component').then((m) => m.ReturnsComponent) },
  { path: 'exchange-return-policy', redirectTo: 'returns' },
  { path: 'login', loadComponent: () => import('./pages/auth/login/login.component').then((m) => m.LoginComponent) },
  { path: 'register', loadComponent: () => import('./pages/auth/register/register.component').then((m) => m.RegisterComponent) },

  // Checkout and order tracking are open to guests as well as account holders —
  // the API decides what a given caller may see (session or guest token).
  { path: 'checkout', loadComponent: () => import('./pages/checkout/checkout.component').then((m) => m.CheckoutComponent) },
  { path: 'account/orders', loadComponent: () => import('./pages/account/orders/orders.component').then((m) => m.OrdersComponent) },
  { path: 'account/orders/:id', loadComponent: () => import('./pages/account/order-detail/order-detail.component').then((m) => m.OrderDetailComponent) },

  // Admin
  { path: 'admin', canActivate: [adminGuard], loadComponent: () => import('./pages/admin/dashboard/dashboard.component').then((m) => m.DashboardComponent) },
  { path: 'admin/products', canActivate: [adminGuard], loadComponent: () => import('./pages/admin/products/admin-products.component').then((m) => m.AdminProductsComponent) },
  { path: 'admin/categories', canActivate: [adminGuard], loadComponent: () => import('./pages/admin/categories/admin-categories.component').then((m) => m.AdminCategoriesComponent) },
  { path: 'admin/banners', canActivate: [adminGuard], loadComponent: () => import('./pages/admin/banners/admin-banners.component').then((m) => m.AdminBannersComponent) },
  { path: 'admin/flash-sale', canActivate: [adminGuard], loadComponent: () => import('./pages/admin/flash-sale/admin-flash-sale.component').then((m) => m.AdminFlashSaleComponent) },
  { path: 'admin/orders', canActivate: [adminGuard], loadComponent: () => import('./pages/admin/orders/admin-orders.component').then((m) => m.AdminOrdersComponent) },
  { path: 'admin/accounts', canActivate: [adminGuard], loadComponent: () => import('./pages/admin/accounts-attachment/admin-accounts-attachment.component').then((m) => m.AdminAccountsAttachmentComponent) },
  { path: 'admin/accounts-attachment', canActivate: [adminGuard], loadComponent: () => import('./pages/admin/accounts-attachment/admin-accounts-attachment.component').then((m) => m.AdminAccountsAttachmentComponent) },
  { path: 'admin/jazzcash', canActivate: [adminGuard], loadComponent: () => import('./pages/admin/accounts-attachment/admin-accounts-attachment.component').then((m) => m.AdminAccountsAttachmentComponent) },
  { path: 'admin/social', canActivate: [adminGuard], loadComponent: () => import('./pages/admin/accounts-attachment/admin-accounts-attachment.component').then((m) => m.AdminAccountsAttachmentComponent) },
  { path: 'admin/emails', canActivate: [adminGuard], loadComponent: () => import('./pages/admin/accounts-attachment/admin-accounts-attachment.component').then((m) => m.AdminAccountsAttachmentComponent) },
  { path: 'admin/analytics', canActivate: [adminGuard], loadComponent: () => import('./pages/admin/analytics/analytics.component').then((m) => m.AnalyticsComponent) },
  { path: 'admin/shop-managers', canActivate: [adminGuard], loadComponent: () => import('./pages/admin/shop-managers/admin-shop-managers.component').then((m) => m.AdminShopManagersComponent) },

  // Shop Manager
  { path: 'shop-manager', canActivate: [shopManagerGuard], loadComponent: () => import('./pages/shop-manager/dashboard/shop-manager-dashboard.component').then((m) => m.ShopManagerDashboardComponent) },
  { path: 'shop-manager/products', canActivate: [shopManagerGuard], loadComponent: () => import('./pages/shop-manager/products/shop-manager-products.component').then((m) => m.ShopManagerProductsComponent) },
  { path: 'shop-manager/orders', canActivate: [shopManagerGuard], loadComponent: () => import('./pages/shop-manager/orders/shop-manager-orders.component').then((m) => m.ShopManagerOrdersComponent) },
  { path: 'shop-manager/emails', canActivate: [shopManagerGuard], loadComponent: () => import('./pages/shop-manager/emails/shop-manager-emails.component').then((m) => m.ShopManagerEmailsComponent) },
  { path: 'shop-manager/analytics', canActivate: [shopManagerGuard], loadComponent: () => import('./pages/shop-manager/analytics/shop-manager-analytics.component').then((m) => m.ShopManagerAnalyticsComponent) },

  { path: '**', redirectTo: '' },
];

