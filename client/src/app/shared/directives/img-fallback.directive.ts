import { Directive, ElementRef, HostListener, Input } from '@angular/core';

// Inline SVG placeholder. Deliberately a data URI rather than a URL to an image
// host: product photos come from third-party CDNs that retire URLs over time,
// and the fallback itself must never be able to 404.
export const FALLBACK_IMAGE =
  'data:image/svg+xml;charset=UTF-8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
       <rect width="400" height="400" fill="#e9eef9"/>
       <text x="200" y="188" font-size="64" text-anchor="middle">🎒</text>
       <text x="200" y="238" font-size="20" text-anchor="middle"
             fill="#7d8a97" font-family="system-ui, sans-serif">Wondercart</text>
     </svg>`
  );

/**
 * Swaps in a placeholder when an image fails to load or has no source at all.
 *
 *   <img [src]="product.images[0]" appImgFallback />
 *
 * Without this, a dead image URL renders as the raw alt text, which looks broken.
 */
@Directive({
  selector: 'img[appImgFallback]',
  standalone: true,
})
export class ImgFallbackDirective {
  /** Optional custom placeholder; defaults to the inline Wondercart SVG. */
  @Input() appImgFallback: string | '' = '';

  constructor(private el: ElementRef<HTMLImageElement>) {}

  private get fallback(): string {
    return this.appImgFallback || FALLBACK_IMAGE;
  }

  @HostListener('error')
  onError() {
    const img = this.el.nativeElement;
    // Guard against an infinite error loop if the fallback itself misbehaves.
    if (img.src !== this.fallback) img.src = this.fallback;
  }
}
