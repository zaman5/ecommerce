import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ProductService, CategoryService } from '../../core/services/api.service';
import { Category, ColorOption, Product } from '../../core/models/models';
import { ProductCardComponent } from '../../shared/components/product-card.component';
import { SwatchPipe } from '../../shared/pipes/swatch.pipe';

/** Catalogue pages show a lot of small cards, marketplace-style. */
const PER_PAGE = 20;

@Component({
  selector: 'app-shop',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ProductCardComponent, SwatchPipe],
  template: `
    <section class="catalog">
      <div class="container">
        <!-- Breadcrumb, as eBay carries above its results -->
        <nav class="crumbs" aria-label="Breadcrumb">
          <a routerLink="/">Home</a>
          <span>›</span>
          @if (scopeLabel()) {
            <button class="crumb-btn" (click)="pickCategory('')">All Categories</button>
            <span>›</span>
            @if (activeDept(); as dept) {
              @if (dept.slug !== filters.category) {
                <!-- Drilled into a sub-category, so the department is a step. -->
                <button class="crumb-btn" (click)="pickCategory(dept.slug)">{{ dept.name }}</button>
                <span>›</span>
              }
            }
            <span class="current">{{ scopeLabel() }}</span>
          } @else {
            <span class="current">All Categories</span>
          }
        </nav>
      </div>

      <div class="container">
        <!-- On a phone the rail alone was ~1250px tall, pushing every product
             below the fold, so it collapses behind this toggle. -->
        <button class="filter-toggle" (click)="filtersOpen.set(!filtersOpen())" [attr.aria-expanded]="filtersOpen()">
          {{ filtersOpen() ? '✕ Hide filters' : '☰ Filters' }}
          @if (activeFilterCount() > 0) { <span class="fcount">{{ activeFilterCount() }}</span> }
        </button>
      </div>

      <div class="container cat-layout">
        <!-- ================= FILTER RAIL ================= -->
        <aside class="rail" [class.open]="filtersOpen()">
          <div class="rail-group">
            <h3 class="rail-title">Category</h3>
            <div class="rail-body links">
              @if (activeDept(); as dept) {
                <!-- Drilled into a department: show it with its children, the
                     way eBay narrows the rail once you pick a category. -->
                <button class="cat-back" (click)="pickCategory('')">‹ All Categories</button>
                <button class="cat-link dept" [class.on]="filters.category === dept.slug" (click)="pickCategory(dept.slug)">
                  {{ dept.name }}
                </button>
                @for (s of subsOf(dept.slug); track s._id) {
                  <button class="cat-link sub" [class.on]="filters.category === s.slug" (click)="pickCategory(s.slug)">
                    {{ s.name }} <span class="opt-count">({{ s.productCount }})</span>
                  </button>
                }
              } @else {
                <button class="cat-link on" (click)="pickCategory('')">All Categories</button>
                @for (c of departments(); track c._id) {
                  <button class="cat-link" (click)="pickCategory(c.slug)">
                    {{ c.name }} <span class="opt-count">({{ c.productCount }})</span>
                  </button>
                }
              }
            </div>
          </div>

          @if (colors().length) {
            <div class="rail-group">
              <h3 class="rail-title">Colour</h3>
              <div class="rail-body">
                @for (c of colors(); track c.name) {
                  <label class="opt">
                    <input type="checkbox" [checked]="filters.color === c.name" (change)="pickColor(c.name)" />
                    <img class="opt-dot" [src]="c.hex | swatch" alt="" />
                    <span class="opt-name">{{ c.name }}</span>
                    <span class="opt-count">({{ c.count }})</span>
                  </label>
                }
              </div>
            </div>
          }

          <div class="rail-group">
            <h3 class="rail-title">Price</h3>
            <div class="rail-body">
              <div class="price-row">
                <input class="price-in" type="number" min="0" placeholder="Min" [(ngModel)]="minPriceInput" (keyup.enter)="applyPrice()" aria-label="Minimum price" />
                <span class="dash">to</span>
                <input class="price-in" type="number" min="0" placeholder="Max" [(ngModel)]="maxPriceInput" (keyup.enter)="applyPrice()" aria-label="Maximum price" />
                <button class="price-go" (click)="applyPrice()" aria-label="Apply price range">›</button>
              </div>
            </div>
          </div>

          <div class="rail-group">
            <h3 class="rail-title">Show only</h3>
            <div class="rail-body">
              <!-- No "In stock only" here: sold-out products are never listed,
                   so the checkbox could only ever be a no-op. -->
              <label class="opt">
                <input type="checkbox" [(ngModel)]="filters.onSale" (change)="apply()" />
                <span class="opt-name">Deals &amp; savings</span>
              </label>
            </div>
          </div>

          <button class="link-btn" (click)="reset()">Clear all filters</button>
        </aside>

        <!-- ================= RESULTS ================= -->
        <div class="results">
          <div class="res-head">
            <div class="res-count">
              <strong>{{ shownRange() }}</strong> of <strong>{{ total() | number }}</strong> result{{ total() === 1 ? '' : 's' }}
              @if (scopeLabel()) { <span>for <b>{{ scopeLabel() }}</b></span> }
            </div>
            <div class="tools">
              <label class="sort-wrap">
                <span class="tool-label">Sort:</span>
                <select class="rail-select sort" [(ngModel)]="filters.sort" (change)="apply()">
                  <option value="newest">Best Match</option>
                  <option value="popular">Most popular</option>
                  <option value="priceLow">Price + delivery: lowest first</option>
                  <option value="priceHigh">Price + delivery: highest first</option>
                  <option value="rating">Top rated</option>
                </select>
              </label>
              <div class="view-toggle">
                <button [class.on]="view() === 'grid'" (click)="view.set('grid')" aria-label="Grid view" title="Grid view">▦</button>
                <button [class.on]="view() === 'list'" (click)="view.set('list')" aria-label="List view" title="List view">☰</button>
              </div>
            </div>
          </div>

          @if (loading()) { <div class="spinner"></div> }
          @else if (products().length === 0) {
            <div class="empty card card-pad center">
              <div style="font-size:2.5rem">🔍</div>
              <h3>No products found</h3>
              <p class="text-muted">Try removing a filter or widening the price range.</p>
              <button class="btn btn-ghost btn-sm" (click)="reset()">Clear filters</button>
            </div>
          } @else {
            <div class="prod-grid" [class.list]="view() === 'list'">
              @for (p of products(); track p._id) {
                <app-product-card [product]="p" [dense]="true" variant="ebay" [list]="view() === 'list'" />
              }
            </div>

            @if (pages() > 1) {
              <nav class="pager" aria-label="Pagination">
                <button class="pg arrow" [disabled]="page() === 1" (click)="goTo(page()-1)" aria-label="Previous page">‹</button>
                @for (p of pageList(); track $index) {
                  @if (p === 0) {
                    <span class="pg gap">…</span>
                  } @else {
                    <button class="pg" [class.on]="p === page()" (click)="goTo(p)" [attr.aria-current]="p === page() ? 'page' : null">{{ p }}</button>
                  }
                }
                <button class="pg arrow" [disabled]="page() === pages()" (click)="goTo(page()+1)" aria-label="Next page">›</button>
              </nav>
              <div class="per-page">
                <label>
                  Items per page
                  <select class="rail-select" [(ngModel)]="perPage" (change)="apply()">
                    <option [ngValue]="20">20</option>
                    <option [ngValue]="40">40</option>
                    <option [ngValue]="48">48</option>
                  </select>
                </label>
              </div>
            }
          }
        </div>
      </div>
    </section>
  `,
  styles: [`
    /* eBay's results page is mostly white with hairline rules and blue links —
       the rail has no boxes at all, just headings over checkbox lists. */
    .catalog { padding: 14px 0 56px; --link:#3665f3; --hair:#e5e5e5; }

    .crumbs { display:flex; align-items:center; gap:7px; flex-wrap:wrap; font-size:.8rem; color:#707070; margin-bottom:12px; }
    .crumbs a, .crumbs .crumb-btn { color: var(--link); }
    .crumbs a:hover, .crumbs .crumb-btn:hover { text-decoration:underline; }
    .crumb-btn { background:none; border:none; padding:0; font:inherit; font-size:.8rem; cursor:pointer; }
    .crumbs .current { color: var(--ink); }

    .cat-layout { display:grid; grid-template-columns: 200px minmax(0,1fr); gap: 24px; align-items:start; }

    /* ---- filter rail ---- */
    .rail { position:sticky; top:88px; }
    .rail-group { padding-bottom:14px; margin-bottom:14px; border-bottom:1px solid var(--hair); }
    .rail-title { font-family: var(--font-body); font-weight:700; font-size:.88rem; margin:0 0 8px; }
    .rail-body.links { max-height:260px; overflow-y:auto; }
    .cat-link { display:block; width:100%; text-align:left; background:none; border:none; cursor:pointer;
      font:inherit; font-size:.82rem; color: var(--link); padding:4px 0; }
    .cat-link:hover { text-decoration:underline; }
    .cat-link.on { color: var(--ink); font-weight:700; text-decoration:none; cursor:default; }
    .cat-link.dept { font-weight:700; color: var(--ink); }
    .cat-link.dept:not(.on) { color: var(--link); }
    .cat-link.sub { padding-left:12px; }
    .cat-back { display:block; width:100%; text-align:left; background:none; border:none; cursor:pointer;
      font:inherit; font-size:.78rem; color: var(--link); padding:2px 0 8px; }
    .cat-back:hover { text-decoration:underline; }

    .opt { display:flex; align-items:center; gap:7px; padding:4px 0; font-size:.82rem; cursor:pointer; }
    .opt input { width:14px; height:14px; accent-color: var(--link); cursor:pointer; flex:none; }
    .opt-dot { width:14px; height:14px; border-radius:50%; border:1px solid rgba(0,0,0,.2); flex:none; }
    .opt-name { color: var(--ink); }
    .opt-count { color:#707070; font-size:.76rem; }

    .price-row { display:flex; align-items:center; gap:5px; }
    .price-in { width:100%; min-width:0; padding:6px 8px; border:1px solid #767676; border-radius:4px;
      font-family: var(--font-body); font-size:.8rem; color: var(--ink); background:#fff; }
    .dash { color:#707070; font-size:.78rem; }
    .price-go { flex:none; width:28px; height:28px; border:1px solid #767676; border-radius:50%; background:#fff;
      color: var(--ink); font-size:1rem; line-height:1; cursor:pointer; }
    .price-go:hover { background:#f5f5f5; }

    .rail-select { width:100%; padding:6px 8px; border:1px solid #767676; border-radius:4px; background:#fff;
      font-family: var(--font-body); font-size:.8rem; color: var(--ink); cursor:pointer; }
    .link-btn { background:none; border:none; padding:0; font:inherit; font-size:.82rem; color: var(--link); cursor:pointer; }
    .link-btn:hover { text-decoration:underline; }

    /* ---- results ---- */
    .res-head { display:flex; align-items:center; justify-content:space-between; gap:14px; flex-wrap:wrap;
      padding-bottom:10px; border-bottom:1px solid var(--hair); margin-bottom:14px; }
    .res-count { font-size:.85rem; color:#707070; }
    .res-count strong, .res-count b { color: var(--ink); }
    .tools { display:flex; align-items:center; gap:10px; }
    .sort-wrap { display:flex; align-items:center; gap:6px; }
    .tool-label { font-size:.82rem; color:#707070; }
    .sort { width:auto; }
    .view-toggle { display:flex; border:1px solid #767676; border-radius:4px; overflow:hidden; }
    .view-toggle button { width:30px; height:28px; border:none; background:#fff; cursor:pointer; color:#707070; font-size:.85rem; }
    .view-toggle button.on { background: var(--ink); color:#fff; }

    /* Same --listing-cols ladder the home page uses (see styles.css) — the
       sidebar narrows the track, so cards land a shade smaller here. */
    .prod-grid { display:grid; grid-template-columns: repeat(var(--listing-cols), minmax(0, 1fr)); gap:14px; }
    /* List view reuses the same cards, laid out one per row. */
    .prod-grid.list { grid-template-columns: 1fr; gap:0; }
    .prod-grid.list app-product-card { border-bottom:1px solid var(--hair); padding:2px 0; }
    .empty { padding:60px 20px; display:flex; flex-direction:column; align-items:center; gap:10px; }

    .pager { display:flex; align-items:center; justify-content:center; gap:4px; margin-top:30px; flex-wrap:wrap; }
    .pg { min-width:32px; height:32px; padding:0 8px; border:none; background:none; border-radius:50%;
      font-family: var(--font-body); font-weight:600; font-size:.88rem; color: var(--ink); cursor:pointer; }
    .pg:hover:not(:disabled):not(.on) { background:#f0f0f0; }
    .pg.on { background: var(--ink); color:#fff; }
    .pg:disabled { opacity:.35; cursor:not-allowed; }
    .pg.gap { cursor:default; color:#707070; }
    .per-page { display:flex; justify-content:center; margin-top:14px; font-size:.8rem; color:#707070; }
    .per-page label { display:flex; align-items:center; gap:7px; }
    .per-page .rail-select { width:auto; }

    /* Shown only on small screens — see the media query below. */
    .filter-toggle { display:none; align-items:center; gap:8px; width:100%; margin-bottom:14px;
      padding:12px 16px; border:1px solid #767676; border-radius:6px; background:#fff;
      font-family: var(--font-display); font-weight:600; font-size:.95rem; color: var(--ink); cursor:pointer; }
    .fcount { background:#fff; color: var(--accent); border:1px solid var(--accent); font-family: var(--font-body); font-weight:800;
      font-size:.72rem; min-width:20px; height:20px; border-radius:999px; display:grid; place-items:center; padding:0 6px; }

    @media (max-width: 900px) {
      .cat-layout { grid-template-columns: 1fr; }
      .rail { position:static; display:none; }
      .rail.open { display:block; margin-bottom:20px; }
      .rail-body.links { max-height:200px; }
      .filter-toggle { display:flex; }

      /* Comfortable tap targets — the desktop sizes are too small for a thumb. */
      .opt { padding:9px 0; }
      .opt input { width:20px; height:20px; }
      .price-in { padding:10px; font-size:.9rem; }
      .price-go { width:38px; height:38px; font-size:1.2rem; }
      .rail-select, .sort { padding:10px; font-size:.9rem; }
      .view-toggle button { width:40px; height:38px; font-size:1rem; }
      .cat-link { padding:9px 0; }
      .link-btn { padding:8px 0; }
    }
    @media (max-width: 560px) {
      .prod-grid { gap:10px; }
      .res-head { flex-direction:column; align-items:flex-start; }
      .tools { width:100%; justify-content:space-between; }
    }
  `],
})
export class ShopComponent implements OnInit {
  categories = signal<Category[]>([]);
  products = signal<Product[]>([]);
  colors = signal<ColorOption[]>([]);
  loading = signal(true);
  page = signal(1);
  pages = signal(1);
  total = signal(0);
  view = signal<'grid' | 'list'>('grid');
  /** Only consulted on small screens, where the rail is collapsed by default. */
  filtersOpen = signal(false);

  filters = {
    search: '',
    category: '',
    minPrice: '' as number | '',
    maxPrice: '' as number | '',
    sort: 'newest',
    onSale: false,
    color: '',
  };
  perPage = PER_PAGE;

  // Kept separate from `filters` so typing a range doesn't refetch on each
  // keystroke — it applies on Enter or the arrow button.
  minPriceInput: number | null = null;
  maxPriceInput: number | null = null;

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
      this.filters.onSale = q['deals'] === 'true';
      this.filters.color = q['color'] || '';
      this.load(1);
    });
  }

  /**
   * Colour options for the filters currently active — every one of them, not
   * just the category. The facet counts used to ignore search, price and Deals,
   * so a swatch could read "Blue 4" and return nothing at all when clicked.
   *
   * `color` itself is left out: the facet reports what each colour *would*
   * return, so narrowing to the chosen one first would zero out all the others.
   */
  private loadColors() {
    const { color, sort, ...active } = this.filters;
    this.productSvc
      .colors({ ...active, onSale: active.onSale || '' })
      .subscribe((c) => {
        this.colors.set(c);
        // A colour the current filters leave nothing of would empty the page
        // with no way to see why — drop it and show the rest instead. Safe from
        // looping: the reload runs with no colour set, so this can't fire twice.
        if (color && !c.some((o) => o.name === color)) {
          this.filters.color = '';
          this.load(1);
        }
      });
  }

  pickCategory(slug: string) {
    this.filters.category = slug;
    // Reflected in the URL so the view is shareable and Back works.
    this.router.navigate(['/shop'], { queryParams: slug ? { category: slug } : {} });
  }

  pickColor(name: string) {
    // Clicking the active swatch again clears it.
    this.filters.color = this.filters.color === name ? '' : name;
    this.apply();
  }

  applyPrice() {
    this.filters.minPrice = this.minPriceInput ?? '';
    this.filters.maxPrice = this.maxPriceInput ?? '';
    this.apply();
  }

  /** How many filters are narrowing the results — shown on the mobile toggle. */
  activeFilterCount(): number {
    const f = this.filters;
    return [f.category, f.color, f.minPrice !== '', f.maxPrice !== '', f.onSale]
      .filter(Boolean).length;
  }

  /** Top-level departments only. */
  departments(): Category[] {
    return this.categories().filter((c) => !c.parent);
  }

  subsOf(parentSlug: string): Category[] {
    return this.categories().filter((c) => c.parent === parentSlug);
  }

  /**
   * The department the rail should be drilled into — the selected category when
   * it is one, otherwise the parent of the selected sub-category. Null while
   * browsing everything.
   */
  activeDept(): Category | null {
    const sel = this.categories().find((c) => c.slug === this.filters.category);
    if (!sel) return null;
    return sel.parent ? this.categories().find((c) => c.slug === sel.parent) ?? null : sel;
  }

  /** "1-20" — which slice of the result set this page is showing. */
  shownRange(): string {
    if (!this.total()) return '0';
    const first = (this.page() - 1) * this.perPage + 1;
    const last = Math.min(this.page() * this.perPage, this.total());
    return `${first}-${last}`;
  }

  /** Title reflects whatever sent us here. */
  heading(): string {
    if (this.filters.search) return this.filters.search;
    if (this.filters.onSale) return 'Deals';
    const cat = this.categories().find((c) => c.slug === this.filters.category);
    return cat ? cat.name : 'All Products';
  }

  /** The 'for "X"' part of the results count — omitted when browsing everything. */
  scopeLabel(): string {
    if (this.filters.search) return this.filters.search;
    const cat = this.categories().find((c) => c.slug === this.filters.category);
    return cat?.name ?? '';
  }

  /** Page numbers with 0 standing in for a gap, so long ranges stay compact. */
  pageList(): number[] {
    const total = this.pages();
    const cur = this.page();
    if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

    const out: number[] = [1];
    const from = Math.max(2, cur - 1);
    const to = Math.min(total - 1, cur + 1);
    if (from > 2) out.push(0);
    for (let i = from; i <= to; i++) out.push(i);
    if (to < total - 1) out.push(0);
    out.push(total);
    return out;
  }

  load(page: number) {
    this.loading.set(true);
    this.page.set(page);
    // Refreshed alongside the results, not only when the category changes, so
    // the swatch counts always describe the list being shown next to them.
    this.loadColors();
    this.productSvc
      .list({
        ...this.filters,
        onSale: this.filters.onSale || '',
        page,
        limit: this.perPage,
      })
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

  goTo(p: number) {
    this.load(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  reset() {
    this.filters = {
      search: '', category: '', minPrice: '', maxPrice: '',
      sort: 'newest', onSale: false, color: '',
    };
    this.minPriceInput = null;
    this.maxPriceInput = null;
    this.router.navigate(['/shop']);
    this.load(1);
  }
}
