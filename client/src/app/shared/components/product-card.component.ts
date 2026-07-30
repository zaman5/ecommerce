import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { Product } from '../../core/models/models';
import { CartService } from '../../core/services/cart.service';
import { FALLBACK_IMAGE, ImgFallbackDirective } from '../directives/img-fallback.directive';

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [CommonModule, RouterLink, ImgFallbackDirective],
  template: `
    <div class="pcard">
      <a [routerLink]="['/product', product.slug]" class="pimg">
        <img [src]="product.images[0] || fallback" [alt]="product.name" loading="lazy" appImgFallback />
        @if (discount() > 0) { <span class="badge badge-sale tag">-{{ discount() }}%</span> }
        @if (product.stock === 0) { <span class="soldout">Sold out</span> }
      </a>
      <div class="pbody">
        <div class="brand">{{ product.brand }}</div>
        <a [routerLink]="['/product', product.slug]" class="pname">{{ product.name }}</a>
        <div class="rating">★ {{ product.rating | number:'1.1-1' }} <span class="text-muted">({{ product.numReviews }})</span></div>
        <div class="prow">
          <div>
            <span class="price">Rs {{ product.price | number }}</span>
            @if (product.compareAtPrice > product.price) {
              <span class="strike">Rs {{ product.compareAtPrice | number }}</span>
            }
          </div>
          <button class="add" [disabled]="product.stock === 0" (click)="cart.add(product)" aria-label="Add to cart">+</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .pcard { background:#fff; border:1px solid var(--line); border-radius: var(--radius); overflow:hidden; box-shadow: var(--shadow-sm); transition: transform .15s ease, box-shadow .2s ease; display:flex; flex-direction:column; }
    .pcard:hover { transform: translateY(-4px); box-shadow: var(--shadow); }
    .pimg { position:relative; aspect-ratio: 1/1; display:block; background: var(--cream-deep); }
    .pimg img { width:100%; height:100%; object-fit:cover; }
    .tag { position:absolute; top:10px; left:10px; }
    .soldout { position:absolute; inset:0; display:grid; place-items:center; background: rgba(255,255,255,.7); font-family: var(--font-display); font-weight:700; color: var(--muted); }
    .pbody { padding:14px; display:flex; flex-direction:column; gap:4px; flex:1; }
    .brand { font-size:.75rem; text-transform:uppercase; letter-spacing:.04em; color: var(--mint); font-weight:800; }
    .pname { font-family: var(--font-display); font-weight:600; color: var(--ink); line-height:1.25; }
    .pname:hover { color: var(--coral); }
    .rating { font-size:.82rem; color:#f0a500; font-weight:700; }
    .prow { margin-top:auto; padding-top:8px; display:flex; align-items:center; justify-content:space-between; }
    .add { width:38px; height:38px; border-radius:50%; border:none; background: var(--mint); color:#fff; font-size:1.4rem; font-weight:700; cursor:pointer; line-height:1; display:grid; place-items:center; transition: background .15s; }
    .add:hover { background: var(--coral); }
    .add:disabled { background: var(--line); cursor:not-allowed; }
  `],
})
export class ProductCardComponent {
  @Input({ required: true }) product!: Product;
  fallback = FALLBACK_IMAGE;
  constructor(public cart: CartService) {}
  discount(): number {
    if (this.product.compareAtPrice > this.product.price) {
      return Math.round((1 - this.product.price / this.product.compareAtPrice) * 100);
    }
    return 0;
  }
}
