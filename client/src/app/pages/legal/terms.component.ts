import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { CONTACT } from '../contact/contact.component';

/**
 * Terms & Conditions.
 *
 * The clauses describe how this shop actually behaves — cash on delivery and
 * card/JazzCash/Easypaisa at checkout, server-side pricing, stock decremented
 * on order, cancellation while pending, the 7-day return window shown on the
 * product page — so the page and the code agree. Change the behaviour and this
 * text needs changing with it.
 *
 * NOT legal advice: have a lawyer review before trading on it.
 */
@Component({
  selector: 'app-terms',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <section class="section">
      <div class="container">
        <div class="head">
          <h1>Terms &amp; Conditions</h1>
          <p class="text-muted">Last updated {{ updated }}</p>
          <p class="intro">
            These terms cover your use of Wondercart and any order you place with us. By placing an
            order you accept them, so please read them first. If anything is unclear,
            <a routerLink="/contact">ask us</a> before you buy.
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
            <section id="orders">
              <h2>1. Orders and acceptance</h2>
              <p>
                Placing an order is an offer to buy, not a completed sale. The sale is made when we
                confirm your order and it moves out of <em>pending</em>. Until then we may decline
                or cancel it — for example if an item turns out to be unavailable, if the price was
                listed in error, or if we cannot verify the delivery details.
              </p>
              <p>
                You must be able to enter a contract to order. If you are under 18, order through a
                parent or guardian.
              </p>
            </section>

            <section id="prices">
              <h2>2. Prices and payment</h2>
              <p>
                All prices are in <strong>Pakistani Rupees (Rs)</strong> and include any tax that
                applies, unless stated otherwise. Delivery is charged separately and is shown before
                you confirm.
              </p>
              <p>
                The total is always recalculated on our server from the prices held in our catalogue
                at the moment you order. A price shown in your browser from an older page — or one
                altered in it — is never the price charged.
              </p>
              <p>
                We accept cash on delivery and the payment methods offered at checkout. If a payment
                fails or is reversed we may hold or cancel the order.
              </p>
            </section>

            <section id="stock">
              <h2>3. Stock and product information</h2>
              <p>
                Stock is reserved when your order is placed. Items that sell out are removed from the
                store until they are back in, so a product you saw earlier may no longer appear.
              </p>
              <p>
                We describe products as accurately as we can, but photographs are illustrative —
                colours in particular can vary between screens. Where a product offers a colour
                choice, the colour you select at checkout is the one we send.
              </p>
            </section>

            <section id="delivery">
              <h2>4. Delivery</h2>
              <p>
                We deliver across Pakistan. Orders are normally dispatched within 24 hours of being
                confirmed, and you can follow the status on the
                <a routerLink="/account/orders">Track order</a> page at any time.
              </p>
              <p>
                Delivery timescales are estimates, not guarantees — they depend on the courier and
                your location. Risk in the goods passes to you on delivery. Please check your parcel
                on arrival and tell us about any damage promptly.
              </p>
            </section>

            <section id="returns">
              <h2>5. Returns and refunds</h2>
              <p>
                You may return most items within <strong>7 days</strong> of delivery, provided they
                are unused, in their original condition and with their packaging. Contact us first so
                we can tell you where to send them.
              </p>
              <p>
                Items damaged in transit or faulty on arrival are replaced free of charge. A change
                of mind on a used item is not accepted. For hygiene reasons some items cannot be
                returned once opened — this is noted on the product page where it applies.
              </p>
              <p>
                Approved refunds are made by the method you paid with, once the item reaches us and
                has been checked.
              </p>
            </section>

            <section id="cancellation">
              <h2>6. Cancelling an order</h2>
              <p>
                You can cancel an order yourself from your account while it is still
                <em>pending</em>. Once it has been confirmed and is being prepared for dispatch it
                can no longer be cancelled online — contact us and we will help if it has not yet
                left us.
              </p>
            </section>

            <section id="accounts">
              <h2>7. Your account</h2>
              <p>
                You are responsible for what happens under your account, so keep your password to
                yourself and tell us if you think someone else has it. You can also order as a guest;
                in that case we keep a reference in your browser so you can track the order, and you
                can recover it with your order number and email.
              </p>
              <p>
                We may suspend an account that is used for fraud, abuse of staff, or to disrupt the
                site.
              </p>
            </section>

            <section id="reviews">
              <h2>8. Reviews and content you post</h2>
              <p>
                Reviews should be your honest experience of the product. Do not post anything
                unlawful, abusive, misleading, or that infringes someone else's rights, and do not
                include personal contact details. We may remove content that breaks this, and by
                posting you allow us to display it on the site.
              </p>
            </section>

            <section id="liability">
              <h2>9. Our liability</h2>
              <p>
                We take care to keep the site and its information accurate and available, but we do
                not promise it will be uninterrupted or error-free.
              </p>
              <p>
                Where a product is faulty or not as described, your legal rights under Pakistani
                consumer law apply in full and nothing here limits them. Beyond that, our liability
                for an order is limited to what you paid for it, and we are not liable for indirect
                or consequential loss.
              </p>
            </section>

            <section id="privacy">
              <h2>10. Your information</h2>
              <p>
                We collect only what we need to take payment, deliver your order and answer your
                questions — your name, contact details and delivery address. We do not sell your
                information. We share it with couriers and payment providers solely to fulfil your
                order.
              </p>
            </section>

            <section id="changes">
              <h2>11. Changes to these terms</h2>
              <p>
                We may update these terms as the shop changes. The version published here when you
                place an order is the version that governs it, so the date at the top matters.
              </p>
            </section>

            <section id="contact">
              <h2>12. Contact</h2>
              <p>Questions about these terms, an order or a return:</p>
              <ul class="contact-list">
                <li><strong>Email</strong> <a [href]="'mailto:' + c.email">{{ c.email }}</a></li>
                <li><strong>Phone</strong> {{ c.phone }}</li>
                <li><strong>Hours</strong> {{ c.hours }}</li>
                <li><strong>Address</strong> {{ c.address }}</li>
              </ul>
              <p><a class="btn btn-primary" routerLink="/contact">Send us a message</a></p>
            </section>
          </article>
        </div>
      </div>
    </section>
  `,
  styles: [`
    .head { margin-bottom: 24px; }
    .head h1 { margin: 0 0 4px; }
    .head .intro { max-width: 70ch; margin: 12px 0 0; }
    .head .intro a { color: var(--ink); text-decoration: underline; }
    .head .intro a:hover { color: var(--brand); }

    .layout { display: grid; grid-template-columns: 250px minmax(0, 1fr); gap: 24px; align-items: start; }
    /* Sticky so the contents stay reachable through a long document. */
    .toc { position: sticky; top: 150px; }
    .toc h2 { font-size: .95rem; margin: 0 0 10px; }
    .toc a { display: block; padding: 5px 0; font-size: .87rem; color: var(--muted); }
    .toc a:hover { color: var(--brand); }

    .body { max-width: 78ch; }
    .body section { scroll-margin-top: 160px; }
    .body section + section { margin-top: 28px; padding-top: 24px; border-top: 1px solid var(--line); }
    .body h2 { font-size: 1.12rem; margin: 0 0 10px; }
    .body p { margin: 0 0 12px; color: #4a5560; line-height: 1.75; }
    .body p:last-child { margin-bottom: 0; }
    .body a { color: var(--ink); text-decoration: underline; }
    .body a:hover { color: var(--brand); }
    .body .btn { text-decoration: none; color: #fff; }
    .contact-list { list-style: none; padding: 0; margin: 0 0 16px; }
    .contact-list li { padding: 6px 0; border-bottom: 1px solid var(--line); color: #4a5560; }
    .contact-list li:last-child { border-bottom: none; }
    .contact-list strong { display: inline-block; min-width: 90px; font-family: var(--font-display); color: var(--ink); }

    @media (max-width: 900px) {
      .layout { grid-template-columns: 1fr; }
      .toc { position: static; }
    }
  `],
})
export class TermsComponent {
  readonly c = CONTACT;
  /** Bump when the clauses change — clause 11 makes this date meaningful. */
  readonly updated = '11 August 2026';

  readonly sections = [
    { n: 1, id: 'orders', title: 'Orders and acceptance' },
    { n: 2, id: 'prices', title: 'Prices and payment' },
    { n: 3, id: 'stock', title: 'Stock and product information' },
    { n: 4, id: 'delivery', title: 'Delivery' },
    { n: 5, id: 'returns', title: 'Returns and refunds' },
    { n: 6, id: 'cancellation', title: 'Cancelling an order' },
    { n: 7, id: 'accounts', title: 'Your account' },
    { n: 8, id: 'reviews', title: 'Reviews and content' },
    { n: 9, id: 'liability', title: 'Our liability' },
    { n: 10, id: 'privacy', title: 'Your information' },
    { n: 11, id: 'changes', title: 'Changes to these terms' },
    { n: 12, id: 'contact', title: 'Contact' },
  ];
}
