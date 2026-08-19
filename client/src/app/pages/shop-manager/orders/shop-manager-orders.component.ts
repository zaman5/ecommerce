import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { OrderService } from '../../../core/services/api.service';
import { Order } from '../../../core/models/models';
import { ShopManagerNavComponent } from '../shop-manager-nav.component';
import { MediaUrlPipe } from '../../../shared/pipes/media-url.pipe';
import { environment } from '../../../../environments/environment';

const API_ORIGIN = environment.apiUrl.replace(/\/api\/?$/, '');

@Component({
  selector: 'app-sm-orders',
  standalone: true,
  imports: [CommonModule, FormsModule, ShopManagerNavComponent, MediaUrlPipe],
  template: `
    <section class="section">
      <div class="container">
        <app-shop-manager-nav />
        <h1>Orders</h1>
        <p class="text-muted">Orders containing your assigned products.</p>

        <div class="flex gap mt">
          <select class="input" style="max-width:200px" [(ngModel)]="statusFilter" (ngModelChange)="reload()">
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="processing">Processing</option>
            <option value="shipped">Shipped</option>
            <option value="out_for_delivery">Out for delivery</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        @if (loading()) { <div class="spinner"></div> }
        @else {
          <div class="card table-wrap mt">
            <table class="table">
              <thead><tr><th>Order</th><th>Customer</th><th>Items</th><th>Total</th><th>Status</th><th>Payment & Proof</th><th>Date</th><th>Actions</th></tr></thead>
              <tbody>
                @for (o of orders(); track o._id) {
                  <tr>
                    <td><strong>#{{ o.orderNumber }}</strong></td>
                    <td>{{ custName(o) }}</td>
                    <td>{{ o.items.length }}</td>
                    <td class="price">Rs {{ o.grandTotal | number }}</td>
                    <td><span class="status" [class]="'status-' + o.status">{{ label(o.status) }}</span></td>
                    <td>
                      <div class="pay-cell">
                        <span class="badge" [class.badge-sale]="o.paymentStatus === 'unpaid'" [class.badge-paid]="o.paymentStatus === 'paid'">
                          {{ o.paymentMethod }} ({{ o.paymentStatus }})
                        </span>
                        @if (o.paymentScreenshot) {
                          <div class="proof-row">
                            <img [src]="o.paymentScreenshot | mediaUrl" alt="Payment proof" class="proof-thumb" (click)="openScreenshot(o.paymentScreenshot)" title="Click to view screenshot" />
                            @if (o.paymentStatus !== 'paid') {
                              <button class="btn btn-sm btn-verify" [disabled]="verifyingId() === o._id" (click)="verifyPayment(o)">
                                {{ verifyingId() === o._id ? '…' : 'Verify' }}
                              </button>
                            }
                          </div>
                        }
                      </div>
                    </td>
                    <td class="text-muted">{{ o.createdAt | date:'MMM d' }}</td>
                    <td>
                      <select class="input" style="font-size:.8rem;padding:6px 10px;min-width:130px"
                              [ngModel]="o.status" (ngModelChange)="updateStatus(o, $event)">
                        <option value="pending">Pending</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="processing">Processing</option>
                        <option value="shipped">Shipped</option>
                        <option value="out_for_delivery">Out for delivery</option>
                        <option value="delivered">Delivered</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                    </td>
                  </tr>
                } @empty {
                  <tr><td colspan="8" class="center text-muted" style="padding:24px">No orders found.</td></tr>
                }
              </tbody>
            </table>
          </div>
        }
      </div>
    </section>
  `,
  styles: [`
    .pay-cell { display:flex; flex-direction:column; gap:6px; align-items:flex-start; }
    .badge-paid { background:#e8f5e9; color:#2e7d32; }
    .proof-row { display:flex; align-items:center; gap:8px; margin-top:2px; }
    .proof-thumb { width:42px; height:42px; object-fit:cover; border-radius:6px; border:1px solid var(--line); cursor:pointer; }
    .proof-thumb:hover { transform:scale(1.1); }
    .btn-verify { background:#2e7d32; color:#fff; font-size:.75rem; padding:4px 8px; border-radius:6px; border:none; cursor:pointer; }
    .btn-verify:hover { background:#1b5e20; }
  `],
})
export class ShopManagerOrdersComponent implements OnInit {
  orders = signal<Order[]>([]);
  loading = signal(true);
  verifyingId = signal<string | null>(null);
  statusFilter = '';

  constructor(private orderSvc: OrderService) {}

  ngOnInit() { this.reload(); }

  reload() {
    this.loading.set(true);
    this.orderSvc.adminAll(this.statusFilter || undefined).subscribe({
      next: (o) => { this.orders.set(o); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  custName(o: Order) {
    if (o.user && typeof o.user === 'object') return o.user.name;
    return o.shippingAddress?.fullName ? `${o.shippingAddress.fullName} (guest)` : 'Guest';
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

  updateStatus(o: Order, newStatus: string) {
    this.orderSvc.updateStatus(o._id, { status: newStatus }).subscribe({
      next: (updated) => {
        const list = this.orders().map((x) => (x._id === updated._id ? updated : x));
        this.orders.set(list);
      },
      error: (err) => alert(err.error?.message || 'Could not update.'),
    });
  }

  verifyPayment(o: Order) {
    this.verifyingId.set(o._id);
    this.orderSvc.verifyPayment(o._id).subscribe({
      next: (updated) => {
        this.orders.set(this.orders().map((x) => (x._id === updated._id ? updated : x)));
        this.verifyingId.set(null);
      },
      error: (err) => {
        alert(err.error?.message || 'Could not verify payment.');
        this.verifyingId.set(null);
      },
    });
  }
}
