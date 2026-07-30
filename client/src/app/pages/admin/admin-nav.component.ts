import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-admin-nav',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <div class="admin-nav">
      <a routerLink="/admin" routerLinkActive="active" [routerLinkActiveOptions]="{exact:true}">📊 Dashboard</a>
      <a routerLink="/admin/products" routerLinkActive="active">📦 Products</a>
      <a routerLink="/admin/orders" routerLinkActive="active">🧾 Orders</a>
      <a routerLink="/admin/analytics" routerLinkActive="active">📈 Analytics</a>
    </div>
  `,
  styles: [`
    .admin-nav { display:flex; gap:8px; flex-wrap:wrap; background:#fff; padding:8px; border-radius:999px; box-shadow: var(--shadow-sm); border:1px solid var(--line); margin-bottom:26px; width:fit-content; }
    .admin-nav a { font-family: var(--font-display); font-weight:600; padding:9px 18px; border-radius:999px; color: var(--muted); white-space:nowrap; }
    .admin-nav a.active { background: var(--coral); color:#fff; }
    .admin-nav a:hover:not(.active) { background: var(--cream); color: var(--ink); }
    @media (max-width:560px){ .admin-nav { width:100%; overflow-x:auto; } }
  `],
})
export class AdminNavComponent {}
