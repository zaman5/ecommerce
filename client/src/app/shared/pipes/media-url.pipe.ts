import { Pipe, PipeTransform } from '@angular/core';
import { environment } from '../../../environments/environment';

/** The API's origin, e.g. "http://localhost:5000" in dev and "" in production. */
const API_ORIGIN = environment.apiUrl.replace(/\/api\/?$/, '');

/**
 * Resolves an uploaded image path against the API host.
 *
 * Uploads are stored as a relative "/uploads/…" path so the same database works
 * on any domain. In production the API is same-origin and the path resolves as
 * is; in development the site is on :4200 while the files are served from
 * :5000, so the origin has to be put back on. External URLs and data URIs are
 * passed straight through.
 */
@Pipe({ name: 'mediaUrl', standalone: true })
export class MediaUrlPipe implements PipeTransform {
  transform(url: string | undefined | null): string {
    if (!url) return '';
    if (/^(https?:)?\/\//i.test(url) || url.startsWith('data:')) return url;
    if (url.startsWith('/uploads/')) return API_ORIGIN + url;
    return url;
  }
}
