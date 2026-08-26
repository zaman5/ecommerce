import { Injectable, Inject } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { DOCUMENT } from '@angular/common';
import { Product } from '../models/models';

export interface SeoConfig {
  title?: string;
  description?: string;
  keywords?: string | string[];
  canonicalUrl?: string;
  ogType?: 'website' | 'product' | 'article';
  ogImage?: string;
  ogPrice?: number;
  twitterCard?: 'summary' | 'summary_large_image';
  noindex?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class SeoService {
  private readonly defaultSiteName = 'WonderCart';
  private readonly defaultTitle = 'WonderCart — Premium Baby Care & Kids Online Store Pakistan';
  private readonly defaultDescription =
    'WonderCart Pakistan — Trusted baby care, kids & school essentials. Shop school bags, lunch boxes, water bottles, stationery, and accessories with fast cash on delivery across Pakistan.';
  private readonly defaultKeywords =
    'baby products, kids essentials, school bags, lunch boxes, water bottles, baby care, online shopping Pakistan, WonderCart, cash on delivery';
  private readonly defaultOgImage = 'https://wondercart.pk/assets/logo.png';

  constructor(
    private titleService: Title,
    private metaService: Meta,
    @Inject(DOCUMENT) private document: Document
  ) {}

  /**
   * Set complete meta tags, OG, Twitter tags, and canonical link
   */
  setPageSeo(config: SeoConfig) {
    const fullTitle = config.title ? `${config.title}` : this.defaultTitle;
    const description = config.description || this.defaultDescription;
    const keywordsStr = Array.isArray(config.keywords)
      ? config.keywords.filter(Boolean).join(', ')
      : config.keywords || this.defaultKeywords;
    const ogType = config.ogType || 'website';
    const ogImage = config.ogImage || this.defaultOgImage;
    const twitterCard = config.twitterCard || 'summary_large_image';

    // Page Title
    this.titleService.setTitle(fullTitle);

    // Standard Meta Tags
    this.metaService.updateTag({ name: 'description', content: description });
    this.metaService.updateTag({ name: 'keywords', content: keywordsStr });
    this.metaService.updateTag({ name: 'author', content: this.defaultSiteName });
    this.metaService.updateTag({
      name: 'robots',
      content: config.noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large',
    });

    // OpenGraph Meta Tags (Facebook, WhatsApp, LinkedIn, etc.)
    this.metaService.updateTag({ property: 'og:site_name', content: this.defaultSiteName });
    this.metaService.updateTag({ property: 'og:title', content: fullTitle });
    this.metaService.updateTag({ property: 'og:description', content: description });
    this.metaService.updateTag({ property: 'og:type', content: ogType });
    this.metaService.updateTag({ property: 'og:image', content: ogImage });

    if (config.canonicalUrl) {
      this.metaService.updateTag({ property: 'og:url', content: config.canonicalUrl });
      this.setCanonicalUrl(config.canonicalUrl);
    }

    if (config.ogPrice) {
      this.metaService.updateTag({ property: 'product:price:amount', content: config.ogPrice.toString() });
      this.metaService.updateTag({ property: 'product:price:currency', content: 'PKR' });
    }

    // Twitter Card Tags
    this.metaService.updateTag({ name: 'twitter:card', content: twitterCard });
    this.metaService.updateTag({ name: 'twitter:title', content: fullTitle });
    this.metaService.updateTag({ name: 'twitter:description', content: description });
    this.metaService.updateTag({ name: 'twitter:image', content: ogImage });
  }

  /**
   * Sets SEO for a single product page (like eBay / Daraz) with rich snippet JSON-LD
   */
  setProductSeo(p: Product, currentUrl?: string) {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://wondercart.pk';
    const prodUrl = currentUrl || `${origin}/product/${p.slug}`;
    const cleanDesc = this.stripHtml(p.description || '').slice(0, 160).trim();
    const metaDesc =
      p.metaDescription?.trim() ||
      (cleanDesc
        ? `${cleanDesc}... Buy ${p.name} online at best price in Pakistan. Fast COD Delivery at WonderCart.`
        : `Buy ${p.name} (${p.brand || 'WonderCart'}) online in Pakistan at Rs ${p.price}. High quality with Cash on Delivery.`);

    const seoTitle = p.metaTitle?.trim() || `${p.name} — Buy Online in Pakistan | WonderCart`;

    const catName = typeof p.category === 'object' ? p.category.name : '';
    const catSlug = typeof p.category === 'object' ? p.category.slug : '';

    const kwList: string[] = [];
    if (Array.isArray(p.keywords)) kwList.push(...p.keywords);
    if (Array.isArray(p.tags)) kwList.push(...p.tags);
    if (p.name) kwList.push(p.name);
    if (p.brand) kwList.push(p.brand);
    if (catName) kwList.push(catName, `${catName} Pakistan`, `buy ${catName}`);
    kwList.push('online shopping Pakistan', 'cash on delivery', 'best price');

    const firstImage = p.images?.[0] || this.defaultOgImage;
    const fullImgUrl = firstImage.startsWith('http') ? firstImage : `${origin}${firstImage.startsWith('/') ? '' : '/'}${firstImage}`;

    this.setPageSeo({
      title: seoTitle,
      description: metaDesc,
      keywords: Array.from(new Set(kwList)).filter(Boolean),
      canonicalUrl: prodUrl,
      ogType: 'product',
      ogImage: fullImgUrl,
      ogPrice: p.price,
      twitterCard: 'summary_large_image',
    });

    // Generate Schema.org Product JSON-LD
    const productSchema: any = {
      '@context': 'https://schema.org',
      '@type': 'Product',
      name: p.name,
      image: p.images?.length ? p.images.map((img) => (img.startsWith('http') ? img : `${origin}${img.startsWith('/') ? '' : '/'}${img}`)) : [fullImgUrl],
      description: cleanDesc || metaDesc,
      sku: p.slug,
      brand: {
        '@type': 'Brand',
        name: p.brand || 'WonderCart',
      },
      offers: {
        '@type': 'Offer',
        url: prodUrl,
        priceCurrency: 'PKR',
        price: p.price,
        priceValidUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        itemCondition: 'https://schema.org/NewCondition',
        availability: p.stock > 0 ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
        seller: {
          '@type': 'Organization',
          name: 'WonderCart Pakistan',
        },
      },
    };

    if (p.rating && p.rating > 0) {
      productSchema.aggregateRating = {
        '@type': 'AggregateRating',
        ratingValue: p.rating,
        reviewCount: p.numReviews || 1,
        bestRating: '5',
        worstRating: '1',
      };
    }

    if (kwList.length > 0) {
      productSchema.keywords = kwList.slice(0, 10).join(', ');
    }

    // BreadcrumbList schema
    const breadcrumbSchema = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Home',
          item: `${origin}/`,
        },
        ...(catName
          ? [
              {
                '@type': 'ListItem',
                position: 2,
                name: catName,
                item: `${origin}/shop?category=${encodeURIComponent(catSlug)}`,
              },
              {
                '@type': 'ListItem',
                position: 3,
                name: p.name,
                item: prodUrl,
              },
            ]
          : [
              {
                '@type': 'ListItem',
                position: 2,
                name: p.name,
                item: prodUrl,
              },
            ]),
      ],
    };

    this.setStructuredData([productSchema, breadcrumbSchema], 'product-json-ld');
  }

  /**
   * Sets SEO for Category / Catalogue page
   */
  setCategorySeo(categoryName?: string, categorySlug?: string, totalProducts?: number) {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://wondercart.pk';
    const catUrl = categorySlug ? `${origin}/shop?category=${encodeURIComponent(categorySlug)}` : `${origin}/shop`;

    const title = categoryName
      ? `${categoryName} — Buy ${categoryName} Online at Best Price in Pakistan | WonderCart`
      : 'Online Shopping in Pakistan — Explore Products | WonderCart';

    const desc = categoryName
      ? `Shop authentic ${categoryName} online at WonderCart Pakistan. Browse ${totalProducts ? totalProducts + '+' : 'wide range of'} premium quality products with fast Cash on Delivery across Pakistan.`
      : 'Shop our complete catalogue of premium baby care, kids and school essentials at WonderCart Pakistan. High quality, best prices, and cash on delivery.';

    const keywords = categoryName
      ? [
          categoryName,
          `buy ${categoryName} online`,
          `${categoryName} price in Pakistan`,
          `${categoryName} cash on delivery`,
          'kids essentials',
          'WonderCart Pakistan',
        ]
      : this.defaultKeywords;

    this.setPageSeo({
      title,
      description: desc,
      keywords,
      canonicalUrl: catUrl,
      ogType: 'website',
    });

    // Breadcrumb schema
    const breadcrumbs: any = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        {
          '@type': 'ListItem',
          position: 1,
          name: 'Home',
          item: `${origin}/`,
        },
        {
          '@type': 'ListItem',
          position: 2,
          name: categoryName || 'All Categories',
          item: catUrl,
        },
      ],
    };

    this.setStructuredData(breadcrumbs, 'category-json-ld');
  }

  /**
   * Sets Homepage SEO and Sitelinks Searchbox JSON-LD schema
   */
  setHomeSeo() {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://wondercart.pk';

    this.setPageSeo({
      title: 'WonderCart — Pakistan\'s #1 Baby Care & Kids Online Shopping Store',
      description: this.defaultDescription,
      keywords: this.defaultKeywords,
      canonicalUrl: `${origin}/`,
      ogType: 'website',
    });

    // WebSite with SearchAction + Organization Schema
    const webSiteSchema = {
      '@context': 'https://schema.org',
      '@type': 'WebSite',
      name: 'WonderCart Pakistan',
      url: `${origin}/`,
      potentialAction: {
        '@type': 'SearchAction',
        target: {
          '@type': 'EntryPoint',
          urlTemplate: `${origin}/shop?search={search_term_string}`,
        },
        'query-input': 'required name=search_term_string',
      },
    };

    const organizationSchema = {
      '@context': 'https://schema.org',
      '@type': 'Organization',
      name: 'WonderCart',
      url: `${origin}/`,
      logo: `${origin}/assets/logo.png`,
      contactPoint: {
        '@type': 'ContactPoint',
        contactType: 'customer support',
        areaServed: 'PK',
        availableLanguage: ['English', 'Urdu'],
      },
    };

    this.setStructuredData([webSiteSchema, organizationSchema], 'home-json-ld');
  }

  /**
   * Set Canonical link in <head>
   */
  private setCanonicalUrl(url: string) {
    let link: HTMLLinkElement | null = this.document.querySelector("link[rel='canonical']");
    if (!link) {
      link = this.document.createElement('link');
      link.setAttribute('rel', 'canonical');
      this.document.head.appendChild(link);
    }
    link.setAttribute('href', url);
  }

  /**
   * Inject or update JSON-LD structured data script
   */
  setStructuredData(data: object | object[], scriptId = 'structured-data-json-ld') {
    let script: HTMLScriptElement | null = this.document.getElementById(scriptId) as HTMLScriptElement;
    if (!script) {
      script = this.document.createElement('script');
      script.id = scriptId;
      script.type = 'application/ld+json';
      this.document.head.appendChild(script);
    }
    script.text = JSON.stringify(data, null, 2);
  }

  /**
   * Remove structured data script on page leave
   */
  clearStructuredData(scriptId = 'structured-data-json-ld') {
    const script = this.document.getElementById(scriptId);
    if (script) {
      script.remove();
    }
  }

  private stripHtml(html: string): string {
    return html.replace(/<[^>]*>?/gm, ' ').replace(/\s+/g, ' ').trim();
  }
}
