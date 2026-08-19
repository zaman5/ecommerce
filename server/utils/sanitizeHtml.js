/**
 * Conservative allow-list sanitiser for the rich-text description field.
 *
 * The client renders this with Angular's `[innerHTML]`, which runs its own
 * sanitizer and is the primary defence. This is the second layer: it keeps
 * hostile markup out of the database in the first place, so the stored data is
 * safe for any other consumer too (an export, an email, a future SSR view).
 *
 * Anything not explicitly allowed is dropped, which is the only ordering that
 * fails safe — a deny-list would miss whatever it had not heard of.
 */

const ALLOWED_TAGS = new Set([
  'p', 'br', 'strong', 'b', 'em', 'i', 'u', 'h2', 'h3', 'ul', 'ol', 'li', 'a', 'span', 'div',
  'img', 'figure', 'figcaption', 'blockquote',
]);

const ALLOWED_ATTRS = {
  a: new Set(['href', 'title']),
  // No width/height/style: the stylesheet owns sizing, and letting the author
  // set them is how a "product photo" becomes a full-screen overlay.
  img: new Set(['src', 'alt']),
};

/** Tags that never have a closing partner. */
const VOID_TAGS = new Set(['br', 'img']);

/** Tags whose *contents* must go too, not just the tag itself. */
const STRIP_WITH_CONTENT = /<(script|style|iframe|object|embed|noscript|template)\b[^>]*>[\s\S]*?<\/\1>/gi;

function safeHref(value) {
  const v = String(value).trim();
  // Blocks javascript:, data:, vbscript: and friends; allows relative links.
  return /^(https?:\/\/|mailto:|\/)/i.test(v) ? v : null;
}

/**
 * Image sources are narrower than link targets: only http(s) or one of our own
 * uploaded paths. `data:` is excluded because an SVG data URI is a script
 * delivery mechanism.
 */
function safeSrc(value) {
  const v = String(value).trim();
  return /^(https?:\/\/|\/uploads\/)/i.test(v) ? v : null;
}

function attrsFor(tag, raw) {
  const allowed = ALLOWED_ATTRS[tag];
  if (!allowed || !raw) return '';
  const out = [];
  // name="value" | name='value' | name=value
  const re = /([a-zA-Z-]+)\s*=\s*("([^"]*)"|'([^']*)'|([^\s"'>]+))/g;
  let m;
  while ((m = re.exec(raw))) {
    const name = m[1].toLowerCase();
    if (!allowed.has(name)) continue;
    const value = m[3] ?? m[4] ?? m[5] ?? '';
    if (name === 'href') {
      const href = safeHref(value);
      if (!href) continue;
      out.push(`href="${href.replace(/"/g, '&quot;')}"`);
    } else if (name === 'src') {
      const src = safeSrc(value);
      if (!src) continue;
      out.push(`src="${src.replace(/"/g, '&quot;')}"`);
    } else {
      out.push(`${name}="${String(value).replace(/"/g, '&quot;')}"`);
    }
  }
  // Anything we keep a link for should not be able to hijack the opener.
  if (tag === 'a' && out.some((a) => a.startsWith('href='))) {
    out.push('target="_blank"', 'rel="noopener noreferrer"');
  }
  return out.length ? ' ' + out.join(' ') : '';
}

/**
 * @param {string} html untrusted markup
 * @returns {string} markup containing only allow-listed tags and attributes
 */
export function sanitizeHtml(html) {
  if (typeof html !== 'string' || !html) return '';

  let out = html.replace(STRIP_WITH_CONTENT, '');
  // Comments can hide markup from naive parsers; they carry nothing we want.
  out = out.replace(/<!--[\s\S]*?-->/g, '');

  out = out.replace(/<\s*(\/)?\s*([a-zA-Z0-9-]+)((?:[^>"']|"[^"]*"|'[^']*')*)>/g, (match, closing, rawTag, rawAttrs) => {
    const tag = rawTag.toLowerCase();
    if (!ALLOWED_TAGS.has(tag)) return '';
    if (closing) return VOID_TAGS.has(tag) ? '' : `</${tag}>`;
    if (tag === 'br') return '<br>';

    const attrs = attrsFor(tag, rawAttrs);
    // An image whose src was rejected is dropped whole — keeping it would just
    // render a broken-image icon in the middle of the copy.
    if (tag === 'img' && !attrs.includes('src=')) return '';
    return `<${tag}${attrs}>`;
  });

  // Any stray angle brackets left over are escaped rather than emitted raw.
  return out.replace(/<(?![a-zA-Z/])/g, '&lt;').trim();
}

export default sanitizeHtml;
