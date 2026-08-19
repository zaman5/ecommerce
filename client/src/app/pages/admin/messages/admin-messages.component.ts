import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MessageService } from '../../../core/services/api.service';
import { ContactMessage } from '../../../core/models/models';
import { AdminNavComponent } from '../admin-nav.component';

@Component({
  selector: 'app-admin-messages',
  standalone: true,
  imports: [CommonModule, AdminNavComponent],
  template: `
    <section class="section">
      <div class="container">
        <app-admin-nav />

        <div class="head">
          <div>
            <h1>Messages</h1>
            <p class="text-muted">
              Sent through the Contact us page.
              @if (unread() > 0) {
                <strong>{{ unread() }} unread</strong> of {{ items().length }} shown.
              } @else {
                All caught up — {{ items().length }} message{{ items().length === 1 ? '' : 's' }}.
              }
            </p>
          </div>
          <div class="filters">
            <button class="pill" [class.on]="filter() === 'all'" (click)="setFilter('all')">All</button>
            <button class="pill" [class.on]="filter() === 'unread'" (click)="setFilter('unread')">
              Unread @if (unread() > 0) { <span class="badge">{{ unread() }}</span> }
            </button>
          </div>
        </div>

        @if (loading()) { <div class="spinner"></div> }
        @else if (!items().length) {
          <div class="card card-pad center">
            <div class="empty-ico">📭</div>
            <p class="text-muted">
              {{ filter() === 'unread' ? 'Nothing unread.' : 'No messages yet.' }}
            </p>
          </div>
        } @else {
          <div class="list">
            @for (m of items(); track m._id) {
              <article class="msg card" [class.unread]="!m.isRead">
                <header class="msg-head" (click)="toggleOpen(m)">
                  <span class="dot" [class.on]="!m.isRead" [attr.aria-label]="m.isRead ? 'Read' : 'Unread'"></span>
                  <div class="who">
                    <strong>{{ m.subject }}</strong>
                    <span class="from">
                      {{ m.name }} · {{ m.email }}
                      @if (m.user) { <span class="tag-acct">account</span> }
                      @if (m.orderNumber) { <span class="tag-order">{{ m.orderNumber }}</span> }
                    </span>
                  </div>
                  <time [attr.datetime]="m.createdAt">{{ m.createdAt | date: 'd MMM, HH:mm' }}</time>
                  <span class="chev">{{ isOpen(m) ? '▴' : '▾' }}</span>
                </header>

                @if (isOpen(m)) {
                  <div class="msg-body">
                    <p class="text">{{ m.body }}</p>
                    <div class="msg-actions">
                      <a class="btn btn-primary btn-sm" [href]="replyLink(m)">✉️ Reply by email</a>
                      <button class="btn btn-ghost btn-sm" (click)="setRead(m, !m.isRead)">
                        {{ m.isRead ? 'Mark unread' : 'Mark read' }}
                      </button>
                      <button class="btn btn-ghost btn-sm danger" (click)="remove(m)">Delete</button>
                    </div>
                  </div>
                }
              </article>
            }
          </div>
        }
      </div>
    </section>
  `,
  styles: [`
    .head { display:flex; justify-content:space-between; align-items:flex-start; gap:16px; flex-wrap:wrap; margin-bottom:20px; }
    .head h1 { margin:0 0 4px; }
    .filters { display:flex; gap:8px; }
    .pill { border:1px solid var(--line); background:#fff; border-radius:999px; padding:8px 16px; cursor:pointer;
      font-family: var(--font-display); font-weight:600; font-size:.88rem; color: var(--muted); }
    .pill.on { background:#fff; border-color: var(--brand); color: var(--brand); box-shadow: var(--shadow-sm); }
    /* Was a translucent white pip, which only worked while the active pill had a
       solid blue fill behind it. On the white pill it needs its own tint. */
    .pill .badge { background: var(--accent-soft); color: var(--accent-dark); border-radius:999px; padding:1px 7px; margin-left:5px; font-size:.78rem; }
    .pill:not(.on) .badge { background: var(--accent); color:#fff; }

    .empty-ico { font-size:2.4rem; }
    .list { display:flex; flex-direction:column; gap:10px; }
    .msg { overflow:hidden; }
    /* An unread message gets a coral spine — scannable down a long list. */
    .msg.unread { border-left:4px solid var(--accent); }

    .msg-head { display:flex; align-items:center; gap:12px; padding:14px 18px; cursor:pointer; }
    .msg-head:hover { background: var(--cream); }
    .dot { width:9px; height:9px; border-radius:50%; background: transparent; border:1px solid var(--line); flex:none; }
    .dot.on { background: var(--accent); border-color: var(--accent); }
    .who { flex:1; min-width:0; display:flex; flex-direction:column; gap:2px; }
    .who strong { font-family: var(--font-display); }
    .from { font-size:.82rem; color: var(--muted); display:flex; align-items:center; gap:7px; flex-wrap:wrap; }
    .tag-acct, .tag-order { font-size:.68rem; font-weight:800; border-radius:999px; padding:1px 8px; }
    .tag-acct { background: var(--soft); color:var(--ink); }
    .tag-order { background:#fff0d6; color:#a9721f; }
    time { font-size:.8rem; color: var(--muted); white-space:nowrap; }
    .chev { color: var(--muted); font-size:.8rem; }

    .msg-body { padding:0 18px 16px 39px; border-top:1px solid var(--line); }
    /* pre-wrap: the sender's line breaks are part of what they wrote. */
    .text { white-space:pre-wrap; margin:14px 0 0; color:#4a5560; line-height:1.7; overflow-wrap:anywhere; }
    .msg-actions { display:flex; gap:8px; margin-top:16px; flex-wrap:wrap; }
    .msg-actions .btn { text-decoration:none; }
    .danger { color: var(--danger); }
    .danger:hover { border-color: var(--danger); color: var(--danger); }

    @media (max-width:640px) {
      .msg-head { flex-wrap:wrap; }
      time { order:3; }
      .msg-body { padding-left:18px; }
    }
  `],
})
export class AdminMessagesComponent implements OnInit {
  items = signal<ContactMessage[]>([]);
  unread = signal(0);
  loading = signal(true);
  filter = signal<'all' | 'unread'>('all');
  private open = signal<Set<string>>(new Set());

  constructor(private svc: MessageService) {}

  ngOnInit() { this.reload(); }

  reload() {
    this.loading.set(true);
    this.svc.list(this.filter() === 'unread' ? 'unread' : undefined).subscribe({
      next: (r) => { this.items.set(r.items); this.unread.set(r.unread); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  setFilter(f: 'all' | 'unread') {
    if (this.filter() === f) return;
    this.filter.set(f);
    this.reload();
  }

  isOpen(m: ContactMessage) { return this.open().has(m._id); }

  /** Opening a message marks it read, the way an inbox does. */
  toggleOpen(m: ContactMessage) {
    const next = new Set(this.open());
    if (next.has(m._id)) {
      next.delete(m._id);
    } else {
      next.add(m._id);
      if (!m.isRead) this.setRead(m, true);
    }
    this.open.set(next);
  }

  setRead(m: ContactMessage, isRead: boolean) {
    this.svc.setRead(m._id, isRead).subscribe({
      next: () => {
        // Patch in place rather than reloading: under the "unread" filter a
        // reload would yank the message out from under the pointer the instant
        // it was opened.
        this.items.update((list) => list.map((x) => (x._id === m._id ? { ...x, isRead } : x)));
        this.unread.update((n) => Math.max(0, n + (isRead ? -1 : 1)));
      },
      error: (err) => alert(err.error?.message || 'Could not update that message.'),
    });
  }

  /** Pre-fills a reply in whatever mail client the admin uses. */
  replyLink(m: ContactMessage): string {
    const subject = `Re: ${m.subject}`;
    const intro = `\n\n\n--- You wrote on ${new Date(m.createdAt).toLocaleString()} ---\n${m.body}`;
    return `mailto:${encodeURIComponent(m.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(intro)}`;
  }

  remove(m: ContactMessage) {
    if (!confirm(`Delete the message from ${m.name}? This cannot be undone.`)) return;
    this.svc.remove(m._id).subscribe({
      next: () => this.reload(),
      error: (err) => alert(err.error?.message || 'Could not delete that message.'),
    });
  }
}
