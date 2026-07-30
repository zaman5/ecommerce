import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CartService } from '../../core/services/cart.service';
import { OrderService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <section class="section">
      <div class="container">
        <h1>Checkout</h1>
        @if (cart.items().length === 0) {
          <div class="card card-pad center mt">
            <p>Your cart is empty.</p>
            <a routerLink="/shop" class="btn btn-primary">Go shopping</a>
          </div>
        } @else {
          <div class="checkout-layout mt-lg">
            <div class="card card-pad">
              <!-- Guests check out with no account. Only the fields a courier
                   actually needs are shown; the rest is tucked away below. -->
              @if (!auth.isLoggedIn()) {
                <div class="guest-banner">
                  <div>
                    <strong>🛍️ Checking out as a guest</strong>
                    <span>No account needed — we only ask for what’s required to deliver your order.</span>
                  </div>
                  <a routerLink="/login" [queryParams]="{ redirect: '/checkout' }" class="btn btn-ghost btn-sm">Log in instead</a>
                </div>
              }

              <h3>Shipping details</h3>
              @if (error()) { <div class="alert alert-error">{{ error() }}</div> }

              <div class="field">
                <label>Full name <span class="req">*</span></label>
                <input class="input" [(ngModel)]="form.fullName" name="fullName" autocomplete="name" />
              </div>

              @if (!auth.isLoggedIn()) {
                <div class="field">
                  <label>Email <span class="req">*</span></label>
                  <input class="input" type="email" [(ngModel)]="form.email" name="email" autocomplete="email" placeholder="you@example.com" />
                  <small class="hint">We’ll send your order confirmation and tracking link here.</small>
                </div>
              }

              <div class="field">
                <label>Phone <span class="req">*</span></label>
                <input class="input" [(ngModel)]="form.phone" name="phone" autocomplete="tel" placeholder="03xx-xxxxxxx" />
              </div>

              <div class="field">
                <label>Address <span class="req">*</span></label>
                <input class="input" [(ngModel)]="form.line1" name="line1" autocomplete="street-address" placeholder="House, street, area" />
              </div>

              <div class="field">
                <label>City <span class="req">*</span></label>
                <input class="input" [(ngModel)]="form.city" name="city" autocomplete="address-level2" />
              </div>

              <!-- Everything optional lives behind this toggle so the default
                   form is as short as possible. -->
              @if (showOptional()) {
                <div class="grid grid-2 optional">
                  <div class="field"><label>Province <span class="opt">(optional)</span></label><input class="input" [(ngModel)]="form.province" name="province" /></div>
                  <div class="field"><label>Postal code <span class="opt">(optional)</span></label><input class="input" [(ngModel)]="form.postalCode" name="postalCode" /></div>
                </div>
              } @else {
                <button type="button" class="toggle" (click)="showOptional.set(true)">+ Add province / postal code (optional)</button>
              }

              <h3 class="mt">Payment method</h3>
              <div class="pay-options">
                @for (m of methods; track m.value) {
                  <label class="pay" [class.on]="form.paymentMethod === m.value">
                    <input type="radio" name="pay" [value]="m.value" [(ngModel)]="form.paymentMethod" />
                    <span class="ic">{{ m.icon }}</span>{{ m.label }}
                  </label>
                }
              </div>
              <p class="note">💡 Card / JazzCash / Easypaisa are placeholders here — connect a real payment gateway before going live.</p>
            </div>

            <aside class="card card-pad summary">
              <h3>Your order</h3>
              @for (i of cart.items(); track i.product) {
                <div class="line"><span>{{ i.name }} × {{ i.qty }}</span><strong>Rs {{ i.price * i.qty | number }}</strong></div>
              }
              <div class="line"><span>Shipping</span><strong>Rs {{ shippingFee | number }}</strong></div>
              <div class="line total"><span>Total</span><strong class="price">Rs {{ cart.subtotal() + shippingFee | number }}</strong></div>
              <button class="btn btn-primary btn-block mt" [disabled]="placing()" (click)="placeOrder()">
                {{ placing() ? 'Placing order…' : 'Place order' }}
              </button>
              @if (!auth.isLoggedIn()) {
                <p class="guest-foot">No account required.</p>
              }
            </aside>
          </div>
        }
      </div>
    </section>
  `,
  styles: [`
    .checkout-layout { display:grid; grid-template-columns: 1fr 360px; gap:28px; align-items:start; }
    .summary { position:sticky; top:88px; }
    .line { display:flex; justify-content:space-between; padding:7px 0; gap:12px; }
    .line.total { border-top:1px solid var(--line); margin-top:8px; padding-top:14px; font-size:1.2rem; }
    .pay-options { display:flex; flex-direction:column; gap:10px; }
    .pay { display:flex; align-items:center; gap:10px; border:2px solid var(--line); border-radius:14px; padding:12px 14px; cursor:pointer; font-weight:700; }
    .pay.on { border-color: var(--coral); background:#fff6f3; }
    .pay input { accent-color: var(--coral); }
    .ic { font-size:1.3rem; }
    .note { font-size:.85rem; color: var(--muted); margin-top:12px; background: var(--cream); padding:10px; border-radius:10px; }
    .guest-banner { display:flex; align-items:center; justify-content:space-between; gap:16px; flex-wrap:wrap;
      background: var(--mint-soft); border-radius:14px; padding:14px 16px; margin-bottom:20px; }
    .guest-banner span { display:block; color: var(--muted); font-size:.88rem; margin-top:2px; }
    .req { color: var(--coral); }
    .opt { color: var(--muted); font-weight:500; font-size:.85em; }
    .hint { display:block; color: var(--muted); font-size:.8rem; margin-top:4px; }
    .toggle { background:none; border:none; color: var(--coral); font-weight:700; cursor:pointer; padding:4px 0; font-size:.9rem; }
    .toggle:hover { text-decoration: underline; }
    .guest-foot { text-align:center; color: var(--muted); font-size:.82rem; margin:10px 0 0; }
    @media (max-width: 800px) { .checkout-layout { grid-template-columns: 1fr; } }
  `],
})
export class CheckoutComponent implements OnInit {
  placing = signal(false);
  error = signal('');
  showOptional = signal(false);
  readonly shippingFee = 250; // must match SHIPPING_FEE on the server

  methods = [
    { value: 'cod', label: 'Cash on delivery', icon: '💵' },
    { value: 'card', label: 'Credit / Debit card', icon: '💳' },
    { value: 'jazzcash', label: 'JazzCash', icon: '📱' },
    { value: 'easypaisa', label: 'Easypaisa', icon: '📲' },
  ];
  form = {
    fullName: '', email: '', line1: '', city: '', province: '', postalCode: '', phone: '',
    paymentMethod: 'cod',
  };

  constructor(
    public cart: CartService,
    private orders: OrderService,
    public auth: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    const u = this.auth.user();
    if (u) {
      this.form.fullName = u.name;
      this.form.email = u.email;
      this.form.phone = u.phone || u.address?.phone || '';
      this.form.line1 = u.address?.line1 || '';
      this.form.city = u.address?.city || '';
      this.form.province = u.address?.province || '';
      this.form.postalCode = u.address?.postalCode || '';
      // Show the optional block pre-filled rather than hiding saved details.
      if (this.form.province || this.form.postalCode) this.showOptional.set(true);
    }
  }

  private validate(): string | null {
    if (!this.form.fullName.trim()) return 'Please enter your full name.';
    if (!this.auth.isLoggedIn()) {
      if (!this.form.email.trim()) return 'Please enter your email so we can send your order confirmation.';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.form.email.trim())) return 'That email address doesn’t look right.';
    }
    if (!this.form.phone.trim()) return 'Please enter a phone number so we can reach you.';
    if (!this.form.line1.trim()) return 'Please enter your delivery address.';
    if (!this.form.city.trim()) return 'Please enter your city.';
    return null;
  }

  placeOrder() {
    this.error.set('');
    const problem = this.validate();
    if (problem) { this.error.set(problem); return; }

    this.placing.set(true);
    const payload = {
      items: this.cart.items().map((i) => ({ product: i.product, qty: i.qty })),
      shippingAddress: {
        fullName: this.form.fullName.trim(), line1: this.form.line1.trim(), city: this.form.city.trim(),
        province: this.form.province.trim(), postalCode: this.form.postalCode.trim(), phone: this.form.phone.trim(),
      },
      paymentMethod: this.form.paymentMethod,
      // Ignored by the server when a valid token is sent.
      email: this.form.email.trim(),
    };

    this.orders.place(payload).subscribe({
      next: (order) => {
        // A guest gets a one-time token back — keep it so they can reopen and
        // track this order later without an account.
        if (order.guestToken) {
          this.orders.rememberGuestOrder({
            id: order._id,
            orderNumber: order.orderNumber,
            token: order.guestToken,
            placedAt: order.createdAt || new Date().toISOString(),
          });
        }
        this.cart.clear();
        this.router.navigate(['/account/orders', order._id], { queryParams: { placed: 1 } });
      },
      error: (err) => {
        this.error.set(err.error?.message || 'Could not place your order. Please try again.');
        this.placing.set(false);
      },
    });
  }
}
