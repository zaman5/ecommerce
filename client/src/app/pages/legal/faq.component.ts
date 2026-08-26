import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

interface FaqItem {
  id: string;
  category: 'orders' | 'payments' | 'shipping' | 'returns' | 'account';
  question: string;
  answer: string;
  isOpen?: boolean;
}

@Component({
  selector: 'app-faq',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <section class="section">
      <div class="container">
        <!-- Header -->
        <div class="head text-center">
          <div class="badge-pill">Help &amp; Support</div>
          <h1>❓ Frequently Asked Questions</h1>
          <p class="intro">
            Find quick answers to common questions about orders, payments, delivery, returns, and your WonderCart account.
          </p>

          <!-- Search Bar -->
          <div class="faq-search-wrap">
            <div class="search-box">
              <span class="search-ico">🔍</span>
              <input
                type="text"
                class="search-input"
                placeholder="Search FAQs (e.g. tracking, COD, return address, delivery)..."
                [ngModel]="searchQuery()"
                (ngModelChange)="searchQuery.set($event)"
              />
              @if (searchQuery()) {
                <button class="clear-btn" (click)="searchQuery.set('')" aria-label="Clear search">✕</button>
              }
            </div>
          </div>
        </div>

        <!-- Category Filter Tabs -->
        <div class="tabs-bar">
          @for (tab of categories; track tab.key) {
            <button
              class="tab-btn"
              [class.active]="selectedCategory() === tab.key"
              (click)="selectCategory(tab.key)"
            >
              <span class="tab-ico">{{ tab.icon }}</span>
              <span class="tab-label">{{ tab.label }}</span>
              <span class="tab-badge">{{ getCountForCategory(tab.key) }}</span>
            </button>
          }
        </div>

        <!-- FAQ Items Accordion -->
        <div class="faq-list">
          @if (filteredFaqs().length === 0) {
            <div class="card card-pad no-results">
              <div class="empty-ico">🔍</div>
              <h3>No matching questions found</h3>
              <p class="text-muted">Try using different keywords or browse through the categories above.</p>
              <button class="btn btn-ghost" (click)="resetFilters()">View All FAQs</button>
            </div>
          } @else {
            @for (faq of filteredFaqs(); track faq.id) {
              <div class="faq-card" [class.open]="openMap()[faq.id]">
                <button
                  class="faq-question"
                  (click)="toggle(faq.id)"
                  [attr.aria-expanded]="openMap()[faq.id]"
                >
                  <span class="q-text">{{ faq.question }}</span>
                  <span class="q-toggle-ico">
                    <i class="fas fa-chevron-down"></i>
                  </span>
                </button>

                @if (openMap()[faq.id]) {
                  <div class="faq-answer">
                    <div [innerHTML]="faq.answer"></div>
                  </div>
                }
              </div>
            }
          }
        </div>

        <!-- Still Need Help Box -->
        <div class="card card-pad need-help-box">
          <div class="help-content">
            <div class="help-ico">💬</div>
            <div>
              <h3>Still have questions?</h3>
              <p>Our dedicated support team is here to assist you with any inquiries or order updates.</p>
            </div>
          </div>
          <div class="help-btns">
            <a routerLink="/contact" class="btn btn-primary">📞 Contact Support</a>
            <a href="mailto:support@wondercart.pk" class="btn btn-ghost">support&#64;wondercart.pk</a>
          </div>
        </div>
      </div>
    </section>
  `,
  styles: [`
    .text-center { text-align: center; }
    .head { margin-bottom: 32px; display: flex; flex-direction: column; align-items: center; }
    .badge-pill { display: inline-block; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--brand); background: rgba(59, 130, 246, 0.1); padding: 4px 12px; border-radius: 999px; margin-bottom: 10px; }
    .head h1 { margin: 0 0 10px; font-size: 2rem; }
    .head .intro { max-width: 60ch; margin: 0 auto 24px; color: #4b5563; font-size: 1rem; line-height: 1.6; }

    /* Search Box */
    .faq-search-wrap { width: 100%; max-width: 580px; }
    .search-box { position: relative; display: flex; align-items: center; background: #ffffff; border: 1.5px solid #d1d5db; border-radius: 999px; padding: 4px 16px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); transition: border-color .15s, box-shadow .15s; }
    .search-box:focus-within { border-color: var(--brand); box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15); }
    .search-ico { font-size: 1.1rem; margin-right: 10px; opacity: 0.7; }
    .search-input { width: 100%; border: none; outline: none; background: transparent; font-size: 0.95rem; color: #1f2937; padding: 10px 0; }
    .clear-btn { background: none; border: none; font-size: 0.9rem; color: #9ca3af; cursor: pointer; padding: 4px 8px; border-radius: 50%; }
    .clear-btn:hover { color: #1f2937; }

    /* Filter Tabs */
    .tabs-bar { display: flex; gap: 8px; justify-content: center; flex-wrap: wrap; margin-bottom: 28px; }
    .tab-btn { display: inline-flex; align-items: center; gap: 8px; padding: 8px 16px; border-radius: 999px; border: 1px solid #e5e7eb; background: #ffffff; color: #4b5563; font-size: 0.88rem; font-weight: 500; cursor: pointer; transition: all .15s; }
    .tab-btn:hover { background: #f9fafb; border-color: #d1d5db; color: #1f2937; }
    .tab-btn.active { background: var(--brand); border-color: var(--brand); color: #ffffff; box-shadow: 0 2px 6px rgba(59, 130, 246, 0.3); }
    .tab-btn.active .tab-badge { background: rgba(255, 255, 255, 0.25); color: #ffffff; }
    .tab-badge { font-size: 0.75rem; padding: 2px 7px; border-radius: 999px; background: #f3f4f6; color: #6b7280; font-weight: 600; }

    /* FAQ List */
    .faq-list { max-width: 820px; margin: 0 auto 40px; display: flex; flex-direction: column; gap: 12px; }
    .faq-card { background: #ffffff; border: 1px solid #e5e7eb; border-radius: 12px; overflow: hidden; transition: border-color .15s, box-shadow .15s; }
    .faq-card:hover { border-color: #cbd5e1; }
    .faq-card.open { border-color: var(--brand); box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); }

    .faq-question { width: 100%; text-align: left; background: none; border: none; padding: 18px 22px; display: flex; justify-content: space-between; align-items: center; gap: 16px; cursor: pointer; font-family: inherit; font-size: 1.02rem; font-weight: 600; color: #111827; }
    .faq-question:hover { color: var(--brand); }
    .q-toggle-ico { display: flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 50%; background: #f3f4f6; font-size: 0.8rem; color: #6b7280; transition: transform .2s ease, background .15s; flex-shrink: 0; }
    .faq-card.open .q-toggle-ico { transform: rotate(180deg); background: #eff6ff; color: var(--brand); }

    .faq-answer { padding: 0 22px 20px; color: #374151; font-size: 0.94rem; line-height: 1.7; border-top: 1px solid #f3f4f6; padding-top: 14px; }
    .faq-answer p { margin: 0 0 10px; }
    .faq-answer p:last-child { margin-bottom: 0; }
    .faq-answer ul { margin: 8px 0; padding-left: 20px; }
    .faq-answer li { margin-bottom: 6px; }
    .faq-answer a { color: var(--brand); text-decoration: underline; font-weight: 500; }
    .faq-answer strong { color: #111827; }

    /* No Results */
    .no-results { text-align: center; padding: 40px 20px; }
    .empty-ico { font-size: 2.5rem; margin-bottom: 12px; }
    .no-results h3 { margin: 0 0 6px; font-size: 1.2rem; }
    .no-results p { margin: 0 0 16px; }

    /* Need Help Box */
    .need-help-box { max-width: 820px; margin: 0 auto; display: flex; justify-content: space-between; align-items: center; gap: 24px; flex-wrap: wrap; background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border: 1px solid #e2e8f0; }
    .help-content { display: flex; align-items: center; gap: 16px; }
    .help-ico { font-size: 2.2rem; line-height: 1; }
    .help-content h3 { margin: 0 0 4px; font-size: 1.15rem; color: #0f172a; }
    .help-content p { margin: 0; font-size: 0.88rem; color: #475569; }
    .help-btns { display: flex; gap: 10px; flex-wrap: wrap; }
    .help-btns .btn { text-decoration: none; }

    @media (max-width: 700px) {
      .need-help-box { flex-direction: column; align-items: flex-start; }
      .help-btns { width: 100%; }
      .help-btns .btn { flex: 1; text-align: center; }
    }
  `],
})
export class FaqComponent {
  searchQuery = signal('');
  selectedCategory = signal<string>('all');
  openMap = signal<Record<string, boolean>>({
    'ord-1': true, // Open the first question by default
  });

  readonly categories = [
    { key: 'all', label: 'All Questions', icon: '🌟' },
    { key: 'orders', label: 'Orders & Tracking', icon: '📦' },
    { key: 'payments', label: 'Payments & Billing', icon: '💳' },
    { key: 'shipping', label: 'Shipping & Delivery', icon: '🚚' },
    { key: 'returns', label: 'Returns & Exchanges', icon: '🔁' },
    { key: 'account', label: 'Account & Support', icon: '🛡️' },
  ];

  readonly faqs: FaqItem[] = [
    // Orders
    {
      id: 'ord-1',
      category: 'orders',
      question: 'How do I place an order on WonderCart?',
      answer: `
        <p>Placing an order on WonderCart is simple and quick:</p>
        <ul>
          <li>Browse our catalogue and click <strong>Add to Cart</strong> on your desired items.</li>
          <li>Click the cart icon in the top header and select <strong>Checkout</strong>.</li>
          <li>Enter your shipping address, contact details, and choose your preferred payment method (Cash on Delivery or Online Payment).</li>
          <li>Review your order summary and click <strong>Confirm Order</strong>. You will receive an immediate confirmation with your unique Order ID.</li>
        </ul>
      `,
    },
    {
      id: 'ord-2',
      category: 'orders',
      question: 'How can I track my order status in real-time?',
      answer: `
        <p>You can track your order at any stage:</p>
        <ul>
          <li>Go to our <a href="/account/orders">Track Order</a> page.</li>
          <li>Enter your <strong>Order Number</strong> (e.g., WC-10234) and your email address.</li>
          <li>You will see live status updates from <em>Pending</em>, <em>Confirmed</em>, <em>Dispatched</em> to <em>Delivered</em>.</li>
        </ul>
      `,
    },
    {
      id: 'ord-3',
      category: 'orders',
      question: 'Can I cancel or modify my order after placing it?',
      answer: `
        <p>Yes, you can cancel your order directly from your <a href="/account/orders">Orders page</a> as long as it is still in <strong>Pending</strong> status.</p>
        <p>Once an order has been <strong>Confirmed</strong> or dispatched to our courier partner, it cannot be modified or cancelled online. Please contact our support team at <a href="mailto:support@wondercart.pk">support@wondercart.pk</a> immediately for assistance.</p>
      `,
    },
    {
      id: 'ord-4',
      category: 'orders',
      question: 'Do I need an account to place an order?',
      answer: `
        <p>No, guest checkout is fully supported! However, creating a free account allows you to save delivery addresses, view complete purchase history, track orders effortlessly, and save items to your wishlist.</p>
      `,
    },

    // Payments
    {
      id: 'pay-1',
      category: 'payments',
      question: 'What payment methods does WonderCart accept?',
      answer: `
        <p>We provide multiple flexible payment options across Pakistan:</p>
        <ul>
          <li><strong>Cash on Delivery (COD):</strong> Pay in cash directly to the courier rider upon delivery of your parcel.</li>
          <li><strong>JazzCash:</strong> Fast mobile wallet and direct bank transfer checkout.</li>
          <li><strong>Easypaisa:</strong> Mobile account payments.</li>
          <li><strong>Debit / Credit Cards:</strong> Visa and Mastercard credit/debit cards via secure payment gateways.</li>
        </ul>
      `,
    },
    {
      id: 'pay-2',
      category: 'payments',
      question: 'Is Cash on Delivery (COD) available everywhere in Pakistan?',
      answer: `
        <p>Yes, Cash on Delivery is supported in all major cities, towns, and deliverable postal codes throughout Pakistan.</p>
      `,
    },
    {
      id: 'pay-3',
      category: 'payments',
      question: 'Is my payment and personal information secure?',
      answer: `
        <p>Absolutely. We use industry-standard encryption protocols and trusted financial gateways. WonderCart does not store sensitive credit card or banking numbers on our servers.</p>
      `,
    },

    // Shipping
    {
      id: 'ship-1',
      category: 'shipping',
      question: 'What are the delivery charges and shipping times?',
      answer: `
        <p><strong>Delivery Times:</strong></p>
        <ul>
          <li><strong>Major Cities (Lahore, Karachi, Islamabad, Rawalpindi):</strong> 2 to 4 business days.</li>
          <li><strong>Other Cities & Regional Areas:</strong> 3 to 6 business days.</li>
        </ul>
        <p>Delivery charges are calculated at checkout and displayed before you confirm your order. Look out for seasonal <strong>Free Shipping</strong> promotional banners!</p>
      `,
    },
    {
      id: 'ship-2',
      category: 'shipping',
      question: 'Which courier services do you partner with?',
      answer: `
        <p>We partner with premier logistics carriers including TCS, Leopards Courier, Trax, and PostEx to ensure safe and prompt nationwide delivery.</p>
      `,
    },

    // Returns
    {
      id: 'ret-1',
      category: 'returns',
      question: 'What is WonderCart’s Exchange & Return Policy?',
      answer: `
        <p>Products purchased via WonderCart.pk may be eligible for exchange or return within <strong>30 days of purchase</strong>, provided that:</p>
        <ul>
          <li>The item is <strong>unused and unwashed</strong>.</li>
          <li>The item is in its <strong>original condition</strong>.</li>
          <li>All original <strong>tags, packaging, and invoice</strong> are intact.</li>
        </ul>
        <p>For more details, please visit our <a href="/returns">Exchange &amp; Return Policy</a> page.</p>
      `,
    },
    {
      id: 'ret-2',
      category: 'returns',
      question: 'Which items are non-returnable and non-exchangeable?',
      answer: `
        <p>For hygiene and safety reasons, the following items are strictly non-returnable and non-exchangeable:</p>
        <ul>
          <li>Toys</li>
          <li>Jewelry and accessories</li>
          <li>Swimwear and swimming gear</li>
          <li>School supplies</li>
          <li>Baby care items</li>
          <li>Undergarments</li>
          <li>Food items</li>
        </ul>
      `,
    },
    {
      id: 'ret-3',
      category: 'returns',
      question: 'How do I return an item and where do I send it?',
      answer: `
        <p>To initiate a return or exchange, send the parcel via any courier service to our exchange center:</p>
        <p><strong>Exchange Department<br>WonderCart<br>5th Floor, 12-D, SNC Center<br>Fazal-e-Haq Road, Blue Area<br>Islamabad, Pakistan</strong></p>
        <p>Upon receipt and inspection, a <strong>shopping voucher</strong> will be issued within <strong>24–48 working hours</strong> via email or phone. WonderCart does not offer cash refunds.</p>
      `,
    },

    // Account & Support
    {
      id: 'acc-1',
      category: 'account',
      question: 'How do I contact WonderCart customer support?',
      answer: `
        <p>You can reach our dedicated support team via:</p>
        <ul>
          <li><strong>Email:</strong> <a href="mailto:support@wondercart.pk">support@wondercart.pk</a></li>
          <li><strong>Contact Form:</strong> Visit our <a href="/contact">Contact Us</a> page.</li>
          <li><strong>Support Hours:</strong> Monday to Saturday, 9:00 AM – 6:00 PM (PKT).</li>
        </ul>
      `,
    },
    {
      id: 'acc-2',
      category: 'account',
      question: 'What if I receive a damaged or incorrect item?',
      answer: `
        <p>We inspect all orders before dispatch. In the rare event that an item is received damaged or incorrect, please email us at <a href="mailto:support@wondercart.pk">support@wondercart.pk</a> within 48 hours of delivery along with your order number and photos of the product. We will arrange a replacement or voucher at no extra delivery cost.</p>
      `,
    },
    {
      id: 'acc-3',
      category: 'account',
      question: 'How do I reset my account password?',
      answer: `
        <p>Click on <a href="/login">Sign In</a>, select <em>Forgot password?</em>, enter your registered email address, and follow the password recovery instructions sent to your inbox.</p>
      `,
    },
  ];

  filteredFaqs = computed(() => {
    const q = this.searchQuery().trim().toLowerCase();
    const cat = this.selectedCategory();

    return this.faqs.filter((faq) => {
      const matchCat = cat === 'all' || faq.category === cat;
      if (!matchCat) return false;

      if (!q) return true;
      return (
        faq.question.toLowerCase().includes(q) ||
        faq.answer.toLowerCase().includes(q)
      );
    });
  });

  selectCategory(key: string) {
    this.selectedCategory.set(key);
  }

  toggle(id: string) {
    const map = { ...this.openMap() };
    map[id] = !map[id];
    this.openMap.set(map);
  }

  getCountForCategory(key: string): number {
    if (key === 'all') return this.faqs.length;
    return this.faqs.filter((f) => f.category === key).length;
  }

  resetFilters() {
    this.searchQuery.set('');
    this.selectedCategory.set('all');
  }
}
