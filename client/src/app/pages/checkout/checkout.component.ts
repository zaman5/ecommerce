import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { CartService } from '../../core/services/cart.service';
import { OrderService, UploadService, SettingsService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { JazzCashSettings } from '../../core/models/models';
import { MediaUrlPipe } from '../../shared/pipes/media-url.pipe';

@Component({
  selector: 'app-checkout',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, MediaUrlPipe],
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
                    <span>No account needed — we only ask for what's required to deliver your order.</span>
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

              <div class="field">
                <label>Email <span class="req">*</span></label>
                <input class="input" type="email" [(ngModel)]="form.email" name="email" autocomplete="email" placeholder="you@example.com" />
                <small class="hint">We'll send your order confirmation and tracking link here.</small>
              </div>

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
                    <input type="radio" name="pay" [value]="m.value" [(ngModel)]="form.paymentMethod" (ngModelChange)="onPaymentChange($event)" />
                    <span class="ic">{{ m.icon }}</span>{{ m.label }}
                  </label>
                }
              </div>

              <!-- JazzCash payment details -->
              @if (form.paymentMethod === 'jazzcash') {
                <div class="jazzcash-box mt">
                  <h4>📱 JazzCash Payment Details</h4>
                  <div class="jc-info">
                    <div class="jc-phone">
                      <span class="jc-label">Send payment to:</span>
                      <strong class="jc-number">{{ jazzcashSettings()?.phone || '03038164288' }}</strong>
                    </div>
                    @if (jazzcashSettings()?.qrImage) {
                      <div class="jc-qr">
                        <span class="jc-label">Or scan QR code:</span>
                        <img [src]="jazzcashSettings()!.qrImage | mediaUrl" alt="JazzCash QR Code" class="qr-img" />
                      </div>
                    }
                  </div>
                  <div class="jc-upload mt">
                    <label class="jc-label">Payment screenshot <span class="req">*</span></label>
                    <p class="jc-hint">After sending payment, take a screenshot and upload it here. This is required to complete your order.</p>
                    @if (!screenshotUrl()) {
                      <label class="upload-area" [class.uploading]="uploadingScreenshot()">
                        <input type="file" accept="image/*" (change)="onScreenshotSelect($event)" hidden />
                        @if (uploadingScreenshot()) {
                          <span class="upload-text">⏳ Uploading…</span>
                        } @else {
                          <span class="upload-text">📷 Click to upload screenshot</span>
                          <span class="upload-sub">JPG, PNG or WebP · max 5MB</span>
                        }
                      </label>
                    } @else {
                      <div class="screenshot-preview">
                        <img [src]="screenshotUrl()! | mediaUrl" alt="Payment screenshot" />
                        <button class="btn btn-ghost btn-sm" (click)="removeScreenshot()">✕ Remove</button>
                      </div>
                    }
                  </div>
                </div>
              }
            </div>

            <aside class="card card-pad summary">
              <h3>Your order</h3>
              @for (i of cart.items(); track cart.keyOf(i)) {
                <div class="line">
                  <span>{{ i.name }}@if (i.color) { <em class="colour">· {{ i.color }}</em> } × {{ i.qty }}</span>
                  <strong>Rs {{ i.price * i.qty | number }}</strong>
                </div>
              }
              <div class="line"><span>Shipping</span><strong>Rs {{ shippingFee | number }}</strong></div>
              <div class="line total"><span>Total</span><strong class="price">Rs {{ cart.subtotal() + shippingFee | number }}</strong></div>
              <button class="btn btn-primary btn-block mt" [disabled]="placing() || !canPlace()" (click)="placeOrder()">
                {{ placing() ? 'Placing order…' : 'Place order' }}
              </button>
              @if (form.paymentMethod === 'jazzcash' && !screenshotUrl()) {
                <p class="screenshot-warn">⚠️ Please upload your JazzCash payment screenshot to place the order.</p>
              }
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
    .colour { font-style:normal; color: var(--muted); font-weight:700; }
    .line.total { border-top:1px solid var(--line); margin-top:8px; padding-top:14px; font-size:1.2rem; }
    .pay-options { display:flex; flex-direction:column; gap:10px; }
    .pay { display:flex; align-items:center; gap:10px; border:2px solid var(--line); border-radius:14px; padding:12px 14px; cursor:pointer; font-weight:700; }
    .pay.on { border-color: var(--brand); background:#fff6f3; }
    .pay input { accent-color: var(--ink); }
    .ic { font-size:1.3rem; }
    .guest-banner { display:flex; align-items:center; justify-content:space-between; gap:16px; flex-wrap:wrap;
      background: var(--soft); border-radius:14px; padding:14px 16px; margin-bottom:20px; }
    .guest-banner span { display:block; color: var(--muted); font-size:.88rem; margin-top:2px; }
    .req { color: var(--accent); }
    .opt { color: var(--muted); font-weight:500; font-size:.85em; }
    .hint { display:block; color: var(--muted); font-size:.8rem; margin-top:4px; }
    .toggle { background:none; border:none; color: var(--ink); font-weight:700; cursor:pointer; padding:4px 0; font-size:.9rem; }
    .toggle:hover { text-decoration: underline; }
    .guest-foot { text-align:center; color: var(--muted); font-size:.82rem; margin:10px 0 0; }

    /* JazzCash payment box */
    .jazzcash-box { background: linear-gradient(135deg, #f0f7ff 0%, #e8f4e8 100%); border:2px solid #c8e6c9;
      border-radius:16px; padding:20px; }
    .jazzcash-box h4 { margin:0 0 14px; font-size:1.1rem; }
    .jc-info { display:flex; gap:24px; flex-wrap:wrap; }
    .jc-phone { display:flex; flex-direction:column; gap:6px; }
    .jc-label { font-size:.88rem; color: var(--muted); font-weight:600; }
    .jc-number { font-size:1.5rem; font-family: var(--font-display); color: #2e7d32; letter-spacing:1px; }
    .jc-qr { display:flex; flex-direction:column; gap:6px; }
    .qr-img { width:140px; height:140px; object-fit:contain; border-radius:10px; border:2px solid var(--line); background:#fff; }
    .jc-hint { font-size:.85rem; color: var(--muted); margin:4px 0 10px; }
    .jc-upload .jc-label { display:block; margin-bottom:4px; }
    .upload-area { display:flex; flex-direction:column; align-items:center; justify-content:center; gap:4px;
      border:2px dashed var(--line); border-radius:14px; padding:28px 20px; cursor:pointer; text-align:center;
      transition: border-color .2s, background .2s; }
    .upload-area:hover { border-color: var(--brand); background:rgba(255,107,74,.04); }
    .upload-area.uploading { opacity:.7; pointer-events:none; }
    .upload-text { font-weight:700; font-size:.95rem; }
    .upload-sub { font-size:.8rem; color: var(--muted); }
    .screenshot-preview { display:flex; align-items:flex-start; gap:12px; margin-top:4px; }
    .screenshot-preview img { width:120px; height:120px; object-fit:cover; border-radius:10px; border:2px solid var(--line); }
    .screenshot-warn { text-align:center; color: #e65100; font-size:.84rem; margin:10px 0 0; font-weight:600; }

    @media (max-width: 800px) {
      .checkout-layout { grid-template-columns: 1fr; gap: 20px; }
      .guest-banner { flex-direction: column; align-items: flex-start; gap: 10px; }
      .guest-banner a { width: 100%; text-align: center; }
      .jc-info { flex-direction: column; gap: 14px; }
      .qr-img { width: 120px; height: 120px; }
      .summary { position: static; }
    }
  `],
})
export class CheckoutComponent implements OnInit {
  placing = signal(false);
  error = signal('');
  showOptional = signal(false);
  readonly shippingFee = 250; // must match SHIPPING_FEE on the server

  // JazzCash
  jazzcashSettings = signal<JazzCashSettings | null>(null);
  screenshotUrl = signal('');
  uploadingScreenshot = signal(false);

  methods = [
    { value: 'cod', label: 'Cash on delivery', icon: '💵' },
    { value: 'jazzcash', label: 'JazzCash', icon: '📱' },
  ];
  form = {
    fullName: '', email: '', line1: '', city: '', province: '', postalCode: '', phone: '',
    paymentMethod: 'cod',
  };

  constructor(
    public cart: CartService,
    private orders: OrderService,
    private uploads: UploadService,
    private settings: SettingsService,
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
    // Pre-fetch JazzCash settings so there's no delay when the user selects it.
    this.settings.getJazzCash().subscribe({
      next: (s) => this.jazzcashSettings.set(s),
    });
  }

  onPaymentChange(method: string) {
    // Clear screenshot if switching away from JazzCash
    if (method !== 'jazzcash') {
      this.screenshotUrl.set('');
    }
  }

  onScreenshotSelect(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    this.uploadingScreenshot.set(true);
    this.error.set('');
    this.uploads.paymentScreenshot(file).subscribe({
      next: (res) => {
        this.screenshotUrl.set(res.url);
        this.uploadingScreenshot.set(false);
      },
      error: (err) => {
        this.error.set(err.error?.message || 'Failed to upload screenshot. Please try again.');
        this.uploadingScreenshot.set(false);
      },
    });
  }

  removeScreenshot() {
    this.screenshotUrl.set('');
  }

  canPlace(): boolean {
    if (this.form.paymentMethod === 'jazzcash' && !this.screenshotUrl()) return false;
    return true;
  }

  private validate(): string | null {
    if (!this.form.fullName.trim()) return 'Please enter your full name.';
    if (!this.auth.isLoggedIn()) {
      if (!this.form.email.trim()) return 'Please enter your email so we can send your order confirmation.';
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.form.email.trim())) return 'That email address doesn\u2019t look right.';
    }
    if (!this.form.phone.trim()) return 'Please enter a phone number so we can reach you.';
    if (!this.form.line1.trim()) return 'Please enter your delivery address.';
    if (!this.form.city.trim()) return 'Please enter your city.';
    if (this.form.paymentMethod === 'jazzcash' && !this.screenshotUrl()) {
      return 'Please upload your JazzCash payment screenshot.';
    }
    return null;
  }

  placeOrder() {
    this.error.set('');
    const problem = this.validate();
    if (problem) { this.error.set(problem); return; }

    this.placing.set(true);
    const payload: any = {
      items: this.cart.items().map((i) => ({ product: i.product, qty: i.qty, color: i.color })),
      shippingAddress: {
        fullName: this.form.fullName.trim(), line1: this.form.line1.trim(), city: this.form.city.trim(),
        province: this.form.province.trim(), postalCode: this.form.postalCode.trim(), phone: this.form.phone.trim(),
      },
      paymentMethod: this.form.paymentMethod,
      // Ignored by the server when a valid token is sent.
      email: this.form.email.trim(),
    };

    if (this.form.paymentMethod === 'jazzcash') {
      payload.paymentScreenshot = this.screenshotUrl();
    }

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
