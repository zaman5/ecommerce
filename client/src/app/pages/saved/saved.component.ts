import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { SavedService } from '../../core/services/saved.service';
import { FALLBACK_IMAGE, ImgFallbackDirective } from '../../shared/directives/img-fallback.directive';
import { MediaUrlPipe } from '../../shared/pipes/media-url.pipe';

@Component({
  selector: 'app-saved',
  standalone: true,
  imports: [CommonModule, RouterLink, ImgFallbackDirective, MediaUrlPipe],
  template: `
    <section class="head">
      <div class="container">
        <h1>Saved items</h1>
        <p class="text-muted">{{ saved.count() }} item{{ saved.count() === 1 ? '' : 's' }} on your watchlist.</p>
      </div>
    </section>

    <section class="section">
      <div class="container">
        @if (saved.count() === 0) {
          <div class="empty card card-pad center">
            <div style="font-size:2.5rem">♡</div>
            <h3>Nothing saved yet</h3>
            <p class="text-muted">Tap the heart on any product to keep it here for later.</p>
            <a routerLink="/shop" class="btn btn-primary">Browse products</a>
          </div>
        } @else {
          <div class="saved-list">
            @for (i of saved.items(); track i.product) {
              <div class="srow card">
                <a [routerLink]="['/product', i.slug]" class="sthumb">
                  <img [src]="(i.image | mediaUrl) || fallback" [alt]="i.name" appImgFallback />
                </a>
                <div class="sbody">
                  <a [routerLink]="['/product', i.slug]" class="sname">{{ i.name }}</a>
                  <div class="sprice">
                    <span class="price">Rs {{ i.price | number }}</span>
                    @if (i.compareAtPrice > i.price) {
                      <span class="strike">Rs {{ i.compareAtPrice | number }}</span>
                    }
                  </div>
                </div>
                <button class="btn btn-ghost btn-sm" (click)="saved.remove(i.product)">Remove</button>
              </div>
            }
          </div>
          <div class="foot">
            <a routerLink="/shop" class="btn btn-ghost">Keep shopping</a>
            <button class="btn btn-ghost btn-sm" (click)="saved.clear()">Clear all</button>
          </div>
        }
      </div>
    </section>
  `,
  styles: [`
    .head { background: var(--soft); padding: 34px 0; }
    .head h1 { font-size: 2.2rem; margin: 0; }
    .empty { padding: 60px 20px; display: flex; flex-direction: column; align-items: center; gap: 10px; }
    .saved-list { display: flex; flex-direction: column; gap: 14px; }
    .srow { display: flex; align-items: center; gap: 16px; padding: 14px; }
    .sthumb { width: 84px; height: 84px; flex: none; border-radius: var(--radius-sm); overflow: hidden; background: var(--cream-deep); }
    .sthumb img { width: 100%; height: 100%; object-fit: cover; }
    .sbody { flex: 1; min-width: 0; }
    .sname { font-family: var(--font-display); font-weight: 600; color: var(--ink); }
    .sname:hover { color: var(--brand); }
    .sprice { margin-top: 4px; display: flex; align-items: baseline; gap: 8px; }
    .foot { display: flex; align-items: center; justify-content: space-between; margin-top: 26px; }
    @media (max-width: 620px) {
      .srow { flex-wrap: wrap; }
      .sbody { flex-basis: calc(100% - 100px); }
    }
  `],
})
export class SavedComponent {
  fallback = FALLBACK_IMAGE;
  constructor(public saved: SavedService) {}
}
