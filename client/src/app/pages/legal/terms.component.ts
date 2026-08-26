import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CONTACT } from '../contact/contact.component';
import { SettingsService } from '../../core/services/api.service';

@Component({
  selector: 'app-terms',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <section class="section">
      <div class="container">
        <div class="head">
          <div class="badge-pill">Legal Agreement</div>
          <h1>📜 Terms &amp; Conditions</h1>
          <p class="text-muted">Last updated {{ updated }}</p>
          <p class="intro">
            By using <strong>WonderCart.pk</strong> and placing orders with us, you agree to the following terms and conditions. Please read them carefully. If anything is unclear, <a routerLink="/contact">contact our support team</a> before purchasing.
          </p>
        </div>

        <div class="layout">
          <nav class="toc card card-pad" aria-label="On this page">
            <h2>On this page</h2>
            @for (s of sections; track s.id) {
              <a [href]="'#' + s.id">{{ s.n }}. {{ s.title }}</a>
            }
          </nav>

          <article class="card card-pad body">
            <!-- 1. Orders and Acceptance -->
            <section id="orders">
              <h2>1. Orders &amp; Acceptance</h2>
              <p>
                Placing an order is an offer to buy. An order is formally confirmed when it is processed and approved on our system. WonderCart reserves the right to decline or cancel orders due to product unavailability, listing errors, or delivery verification issues.
              </p>
            </section>

            <!-- 2. Prices and Payment -->
            <section id="prices">
              <h2>2. Prices &amp; Payment</h2>
              <p>
                All prices are listed in <strong>Pakistani Rupees (Rs)</strong> and include applicable taxes unless specified otherwise. We accept Cash on Delivery (COD), JazzCash, Easypaisa, and major debit/credit cards.
              </p>
            </section>

            <!-- 3. Confidentiality -->
            <section id="confidentiality">
              <h2>3. Confidentiality</h2>
              <p>
                Customer information will not be disclosed to third parties except where strictly required by law, court order, or essential contractual obligation for order fulfillment.
              </p>
            </section>

            <!-- 4. Website Availability -->
            <section id="availability">
              <h2>4. Website Availability</h2>
              <p>
                We aim to maintain continuous, uninterrupted service; however, temporary disruptions may occasionally occur due to scheduled maintenance, server upgrades, or unexpected technical issues.
              </p>
            </section>

            <!-- 5. Data Collection (Log Files) -->
            <section id="data-collection">
              <h2>5. Data Collection (Log Files)</h2>
              <p>
                We collect non-personal diagnostic data such as IP addresses, browser types, device identifiers, and site usage patterns solely to optimize performance and enhance the user browsing experience.
              </p>
            </section>

            <!-- 6. Cookies -->
            <section id="cookies">
              <h2>6. Cookies</h2>
              <p>
                Our website uses cookies and similar storage technologies to preserve session preferences, manage your shopping cart, and enhance general platform functionality.
              </p>
            </section>

            <!-- 7. External Links -->
            <section id="external-links">
              <h2>7. External Links</h2>
              <p>
                WonderCart may contain links to external third-party services or payment processors. WonderCart is not responsible for the content, privacy practices, or security standards of third-party websites.
              </p>
            </section>

            <!-- 8. Intellectual Property -->
            <section id="ip">
              <h2>8. Intellectual Property</h2>
              <p>
                All website content, including logos, graphics, product visuals, text copy, designs, and software code, is the property of WonderCart and is protected under applicable copyright and intellectual property laws.
              </p>
            </section>

            <!-- 9. Exchange & Return Policy -->
            <section id="returns">
              <h2>9. 🔁 Exchange &amp; Return Policy</h2>
              <p>
                Products purchased via WonderCart.pk may be eligible for exchange or return within <strong>30 days of purchase</strong>, provided the item is unused, unwashed, and in its original condition with all tags, packaging, and invoice intact.
              </p>
              <p>
                All approved returns are processed via <strong>shopping vouchers only</strong>. For full details, exclusions, and courier address, please view our <a routerLink="/returns">Exchange &amp; Return Policy</a>.
              </p>
            </section>

            <!-- 10. Force Majeure -->
            <section id="force-majeure">
              <h2>10. Force Majeure</h2>
              <p>
                WonderCart shall not be held liable for any delays or failure in performance or delivery resulting from events beyond reasonable control, including natural disasters, extreme weather, courier strikes, civil disruptions, or governmental actions.
              </p>
            </section>

            <!-- 11. General Terms -->
            <section id="general">
              <h2>11. General Terms</h2>
              <ul class="bullet-list">
                <li>Continued use of the website implies full acceptance of these terms.</li>
                <li>If any provision of these terms is deemed invalid or unenforceable, the remaining provisions shall remain in full force and effect.</li>
                <li>These terms may only be amended or waived with authorized written approval from WonderCart management.</li>
              </ul>
            </section>

            <!-- 12. Policy Updates -->
            <section id="updates">
              <h2>12. Policy Updates</h2>
              <p>
                WonderCart reserves the right to modify or update these terms and policies at any time without prior notice. Changes take effect immediately upon publication on this page.
              </p>
            </section>

            <!-- 13. Contact Us -->
            <section id="contact">
              <h2>13. 📞 Contact Us</h2>
              <p>For inquiries, support, or assistance regarding these terms or your orders:</p>
              <ul class="contact-list">
                <li><strong>Email</strong> <a [href]="'mailto:' + email()">{{ email() }}</a></li>
                <li><strong>UAN</strong> {{ uan() }}</li>
                <li><strong>Hours</strong> {{ hours() }}</li>
              </ul>
              <p>
                Our customer support team is available to assist you with all order-related queries, returns, exchanges, and general information.
              </p>
              <p><a class="btn btn-primary" routerLink="/contact">Send us a message</a></p>
            </section>
          </article>
        </div>
      </div>
    </section>
  `,
  styles: [`
    .badge-pill { display: inline-block; font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--brand); background: rgba(59, 130, 246, 0.1); padding: 4px 12px; border-radius: 999px; margin-bottom: 8px; }
    .head { margin-bottom: 24px; }
    .head h1 { margin: 0 0 4px; font-size: 2rem; color: var(--ink); }
    .head .intro { max-width: 70ch; margin: 12px 0 0; font-size: 0.98rem; line-height: 1.6; }
    .head .intro a { color: var(--brand); text-decoration: underline; }

    .layout { display: grid; grid-template-columns: 250px minmax(0, 1fr); gap: 24px; align-items: start; }
    .toc { position: sticky; top: 140px; }
    .toc h2 { font-size: .95rem; margin: 0 0 10px; color: var(--ink); }
    .toc a { display: block; padding: 5px 0; font-size: .87rem; color: var(--muted); text-decoration: none; }
    .toc a:hover { color: var(--brand); font-weight: 500; }

    .body { max-width: 78ch; }
    .body section { scroll-margin-top: 150px; }
    .body section + section { margin-top: 28px; padding-top: 24px; border-top: 1px solid var(--line); }
    .body h2 { font-size: 1.15rem; margin: 0 0 10px; color: var(--ink); }
    .body p { margin: 0 0 12px; color: #4a5560; line-height: 1.75; font-size: 0.94rem; }
    .body p:last-child { margin-bottom: 0; }
    .body a { color: var(--brand); text-decoration: underline; }
    .bullet-list { padding-left: 20px; margin: 0 0 12px; }
    .bullet-list li { margin-bottom: 8px; color: #4a5560; font-size: 0.94rem; line-height: 1.65; }

    .contact-list { list-style: none; padding: 0; margin: 0 0 16px; }
    .contact-list li { padding: 6px 0; border-bottom: 1px solid var(--line); color: #4a5560; font-size: 0.92rem; }
    .contact-list li:last-child { border-bottom: none; }
    .contact-list strong { display: inline-block; min-width: 90px; color: var(--ink); font-weight: 600; }

    @media (max-width: 900px) {
      .layout { grid-template-columns: 1fr; }
      .toc { position: static; }
    }
  `],
})
export class TermsComponent implements OnInit {
  readonly c = CONTACT;
  readonly updated = '26 August 2026';

  uan = signal(CONTACT.uan);
  email = signal(CONTACT.email);
  hours = signal(CONTACT.hours);

  constructor(private settingsSvc: SettingsService) {}

  ngOnInit() {
    this.settingsSvc.getContact().subscribe({
      next: (res) => {
        if (res.uan) this.uan.set(res.uan);
        if (res.supportEmail) this.email.set(res.supportEmail);
        if (res.supportHours) this.hours.set(res.supportHours);
      },
      error: () => {},
    });
  }

  readonly sections = [
    { n: 1, id: 'orders', title: 'Orders & Acceptance' },
    { n: 2, id: 'prices', title: 'Prices & Payment' },
    { n: 3, id: 'confidentiality', title: 'Confidentiality' },
    { n: 4, id: 'availability', title: 'Website Availability' },
    { n: 5, id: 'data-collection', title: 'Data Collection' },
    { n: 6, id: 'cookies', title: 'Cookies' },
    { n: 7, id: 'external-links', title: 'External Links' },
    { n: 8, id: 'ip', title: 'Intellectual Property' },
    { n: 9, id: 'returns', title: 'Exchange & Return Policy' },
    { n: 10, id: 'force-majeure', title: 'Force Majeure' },
    { n: 11, id: 'general', title: 'General Terms' },
    { n: 12, id: 'updates', title: 'Policy Updates' },
    { n: 13, id: 'contact', title: 'Contact Us' },
  ];
}
