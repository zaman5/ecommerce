import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { OrderService } from '../../../core/services/api.service';
import { AuthService } from '../../../core/services/auth.service';
import { Order } from '../../../core/models/models';
import { ImgFallbackDirective } from '../../../shared/directives/img-fallback.directive';
import { MediaUrlPipe } from '../../../shared/pipes/media-url.pipe';

@Component({
  selector: 'app-orders',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ImgFallbackDirective, MediaUrlPipe],
  template: `
    <section class="section">
      <div class="container">
        <h1>{{ auth.isLoggedIn() ? 'My orders' : 'Your orders' }}</h1>
        <p class="text-muted">Track and review everything you’ve ordered.</p>

        @if (!auth.isLoggedIn()) {
          <div class="guest-note card card-pad mt">
            <div>
              <strong>You’re browsing as a guest.</strong>
              <p class="text-muted">Orders you place without an account are remembered on this device only.
                Lost them? Look one up below, or <a routerLink="/login" class="link">log in</a>.</p>
            </div>
          </div>
        }

        @if (loading()) { <div class="spinner"></div> }
        @else if (orders().length === 0) {
          <div class="card card-pad center mt-lg">
            <div style="font-size:2.6rem">📦</div>
            <h3>No orders yet</h3>
            <p class="text-muted">When you place an order, it’ll show up here.</p>
            <a routerLink="/shop" class="btn btn-primary mt">Start shopping</a>
          </div>
        } @else {
          <div class="orders mt-lg">
            @for (o of orders(); track o._id) {
              <a [routerLink]="['/account/orders', o._id]" class="order card">
                <div class="o-main">
                  <div class="o-num">#{{ o.orderNumber }}</div>
                  <div class="text-muted">{{ o.createdAt | date:'mediumDate' }} · {{ o.items.length }} item(s)</div>
                  <div class="thumbs">
                    @for (i of o.items.slice(0,4); track i.product + '::' + (i.color || '')) { <img [src]="i.image | mediaUrl" [alt]="i.name" appImgFallback /> }
                  </div>
                </div>
                <div class="o-side">
                  <span class="status" [class]="'status-' + o.status">{{ label(o.status) }}</span>
                  <div class="price">Rs {{ o.grandTotal | number }}</div>
                  <span class="track">Track order →</span>
                </div>
              </a>
            }
          </div>
        }

        <!-- Guest recovery: find an order from its number + email -->
        @if (!auth.isLoggedIn()) {
          <div class="card card-pad mt-lg lookup">
            <h3>Track an order</h3>
            <p class="text-muted">Enter the order number from your confirmation and the email you used.</p>
            @if (lookupError()) { <div class="alert alert-error">{{ lookupError() }}</div> }
            <div class="grid grid-2">
              <div class="field"><label>Order number</label><input class="input" [(ngModel)]="lookupNumber" placeholder="BS-1234567890" /></div>
              <div class="field"><label>Email</label><input class="input" type="email" [(ngModel)]="lookupEmail" placeholder="you@example.com" /></div>
            </div>
            <button class="btn btn-primary" [disabled]="looking()" (click)="findOrder()">
              {{ looking() ? 'Looking…' : 'Find my order' }}
            </button>
          </div>
        }
      </div>
    </section>
  `,
  styles: [`
    .order { display:flex; justify-content:space-between; align-items:center; gap:20px; padding:18px 22px; margin-bottom:14px; transition: box-shadow .2s, transform .12s; }
    .order:hover { box-shadow: var(--shadow); transform: translateY(-2px); }
    .o-num { font-family: var(--font-display); font-weight:700; font-size:1.1rem; }
    .thumbs { display:flex; gap:6px; margin-top:8px; }
    .thumbs img { width:44px; height:44px; object-fit:cover; border-radius:8px; }
    .o-side { text-align:right; display:flex; flex-direction:column; align-items:flex-end; gap:6px; }
    .track { color: var(--ink); font-weight:700; font-size:.9rem; }
    .track:hover { color: var(--brand); }
    .guest-note { background: var(--soft); }
    .guest-note p { margin:4px 0 0; }
    .link { color: var(--ink); font-weight:700; }
    .link:hover { color: var(--brand); }
    .lookup { max-width:640px; }
    @media (max-width:560px){ .order { flex-direction:column; align-items:flex-start; } .o-side { text-align:left; align-items:flex-start; } }
  `],
})
export class OrdersComponent implements OnInit {
  orders = signal<Order[]>([]);
  loading = signal(true);

  lookupNumber = '';
  lookupEmail = '';
  looking = signal(false);
  lookupError = signal('');

  constructor(private orderSvc: OrderService, public auth: AuthService, private router: Router) {}

  ngOnInit() {
    if (this.auth.isLoggedIn()) {
      this.orderSvc.mine().subscribe({
        next: (o) => { this.orders.set(o); this.loading.set(false); },
        error: () => this.loading.set(false),
      });
      return;
    }

    // Guests have no server-side list — fetch each order this browser remembers.
    const refs = this.orderSvc.guestOrders();
    if (refs.length === 0) { this.loading.set(false); return; }

    forkJoin(
      refs.map((r) => this.orderSvc.get(r.id, r.token).pipe(catchError(() => of(null))))
    ).subscribe((results) => {
      this.orders.set(results.filter((o): o is Order => o !== null));
      this.loading.set(false);
    });
  }

  findOrder() {
    this.lookupError.set('');
    if (!this.lookupNumber.trim() || !this.lookupEmail.trim()) {
      this.lookupError.set('Please enter both your order number and email.');
      return;
    }
    this.looking.set(true);
    this.orderSvc.lookup(this.lookupNumber.trim(), this.lookupEmail.trim()).subscribe({
      next: (res) => {
        // Remember it so it appears in the list next time too.
        this.orderSvc.rememberGuestOrder({
          id: res.id, orderNumber: res.orderNumber, token: res.token, placedAt: new Date().toISOString(),
        });
        this.looking.set(false);
        this.router.navigate(['/account/orders', res.id]);
      },
      error: (err) => {
        this.lookupError.set(err.error?.message || 'We could not find that order.');
        this.looking.set(false);
      },
    });
  }

  label(s: string) { return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()); }
}
