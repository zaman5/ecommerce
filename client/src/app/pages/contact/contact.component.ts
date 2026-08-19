import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MessageService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';

/**
 * Where to reach the shop. Kept together at the top so there is one place to
 * change when the real details are known — they also appear in the Terms page's
 * contact clause.
 */
export const CONTACT = {
  email: 'support@wondercart.pk',
  phone: '+92 300 1234567',
  whatsapp: '+92 300 1234567',
  hours: 'Monday to Saturday, 9am – 6pm (PKT)',
  address: 'Wondercart, Gulberg III, Lahore, Pakistan',
  replyWithin: 'one working day',
};

@Component({
  selector: 'app-contact',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  template: `
    <section class="section">
      <div class="container">
        <div class="head">
          <h1>Contact us</h1>
          <p class="text-muted">
            Questions about an order, a product or a return — send us a message and we'll reply
            by email within {{ c.replyWithin }}.
          </p>
        </div>

        <div class="layout">
          <!-- ---------- form ---------- -->
          <div class="card card-pad form-card">
            @if (sent()) {
              <div class="done">
                <div class="tick">✅</div>
                <h2>Message sent</h2>
                <p class="text-muted">{{ sentMessage() }}</p>
                <p class="text-muted ref">Reference: <code>{{ reference() }}</code></p>
                <div class="done-actions">
                  <a class="btn btn-ghost" routerLink="/shop">Keep shopping</a>
                  <button class="btn btn-primary" (click)="writeAnother()">Write another</button>
                </div>
              </div>
            } @else {
              <h2>Send us a message</h2>
              @if (error()) { <div class="alert alert-error">{{ error() }}</div> }

              <div class="two">
                <div class="field">
                  <label for="c-name">Your name</label>
                  <input id="c-name" class="input" [(ngModel)]="form.name" name="name" autocomplete="name" />
                </div>
                <div class="field">
                  <label for="c-email">Email</label>
                  <input id="c-email" class="input" type="email" [(ngModel)]="form.email" name="email"
                    autocomplete="email" placeholder="you@example.com" />
                </div>
              </div>

              <div class="two">
                <div class="field">
                  <label for="c-subject">Subject</label>
                  <input id="c-subject" class="input" [(ngModel)]="form.subject" name="subject"
                    placeholder="e.g. Where is my order?" />
                </div>
                <div class="field">
                  <label for="c-order">Order number <span class="hint">— optional</span></label>
                  <input id="c-order" class="input" [(ngModel)]="form.orderNumber" name="orderNumber"
                    placeholder="e.g. WC-10234" />
                </div>
              </div>

              <div class="field">
                <label for="c-body">Message</label>
                <textarea id="c-body" class="input msg" rows="6" [(ngModel)]="form.body" name="body"
                  placeholder="Tell us what you need help with…"></textarea>
                <p class="hint counter" [class.over]="form.body.length > 4000">
                  {{ form.body.length }} / 4000
                </p>
              </div>

              <button class="btn btn-primary btn-block" [disabled]="sending()" (click)="submit()">
                {{ sending() ? 'Sending…' : 'Send message' }}
              </button>
              <p class="hint legal">
                By sending this you agree to our <a routerLink="/terms">Terms &amp; Conditions</a>.
                We use your email only to reply.
              </p>
            }
          </div>

          <!-- ---------- details ---------- -->
          <aside class="card card-pad side">
            <h2>Other ways to reach us</h2>

            <div class="line">
              <span class="ico">✉️</span>
              <div>
                <strong>Email</strong>
                <a [href]="'mailto:' + c.email">{{ c.email }}</a>
              </div>
            </div>
            <div class="line">
              <span class="ico">📞</span>
              <div>
                <strong>Phone</strong>
                <a [href]="'tel:' + c.phone.replace(' ', '')">{{ c.phone }}</a>
              </div>
            </div>
            <div class="line">
              <span class="ico">💬</span>
              <div>
                <strong>WhatsApp</strong>
                <span>{{ c.whatsapp }}</span>
              </div>
            </div>
            <div class="line">
              <span class="ico">⏰</span>
              <div><strong>Hours</strong><span>{{ c.hours }}</span></div>
            </div>
            <div class="line">
              <span class="ico">📍</span>
              <div><strong>Address</strong><span>{{ c.address }}</span></div>
            </div>

            <div class="tip">
              <strong>Chasing an order?</strong>
              <p>
                You can see its live status yourself on the
                <a routerLink="/account/orders">Track order</a> page — that's usually faster than
                waiting for a reply.
              </p>
            </div>
          </aside>
        </div>
      </div>
    </section>
  `,
  styles: [`
    .head { margin-bottom: 24px; }
    .head h1 { margin: 0 0 6px; }
    .head p { margin: 0; max-width: 60ch; }
    .layout { display: grid; grid-template-columns: minmax(0, 1.4fr) minmax(0, 1fr); gap: 24px; align-items: start; }
    .form-card h2, .side h2 { font-size: 1.15rem; margin: 0 0 16px; }
    .two { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
    .hint { font-weight: 600; color: var(--muted); font-size: .82rem; }
    .msg { min-height: 150px; }
    .counter { text-align: right; margin: 4px 0 0; }
    .counter.over { color: var(--danger); }
    .legal { margin: 12px 0 0; text-align: center; }
    .legal a { color: var(--ink); text-decoration: underline; }
    .legal a:hover { color: var(--brand); }

    .side .line { display: flex; gap: 12px; padding: 12px 0; border-bottom: 1px solid var(--line); }
    .side .line:last-of-type { border-bottom: none; }
    .side .ico { font-size: 1.2rem; line-height: 1.4; }
    .side .line strong { display: block; font-family: var(--font-display); font-size: .92rem; }
    .side .line a, .side .line span { color: var(--muted); font-size: .9rem; }
    .side .line a:hover { color: var(--brand); text-decoration: underline; }
    .tip { background: var(--soft); border-radius: var(--radius-sm); padding: 14px 16px; margin-top: 16px; }
    .tip strong { font-family: var(--font-display); }
    .tip p { margin: 4px 0 0; font-size: .88rem; color: var(--ink); }
    .tip a { color: var(--ink); text-decoration: underline; font-weight: 700; }

    .done { text-align: center; padding: 26px 0; }
    .done .tick { font-size: 2.6rem; }
    .done h2 { margin: 8px 0; }
    .done .ref code { font-size: .8rem; }
    .done-actions { display: flex; gap: 10px; justify-content: center; margin-top: 18px; flex-wrap: wrap; }

    @media (max-width: 900px) { .layout { grid-template-columns: 1fr; } }
    @media (max-width: 560px) { .two { grid-template-columns: 1fr; } }
  `],
})
export class ContactComponent implements OnInit {
  readonly c = CONTACT;

  form = { name: '', email: '', subject: '', orderNumber: '', body: '' };
  sending = signal(false);
  sent = signal(false);
  sentMessage = signal('');
  reference = signal('');
  error = signal('');

  constructor(private messages: MessageService, private auth: AuthService) {}

  ngOnInit() {
    // Save a signed-in customer retyping what we already know.
    const u = this.auth.user();
    if (u) {
      this.form.name = u.name || '';
      this.form.email = u.email || '';
    }
  }

  submit() {
    const f = this.form;
    if (!f.name.trim()) { this.error.set('Please tell us your name.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.email.trim())) {
      this.error.set('Please enter an email address we can reply to.');
      return;
    }
    if (!f.subject.trim()) { this.error.set('Please add a subject.'); return; }
    if (f.body.trim().length < 10) {
      this.error.set('Please write a little more so we can help.');
      return;
    }

    this.error.set('');
    this.sending.set(true);
    this.messages.send({ ...f, name: f.name.trim(), email: f.email.trim() }).subscribe({
      next: (r) => {
        this.sentMessage.set(r.message);
        this.reference.set(r.reference);
        this.sent.set(true);
        this.sending.set(false);
      },
      error: (err) => {
        // 429 carries its own wording about waiting — show whatever the API said.
        this.error.set(err.error?.message || 'Could not send that message. Please try again.');
        this.sending.set(false);
      },
    });
  }

  writeAnother() {
    const u = this.auth.user();
    this.form = {
      name: u?.name || '', email: u?.email || '',
      subject: '', orderNumber: '', body: '',
    };
    this.sent.set(false);
    this.error.set('');
  }
}
