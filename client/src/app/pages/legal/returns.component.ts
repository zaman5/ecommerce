import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-returns',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <section class="section">
      <div class="container">
        <div class="head">
          <div class="badge-pill">Policy</div>
          <h1>🔁 Exchange &amp; Return Policy</h1>
          <p class="intro">
            At WonderCart, customer satisfaction is our top priority. We strive to provide a seamless
            and reliable shopping experience for our customers across Pakistan.
          </p>
        </div>

        <div class="policy-grid">
          <!-- Main Content Card -->
          <article class="card card-pad policy-body">
            <!-- Section 1 -->
            <section class="policy-section">
              <div class="sec-header">
                <span class="sec-num">i</span>
                <h2>Eligibility for Exchange &amp; Return</h2>
              </div>
              <p>
                Products purchased via <strong>WonderCart.pk</strong> may be eligible for exchange or return
                within <strong>30 days</strong> of purchase, provided that:
              </p>
              <ul class="checklist">
                <li>
                  <span class="check-ico">✓</span>
                  <span>The item is <strong>unused and unwashed</strong></span>
                </li>
                <li>
                  <span class="check-ico">✓</span>
                  <span>The item is in its <strong>original condition</strong></span>
                </li>
                <li>
                  <span class="check-ico">✓</span>
                  <span>All original <strong>tags, packaging, and invoice</strong> are intact</span>
                </li>
              </ul>
            </section>

            <!-- Section 2 -->
            <section class="policy-section">
              <div class="sec-header">
                <span class="sec-num">ii</span>
                <h2>Non-Returnable &amp; Non-Exchangeable Items</h2>
              </div>
              <p>
                For hygiene and safety reasons, the following items are <strong>not eligible</strong> for return or exchange:
              </p>
              <div class="excluded-tags">
                <span class="tag-item">🚫 Toys</span>
                <span class="tag-item">🚫 Jewelry and accessories</span>
                <span class="tag-item">🚫 Swimwear and swimming gear</span>
                <span class="tag-item">🚫 School supplies</span>
                <span class="tag-item">🚫 Baby care items</span>
                <span class="tag-item">🚫 Undergarments</span>
                <span class="tag-item">🚫 Food items</span>
              </div>
            </section>

            <!-- Section 3 -->
            <section class="policy-section">
              <div class="sec-header">
                <span class="sec-num">iii</span>
                <h2>Exchange &amp; Return Process</h2>
              </div>
              <p>To initiate a return or exchange, customers must send the item via a courier service to the following address:</p>

              <div class="courier-box">
                <div class="courier-ico">📦</div>
                <div class="courier-text">
                  <div class="dept-title">Exchange Department</div>
                  <div class="company-name">WonderCart</div>
                  <div class="address-line">5th Floor, 12-D, SNC Center</div>
                  <div class="address-line">Fazal-e-Haq Road, Blue Area</div>
                  <div class="address-line">Islamabad, Pakistan</div>
                </div>
              </div>

              <div class="timeline-note">
                <span class="note-ico">⚡</span>
                <p>
                  Upon receipt and inspection, a <strong>shopping voucher</strong> will be issued within
                  <strong>24–48 working hours</strong> via email or phone.
                </p>
              </div>
            </section>

            <!-- Section 4 -->
            <section class="policy-section">
              <div class="sec-header">
                <span class="sec-num">iv</span>
                <h2>Refund Policy</h2>
              </div>
              <ul class="bullet-list">
                <li>WonderCart <strong>does not offer cash refunds</strong>.</li>
                <li>All approved returns are processed via <strong>shopping vouchers only</strong>.</li>
                <li><strong>Delivery charges are non-refundable</strong>, except in cases where incorrect or defective items were delivered.</li>
              </ul>
            </section>

            <!-- Section 5 -->
            <section class="policy-section">
              <div class="sec-header">
                <span class="sec-num">v</span>
                <h2>Additional Terms</h2>
              </div>
              <ul class="bullet-list">
                <li>WonderCart reserves the right to reject any return request that does not meet the eligibility criteria.</li>
                <li>Items purchased during sales, promotions, or clearance may not be eligible for return or exchange unless stated otherwise.</li>
                <li>Policies are subject to change without prior notice.</li>
              </ul>
            </section>
          </article>

          <!-- Sidebar Support Card -->
          <aside class="sidebar-col">
            <div class="card card-pad help-card">
              <h3>Need Help?</h3>
              <p>For assistance, please contact our customer support team:</p>

              <div class="contact-entry">
                <span class="entry-ico">✉️</span>
                <div>
                  <strong>Email Support</strong>
                  <a href="mailto:support@wondercart.pk">support&#64;wondercart.pk</a>
                </div>
              </div>

              <div class="help-actions">
                <a routerLink="/contact" class="btn btn-primary btn-block">Send us a message</a>
                <a routerLink="/account/orders" class="btn btn-ghost btn-block">Track your order</a>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  `,
  styles: [`
    .head { margin-bottom: 28px; }
    .badge-pill { display: inline-block; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--brand); background: rgba(59, 130, 246, 0.1); padding: 4px 10px; border-radius: 999px; margin-bottom: 8px; }
    .head h1 { margin: 0 0 8px; font-size: 1.85rem; }
    .head .intro { max-width: 72ch; margin: 0; color: #4b5563; font-size: 1.02rem; line-height: 1.6; }

    .policy-grid { display: grid; grid-template-columns: minmax(0, 2fr) minmax(0, 1fr); gap: 28px; align-items: start; }
    .policy-body { max-width: 100%; }

    .policy-section { scroll-margin-top: 140px; }
    .policy-section + .policy-section { margin-top: 32px; padding-top: 28px; border-top: 1px solid var(--line); }

    .sec-header { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
    .sec-num { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 50%; background: #eff6ff; color: var(--brand); font-weight: 700; font-size: 0.85rem; text-transform: lowercase; }
    .sec-header h2 { font-size: 1.2rem; margin: 0; color: var(--ink); }

    .policy-section p { color: #374151; line-height: 1.7; margin: 0 0 14px; font-size: 0.95rem; }

    .checklist { list-style: none; padding: 0; margin: 0 0 16px; display: flex; flex-direction: column; gap: 10px; }
    .checklist li { display: flex; align-items: center; gap: 10px; font-size: 0.93rem; color: #1f2937; background: #f9fafb; padding: 10px 14px; border-radius: 8px; border: 1px solid #f3f4f6; }
    .check-ico { display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; border-radius: 50%; background: #10b981; color: #ffffff; font-size: 0.75rem; font-weight: bold; }

    .excluded-tags { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
    .tag-item { display: inline-flex; align-items: center; gap: 6px; padding: 7px 12px; background: #fef2f2; color: #991b1b; border: 1px solid #fee2e2; border-radius: 6px; font-size: 0.88rem; font-weight: 500; }

    .courier-box { display: flex; gap: 16px; background: #f8fafc; border: 1.5px dashed #cbd5e1; border-radius: 10px; padding: 18px 20px; margin: 16px 0; }
    .courier-ico { font-size: 2rem; line-height: 1; }
    .dept-title { font-weight: 700; color: var(--brand); font-size: 0.98rem; }
    .company-name { font-weight: 600; color: #1e293b; margin-top: 2px; }
    .address-line { color: #475569; font-size: 0.92rem; line-height: 1.45; }

    .timeline-note { display: flex; gap: 10px; align-items: flex-start; background: #f0fdf4; border-left: 3px solid #16a34a; border-radius: 4px; padding: 12px 14px; margin-top: 14px; }
    .note-ico { font-size: 1.2rem; line-height: 1.3; }
    .timeline-note p { margin: 0; font-size: 0.9rem; color: #166534; line-height: 1.5; }

    .bullet-list { padding-left: 20px; margin: 0 0 14px; }
    .bullet-list li { margin-bottom: 8px; color: #374151; line-height: 1.65; font-size: 0.93rem; }

    /* Sidebar */
    .sidebar-col { position: sticky; top: 140px; }
    .help-card h3 { font-size: 1.1rem; margin: 0 0 10px; }
    .help-card p { font-size: 0.88rem; color: #4b5563; line-height: 1.5; margin: 0 0 16px; }
    .contact-entry { display: flex; gap: 12px; padding: 12px; background: #f9fafb; border-radius: 8px; border: 1px solid var(--line); margin-bottom: 18px; }
    .entry-ico { font-size: 1.3rem; }
    .contact-entry strong { display: block; font-size: 0.88rem; color: var(--ink); }
    .contact-entry a { font-size: 0.88rem; color: var(--brand); text-decoration: underline; word-break: break-all; }
    .help-actions { display: flex; flex-direction: column; gap: 10px; }
    .btn-block { display: block; width: 100%; text-align: center; text-decoration: none; }

    @media (max-width: 900px) {
      .policy-grid { grid-template-columns: 1fr; }
      .sidebar-col { position: static; }
    }
  `],
})
export class ReturnsComponent {}
