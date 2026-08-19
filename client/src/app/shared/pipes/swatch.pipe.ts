import { Pipe, PipeTransform } from '@angular/core';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';

const HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

/**
 * Renders a colour swatch as an SVG image rather than a CSS background.
 *
 * On a swatch the colour *is* the content, and "auto dark mode" (Chrome's, and
 * extensions like Dark Reader) rewrites background colours — which collapses
 * every swatch to the same grey and makes the picker unusable. Image content is
 * left alone by those engines, so the colour survives.
 */
@Pipe({ name: 'swatch', standalone: true })
export class SwatchPipe implements PipeTransform {
  constructor(private sanitizer: DomSanitizer) {}

  transform(hex: string | undefined | null): SafeUrl {
    // The hex reaches us from admin-entered data, so anything that isn't a
    // plain colour literal is replaced rather than interpolated into the SVG.
    const safe = HEX.test((hex || '').trim()) ? (hex as string).trim() : '#cccccc';
    const svg =
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10">` +
      `<circle cx="5" cy="5" r="5" fill="${safe}"/></svg>`;
    return this.sanitizer.bypassSecurityTrustUrl(`data:image/svg+xml,${encodeURIComponent(svg)}`);
  }
}
