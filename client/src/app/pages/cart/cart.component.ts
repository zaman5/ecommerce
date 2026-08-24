import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CartService } from '../../core/services/cart.service';
import { ImgFallbackDirective } from '../../shared/directives/img-fallback.directive';
import { SwatchPipe } from '../../shared/pipes/swatch.pipe';
import { MediaUrlPipe } from '../../shared/pipes/media-url.pipe';

@Component({
  selector: 'app-cart',
  standalone: true,
  imports: [CommonModule, RouterLink, ImgFallbackDirective, SwatchPipe, MediaUrlPipe],
  template: `
    <section class="section">
      <div class="container">
        <h1>Your cart</h1>
        @if (cart.items().length === 0) {
          <div class="empty card card-pad center">
            <div style="font-size:3rem">🛒</div>
            <h3>Your cart is empty</h3>
            <p class="text-muted">Let’s find what your child needs for school.</p>
            <a routerLink="/shop" class="btn btn-primary mt">Start shopping</a>
          </div>
        } @else {
          <div class="cart-layout mt-lg">
            <div class="items">
              @for (i of cart.items(); track cart.keyOf(i)) {
                <div class="item card">
                  <img [src]="i.image | mediaUrl" [alt]="i.name" appImgFallback />
                  <div class="item-info">
                    @if (i.slug) {
                      <a [routerLink]="['/product', i.slug]" class="name">{{ i.name }}</a>
                    } @else {
                      <span class="name">{{ i.name }}</span>
                    }
                    @if (i.color) {
                      <span class="colour">
                        <img class="dot" [src]="i.colorHex | swatch" alt="" />{{ i.color }}
                      </span>
                    }
                    <span class="price">Rs {{ i.price | number }}</span>
                  </div>
                  <div class="qty">
                    <button (click)="cart.setQty(cart.keyOf(i), i.qty-1)">−</button>
                    <span>{{ i.qty }}</span>
                    <button (click)="cart.setQty(cart.keyOf(i), i.qty+1)">+</button>
                  </div>
                  <div class="line-total price">Rs {{ i.price * i.qty | number }}</div>
                  <button class="remove" (click)="cart.remove(cart.keyOf(i))" aria-label="Remove">✕</button>
                </div>
              }
            </div>

            <aside class="summary card card-pad">
              <h3>Order summary</h3>
              <div class="row"><span>Subtotal</span><strong>Rs {{ cart.subtotal() | number }}</strong></div>
              <div class="row"><span>Shipping</span><strong>Rs 250</strong></div>
              <div class="row total"><span>Total</span><strong class="price">Rs {{ cart.subtotal() + 250 | number }}</strong></div>
              <a routerLink="/checkout" class="btn btn-primary btn-block mt">Proceed to checkout</a>
              <a routerLink="/shop" class="btn btn-ghost btn-block mt" style="margin-top:10px">Continue shopping</a>
            </aside>
          </div>
        }
      </div>
    </section>
  `,
  styles: [`
    .cart-layout { display:grid; grid-template-columns: 1fr 340px; gap:28px; align-items:start; }
    .item { display:grid; grid-template-columns: 84px 1fr auto auto auto; gap:16px; align-items:center; padding:14px; margin-bottom:14px; }
    .item img { width:84px; height:84px; object-fit:cover; border-radius:12px; }
    .name { font-family: var(--font-display); font-weight:600; display:block; }
    /* Column, so the colour line never runs into the price beside it. */
    .item-info { display:flex; flex-direction:column; align-items:flex-start; gap:2px; min-width:0; }
    .colour { display:inline-flex; align-items:center; gap:6px; font-size:.83rem; color: var(--muted); font-weight:700; }
    .colour .dot { width:12px; height:12px; border-radius:50%; border:1px solid rgba(0,0,0,.18); }
    .qty { display:flex; align-items:center; border:2px solid var(--line); border-radius:999px; }
    .qty button { width:34px; height:36px; border:none; background:#fff; font-size:1.2rem; cursor:pointer; }
    .qty span { width:34px; text-align:center; font-weight:800; }
    .remove { border:none; background:none; color: var(--muted); font-size:1.1rem; cursor:pointer; }
    .remove:hover { color: var(--danger); }
    .summary { position:sticky; top:88px; }
    .row { display:flex; justify-content:space-between; padding:8px 0; }
    .row.total { border-top:1px solid var(--line); margin-top:8px; padding-top:14px; font-size:1.2rem; }
    .empty { padding:60px 20px; }
    @media (max-width: 800px) {
      .cart-layout { grid-template-columns: 1fr; gap: 20px; }
      .item {
        grid-template-columns: 72px 1fr auto;
        grid-template-areas:
          'img info remove'
          'img qty total';
        gap: 12px;
        padding: 12px;
      }
      .item img { width:72px; height:72px; grid-area:img; }
      .item-info { grid-area:info; }
      .qty { grid-area:qty; width: fit-content; }
      .line-total { grid-area:total; text-align:right; font-size: 1.05rem; }
      .remove { grid-area:remove; justify-self:end; }
    }
    @media (max-width: 480px) {
      .item {
        grid-template-columns: 60px 1fr auto;
        gap: 10px;
        padding: 10px;
      }
      .item img { width:60px; height:60px; }
      .name { font-size: 0.88rem; }
      .qty button { width: 28px; height: 30px; font-size: 1rem; }
      .qty span { width: 28px; font-size: 0.85rem; }
      .line-total { font-size: 0.95rem; }
    }
  `],
})
export class CartComponent {
  constructor(public cart: CartService) {}
}
