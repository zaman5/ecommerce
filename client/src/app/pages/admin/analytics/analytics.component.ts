import { Component, OnInit, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AnalyticsService } from '../../../core/services/api.service';
import { AdminNavComponent } from '../admin-nav.component';

@Component({
  selector: 'app-analytics',
  standalone: true,
  imports: [CommonModule, AdminNavComponent],
  template: `
    <section class="section">
      <div class="container">
        <app-admin-nav />
        <h1>Sales analytics</h1>
        <p class="text-muted">Understand what sells — and what to do next.</p>

        @if (loading()) { <div class="spinner"></div> }
        @else {
          <!-- Sales trend -->
          <div class="card card-pad mt-lg">
            <div class="head">
              <h3>Revenue — last {{ days() }} days</h3>
              <div class="range">
                @for (d of [7,30,90]; track d) {
                  <button class="chip" [class.on]="days() === d" (click)="setDays(d)">{{ d }}d</button>
                }
              </div>
            </div>
            @if (sales().length === 0) { <p class="text-muted center" style="padding:30px">No sales in this period yet.</p> }
            @else {
              <div class="chart">
                @for (pt of sales(); track pt.date) {
                  <div class="bar-wrap" [title]="pt.date + ': Rs ' + pt.revenue">
                    <div class="bar" [style.height.%]="barHeight(pt.revenue)"></div>
                  </div>
                }
              </div>
              <div class="chart-foot"><span>{{ sales()[0].date | date:'MMM d' }}</span><span>Peak: Rs {{ maxRevenue() | number }}</span></div>
            }
          </div>

          <div class="grid grid-2 mt-lg">
            <!-- Top products -->
            <div class="card card-pad">
              <h3>Best sellers</h3>
              @for (p of top(); track p._id; let i = $index) {
                <div class="rank">
                  <span class="pos">{{ i + 1 }}</span>
                  <img [src]="p.images?.[0] || placeholder" [alt]="p.name" />
                  <div class="rank-info"><span>{{ p.name }}</span><span class="text-muted">{{ p.unitsSold }} sold · Rs {{ p.price | number }}</span></div>
                  <div class="rev">Rs {{ p.unitsSold * p.price | number }}</div>
                </div>
              } @empty { <p class="text-muted">No sales data yet.</p> }
            </div>

            <!-- By category -->
            <div class="card card-pad">
              <h3>Revenue by category</h3>
              @for (c of byCategory(); track c.category) {
                <div class="catrow">
                  <div class="flex between gap"><strong>{{ c.category }}</strong><span class="price">Rs {{ c.revenue | number }}</span></div>
                  <div class="track"><div class="fill" [style.width.%]="catPct(c.revenue)"></div></div>
                  <span class="text-muted">{{ c.units }} units</span>
                </div>
              } @empty { <p class="text-muted">No category sales yet.</p> }
            </div>
          </div>

          <!-- Recommendations -->
          <h2 class="mt-lg">💡 Smart suggestions</h2>
          <p class="text-muted">Data-driven actions to grow sales next month.</p>
          <div class="grid grid-3 mt">
            <div class="rec-col card card-pad">
              <div class="rec-head restock">🔄 Restock soon</div>
              @for (p of recs().restock; track p._id) {
                <div class="rec"><strong>{{ p.name }}</strong><span class="text-muted">{{ p.reason }}</span></div>
              } @empty { <p class="text-muted small">Nothing urgent — stock looks healthy.</p> }
            </div>
            <div class="rec-col card card-pad">
              <div class="rec-head promote">⭐ Promote these</div>
              @for (p of recs().promote; track p._id) {
                <div class="rec"><strong>{{ p.name }}</strong><span class="text-muted">{{ p.reason }}</span></div>
              } @empty { <p class="text-muted small">Keep selling — winners will appear here.</p> }
            </div>
            <div class="rec-col card card-pad">
              <div class="rec-head slow">🏷️ Slow movers</div>
              @for (p of recs().slowMovers; track p._id) {
                <div class="rec"><strong>{{ p.name }}</strong><span class="text-muted">{{ p.reason }}</span></div>
              } @empty { <p class="text-muted small">No slow movers — great job!</p> }
            </div>
          </div>
        }
      </div>
    </section>
  `,
  styles: [`
    .head { display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; }
    .range, .chip { display:inline-flex; }
    .chip { border:2px solid var(--line); background:#fff; padding:5px 14px; border-radius:999px; font-weight:700; cursor:pointer; font-family: var(--font-display); color: var(--muted); margin-left:6px; }
    .chip.on { background: var(--mint); border-color: var(--mint); color:#fff; }
    .chart { display:flex; align-items:flex-end; gap:4px; height:200px; margin-top:20px; padding-top:10px; }
    /* max-width keeps a quiet period (one or two days of sales) reading as
       bars rather than one full-bleed block stretched across the card. */
    .bar-wrap { flex:1; max-width:52px; height:100%; display:flex; align-items:flex-end; }
    .bar { width:100%; background: linear-gradient(var(--coral), var(--sun)); border-radius:6px 6px 0 0; min-height:3px; transition:height .3s; }
    .bar-wrap:hover .bar { background: var(--coral); }
    .chart-foot { display:flex; justify-content:space-between; margin-top:8px; font-size:.82rem; color: var(--muted); }
    .rank { display:flex; align-items:center; gap:12px; padding:10px 0; border-bottom:1px solid var(--line); }
    .pos { width:26px; height:26px; border-radius:50%; background: var(--cream-deep); display:grid; place-items:center; font-weight:800; font-family: var(--font-display); font-size:.85rem; }
    .rank img { width:40px; height:40px; object-fit:cover; border-radius:8px; }
    .rank-info { display:flex; flex-direction:column; flex:1; font-size:.9rem; }
    .rev { font-weight:800; color: var(--coral-dark); font-family: var(--font-display); }
    .catrow { margin-bottom:16px; }
    .track { height:10px; background: var(--cream-deep); border-radius:999px; overflow:hidden; margin:6px 0; }
    .fill { height:100%; background: linear-gradient(90deg, var(--mint), var(--sky)); border-radius:999px; }
    .rec-head { font-family: var(--font-display); font-weight:700; padding-bottom:10px; margin-bottom:10px; border-bottom:2px solid var(--line); }
    .rec { padding:10px 0; border-bottom:1px solid var(--line); display:flex; flex-direction:column; gap:2px; }
    .rec span { font-size:.82rem; }
    .rec:last-child { border-bottom:none; }
    .small { font-size:.85rem; }
  `],
})
export class AnalyticsComponent implements OnInit {
  loading = signal(true);
  days = signal(30);
  sales = signal<any[]>([]);
  top = signal<any[]>([]);
  byCategory = signal<any[]>([]);
  recs = signal<any>({ restock: [], promote: [], slowMovers: [] });
  placeholder = 'https://placehold.co/80x80/f4ebe1/7d8a97?text=%20';

  maxRevenue = computed(() => Math.max(1, ...this.sales().map((s) => s.revenue)));
  private maxCat = computed(() => Math.max(1, ...this.byCategory().map((c) => c.revenue)));

  constructor(private analytics: AnalyticsService) {}

  ngOnInit() {
    this.loadSales();
    this.analytics.topProducts().subscribe((t) => this.top.set(t));
    this.analytics.byCategory().subscribe((c) => this.byCategory.set(c));
    this.analytics.recommendations().subscribe((r) => this.recs.set(r));
  }
  loadSales() {
    this.analytics.sales(this.days()).subscribe({
      next: (s) => { this.sales.set(s); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }
  setDays(d: number) { this.days.set(d); this.loadSales(); }
  barHeight(rev: number) { return Math.max(2, (rev / this.maxRevenue()) * 100); }
  catPct(rev: number) { return (rev / this.maxCat()) * 100; }
}
