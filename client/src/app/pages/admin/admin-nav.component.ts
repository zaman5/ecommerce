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
      <a routerLink="/admin/categories" routerLinkActive="active">🏷️ Categories</a>
      <!-- Flash Sale settings are reached from a product's Flash Sale toggle,
           which is where the decision to run one actually gets made. -->
      <a routerLink="/admin/banners" routerLinkActive="active">🖼️ Banners</a>
      <a routerLink="/admin/orders" routerLinkActive="active">🧾 Orders</a>
      <a routerLink="/admin/jazzcash" routerLinkActive="active">📱 JazzCash</a>
      <a routerLink="/admin/emails" routerLinkActive="active">📧 Emails</a>
      <a routerLink="/admin/messages" routerLinkActive="active">✉️ Messages</a>
      <a routerLink="/admin/analytics" routerLinkActive="active">📈 Analytics</a>
      <a routerLink="/admin/shop-managers" routerLinkActive="active">👥 Shop Managers</a>
    </div>
  `,
  styles: [`
    .admin-nav { 
      display: flex; gap: 8px; background: #fff; padding: 8px; border-radius: 999px; 
      box-shadow: var(--shadow-sm); border: 1px solid var(--line); margin-bottom: 26px; 
      width: fit-content; max-width: 100%; overflow-x: auto; -webkit-overflow-scrolling: touch; 
      scrollbar-width: none; 
    }
    .admin-nav::-webkit-scrollbar { display: none; }
    .admin-nav a { 
      font-family: var(--font-display); font-weight: 600; padding: 9px 18px; 
      border-radius: 999px; color: var(--muted); white-space: nowrap; flex-shrink: 0; 
      font-size: .92rem;
    }
    .admin-nav a.active { 
      background: #fff; color: var(--brand); box-shadow: var(--shadow-sm); 
      border: 1px solid var(--brand); padding: 8px 17px; 
    }
    .admin-nav a:hover:not(.active) { background: var(--cream); color: var(--ink); }
    @media (max-width: 900px) { 
      .admin-nav { width: 100%; border-radius: 16px; padding: 6px; gap: 6px; } 
      .admin-nav a { padding: 7px 14px; font-size: .85rem; }
    }
  `],
})
export class AdminNavComponent {}
