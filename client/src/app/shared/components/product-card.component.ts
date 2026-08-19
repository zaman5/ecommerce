import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Product } from '../../core/models/models';
import { CartService } from '../../core/services/cart.service';
import { SavedService } from '../../core/services/saved.service';
import { FALLBACK_IMAGE, ImgFallbackDirective } from '../directives/img-fallback.directive';
import { MediaUrlPipe } from '../pipes/media-url.pipe';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [CommonModule, RouterLink, ImgFallbackDirective, MediaUrlPipe],
  template: `
    <div class="pcard" [class.dense]="dense" [class.ebay]="variant === 'ebay'" [class.row]="list">
      <a [routerLink]="['/product', product.slug]" class="pimg">
        <img [src]="(product.images[0] | mediaUrl) || fallback" [alt]="product.name" loading="lazy" appImgFallback />
        @if (discount() > 0) { <span class="badge badge-sale tag">-{{ discount() }}%</span> }
        @if (product.stock === 0) { <span class="soldout">Sold out</span> }
      </a>
      <button
        class="watch"
        [class.on]="saved.has(product._id)"
        (click)="saved.toggle(product)"
        [attr.aria-pressed]="saved.has(product._id)"
        [attr.aria-label]="saved.has(product._id) ? 'Remove from saved' : 'Save this item'"
      >{{ saved.has(product._id) ? '♥' : '♡' }}</button>
      <div class="pbody">
        <!-- display:contents by default, so the grid tile is laid out exactly as
             before; the row layout turns this into its left-hand column. -->
        <div class="pinfo">
          <div class="brand">{{ product.brand }}</div>
          <a [routerLink]="['/product', product.slug]" class="pname">{{ product.name }}</a>

          @if (list) {
            <!-- A row is mostly empty space in a grid tile's clothing. These are
                 the details there was never room for, and only render here. -->
            <div class="rating">
              <span class="stars" [attr.aria-label]="'Rated ' + (product.rating || 0) + ' out of 5'">{{ stars() }}</span>
              @if (product.numReviews) {
                <span class="muted-sm">{{ product.numReviews }} rating{{ product.numReviews === 1 ? '' : 's' }}</span>
              } @else {
                <span class="muted-sm">No ratings yet</span>
              }
            </div>

            @if (product.description) {
              <p class="blurb">{{ product.description }}</p>
            }

            <div class="specs">
              @if (categoryName()) { <span class="spec">{{ categoryName() }}</span> }
              @if (product.colors?.length) {
                <span class="spec">{{ product.colors!.length }} colour{{ product.colors!.length === 1 ? '' : 's' }}</span>
              }
              <span class="spec" [class.warn]="product.stock > 0 && product.stock <= 5" [class.out]="product.stock === 0">
                {{ stockLabel() }}
              </span>
              @if (product.unitsSold) { <span class="spec">{{ product.unitsSold }} sold</span> }
            </div>
          }
        </div>

        <div class="prow">
          <div class="pprice">
            <span class="price">Rs {{ product.price | number }}</span>
            @if (product.compareAtPrice > product.price) {
              <span class="strike">Rs {{ product.compareAtPrice | number }}</span>
              @if (variant === 'ebay') { <span class="save-pct">{{ discount() }}% off</span> }
            }
          </div>
          @if (product.colors?.length) {
            <!-- Choosing the colour for them would be guessing, so send them to
                 the page where the swatches are. -->
            <a
              class="add choose"
              [routerLink]="['/product', product.slug]"
              [attr.aria-label]="'Choose a colour for ' + product.name"
              title="Choose a colour"
              >›</a
            >
          } @else {
            <button class="add" [disabled]="product.stock === 0" (click)="cart.add(product)" aria-label="Add to cart">+</button>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    /* The host defaults to inline, which lets the card size itself from its
       content instead of its grid/flex column — cards in a row then disagree on
       width and image height. Block + full height makes every card line up. */
    :host { display:block; height:100%; }
    .pcard { --watch-reserve: 38px; }
    .pcard { position:relative; height:100%; background:#fff; border:1px solid var(--line); border-radius: var(--radius); overflow:hidden; box-shadow: var(--shadow-sm); transition: transform .15s ease, box-shadow .2s ease, border-color .15s ease; display:flex; flex-direction:column; }
    .watch { position:absolute; top:10px; right:10px; z-index:2; width:34px; height:34px; border-radius:50%; border:none; background: rgba(255,255,255,.94); box-shadow: var(--shadow-sm); color: var(--muted); font-size:1.1rem; line-height:1; cursor:pointer; display:grid; place-items:center; transition: color .15s, transform .12s, background .15s; }
    .watch:hover { color: var(--accent); transform: scale(1.1); }
    .watch.on { color: var(--sun-deep); background: var(--sun-soft); }
    .pcard:hover { transform: translateY(-4px); box-shadow: var(--shadow); border-color: var(--brand-soft); }
    .pimg { position:relative; aspect-ratio: 1/1; display:block; background: var(--cream-deep); flex:none; min-height:0; overflow:hidden; }
    .pimg img { width:100%; height:100%; object-fit:cover; }
    .tag { position:absolute; top:10px; left:10px; background: #CC0C39; color: #fff; font-weight:800; font-size:.82rem; padding:4px 11px; border-radius:999px; text-align:center; display:inline-flex; align-items:center; justify-content:center; box-shadow: 0 2px 8px rgba(204, 12, 57, 0.35); }
    .soldout { position:absolute; inset:0; display:grid; place-items:center; background: rgba(255,255,255,.75); font-family: var(--font-display); font-weight:700; color: var(--muted); }
    .pbody { padding:14px; display:flex; flex-direction:column; gap:4px; flex:1; }
    .pinfo { display:contents; }
    .brand { font-size:.75rem; text-transform:uppercase; letter-spacing:.04em; color: var(--muted); font-weight:800; }
    .pname { font-family: var(--font-display); font-weight:700; color: var(--ink); line-height:1.25; transition: color .15s; }
    .pname:hover { color: var(--brand); }
    .prow { margin-top:auto; padding-top:8px; display:flex; align-items:center; justify-content:space-between; gap:8px; }
    .pprice { display:flex; align-items:baseline; gap:8px; flex-wrap:wrap; }
    .price { font-family: var(--font-display); font-weight:800; color: #000000; font-size:1.15rem; }
    .strike { text-decoration: line-through; color: var(--muted); font-weight: 600; font-size: .85em; }
    .save-pct { color: #CC0C39; background: #fff1f2; font-weight: 800; font-size: .78rem; padding: 2px 8px; border-radius: 4px; text-align: center; }
    .add { width:38px; height:38px; flex:none; border-radius:50%; border:1px solid var(--line); background: rgba(255,255,255,.92); box-shadow: var(--shadow-sm); color: var(--ink); font-size:1.4rem; font-weight:700; cursor:pointer; line-height:1; display:grid; place-items:center; transition: color .15s, border-color .15s, transform .12s, background .15s; }
    .add:hover { color: #fff; background: var(--brand); border-color: var(--brand); transform: scale(1.1); }
    .add:disabled { color: var(--line); border-color: var(--line); box-shadow:none; cursor:not-allowed; }
    .add.choose { text-decoration:none; font-size:1.6rem; }

    /* ---- dense layout ---- */
    .pcard.dense { border-radius: var(--radius-sm); }
    .pcard.dense:hover { transform: translateY(-2px); box-shadow: var(--shadow); }
    .pcard.dense .pbody { padding:10px; gap:3px; }
    .pcard.dense .brand { display:none; }
    .pcard.dense .pname { font-family: var(--font-body); font-weight:700; font-size:.88rem; line-height:1.35;
      display:-webkit-box; -webkit-line-clamp:2; line-clamp:2; -webkit-box-orient:vertical; overflow:hidden; }
    .pcard.dense .price { font-size:1.1rem; color: #000000; font-weight:800; }
    .pcard.dense .strike { font-size:.78rem; }
    .pcard.dense .watch { width:28px; height:28px; top:8px; right:8px; font-size:.95rem; }
    .pcard.dense .add { width:32px; height:32px; font-size:1.2rem; }
    .pcard.dense .add.choose { font-size:1.3rem; }

    /* ---- ebay variant ---- */
    .pcard.ebay { border-radius: var(--radius-sm); box-shadow: var(--shadow-sm); border-color: var(--line); }
    .pcard.ebay:hover { transform: translateY(-2px); box-shadow: var(--shadow); border-color: var(--brand); }
    .pcard.ebay .pimg { background:#fff; }
    .pcard.ebay .pimg img { object-fit:contain; padding:6px; }
    .pcard.ebay .pname { color: var(--ink); font-weight:700; }
    .pcard.ebay .pname:hover { color: var(--brand); text-decoration:none; }
    .pcard.ebay .price { color: #000000; font-family: var(--font-display); font-weight:800; font-size:1.15rem; }
    .pcard.ebay .save-pct { color: #CC0C39; background: #fff1f2; font-weight:800; font-size:.76rem; padding: 2px 6px; border-radius: 4px; text-align: center; }
    .pcard.ebay .tag { background: #CC0C39; color: #fff; border:none; font-weight:800; text-align: center; box-shadow: 0 2px 8px rgba(204, 12, 57, 0.35); }

    /* ---- list row (catalogue "list view") ----
       Two columns: the details on the left, price and action on the right. A
       row is ~4x the width of a grid tile, so it carries the rating, blurb and
       specs that would never fit in one. */
    .pcard.row { flex-direction:row; }
    .pcard.row .pimg { width:170px; flex:none; }
    .pcard.row .pbody { padding:14px 16px; flex-direction:row; align-items:stretch; gap:22px; }
    .pcard.row .pinfo { display:flex; flex-direction:column; flex:1; min-width:0; gap:5px; }
    .pcard.row .pname { -webkit-line-clamp:2; line-clamp:2; font-size:1rem; }
    /* The dense card hides the brand for space; a row has plenty. */
    .pcard.row .brand { display:block; }

    .pcard.row .rating { display:flex; align-items:center; gap:8px; }
    .pcard.row .stars { color:var(--sun-deep); letter-spacing:1px; font-size:.86rem; }
    .pcard.row .muted-sm { font-size:.78rem; color: var(--muted); }
    .pcard.row .blurb {
      margin:2px 0 0; font-size:.85rem; line-height:1.5; color:#5a6570;
      display:-webkit-box; -webkit-line-clamp:2; line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;
    }
    .pcard.row .specs { display:flex; flex-wrap:wrap; gap:6px; margin-top:auto; padding-top:8px; }
    .pcard.row .spec { font-size:.72rem; font-weight:700; color: var(--muted);
      background: var(--cream); border:1px solid var(--line); border-radius:999px; padding:2px 9px; }
    .pcard.row .spec.warn { background:#fff0d6; border-color:#f2ddb4; color:#a9721f; }
    .pcard.row .spec.out { background:#ffe0dd; border-color:#f4c7c2; color:#c53030; }

    /* Price column: fixed width so every row's prices line up down the page.
       padding-top clears the save-for-later button, which is pinned to the
       card's top-right corner and would otherwise be painted over the price. */
    .pcard.row .prow { flex:0 0 200px; flex-direction:column; align-items:flex-end; justify-content:flex-start;
      gap:12px; margin-top:0; padding-top: var(--watch-reserve); padding-left:20px;
      border-left:1px solid var(--line); }
    .pcard.row .pprice { flex-direction:column; align-items:flex-end; gap:2px; }

    @media (max-width: 760px) {
      /* Not enough width for two columns — stack, and put the price back on one
         line with the button beside it. */
      .pcard.row .pbody { flex-direction:column; gap:10px; }
      .pcard.row .prow { flex:auto; flex-direction:row; align-items:center; justify-content:space-between;
        padding-left:0; border-left:none; border-top:1px solid var(--line); padding-top:10px; }
      .pcard.row .pprice { flex-direction:row; align-items:baseline; gap:8px; }
      .pcard.row .blurb { -webkit-line-clamp:3; line-clamp:3; }
    }
    @media (max-width: 900px) {
      /* Thumb-sized controls. The desktop 32px circles are too small to hit
         reliably, and the dense card shrinks them further. */
      .add, .pcard.dense .add { width:42px; height:42px; font-size:1.5rem; }
      .pcard.dense .add.choose, .add.choose { font-size:1.6rem; }
      .watch, .pcard.dense .watch { width:38px; height:38px; font-size:1.15rem; top:8px; right:8px; }
      .pcard { --watch-reserve: 46px; }
      .pcard.dense .pname { font-size:.92rem; }
    }
    @media (max-width: 560px) { .pcard.row .pimg { width:110px; } }
  `],
})
export class ProductCardComponent {
  @Input({ required: true }) product!: Product;
  /** Compact listing card for the home page's dense grid. */
  @Input() dense = false;
  /** Horizontal row, for the catalogue's list view. */
  @Input() list = false;
  /**
   * Which listing look to wear. 'ebay' implies the dense layout with eBay's
   * typography (blue link title, plain bold price).
   */
  @Input() variant: 'default' | 'ebay' = 'default';
  fallback = FALLBACK_IMAGE;
  constructor(public cart: CartService, public saved: SavedService) {}

  discount(): number {
    if (this.product.compareAtPrice > this.product.price) {
      return Math.round((1 - this.product.price / this.product.compareAtPrice) * 100);
    }
    return 0;
  }

  /** "★★★★☆" for a 0–5 score, rounded to the nearest whole star. */
  stars(): string {
    const filled = Math.round(this.product.rating || 0);
    return '★'.repeat(filled) + '☆'.repeat(5 - filled);
  }

  /** Warns at five or fewer — the point where "grab it now" is true rather than nagging. */
  stockLabel(): string {
    const n = this.product.stock;
    if (n === 0) return 'Sold out';
    if (n <= 5) return `Only ${n} left`;
    return 'In stock';
  }

  /** `category` is populated on listings but can arrive as a bare id elsewhere. */
  categoryName(): string {
    const c = this.product.category;
    return c && typeof c === 'object' ? c.name : '';
  }
}
