import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { ProductService, CategoryService } from '../../core/services/api.service';
import { Category, Product } from '../../core/models/models';
import { ProductCardComponent } from '../../shared/components/product-card.component';

@Component({
  selector: 'app-shop',
  standalone: true,
  imports: [CommonModule, FormsModule, ProductCardComponent],
  template: `
    <section class="shop-head">
      <div class="container">
        <h1>Shop all products</h1>
        <p class="text-muted">Everything for babies and toddlers, in one happy place.</p>
      </div>
    </section>

    <section class="section">
      <div class="container shop-layout">
        <!-- Filters -->
        <aside class="filters card card-pad">
          <div class="field">
            <label>Search</label>
            <input class="input" [(ngModel)]="filters.search" (keyup.enter)="apply()" placeholder="Search products…" />
          </div>
          <div class="field">
            <label>Category</label>
            <select class="input" [(ngModel)]="filters.category" (change)="apply()">
              <option value="">All categories</option>
              @for (c of categories(); track c._id) { <option [value]="c.slug">{{ c.name }}</option> }
            </select>
          </div>
          <div class="field">
            <label>Age group</label>
            <select class="input" [(ngModel)]="filters.ageGroup" (change)="apply()">
              <option value="">All ages</option>
              <option value="0-6m">0–6 months</option>
              <option value="6-12m">6–12 months</option>
              <option value="1-2y">1–2 years</option>
              <option value="2-4y">2–4 years</option>
              <option value="4y+">4 years +</option>
            </select>
          </div>
          <div class="field">
            <label>Max price: Rs {{ filters.maxPrice || 25000 | number }}</label>
            <input type="range" min="500" max="25000" step="500" [(ngModel)]="filters.maxPrice" (change)="apply()" style="width:100%" />
          </div>
          <button class="btn btn-ghost btn-block btn-sm" (click)="reset()">Clear filters</button>
        </aside>

        <!-- Results -->
        <div class="results">
          <div class="results-top">
            <span class="text-muted">{{ total() }} products</span>
            <select class="input sort" [(ngModel)]="filters.sort" (change)="apply()">
              <option value="newest">Newest</option>
              <option value="popular">Most popular</option>
              <option value="priceLow">Price: low to high</option>
              <option value="priceHigh">Price: high to low</option>
              <option value="rating">Top rated</option>
            </select>
          </div>

          @if (loading()) { <div class="spinner"></div> }
          @else if (products().length === 0) {
            <div class="empty card card-pad center">
              <div style="font-size:2.5rem">🔍</div>
              <h3>No products found</h3>
              <p class="text-muted">Try clearing some filters.</p>
            </div>
          } @else {
            <div class="grid grid-3">
              @for (p of products(); track p._id) { <app-product-card [product]="p" /> }
            </div>
            @if (pages() > 1) {
              <div class="pager">
                <button class="btn btn-ghost btn-sm" [disabled]="page() === 1" (click)="goTo(page()-1)">← Prev</button>
                <span>Page {{ page() }} of {{ pages() }}</span>
                <button class="btn btn-ghost btn-sm" [disabled]="page() === pages()" (click)="goTo(page()+1)">Next →</button>
              </div>
            }
          }
        </div>
      </div>
    </section>
  `,
  styles: [`
    .shop-head { background: var(--mint-soft); padding: 34px 0; }
    .shop-head h1 { font-size: 2.2rem; margin:0; }
    .shop-layout { display:grid; grid-template-columns: 260px 1fr; gap: 28px; align-items:start; }
    .filters { position:sticky; top: 88px; }
    .results-top { display:flex; align-items:center; justify-content:space-between; margin-bottom:18px; }
    .sort { width:auto; }
    .empty { padding:60px 20px; }
    .pager { display:flex; align-items:center; justify-content:center; gap:16px; margin-top:32px; font-weight:700; }
    @media (max-width: 860px) {
      .shop-layout { grid-template-columns: 1fr; }
      .filters { position:static; }
    }
  `],
})
export class ShopComponent implements OnInit {
  categories = signal<Category[]>([]);
  products = signal<Product[]>([]);
  loading = signal(true);
  page = signal(1);
  pages = signal(1);
  total = signal(0);

  filters = { search: '', category: '', ageGroup: '', maxPrice: 25000, sort: 'newest' };

  constructor(
    private productSvc: ProductService,
    private catSvc: CategoryService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    this.catSvc.list().subscribe((c) => this.categories.set(c));
    this.route.queryParams.subscribe((q) => {
      this.filters.category = q['category'] || '';
      this.filters.search = q['search'] || '';
      this.load(1);
    });
  }

  load(page: number) {
    this.loading.set(true);
    this.page.set(page);
    this.productSvc
      .list({ ...this.filters, page, limit: 9 })
      .subscribe({
        next: (r) => {
          this.products.set(r.items);
          this.pages.set(r.pages);
          this.total.set(r.total);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  apply() { this.load(1); }
  goTo(p: number) { this.load(p); window.scrollTo({ top: 0, behavior: 'smooth' }); }
  reset() {
    this.filters = { search: '', category: '', ageGroup: '', maxPrice: 25000, sort: 'newest' };
    this.router.navigate(['/shop']);
    this.load(1);
  }
}
