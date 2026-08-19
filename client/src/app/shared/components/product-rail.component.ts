import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnChanges,
  OnDestroy,
  ViewChild,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Product } from '../../core/models/models';
import { ProductCardComponent } from './product-card.component';

/**
 * A horizontally scrolling strip of product cards with Netflix-style arrows.
 *
 * The native scrollbar is hidden — the arrows are the control — so the row
 * still scrolls by swipe, trackpad and keyboard, it just doesn't show a bar
 * under the cards. Arrows appear only in the direction there is more to see.
 */
@Component({
  selector: 'app-product-rail',
  standalone: true,
  imports: [CommonModule, ProductCardComponent],
  template: `
    <div class="rail-wrap">
      <button
        class="rail-nav prev"
        [class.show]="canPrev()"
        [attr.tabindex]="canPrev() ? 0 : -1"
        (click)="page(-1)"
        aria-label="Scroll back"
      >‹</button>

      <div class="rail" #track (scroll)="sync()">
        @for (p of products; track p._id) {
          <div class="rail-item"><app-product-card [product]="p" [dense]="true" /></div>
        }
      </div>

      <button
        class="rail-nav next"
        [class.show]="canNext()"
        [attr.tabindex]="canNext() ? 0 : -1"
        (click)="page(1)"
        aria-label="Scroll forward"
      >›</button>
    </div>
  `,
  styles: [`
    .rail-wrap { position: relative; }

    /* Column count comes from --listing-cols in styles.css so the rail steps in
       time with the grids elsewhere on the page. */
    .rail { --rail-gap: 12px; --rail-cols: var(--listing-cols);
      display: flex; gap: var(--rail-gap); overflow-x: auto; }
    /* Hide the scrollbar in every engine — the arrows replace it. Firefox and
       old Edge need their own property; the bar is still scrollable, just not
       painted, so touch and trackpad are unaffected. */
    .rail { scrollbar-width: none; -ms-overflow-style: none; }
    .rail::-webkit-scrollbar { display: none; }
    .rail-item { flex: 0 0 calc((100% - (var(--rail-cols) - 1) * var(--rail-gap)) / var(--rail-cols)); }

    .rail-nav {
      position: absolute; top: 50%; transform: translateY(-50%);
      width: 42px; height: 42px; border-radius: 50%;
      border: 1px solid var(--line); background: rgba(255, 255, 255, .96);
      box-shadow: var(--shadow); color: var(--ink);
      font-family: var(--font-display); font-size: 1.7rem; line-height: 1;
      display: grid; place-items: center; cursor: pointer; z-index: 3;
      padding-bottom: 4px; /* optically centres the chevron glyph */
      /* Hidden until there is somewhere to go in that direction. visibility
         rather than display:none so the fade has something to animate. */
      opacity: 0; visibility: hidden;
      transition: opacity .18s ease, visibility .18s ease, background .15s ease, transform .12s ease;
    }
    .rail-nav.show { opacity: 1; visibility: visible; }
    .rail-nav:hover { background: #fff; color: var(--brand-dark); }
    .rail-nav:active { transform: translateY(-50%) scale(.94); }
    .rail-nav:focus-visible { outline: 3px solid var(--brand); outline-offset: 2px; }
    /* -6px tucks them just past the cards without escaping the container's
       padding, so they can never widen the page. */
    .rail-nav.prev { left: -6px; }
    .rail-nav.next { right: -6px; }

    @media (max-width: 560px) { .rail { --rail-gap: 10px; } }

    /* Touch devices swipe the row directly; the arrows would only cover a card. */
    @media (hover: none) and (pointer: coarse) {
      .rail-nav { display: none; }
    }
  `],
})
export class ProductRailComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input({ required: true }) products: Product[] = [];
  @ViewChild('track') private track!: ElementRef<HTMLDivElement>;

  canPrev = signal(false);
  canNext = signal(false);

  private ro?: ResizeObserver;

  ngAfterViewInit() {
    this.sync();
    // Catches breakpoint changes: fewer columns means wider cards, which can
    // turn a scrollable rail into one that already fits.
    this.ro = new ResizeObserver(() => this.sync());
    this.ro.observe(this.track.nativeElement);
  }

  /** Products arrive from the API after first render, so re-measure once the
   *  new cards are actually in the DOM. */
  ngOnChanges() {
    setTimeout(() => this.track && this.sync());
  }

  ngOnDestroy() {
    this.ro?.disconnect();
  }

  /** Advance by whole cards — scrolling by the raw viewport width would drift
   *  out of alignment by one gap per page and leave slivers on screen. */
  page(direction: 1 | -1) {
    const el = this.track.nativeElement;
    const step = this.step(el);
    const perPage = Math.max(1, Math.round(el.clientWidth / step));
    el.scrollBy({ left: direction * perPage * step, behavior: 'smooth' });
  }

  sync() {
    const el = this.track?.nativeElement;
    if (!el) return;
    // 1px of slack: fractional card widths mean scrollLeft rarely hits the
    // maximum exactly, which would otherwise leave the forward arrow showing.
    this.canPrev.set(el.scrollLeft > 1);
    this.canNext.set(el.scrollLeft < el.scrollWidth - el.clientWidth - 1);
  }

  /** One card plus one gap. */
  private step(el: HTMLElement): number {
    const item = el.querySelector<HTMLElement>('.rail-item');
    if (!item) return el.clientWidth;
    const gap = parseFloat(getComputedStyle(el).columnGap) || 0;
    return item.getBoundingClientRect().width + gap;
  }
}
