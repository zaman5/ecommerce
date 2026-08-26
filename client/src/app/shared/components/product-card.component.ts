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
    <div class="product-card" [class.dense]="dense" [class.row-layout]="list">
      <!-- Image & Badges -->
      <div class="card-img-wrap">
        <a [routerLink]="['/product', product.slug]" class="img-link">
          <img
            [src]="(product.images && product.images[0] | mediaUrl) || fallback"
            [alt]="product.name"
            loading="lazy"
            appImgFallback
            class="card-img"
          />
        </a>

        @if (discount() > 0) {
          <span class="badge-tag sale">-{{ discount() }}%</span>
        } @else if (isNew()) {
          <span class="badge-tag new">New</span>
        }

        @if (product.stock === 0) {
          <span class="sold-overlay">Sold out</span>
        }

        <!-- Save to Wishlist Heart -->
        <button
          class="wish-btn"
          [class.saved]="saved.has(product._id)"
          (click)="saved.toggle(product)"
          [attr.aria-label]="saved.has(product._id) ? 'Remove from wishlist' : 'Save to wishlist'"
        >
          <i [class]="saved.has(product._id) ? 'fas fa-heart text-accent' : 'far fa-heart'"></i>
        </button>
      </div>

      <!-- Card Details -->
      <div class="card-content">
        @if (product.brand) {
          <span class="card-brand">{{ product.brand }}</span>
        }

        <h3 class="card-title">
          <a [routerLink]="['/product', product.slug]" [title]="product.name">{{ product.name }}</a>
        </h3>

        <!-- Ratings -->
        <div class="card-rating">
          <div class="stars-wrap">
            @for (star of [1, 2, 3, 4, 5]; track star) {
              <i
                class="fas fa-star"
                [class.active]="(product.rating || 4.5) >= star"
                [class.half]="(product.rating || 4.5) >= star - 0.5 && (product.rating || 4.5) < star"
              ></i>
            }
          </div>
          <span class="review-count">({{ product.numReviews || 48 }})</span>
        </div>

        <!-- Price -->
        <div class="card-price-row">
          <span class="price-val">Rs. {{ product.price | number }}</span>
          @if (product.compareAtPrice > product.price) {
            <span class="strike-val">Rs. {{ product.compareAtPrice | number }}</span>
          }
        </div>

        @if (list && product.description) {
          <p class="card-desc">{{ product.description }}</p>
        }

        <!-- Add to Cart CTA -->
        <div class="card-action">
          @if (product.colors && product.colors.length > 0) {
            <a [routerLink]="['/product', product.slug]" class="btn-cart-cta choose-btn">
              <i class="fas fa-eye"></i> View Options
            </a>
          } @else {
            <button
              class="btn-cart-cta"
              [disabled]="product.stock === 0"
              (click)="cart.add(product)"
            >
              <i class="fas fa-cart-plus"></i> Add to Cart
            </button>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    :host { display: block; height: 100%; }

    .product-card {
      background: #ffffff;
      border: 1px solid #f3f4f6;
      border-radius: 14px;
      padding: 14px;
      height: 100%;
      display: flex;
      flex-direction: column;
      position: relative;
      transition: box-shadow .2s ease, transform .15s ease, border-color .15s ease;
      box-shadow: 0 1px 3px rgba(0,0,0,0.03);
    }
    .product-card:hover {
      box-shadow: 0 10px 25px -5px rgba(0,0,0,0.08), 0 8px 10px -6px rgba(0,0,0,0.04);
      transform: translateY(-3px);
      border-color: #e5e7eb;
    }

    /* Image Wrapper */
    .card-img-wrap {
      position: relative;
      aspect-ratio: 1/1;
      border-radius: 10px;
      background: #f9fafb;
      overflow: hidden;
      margin-bottom: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .img-link { display: block; width: 100%; height: 100%; }
    .card-img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      transition: transform .35s ease;
    }
    .product-card:hover .card-img {
      transform: scale(1.06);
    }

    /* Badges */
    .badge-tag {
      position: absolute;
      top: 10px;
      left: 10px;
      font-size: 0.65rem;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 3px 8px;
      border-radius: 999px;
      z-index: 2;
    }
    .badge-tag.sale { background: #ef4444; color: #ffffff; }
    .badge-tag.new { background: var(--accent); color: #ffffff; }

    /* Sold Out */
    .sold-overlay {
      position: absolute;
      inset: 0;
      background: rgba(255, 255, 255, 0.8);
      display: grid;
      place-items: center;
      font-family: var(--font-display);
      font-weight: 800;
      color: #ef4444;
      font-size: 0.95rem;
      z-index: 3;
    }

    /* Wishlist Button */
    .wish-btn {
      position: absolute;
      top: 10px;
      right: 10px;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      border: 1px solid rgba(0,0,0,0.06);
      background: rgba(255, 255, 255, 0.92);
      box-shadow: 0 2px 5px rgba(0,0,0,0.08);
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.95rem;
      color: #9ca3af;
      transition: transform .15s, color .15s, background .15s;
      z-index: 2;
    }
    .wish-btn:hover { transform: scale(1.1); color: var(--accent); }
    .wish-btn.saved { color: var(--accent); background: #ffffff; }

    /* Card Content */
    .card-content { display: flex; flex-direction: column; flex: 1; }
    .card-brand { font-size: 0.7rem; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px; }

    .card-title {
      font-family: var(--font-body);
      font-size: 0.88rem;
      font-weight: 600;
      line-height: 1.35;
      margin: 0 0 6px;
      color: #1f2937;
    }
    .card-title a {
      color: inherit;
      text-decoration: none;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      line-clamp: 2;
      -webkit-box-orient: vertical;
      overflow: hidden;
      transition: color .15s;
    }
    .card-title a:hover { color: var(--primary); }

    /* Ratings */
    .card-rating { display: flex; align-items: center; gap: 4px; margin-bottom: 8px; font-size: 0.72rem; }
    .stars-wrap { display: flex; gap: 2px; color: #d1d5db; }
    .stars-wrap .fas.active { color: #facc15; }
    .stars-wrap .fas.half { color: #facc15; }
    .review-count { color: #9ca3af; font-weight: 500; }

    /* Price Row */
    .card-price-row { display: flex; align-items: baseline; gap: 8px; margin-bottom: 12px; margin-top: auto; }
    .price-val { font-family: var(--font-display); font-weight: 800; font-size: 1.05rem; color: var(--primary); }
    .strike-val { font-size: 0.78rem; color: #9ca3af; text-decoration: line-through; font-weight: 500; }

    .card-desc { font-size: 0.8rem; color: #6b7280; margin: 4px 0 10px; line-height: 1.4; }

    /* Add to Cart Button */
    .card-action { margin-top: auto; }
    .btn-cart-cta {
      width: 100%;
      padding: 8px 14px;
      border: 1px solid #d1d5db;
      border-radius: 8px;
      background: #ffffff;
      color: #374151;
      font-family: var(--font-body);
      font-weight: 600;
      font-size: 0.82rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      transition: all .15s ease;
      text-decoration: none;
    }
    .btn-cart-cta:hover:not(:disabled) {
      background: var(--primary);
      border-color: var(--primary);
      color: #ffffff;
      box-shadow: 0 4px 12px rgba(30, 58, 138, 0.2);
    }
    .btn-cart-cta:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    /* Dense card modifiers */
    .dense { padding: 10px; }
    .dense .card-img-wrap { margin-bottom: 8px; }
    .dense .card-title { font-size: 0.82rem; margin-bottom: 4px; }
    .dense .price-val { font-size: 0.95rem; }
    .dense .btn-cart-cta { padding: 6px 10px; font-size: 0.78rem; }

    /* Row Layout */
    .row-layout { flex-direction: row; gap: 16px; }
    .row-layout .card-img-wrap { width: 160px; flex: none; margin-bottom: 0; }
    .row-layout .card-content { flex: 1; }

    @media (max-width: 600px) {
      .product-card { padding: 8px; border-radius: 10px; }
      .card-img-wrap { margin-bottom: 6px; }
      .card-title { font-size: 0.78rem; line-height: 1.25; margin-bottom: 4px; min-height: 2.5em; }
      .card-brand { font-size: 0.65rem; margin-bottom: 1px; }
      .card-rating { margin-bottom: 4px; font-size: 0.65rem; gap: 2px; }
      .card-price-row { margin-bottom: 8px; gap: 4px; flex-wrap: wrap; }
      .price-val { font-size: 0.88rem; }
      .strike-val { font-size: 0.72rem; }
      .btn-cart-cta { padding: 6px 6px; font-size: 0.72rem; border-radius: 6px; gap: 4px; }
      .wish-btn { width: 28px; height: 28px; font-size: 0.85rem; top: 6px; right: 6px; }
      .badge-tag { top: 6px; left: 6px; font-size: 0.58rem; padding: 2px 6px; }
      .row-layout { gap: 10px; }
      .row-layout .card-img-wrap { width: 95px; }
    }
  `],
})
export class ProductCardComponent {
  @Input({ required: true }) product!: Product;
  @Input() dense = false;
  @Input() list = false;
  @Input() variant: string = 'default';
  fallback = FALLBACK_IMAGE;

  constructor(public cart: CartService, public saved: SavedService) {}

  discount(): number {
    if (this.product.compareAtPrice > this.product.price) {
      return Math.round((1 - this.product.price / this.product.compareAtPrice) * 100);
    }
    return 0;
  }

  isNew(): boolean {
    if (!this.product.createdAt) return false;
    const diffDays = (new Date().getTime() - new Date(this.product.createdAt).getTime()) / (1000 * 3600 * 24);
    return diffDays < 30;
  }
}
