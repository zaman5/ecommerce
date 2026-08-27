import { Component, HostListener, OnDestroy, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { BannerService } from '../../core/services/api.service';
import { Banner } from '../../core/models/models';
import { ImgFallbackDirective } from '../directives/img-fallback.directive';
import { MediaUrlPipe } from '../pipes/media-url.pipe';

const SLIDE_MS = 5000;

interface Slide {
  banner: Banner;
  external: boolean;
  route: string;
  params: Record<string, string>;
}

const FALLBACK_SLIDES: Slide[] = [
  {
    banner: {
      _id: 'default-1',
      title: 'Back to School 2024',
      subtitle: 'Premium bags, smart stationery & leakproof lunch sets for every grade.',
      image: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=1200&q=80',
      ctaLabel: 'Shop School Deals',
      link: '/shop?category=school-essentials',
      theme: 'dark',
      order: 1,
      isActive: true,
    },
    external: false,
    route: '/shop',
    params: { category: 'school-essentials' },
  },
  {
    banner: {
      _id: 'default-2',
      title: 'Play, Learn & Grow',
      subtitle: 'Exciting educational toys and sensory activities for curious minds.',
      image: 'https://images.unsplash.com/photo-1596461404969-9ae70f2830c1?auto=format&fit=crop&w=1200&q=80',
      ctaLabel: 'Explore Toys',
      link: '/shop?category=toys-fun',
      theme: 'dark',
      order: 2,
      isActive: true,
    },
    external: false,
    route: '/shop',
    params: { category: 'toys-fun' },
  },
];

@Component({
  selector: 'app-hero-banner',
  standalone: true,
  imports: [CommonModule, RouterLink, ImgFallbackDirective, MediaUrlPipe],
  template: `
    <div
      class="hero-frame"
      (mouseenter)="pause()"
      (mouseleave)="resume()"
      (focusin)="pause()"
      (focusout)="resume()"
    >
      <div class="hero-track" [style.transform]="'translateX(' + (-100 * index()) + '%)'">
        @for (s of activeSlides(); track s.banner._id) {
          <div class="hero-slide" [class.light]="s.banner.theme === 'light'" [attr.aria-hidden]="s !== current()">
            <img
              class="hero-shot"
              [src]="(s.banner.image | mediaUrl) || s.banner.image"
              [alt]="s.banner.title"
              appImgFallback
              [attr.loading]="$first ? 'eager' : 'lazy'"
            />
            <div class="hero-copy">
              <h2>{{ s.banner.title }}</h2>
              @if (s.banner.subtitle) { <p>{{ s.banner.subtitle }}</p> }

              @if (s.external) {
                <a class="btn-banner-cta" [href]="s.route" target="_blank" rel="noopener noreferrer">
                  {{ s.banner.ctaLabel || 'Shop Now' }} <i class="fas fa-arrow-right"></i>
                </a>
              } @else {
                <a class="btn-banner-cta" [routerLink]="s.route" [queryParams]="s.params">
                  {{ s.banner.ctaLabel || 'Shop Now' }} <i class="fas fa-arrow-right"></i>
                </a>
              }
            </div>
          </div>
        }
      </div>

      @if (activeSlides().length > 1) {
        <button class="banner-nav prev" (click)="go(index() - 1)" aria-label="Previous banner">‹</button>
        <button class="banner-nav next" (click)="go(index() + 1)" aria-label="Next banner">›</button>

        <div class="banner-dots" role="tablist">
          @for (s of activeSlides(); track s.banner._id) {
            <button
              class="banner-dot"
              [class.active]="$index === index()"
              (click)="go($index)"
              [attr.aria-label]="'Go to slide ' + ($index + 1)"
            ></button>
          }
        </div>
      }
    </div>
  `,
  styles: [`
    :host { display: block; width: 100%; height: 100%; }

    .hero-frame {
      position: relative;
      border-radius: 20px;
      overflow: hidden;
      box-shadow: 0 10px 30px rgba(0,0,0,0.08);
      background: #1f2937;
      aspect-ratio: 21 / 9;
      min-height: 280px;
      max-height: 440px;
    }

    .hero-track {
      display: flex;
      height: 100%;
      transition: transform .55s cubic-bezier(.4, 0, .2, 1);
    }
    .hero-slide {
      position: relative;
      flex: 0 0 100%;
      height: 100%;
    }

    .hero-shot {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    .hero-slide::before {
      content: '';
      position: absolute;
      inset: 0;
      z-index: 1;
      background: linear-gradient(90deg, rgba(15, 23, 42, 0.85) 0%, rgba(15, 23, 42, 0.5) 50%, rgba(15, 23, 42, 0.1) 85%);
    }
    .hero-slide.light::before {
      background: linear-gradient(90deg, rgba(255, 255, 255, 0.92) 0%, rgba(255, 255, 255, 0.65) 50%, rgba(255, 255, 255, 0.1) 85%);
    }

    .hero-copy {
      position: absolute;
      z-index: 2;
      inset: 0;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: flex-start;
      gap: 12px;
      padding: 0 clamp(24px, 7%, 64px);
      max-width: 580px;
    }
    .hero-copy h2 {
      font-family: var(--font-display);
      font-size: clamp(1.5rem, 3.2vw, 2.6rem);
      font-weight: 800;
      margin: 0;
      color: #ffffff;
      line-height: 1.2;
    }
    .hero-copy p {
      margin: 0;
      color: rgba(255, 255, 255, 0.95);
      font-size: clamp(0.88rem, 1.3vw, 1.08rem);
      line-height: 1.5;
    }
    .hero-slide.light .hero-copy h2 { color: var(--primary); }
    .hero-slide.light .hero-copy p { color: #374151; }

    .btn-banner-cta {
      margin-top: 8px;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      background: var(--secondary);
      color: var(--primary);
      font-family: var(--font-display);
      font-weight: 800;
      font-size: 0.9rem;
      padding: 10px 22px;
      border-radius: 999px;
      text-decoration: none;
      box-shadow: 0 4px 14px rgba(250, 204, 21, 0.35);
      transition: transform .15s, background .15s;
    }
    .btn-banner-cta:hover {
      background: #eab308;
      transform: translateY(-2px);
    }

    .banner-nav {
      position: absolute;
      top: 50%;
      transform: translateY(-50%);
      z-index: 3;
      width: 36px;
      height: 36px;
      border-radius: 50%;
      border: none;
      background: rgba(255, 255, 255, 0.9);
      color: var(--primary);
      font-size: 1.4rem;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0;
      transition: opacity .2s, background .15s;
    }
    .hero-frame:hover .banner-nav { opacity: 1; }
    .banner-nav:hover { background: #ffffff; }
    .banner-nav.prev { left: 12px; }
    .banner-nav.next { right: 12px; }

    .banner-dots {
      position: absolute;
      bottom: 12px;
      left: 0;
      right: 0;
      display: flex;
      justify-content: center;
      gap: 6px;
      z-index: 3;
    }
    .banner-dot {
      width: 8px;
      height: 8px;
      border-radius: 999px;
      border: none;
      background: rgba(255, 255, 255, 0.5);
      cursor: pointer;
      padding: 0;
      transition: width .2s, background .2s;
    }
    .banner-dot.active { width: 22px; background: var(--secondary); }

    @media (max-width: 768px) {
      .hero-frame {
        aspect-ratio: 16 / 10;
        min-height: 220px;
        border-radius: 14px;
      }
      .hero-copy {
        padding: 0 20px;
        max-width: 85%;
        gap: 8px;
      }
      .btn-banner-cta {
        padding: 8px 18px;
        font-size: 0.82rem;
      }
    }
  `],
})
export class HeroBannerComponent implements OnInit, OnDestroy {
  slides = signal<Slide[]>([]);
  index = signal(0);

  private timer?: ReturnType<typeof setInterval>;
  private hovered = false;

  constructor(private banners: BannerService) {}

  ngOnInit() {
    this.banners.list().subscribe({
      next: (list) => {
        if (list && list.length > 0) {
          this.slides.set(list.map((b) => this.toSlide(b)));
        } else {
          this.slides.set(FALLBACK_SLIDES);
        }
        this.start();
      },
      error: () => {
        this.slides.set(FALLBACK_SLIDES);
        this.start();
      },
    });
  }

  ngOnDestroy() {
    this.stop();
  }

  activeSlides(): Slide[] {
    return this.slides().length > 0 ? this.slides() : FALLBACK_SLIDES;
  }

  current(): Slide | undefined {
    const list = this.activeSlides();
    return list[this.index() % list.length];
  }

  go(to: number) {
    const n = this.activeSlides().length;
    if (!n) return;
    this.index.set(((to % n) + n) % n);
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

  @HostListener('document:visibilitychange')
  onVisibility() {
    if (document.hidden) this.stop();
    else if (!this.hovered) this.start();
  }

  private start() {
    this.stop();
    if (this.activeSlides().length < 2 || this.hovered || document.hidden) return;
    this.timer = setInterval(() => this.go(this.index() + 1), SLIDE_MS);
  }

  private stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
  }

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
