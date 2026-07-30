import { Routes } from '@angular/router';
import { adminGuard } from './core/guards/guards';

export const routes: Routes = [
  { path: '', loadComponent: () => import('./pages/home/home.component').then((m) => m.HomeComponent) },
  { path: 'shop', loadComponent: () => import('./pages/shop/shop.component').then((m) => m.ShopComponent) },
  { path: 'product/:slug', loadComponent: () => import('./pages/product-detail/product-detail.component').then((m) => m.ProductDetailComponent) },
  { path: 'cart', loadComponent: () => import('./pages/cart/cart.component').then((m) => m.CartComponent) },
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
  { path: 'admin/orders', canActivate: [adminGuard], loadComponent: () => import('./pages/admin/orders/admin-orders.component').then((m) => m.AdminOrdersComponent) },
  { path: 'admin/analytics', canActivate: [adminGuard], loadComponent: () => import('./pages/admin/analytics/analytics.component').then((m) => m.AnalyticsComponent) },

  { path: '**', redirectTo: '' },
];
