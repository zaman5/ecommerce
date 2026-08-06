import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { OrderService } from '../../../core/services/api.service';
import { Order } from '../../../core/models/models';
import { ImgFallbackDirective } from '../../../shared/directives/img-fallback.directive';

@Component({
  selector: 'app-order-detail',
  standalone: true,
  imports: [CommonModule, RouterLink, ImgFallbackDirective],
  template: `
    <section class="section">
      <div class="container">
        <a routerLink="/account/orders" class="back">← All orders</a>

        @if (loading()) { <div class="spinner"></div> }
        @else if (order()) {
          @if (order(); as o) {
          @if (justPlaced()) {
            <div class="alert alert-success">🎉 Thank you! Your order was placed successfully.</div>
          }
          @if (o.isGuest) {
            <div class="alert alert-info guest-tip">
              You ordered as a guest — no account needed. Keep your order number
              <strong>#{{ o.orderNumber }}</strong> to track this order from any device
              (Your orders → <em>Track an order</em>).
            </div>
          }

          <div class="head">
            <div>
              <h1>Order #{{ o.orderNumber }}</h1>
              <p class="text-muted">Placed {{ o.createdAt | date:'medium' }}</p>
            </div>
            <span class="status big" [class]="'status-' + o.status">{{ label(o.status) }}</span>
          </div>

          <div class="detail-grid mt-lg">
            <!-- Tracking timeline -->
            <div class="card card-pad">
              <h3>Order tracking</h3>
              @if (o.status === 'cancelled') {
                <div class="alert alert-error mt">This order was cancelled.</div>
              } @else {
                <div class="timeline">
                  @for (step of steps; track step.key; let i = $index) {
                    <div class="tl-step" [class.done]="isDone(o, step.key)" [class.current]="isCurrent(o, step.key)">
                      <div class="dot">{{ isDone(o, step.key) ? '✓' : (i + 1) }}</div>
                      <div class="tl-body">
                        <strong>{{ step.label }}</strong>
                        @if (eventFor(o, step.key); as ev) { <span class="text-muted">{{ ev.at | date:'MMM d, h:mm a' }}</span> }
                      </div>
                    </div>
                  }
                </div>
              }

              <h3 class="mt-lg">Activity</h3>
              <div class="activity">
                @for (t of reversed(o.tracking); track t.at) {
                  <div class="act">
                    <span class="status" [class]="'status-' + t.status">{{ label(t.status) }}</span>
                    <div><div>{{ t.note }}</div><span class="text-muted">{{ t.at | date:'medium' }}</span></div>
                  </div>
                }
              </div>

              @if (canCancel(o)) {
                <button class="btn btn-ghost mt-lg" [disabled]="cancelling()" (click)="cancel(o)">
                  {{ cancelling() ? 'Cancelling…' : 'Cancel this order' }}
                </button>
              }
            </div>

            <!-- Summary -->
            <aside>
              <div class="card card-pad">
                <h3>Items</h3>
                @for (i of o.items; track i.product) {
                  <div class="line-item">
                    <img [src]="i.image" [alt]="i.name" appImgFallback />
                    <div class="li-info">
                      <span>{{ i.name }}</span>
                      <span class="text-muted">Qty {{ i.qty }}</span>
                      <!-- Once it's delivered this is the moment to ask for a
                           review — and the review earns a "verified purchase"
                           badge. Older orders have no slug, so no link. -->
                      @if (o.status === 'delivered' && i.slug) {
                        <a class="review-link" [routerLink]="['/product', i.slug]" fragment="reviews">★ Write a review</a>
                      }
                    </div>
                    <strong class="price">Rs {{ i.price * i.qty | number }}</strong>
                  </div>
                }
                <div class="line"><span>Subtotal</span><strong>Rs {{ o.itemsTotal | number }}</strong></div>
                <div class="line"><span>Shipping</span><strong>Rs {{ o.shippingFee | number }}</strong></div>
                <div class="line total"><span>Total</span><strong class="price">Rs {{ o.grandTotal | number }}</strong></div>
              </div>

              <div class="card card-pad mt">
                <h3>Delivery</h3>
                <p class="addr">
                  <strong>{{ o.shippingAddress.fullName }}</strong><br />
                  {{ o.shippingAddress.line1 }}<br />
                  {{ o.shippingAddress.city }}{{ o.shippingAddress.province ? ', ' + o.shippingAddress.province : '' }}
                  {{ o.shippingAddress.postalCode }}<br />
                  📞 {{ o.shippingAddress.phone }}
                </p>
                <div class="line"><span>Payment</span><strong>{{ payLabel(o.paymentMethod) }}</strong></div>
                <div class="line"><span>Payment status</span><span class="status" [class]="o.paymentStatus === 'paid' ? 'status-delivered' : 'status-pending'">{{ o.paymentStatus }}</span></div>
              </div>
            </aside>
          </div>
          }
        } @else {
          <div class="center mt-lg"><h2>Order not found</h2></div>
        }
      </div>
    </section>
  `,
  styles: [`
    .back { color: var(--muted); font-weight:700; display:inline-block; margin-bottom:16px; }
    .head { display:flex; justify-content:space-between; align-items:flex-start; gap:16px; flex-wrap:wrap; }
    .status.big { font-size:.95rem; padding:8px 18px; }
    .detail-grid { display:grid; grid-template-columns: 1fr 380px; gap:28px; align-items:start; }
    .timeline { margin-top:14px; }
    .tl-step { display:flex; gap:14px; position:relative; padding-bottom:26px; }
    .tl-step:not(:last-child)::before { content:''; position:absolute; left:17px; top:34px; bottom:0; width:2px; background: var(--line); }
    .tl-step.done:not(:last-child)::before { background: var(--mint); }
    .dot { width:36px; height:36px; border-radius:50%; background: var(--cream-deep); color: var(--muted); display:grid; place-items:center; font-weight:800; font-family: var(--font-display); flex-shrink:0; z-index:1; }
    .tl-step.done .dot { background: var(--mint); color:#fff; }
    .tl-step.current .dot { background: var(--coral); color:#fff; box-shadow:0 0 0 5px #ffe0d9; }
    .tl-body { display:flex; flex-direction:column; padding-top:6px; }
    .tl-body span { font-size:.82rem; }
    .activity { display:flex; flex-direction:column; gap:12px; margin-top:12px; }
    .act { display:flex; gap:12px; align-items:flex-start; }
    .act span.text-muted { font-size:.8rem; }
    .line-item { display:flex; align-items:center; gap:12px; padding:10px 0; border-bottom:1px solid var(--line); }
    .line-item img { width:48px; height:48px; object-fit:cover; border-radius:8px; }
    .li-info { display:flex; flex-direction:column; flex:1; font-size:.9rem; }
    .review-link { color: var(--coral); font-weight:700; font-size:.8rem; margin-top:3px; align-self:flex-start; }
    .review-link:hover { text-decoration: underline; }
    .line { display:flex; justify-content:space-between; padding:7px 0; }
    .line.total { border-top:1px solid var(--line); margin-top:8px; padding-top:12px; font-size:1.15rem; }
    .addr { line-height:1.7; color: var(--ink); }
    @media (max-width: 860px) { .detail-grid { grid-template-columns: 1fr; } }
  `],
})
export class OrderDetailComponent implements OnInit {
  order = signal<Order | null>(null);
  loading = signal(true);
  cancelling = signal(false);
  justPlaced = signal(false);
  /** Present when this browser placed the order as a guest. */
  private guestToken?: string;

  steps = [
    { key: 'confirmed', label: 'Order confirmed' },
    { key: 'processing', label: 'Being prepared' },
    { key: 'shipped', label: 'Shipped' },
    { key: 'out_for_delivery', label: 'Out for delivery' },
    { key: 'delivered', label: 'Delivered' },
  ];
  private order_flow = ['pending', 'confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered'];

  constructor(private route: ActivatedRoute, private orderSvc: OrderService, private router: Router) {}

  ngOnInit() {
    this.justPlaced.set(this.route.snapshot.queryParams['placed'] === '1');
    this.route.paramMap.subscribe((p) => {
      const id = p.get('id')!;
      // A guest proves ownership with the token saved at checkout; the ?token=
      // query param also works so a confirmation link can be shared/bookmarked.
      this.guestToken = this.route.snapshot.queryParams['token'] || this.orderSvc.guestTokenFor(id);
      this.loading.set(true);
      this.orderSvc.get(id, this.guestToken).subscribe({
        next: (o) => { this.order.set(o); this.loading.set(false); },
        error: () => { this.order.set(null); this.loading.set(false); },
      });
    });
  }

  private rank(status: string) { return this.order_flow.indexOf(status); }
  isDone(o: Order, key: string) { return this.rank(o.status) >= this.rank(key); }
  isCurrent(o: Order, key: string) { return o.status === key; }
  eventFor(o: Order, key: string) { return o.tracking.find((t) => t.status === key); }
  reversed(arr: any[]) { return [...arr].reverse(); }
  canCancel(o: Order) { return ['pending', 'confirmed'].includes(o.status); }
  label(s: string) { return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()); }
  payLabel(m: string) {
    return ({ cod: 'Cash on delivery', card: 'Card', jazzcash: 'JazzCash', easypaisa: 'Easypaisa' } as any)[m] || m;
  }

  cancel(o: Order) {
    if (!confirm('Are you sure you want to cancel this order?')) return;
    this.cancelling.set(true);
    this.orderSvc.cancel(o._id, this.guestToken).subscribe({
      next: (updated) => { this.order.set(updated); this.cancelling.set(false); },
      error: () => this.cancelling.set(false),
    });
  }
}
