import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ProductService, CategoryService } from '../../core/services/api.service';
import { Category, Product } from '../../core/models/models';
import { ProductCardComponent } from '../../shared/components/product-card.component';
import { FALLBACK_IMAGE, ImgFallbackDirective } from '../../shared/directives/img-fallback.directive';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterLink, ProductCardComponent, ImgFallbackDirective],
  template: `
    <!-- HERO -->
    <section class="hero">
      <div class="container hero-grid">
        <div class="hero-copy">
          <span class="eyebrow">Trusted by 10,000+ parents 💛</span>
          <h1>Gentle care for your <span class="hl">little one</span></h1>
          <p>Soft clothing, safe toys, and everyday essentials — thoughtfully chosen for babies and toddlers, delivered to your door.</p>
          <div class="flex gap wrap">
            <a routerLink="/shop" class="btn btn-primary">Shop all products</a>
            <a routerLink="/shop" class="btn btn-ghost">Browse best sellers</a>
          </div>
          <div class="hero-trust">
            <div><strong>🚚 Free</strong><span>over Rs 5,000</span></div>
            <div><strong>↩️ 7-day</strong><span>easy returns</span></div>
            <div><strong>🔒 Secure</strong><span>checkout</span></div>
          </div>
        </div>
        <div class="hero-art">
          <img src="https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?w=700&q=80" alt="Happy baby" appImgFallback />
          <div class="floaty f1">🍼</div>
          <div class="floaty f2">🧸</div>
          <div class="floaty f3">⭐</div>
        </div>
      </div>
    </section>

    <!-- CATEGORIES -->
    <section class="section">
      <div class="container">
        <div class="head"><h2>Shop by category</h2><a routerLink="/shop" class="see">See all →</a></div>
        <div class="grid grid-3 cat-grid">
          @for (c of categories(); track c._id) {
            <a [routerLink]="['/shop']" [queryParams]="{ category: c.slug }" class="cat-tile">
              <img [src]="c.image || fallback" [alt]="c.name" appImgFallback />
              <div class="cat-info">
                <h3>{{ c.name }}</h3>
                <span>{{ c.productCount }} items</span>
              </div>
            </a>
          }
        </div>
      </div>
    </section>

    <!-- FEATURED -->
    <section class="section featured">
      <div class="container">
        <div class="head"><h2>Parents’ favourites</h2><a routerLink="/shop" class="see">See all →</a></div>
        @if (loading()) { <div class="spinner"></div> }
        @else {
          <div class="grid grid-4">
            @for (p of featured(); track p._id) { <app-product-card [product]="p" /> }
          </div>
        }
      </div>
    </section>

    <!-- PROMISE -->
    <section class="section">
      <div class="container promise">
        <h2>Why parents choose Funkybunky</h2>
        <div class="grid grid-3 mt-lg">
          <div class="promise-card"><span>🌿</span><h3>Gentle & safe</h3><p>Baby-safe materials, tested for delicate skin and tiny hands.</p></div>
          <div class="promise-card"><span>📦</span><h3>Fast delivery</h3><p>Dispatched within 24 hours with live order tracking.</p></div>
          <div class="promise-card"><span>💬</span><h3>Real support</h3><p>Friendly help whenever you need it, from real people.</p></div>
        </div>
      </div>
    </section>
  `,
  styles: [`
    .hero { background: linear-gradient(160deg, var(--mint-soft), var(--cream) 70%); overflow:hidden; }
    .hero-grid { display:grid; grid-template-columns: 1.1fr 1fr; gap: 40px; align-items:center; padding: 60px 20px; }
    .eyebrow { display:inline-block; background:#fff; padding:6px 14px; border-radius:999px; font-weight:700; font-size:.85rem; box-shadow: var(--shadow-sm); }
    .hero h1 { font-size: clamp(2.2rem, 5vw, 3.6rem); margin:18px 0 12px; }
    .hl { color: var(--coral); }
    .hero-copy p { font-size: 1.1rem; color: var(--muted); max-width: 460px; margin-bottom: 22px; }
    .hero-trust { display:flex; gap:26px; margin-top:28px; flex-wrap:wrap; }
    .hero-trust div { display:flex; flex-direction:column; }
    .hero-trust strong { font-family: var(--font-display); }
    .hero-trust span { font-size:.85rem; color: var(--muted); }
    .hero-art { position:relative; }
    .hero-art img { border-radius: var(--radius-lg); box-shadow: var(--shadow-lg); aspect-ratio: 4/3; object-fit:cover; }
    .floaty { position:absolute; background:#fff; width:56px; height:56px; border-radius:50%; display:grid; place-items:center; font-size:1.6rem; box-shadow: var(--shadow); animation: bob 3s ease-in-out infinite; }
    .f1 { top:-14px; left:-14px; } .f2 { bottom:20px; left:-22px; animation-delay:.6s; } .f3 { top:30px; right:-16px; animation-delay:1.2s; }
    @keyframes bob { 0%,100%{ transform: translateY(0);} 50%{ transform: translateY(-10px);} }
    @media (prefers-reduced-motion: reduce) { .floaty { animation: none; } }
    .head { display:flex; align-items:center; justify-content:space-between; margin-bottom: 22px; }
    .head h2 { font-size: 1.8rem; }
    .see { color: var(--coral); font-weight:700; }
    .cat-tile { position:relative; border-radius: var(--radius); overflow:hidden; box-shadow: var(--shadow-sm); aspect-ratio: 3/2; display:block; }
    .cat-tile img { width:100%; height:100%; object-fit:cover; transition: transform .3s; }
    .cat-tile:hover img { transform: scale(1.06); }
    .cat-info { position:absolute; inset:auto 0 0 0; padding:16px; background: linear-gradient(transparent, rgba(51,65,79,.75)); color:#fff; }
    .cat-info h3 { color:#fff; margin:0; }
    .cat-info span { font-size:.85rem; opacity:.9; }
    .featured { background:#fff; }
    .promise { text-align:center; }
    .promise-card { background: var(--cream); border-radius: var(--radius); padding: 28px; }
    .promise-card span { font-size:2.4rem; }
    .promise-card h3 { margin:12px 0 6px; }
    .promise-card p { color: var(--muted); margin:0; }
    @media (max-width: 860px) { .hero-grid { grid-template-columns: 1fr; } .hero-art { order:-1; } }
  `],
})
export class HomeComponent implements OnInit {
  categories = signal<Category[]>([]);
  featured = signal<Product[]>([]);
  loading = signal(true);
  fallback = FALLBACK_IMAGE;

  constructor(private products: ProductService, private cats: CategoryService) {}

  ngOnInit() {
    this.cats.list().subscribe((c) => this.categories.set(c.slice(0, 6)));
    this.products.list({ featured: true, limit: 8 }).subscribe({
      next: (r) => { this.featured.set(r.items); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }
}
