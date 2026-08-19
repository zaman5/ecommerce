import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OrderService } from '../../../core/services/api.service';
import { Order } from '../../../core/models/models';
import { AdminNavComponent } from '../admin-nav.component';
import { MediaUrlPipe } from '../../../shared/pipes/media-url.pipe';
import { environment } from '../../../../environments/environment';

const API_ORIGIN = environment.apiUrl.replace(/\/api\/?$/, '');

@Component({
  selector: 'app-admin-orders',
  standalone: true,
  imports: [CommonModule, FormsModule, AdminNavComponent, MediaUrlPipe],
  template: `
    <section class="section">
      <div class="container">
        <app-admin-nav />
        <h1>Orders</h1>
        <p class="text-muted">Review orders and update their status — customers see tracking updates instantly.</p>

        <div class="filters mt">
          @for (f of statusFilters; track f.value) {
            <button class="chip" [class.on]="activeFilter() === f.value" (click)="filter(f.value)">{{ f.label }}</button>
          }
        </div>

        @if (loading()) { <div class="spinner"></div> }
        @else {
          <div class="orders mt">
            @for (o of orders(); track o._id) {
              <div class="card card-pad order">
                <div class="o-top" (click)="toggle(o._id)">
                  <div>
                    <div class="o-num">#{{ o.orderNumber }}</div>
                    <span class="text-muted">{{ custName(o) }} · {{ o.createdAt | date:'medium' }}</span>
                  </div>
                  <div class="o-right">
                    <span class="status" [class]="'status-' + o.status">{{ label(o.status) }}</span>
                    <span class="price">Rs {{ o.grandTotal | number }}</span>
                    <span class="caret">{{ expanded() === o._id ? '▲' : '▼' }}</span>
                  </div>
                </div>

                @if (expanded() === o._id) {
                  <div class="o-detail">
                    <div class="cols">
                      <div>
                        <h4>Items</h4>
                        @for (i of o.items; track i.product + '::' + (i.color || '')) {
                          <div class="li">
                            <img [src]="(i.image | mediaUrl) || placeholder" [alt]="i.name" />
                            <span>{{ i.name }}@if (i.color) { <em class="colour">· {{ i.color }}</em> } × {{ i.qty }}</span>
                            <strong>Rs {{ i.price * i.qty | number }}</strong>
                          </div>
                        }
                      </div>
                      <div>
                        <h4>Delivery & Payment</h4>
                        <p class="addr">
                          <strong>{{ o.shippingAddress.fullName }}</strong><br>
                          {{ o.shippingAddress.line1 }}<br>
                          {{ o.shippingAddress.city }}, {{ o.shippingAddress.province }} {{ o.shippingAddress.postalCode }}<br>
                          📞 {{ o.shippingAddress.phone }}
                        </p>
                        <p class="pay-info">
                          <strong>Payment Method:</strong> {{ o.paymentMethod | uppercase }}<br>
                          <strong>Payment Status:</strong> 
                          <span class="status-badge" [class.paid]="o.paymentStatus === 'paid'" [class.unpaid]="o.paymentStatus !== 'paid'">
                            {{ o.paymentStatus }}
                          </span>
                        </p>

                        @if (o.paymentScreenshot) {
                          <div class="ss-box">
                            <strong>📷 JazzCash Payment Screenshot:</strong>
                            <div class="ss-preview-container">
                              <img [src]="o.paymentScreenshot | mediaUrl" alt="Payment screenshot" class="ss-thumb" (click)="openScreenshot(o.paymentScreenshot)" title="Click to view full image" />
                              <a [href]="getMediaUrl(o.paymentScreenshot)" target="_blank" class="ss-link">🔍 View full size</a>
                            </div>
                            @if (o.paymentStatus !== 'paid') {
                              <button class="btn btn-success btn-sm mt-sm" [disabled]="verifyingId() === o._id" (click)="verifyPayment(o)">
                                {{ verifyingId() === o._id ? 'Verifying…' : '✓ Verify & Mark as Paid' }}
                              </button>
                            } @else {
                              <div class="verified-badge">✓ Payment Verified</div>
                            }
                          </div>
                        } @else if (o.paymentMethod === 'jazzcash') {
                          <div class="ss-box alert-box">
                            <span class="text-muted">📱 JazzCash selected — no screenshot uploaded</span>
                          </div>
                        }
                      </div>
                    </div>

                    <div class="update">
                      <h4>Update status</h4>
                      <div class="update-row">
                        <select class="input" [(ngModel)]="statusDraft[o._id]">
                          @for (s of statuses; track s) { <option [value]="s">{{ label(s) }}</option> }
                        </select>
                        <input class="input" [(ngModel)]="noteDraft[o._id]" placeholder="Optional note (e.g. courier, tracking #)" />
                        <button class="btn btn-primary" [disabled]="savingId() === o._id" (click)="updateStatus(o)">
                          {{ savingId() === o._id ? 'Saving…' : 'Update' }}
                        </button>
                      </div>
                    </div>
                  </div>
                }
              </div>
            } @empty {
              <div class="card card-pad center"><p class="text-muted">No orders in this view.</p></div>
            }
          </div>
        }
      </div>
    </section>
  `,
  styles: [`
    .filters { display:flex; gap:8px; flex-wrap:wrap; }
    .chip { border:2px solid var(--line); background:#fff; padding:7px 16px; border-radius:999px; font-weight:700; cursor:pointer; font-family: var(--font-display); color: var(--muted); }
    .chip.on { background:#fff; border-color: var(--brand); color: var(--brand); box-shadow: var(--shadow-sm); }
    .order { margin-bottom:14px; padding:0; overflow:hidden; }
    .o-top { display:flex; justify-content:space-between; align-items:center; padding:18px 22px; cursor:pointer; gap:12px; flex-wrap:wrap; }
    .o-num { font-family: var(--font-display); font-weight:700; font-size:1.05rem; }
    .o-right { display:flex; align-items:center; gap:14px; }
    .caret { color: var(--muted); font-size:.8rem; }
    .o-detail { padding:0 22px 22px; border-top:1px solid var(--line); }
    .cols { display:grid; grid-template-columns:1fr 1fr; gap:24px; margin:18px 0; }
    .li { display:flex; align-items:center; gap:10px; padding:6px 0; font-size:.9rem; }
    .li .colour { font-style:normal; color: var(--muted); font-weight:700; }
    .li img { width:38px; height:38px; object-fit:cover; border-radius:6px; }
    .li strong { margin-left:auto; }
    .addr { line-height:1.6; }
    .pay-info { margin:10px 0; line-height:1.8; }
    .status-badge { display:inline-block; padding:2px 8px; border-radius:6px; font-size:.82rem; font-weight:700; text-transform:capitalize; margin-left:4px; }
    .status-badge.paid { background:#e8f5e9; color:#2e7d32; }
    .status-badge.unpaid { background:#fff3e0; color:#e65100; }
    
    .ss-box { margin-top:14px; padding:14px; background:#f9fbf9; border:1px solid #dcedc8; border-radius:12px; display:flex; flex-direction:column; gap:8px; }
    .ss-preview-container { display:flex; align-items:center; gap:12px; flex-wrap:wrap; }
    .ss-thumb { width:120px; height:120px; object-fit:cover; border-radius:10px; border:2px solid var(--line); cursor:pointer; transition: transform .2s, box-shadow .2s; background:#fff; }
    .ss-thumb:hover { transform:scale(1.05); box-shadow:0 4px 12px rgba(0,0,0,0.15); }
    .ss-link { font-size:.85rem; font-weight:600; color:var(--brand); text-decoration:none; }
    .ss-link:hover { text-decoration:underline; }
    .btn-success { background: #2e7d32; color:#fff; border:none; padding:8px 16px; border-radius:8px; font-weight:700; cursor:pointer; }
    .btn-success:hover { background: #1b5e20; }
    .btn-success:disabled { opacity:.6; cursor:not-allowed; }
    .mt-sm { margin-top:6px; }
    .verified-badge { display:inline-block; background: #e8f5e9; color: #2e7d32; font-weight:700; font-size:.88rem; padding:6px 14px; border-radius:999px; align-self:flex-start; }
    .alert-box { background:#fff8e1; border-color:#ffe082; }

    .update-row { display:flex; gap:10px; flex-wrap:wrap; }
    .update-row select { width:auto; min-width:170px; }
    .update-row .input:not(select) { flex:1; min-width:200px; }
    @media (max-width: 640px) {
      .cols { grid-template-columns: 1fr; gap: 16px; margin: 12px 0; }
      .o-top { padding: 14px 16px; }
      .o-detail { padding: 0 16px 16px; }
      .update-row { flex-direction: column; }
      .update-row select, .update-row .input:not(select), .update-row button { width: 100%; min-width: 0; }
    }
  `],
})
export class AdminOrdersComponent implements OnInit {
  orders = signal<Order[]>([]);
  loading = signal(true);
  expanded = signal<string | null>(null);
  activeFilter = signal('');
  savingId = signal<string | null>(null);
  verifyingId = signal<string | null>(null);
  statusDraft: Record<string, string> = {};
  noteDraft: Record<string, string> = {};
  placeholder = 'https://placehold.co/100x100/f4ebe1/7d8a97?text=%20';

  statuses = ['pending', 'confirmed', 'processing', 'shipped', 'out_for_delivery', 'delivered', 'cancelled'];
  statusFilters = [
    { value: '', label: 'All' }, { value: 'pending', label: 'Pending' }, { value: 'confirmed', label: 'Confirmed' },
    { value: 'processing', label: 'Processing' }, { value: 'shipped', label: 'Shipped' },
    { value: 'delivered', label: 'Delivered' }, { value: 'cancelled', label: 'Cancelled' },
  ];

  constructor(private orderSvc: OrderService) {}
  ngOnInit() { this.load(); }
  load() {
    this.loading.set(true);
    this.orderSvc.adminAll(this.activeFilter() || undefined).subscribe({
      next: (o) => { this.orders.set(o); o.forEach((x) => (this.statusDraft[x._id] = x.status)); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }
  filter(v: string) { this.activeFilter.set(v); this.load(); }
  toggle(id: string) { this.expanded.set(this.expanded() === id ? null : id); }
  updateStatus(o: Order) {
    this.savingId.set(o._id);
    this.orderSvc.updateStatus(o._id, { status: this.statusDraft[o._id], note: this.noteDraft[o._id] }).subscribe({
      next: (updated) => {
        this.orders.set(this.orders().map((x) => (x._id === updated._id ? updated : x)));
        this.noteDraft[o._id] = '';
        this.savingId.set(null);
      },
      error: () => this.savingId.set(null),
    });
  }
  custName(o: Order) {
    if (o.user && typeof o.user === 'object') return o.user.name;
    return o.shippingAddress?.fullName ? `${o.shippingAddress.fullName} (guest)` : 'Guest';
  }
  custEmail(o: Order) {
    if (o.user && typeof o.user === 'object') return o.user.email;
    return o.guestEmail || '—';
  }
  label(s: string) { return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()); }

  getMediaUrl(url: string | undefined | null): string {
    if (!url) return '';
    if (/^(https?:)?\/\//i.test(url) || url.startsWith('data:')) return url;
    if (url.startsWith('/uploads/')) return API_ORIGIN + url;
    return url;
  }

  openScreenshot(url: string) {
    window.open(this.getMediaUrl(url), '_blank');
  }

  verifyPayment(o: Order) {
    this.verifyingId.set(o._id);
    this.orderSvc.verifyPayment(o._id).subscribe({
      next: (updated) => {
        this.orders.set(this.orders().map((x) => (x._id === updated._id ? updated : x)));
        this.verifyingId.set(null);
      },
      error: (err) => {
        alert(err.error?.message || 'Failed to verify payment');
        this.verifyingId.set(null);
      },
    });
  }
}
