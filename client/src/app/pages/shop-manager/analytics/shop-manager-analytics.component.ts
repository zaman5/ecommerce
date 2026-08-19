import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AnalyticsService } from '../../../core/services/api.service';
import { ShopManagerNavComponent } from '../shop-manager-nav.component';

@Component({
  selector: 'app-sm-analytics',
  standalone: true,
  imports: [CommonModule, ShopManagerNavComponent],
  template: `
    <section class="section">
      <div class="container">
        <app-shop-manager-nav />
        <h1>Analytics</h1>
        <p class="text-muted">Performance insights for your assigned products.</p>

        @if (loading()) { <div class="spinner"></div> }
        @else {
          <!-- Top Products -->
          <h2 class="mt-lg">🏆 Top selling products</h2>
          <div class="card table-wrap mt">
            <table class="table">
              <thead><tr><th>Product</th><th>Category</th><th>Units sold</th><th>Price</th><th>Stock</th></tr></thead>
              <tbody>
                @for (p of topProducts(); track p._id) {
                  <tr>
                    <td><strong>{{ p.name }}</strong></td>
                    <td>{{ p.category?.name || '—' }}</td>
                    <td>{{ p.unitsSold }}</td>
                    <td class="price">Rs {{ p.price | number }}</td>
                    <td><span [class.low]="p.stock <= 5">{{ p.stock }}</span></td>
                  </tr>
                } @empty {
                  <tr><td colspan="5" class="center text-muted" style="padding:24px">No sales data yet.</td></tr>
                }
              </tbody>
            </table>
          </div>

          <!-- Revenue by Category -->
          <h2 class="mt-lg">📊 Revenue by category</h2>
          <div class="grid grid-3 mt">
            @for (c of byCategory(); track c.category) {
              <div class="card card-pad">
                <div class="cat-name">{{ c.category }}</div>
                <div class="cat-rev">Rs {{ c.revenue | number }}</div>
                <div class="text-muted" style="font-size:.85rem">{{ c.units }} units sold</div>
              </div>
            } @empty {
              <div class="card card-pad center text-muted">No category data yet.</div>
            }
          </div>

          <!-- Recommendations -->
          @if (recs().restock?.length || recs().promote?.length || recs().slowMovers?.length) {
            <h2 class="mt-lg">💡 Recommendations</h2>
            <div class="recs mt">
              @if (recs().restock?.length) {
                <div class="rec-group">
                  <h3>📦 Restock soon</h3>
                  @for (r of recs().restock; track r._id) {
                    <div class="rec-item card card-pad">
                      <strong>{{ r.name }}</strong>
                      <p class="text-muted" style="margin:4px 0 0;font-size:.85rem">{{ r.reason }}</p>
                    </div>
                  }
                </div>
              }
              @if (recs().slowMovers?.length) {
                <div class="rec-group">
                  <h3>🐢 Slow movers</h3>
                  @for (r of recs().slowMovers; track r._id) {
                    <div class="rec-item card card-pad">
                      <strong>{{ r.name }}</strong>
                      <p class="text-muted" style="margin:4px 0 0;font-size:.85rem">{{ r.reason }}</p>
                    </div>
                  }
                </div>
              }
            </div>
          }
        }
      </div>
    </section>
  `,
  styles: [`
    .low { color: var(--danger); font-weight:800; }
    .cat-name { font-family: var(--font-display); font-weight:700; font-size:1.05rem; }
    .cat-rev { font-family: var(--font-display); font-weight:800; font-size:1.3rem; color: var(--accent-dark); margin:4px 0; }
    .recs { display:flex; flex-direction:column; gap:20px; }
    .rec-group h3 { margin-bottom:10px; }
    .rec-item { margin-bottom:8px; }
  `],
})
export class ShopManagerAnalyticsComponent implements OnInit {
  topProducts = signal<any[]>([]);
  byCategory = signal<any[]>([]);
  recs = signal<any>({});
  loading = signal(true);

  constructor(private analytics: AnalyticsService) {}

  ngOnInit() {
    let loaded = 0;
    const done = () => { loaded++; if (loaded >= 3) this.loading.set(false); };

    this.analytics.topProducts().subscribe({ next: (d) => { this.topProducts.set(d); done(); }, error: done });
    this.analytics.byCategory().subscribe({ next: (d) => { this.byCategory.set(d); done(); }, error: done });
    this.analytics.recommendations().subscribe({ next: (d) => { this.recs.set(d); done(); }, error: done });
  }
}
