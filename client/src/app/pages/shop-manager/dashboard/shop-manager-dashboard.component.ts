import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AnalyticsService, OrderService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { Order } from '../../../core/models/models';
import { ShopManagerNavComponent } from '../shop-manager-nav.component';

@Component({
  selector: 'app-sm-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink, ShopManagerNavComponent],
  template: `
    <section class="section">
      <div class="container">
        <app-shop-manager-nav />
        <div class="welcome-card card card-pad">
          <h1>Welcome, {{ firstName() }} 👋</h1>
          <p class="text-muted">Here's an overview of your assigned products and orders.</p>
          <span class="role-badge">🏪 Shop Manager</span>
        </div>

        @if (loading()) { <div class="spinner"></div> }
        @else {
          <div class="grid grid-4 mt-lg kpis">
            <div class="kpi card card-pad">
              <span class="ic" style="background:#dff5ec">💰</span>
              <div><div class="num">Rs {{ stats().totalRevenue | number }}</div><div class="lbl">Revenue</div></div>
            </div>
            <div class="kpi card card-pad">
              <span class="ic" style="background:#e3f0ff">🧾</span>
              <div><div class="num">{{ stats().totalOrders | number }}</div><div class="lbl">Orders</div></div>
            </div>
            <div class="kpi card card-pad">
              <span class="ic" style="background:#ede0ff">📦</span>
              <div><div class="num">{{ stats().totalProducts | number }}</div><div class="lbl">Products</div></div>
            </div>
            <div class="kpi card card-pad">
              <span class="ic" style="background:#ffe0dd">📉</span>
              <div><div class="num">{{ stats().lowStockCount | number }}</div><div class="lbl">Low stock</div></div>
            </div>
          </div>

          <div class="alerts mt-lg">
            @if (stats().pendingOrders > 0) {
              <a routerLink="/shop-manager/orders" class="alert-card warn">
                ⏳ <strong>{{ stats().pendingOrders }}</strong> pending order(s) need attention →
              </a>
            }
            @if (stats().lowStockCount > 0) {
              <a routerLink="/shop-manager/products" class="alert-card danger">
                📉 <strong>{{ stats().lowStockCount }}</strong> product(s) low on stock →
              </a>
            }
          </div>

          <div class="head mt-lg"><h2>Recent orders</h2><a routerLink="/shop-manager/orders" class="see">View all →</a></div>
          <div class="card table-wrap">
            <table class="table">
              <thead><tr><th>Order</th><th>Customer</th><th>Total</th><th>Status</th><th>Date</th></tr></thead>
              <tbody>
                @for (o of recent(); track o._id) {
                  <tr>
                    <td><strong>#{{ o.orderNumber }}</strong></td>
                    <td>{{ custName(o) }}</td>
                    <td class="price">Rs {{ o.grandTotal | number }}</td>
                    <td><span class="status" [class]="'status-' + o.status">{{ label(o.status) }}</span></td>
                    <td class="text-muted">{{ o.createdAt | date:'MMM d' }}</td>
                  </tr>
                } @empty {
                  <tr><td colspan="5" class="center text-muted" style="padding:24px">No orders yet.</td></tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>
    </section>
  `,
  styles: [`
    .welcome-card { position:relative; overflow:hidden; }
    .welcome-card h1 { margin-bottom:4px; }
    .role-badge { display:inline-block; margin-top:10px; padding:6px 16px; border-radius:999px; background:#dff5ec; color:#2f855a; font-weight:800; font-size:.85rem; }
    .kpis .kpi { display:flex; align-items:center; gap:14px; }
    .ic { width:52px; height:52px; border-radius:16px; display:grid; place-items:center; font-size:1.5rem; flex-shrink:0; }
    .num { font-family: var(--font-display); font-weight:800; font-size:1.5rem; }
    .lbl { color: var(--muted); font-size:.85rem; }
    .alerts { display:flex; gap:14px; flex-wrap:wrap; }
    .alert-card { flex:1; min-width:260px; padding:16px 20px; border-radius: var(--radius); font-weight:700; }
    .alert-card.warn { background:#fff0d6; color:#a9721f; }
    .alert-card.danger { background:#ffe0dd; color:#c53030; }
    .head { display:flex; align-items:center; justify-content:space-between; }
    .see { color: var(--ink); font-weight:700; }
    .see:hover { color:#2f855a; }
  `],
})
export class ShopManagerDashboardComponent implements OnInit {
  stats = signal<any>({});
  recent = signal<Order[]>([]);
  loading = signal(true);
  constructor(private analytics: AnalyticsService, private orders: OrderService, private auth: AuthService) {}
  firstName() { return this.auth.user()?.name?.split(' ')[0] ?? 'Manager'; }
  ngOnInit() {
    this.analytics.overview().subscribe({
      next: (s) => { this.stats.set(s); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
    this.orders.adminAll().subscribe((o) => this.recent.set(o.slice(0, 6)));
  }
  custName(o: Order) {
    if (o.user && typeof o.user === 'object') return o.user.name;
    return o.shippingAddress?.fullName ? `${o.shippingAddress.fullName} (guest)` : 'Guest';
  }
  label(s: string) { return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()); }
}
