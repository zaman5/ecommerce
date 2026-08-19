import { Component, HostListener, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { BannerService } from '../../core/services/api.service';
import { Banner } from '../../core/models/models';
import { ImgFallbackDirective } from '../directives/img-fallback.directive';
import { MediaUrlPipe } from '../pipes/media-url.pipe';

/** How long each slide stays on screen. */
const SLIDE_MS = 5000;

/**
 * A slide with its link already split into the pieces routerLink needs.
 *
 * Precomputed once when the banners arrive rather than in the template: a
 * getter returning a fresh params object on every change-detection pass would
 * hand RouterLink a new reference each time and make it rebuild the href
 * continuously.
 */
interface Slide {
  banner: Banner;
  external: boolean;
  route: string;
  params: Record<string, string>;
}

@Component({
  selector: 'app-hero-banner',
  standalone: true,
  imports: [CommonModule, RouterLink, ImgFallbackDirective, MediaUrlPipe],
  template: `
    @if (slides().length) {
      <section
        class="hero"
        aria-label="Promotions"
        (mouseenter)="pause()"
        (mouseleave)="resume()"
        (focusin)="pause()"
        (focusout)="resume()"
      >
        <div class="container">
          <div class="frame">
            <div class="track" [style.transform]="'translateX(' + (-100 * index()) + '%)'">
              @for (s of slides(); track s.banner._id) {
                <div class="slide" [class.light]="s.banner.theme === 'light'" [attr.aria-hidden]="s !== current()">
                  <img
                    class="shot"
                    [src]="s.banner.image | mediaUrl"
                    [alt]="s.banner.title"
                    appImgFallback
                    [attr.loading]="$first ? 'eager' : 'lazy'"
                  />
                  <div class="copy">
                    <h2>{{ s.banner.title }}</h2>
                    @if (s.banner.subtitle) { <p>{{ s.banner.subtitle }}</p> }

                    <!-- The CTA carries a stretched hit area (see .cta::after),
                         so the whole slide is clickable without nesting one
                         anchor inside another. -->
                    @if (s.external) {
                      <a class="btn btn-primary cta" [href]="s.route" target="_blank" rel="noopener noreferrer"
                        [attr.tabindex]="s === current() ? 0 : -1">{{ s.banner.ctaLabel || 'Shop now' }}</a>
                    } @else {
                      <a class="btn btn-primary cta" [routerLink]="s.route" [queryParams]="s.params"
                        [attr.tabindex]="s === current() ? 0 : -1">{{ s.banner.ctaLabel || 'Shop now' }}</a>
                    }
                  </div>
                </div>
              }
            </div>

            @if (slides().length > 1) {
              <button class="nav prev" (click)="go(index() - 1)" aria-label="Previous banner">‹</button>
              <button class="nav next" (click)="go(index() + 1)" aria-label="Next banner">›</button>

              <div class="dots" role="tablist" aria-label="Choose a banner">
                @for (s of slides(); track s.banner._id) {
                  <button
                    class="dot"
                    [class.on]="$index === index()"
                    role="tab"
                    [attr.aria-selected]="$index === index()"
                    [attr.aria-label]="'Banner ' + ($index + 1) + ': ' + s.banner.title"
                    (click)="go($index)"
                  ></button>
                }
              </div>
            }
          </div>
        </div>
      </section>
    }
  `,
  styles: [`
    .hero { background: var(--cream); padding: 20px 0 6px; }

    /* overflow:hidden clips the off-screen slides; the frame is the window the
       track slides behind. */
    .frame { position: relative; border-radius: var(--radius); overflow: hidden;
      box-shadow: var(--shadow); background: var(--cream-deep); }

    .track { display: flex; transition: transform .55s cubic-bezier(.4, 0, .2, 1); }
    /* Each slide is exactly one frame wide, so the track is N frames long. */
    .slide { position: relative; flex: 0 0 100%; height: clamp(200px, 27vw, 400px); }

    .shot { width: 100%; height: 100%; object-fit: cover; }

    /* Scrim: photos are uploaded by an admin and could be anything, so the text
       gets its own guaranteed contrast rather than trusting the image. */
    .slide::before {
      content: ''; position: absolute; inset: 0; z-index: 1;
      background: linear-gradient(90deg, rgba(28, 24, 22, .82) 0%, rgba(28, 24, 22, .55) 45%, rgba(28, 24, 22, .05) 78%);
    }
    .slide.light::before {
      background: linear-gradient(90deg, rgba(255, 255, 255, .9) 0%, rgba(255, 255, 255, .65) 45%, rgba(255, 255, 255, .1) 78%);
    }

    .copy { position: absolute; z-index: 2; inset: 0; display: flex; flex-direction: column;
      justify-content: center; align-items: flex-start; gap: 10px;
      padding: 0 clamp(20px, 5%, 60px); max-width: 640px; }
    .copy h2 { font-size: clamp(1.3rem, 2.6vw, 2.4rem); margin: 0; color: #fff; }
    .copy p { margin: 0; color: rgba(255, 255, 255, .92); font-size: clamp(.86rem, 1.2vw, 1.05rem);
      max-width: 46ch; }
    .slide.light .copy h2 { color: var(--ink); }
    .slide.light .copy p { color: #4a5560; }
    .cta { margin-top: 6px; }
    /* Stretched hit area — makes the entire slide clickable. Sits below the
       arrows and dots (z-index 3) so those still take their own clicks. */
    .cta::after { content: ''; position: absolute; inset: 0; z-index: 1; }

    .nav {
      position: absolute; top: 50%; transform: translateY(-50%); z-index: 3;
      width: 42px; height: 42px; border-radius: 50%;
      border: 1px solid var(--line); background: rgba(255, 255, 255, .94);
      box-shadow: var(--shadow-sm); color: var(--ink);
      font-family: var(--font-display); font-size: 1.7rem; line-height: 1;
      display: grid; place-items: center; cursor: pointer; padding-bottom: 4px;
      opacity: 0; transition: opacity .18s ease, background .15s ease, transform .12s ease;
    }
    /* Revealed on hover like the product rails, and always for keyboard users. */
    .frame:hover .nav, .nav:focus-visible { opacity: 1; }
    .nav:hover { background: #fff; color: var(--brand-dark); }
    .nav:active { transform: translateY(-50%) scale(.94); }
    .nav:focus-visible { outline: 3px solid var(--brand); outline-offset: 2px; }
    .nav.prev { left: 14px; }
    .nav.next { right: 14px; }

    .dots { position: absolute; z-index: 3; left: 0; right: 0; bottom: 14px;
      display: flex; justify-content: center; gap: 8px; }
    .dot { width: 9px; height: 9px; padding: 0; border-radius: 999px; cursor: pointer;
      border: none; background: rgba(255, 255, 255, .55);
      box-shadow: 0 1px 3px rgba(0, 0, 0, .3);
      transition: width .2s ease, background .2s ease; }
    .dot.on { width: 26px; background: #fff; }
    .dot:focus-visible { outline: 2px solid #fff; outline-offset: 2px; }

    @media (max-width: 720px) {
      .hero { padding: 12px 0 4px; }
      .copy { max-width: none; }
      /* Arrows would sit on top of the text on a narrow slide; the dots and a
         swipe-sized target are enough. */
      .nav { display: none; }
    }

    @media (prefers-reduced-motion: reduce) {
      .track { transition: none; }
    }
  `],
})
export class HeroBannerComponent implements OnInit, OnDestroy {
  slides = signal<Slide[]>([]);
  index = signal(0);

  private timer?: ReturnType<typeof setInterval>;
  /** True while the pointer is over the banner or focus is inside it. */
  private hovered = false;

  constructor(private banners: BannerService) {}

  ngOnInit() {
    this.banners.list().subscribe({
      next: (list) => {
        this.slides.set(list.map((b) => this.toSlide(b)));
        this.start();
      },
      // A banner is decoration — if the request fails the page carries on
      // without it rather than showing an error where a promo should be.
      error: () => this.slides.set([]),
    });
  }

  ngOnDestroy() {
    this.stop();
  }

  current(): Slide | undefined {
    return this.slides()[this.index()];
  }

  /** Wraps at both ends, so the arrows never dead-end. */
  go(to: number) {
    const n = this.slides().length;
    if (!n) return;
    this.index.set(((to % n) + n) % n);
    // Restart the clock so a slide the user just chose gets its full turn.
    this.start();
  }

  pause() {
    this.hovered = true;
    this.stop();
  }

  resume() {
    this.hovered = false;
    this.start();
  }

  /** A background tab still fires intervals; advancing there just burns work. */
  @HostListener('document:visibilitychange')
  onVisibility() {
    if (document.hidden) this.stop();
    else if (!this.hovered) this.start();
  }

  private start() {
    this.stop();
    if (this.slides().length < 2 || this.hovered || document.hidden) return;
    // Someone who has asked for reduced motion gets a static first slide and
    // the controls, never a carousel that moves on its own.
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    this.timer = setInterval(() => this.go(this.index() + 1), SLIDE_MS);
  }

  private stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
  }

  /** Splits "/shop?deals=true" into the route and params routerLink expects. */
  private toSlide(banner: Banner): Slide {
    const link = (banner.link || '/shop').trim();
    if (/^(https?:)?\/\//i.test(link)) {
      return { banner, external: true, route: link, params: {} };
    }
    const [path, qs] = link.split('?');
    const params: Record<string, string> = {};
    if (qs) new URLSearchParams(qs).forEach((v, k) => (params[k] = v));
    return { banner, external: false, route: path || '/', params };
  }
}
