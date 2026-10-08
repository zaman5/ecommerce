import fs from 'fs';
import path from 'path';
import { getSetting } from '../models/Setting.js';

const GRAPH_API_VERSION = 'v19.0';
export const DEFAULT_META_REDIRECT_URI =
  process.env.META_OAUTH_REDIRECT_URI || 'https://wondercart.pk/admin/accounts?tab=social';
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

/**
 * Extract rich and clear error messages from Meta Graph API responses.
 */
export function formatMetaError(data, response) {
  if (data?.error) {
    const err = data.error;
    let msg = err.error_user_msg || err.message || `Meta API error (${err.code || response?.status || 'unknown'})`;
    if (err.error_subcode) {
      msg += ` (Subcode: ${err.error_subcode})`;
    }
    if (err.type && !msg.toLowerCase().includes(err.type.toLowerCase())) {
      msg = `[${err.type}] ${msg}`;
    }
    return msg;
  }
  if (response && !response.ok) {
    return `Meta API returned HTTP ${response.status}: ${response.statusText || 'Request failed'}`;
  }
  return 'Unknown error communicating with Meta API.';
}

/**
 * Format a social post caption using the configured template and product data.
 * Supports:
 * - {product_name}
 * - {description} / {product_description}
 * - {brand}
 * - {price}
 * - {compare_at_price}
 * - {discount_text}
 * - {product_url}
 * - {buy_now_url}
 */
// Meta only reliably accepts these; Instagram publishing accepts JPEG only.
const META_SAFE_IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png']);

let sharpPromise = null;
function loadSharp() {
  if (!sharpPromise) {
    sharpPromise = import('sharp').then((m) => m.default || m).catch(() => null);
  }
  return sharpPromise;
}

/**
 * Work out the public site origin and API origin for a request. Behind the
 * LiteSpeed/Apache proxy req.protocol is "http", and the Referer header is a
 * full page URL, so both need normalising before they go into links Meta fetches.
 */
export function getRequestOrigins(req) {
  const toOrigin = (value) => {
    try { return value ? new URL(value).origin : ''; } catch { return ''; }
  };
  const clientOrigin = toOrigin(req.headers.origin) || toOrigin(req.headers.referer);

  const host = req.get('host') || '';
  const forwardedProto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
  const isLocal = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/i.test(host);
  const proto = forwardedProto || (isLocal ? req.protocol : 'https');
  const serverOrigin = (process.env.PUBLIC_API_ORIGIN || `${proto}://${host}`).replace(/\/$/, '');

  return { clientOrigin, serverOrigin };
}

/**
 * Return a JPEG copy of an uploaded image that Meta can ingest. Uploads are
 * stored as WebP, which Instagram rejects outright and Facebook photo uploads
 * don't reliably accept. The copy is cached next to the original as
 * "social-<name>.jpg". Returns the original path if no conversion is needed or
 * sharp is unavailable.
 */
export async function ensureMetaCompatibleImage(localFile) {
  if (!localFile) return null;
  const ext = path.extname(localFile).toLowerCase();
  if (META_SAFE_IMAGE_EXTS.has(ext)) return localFile;

  const jpegPath = path.join(path.dirname(localFile), `social-${path.basename(localFile, ext)}.jpg`);
  if (fs.existsSync(jpegPath)) return jpegPath;

  const sharp = await loadSharp();
  if (!sharp) return localFile;
  try {
    await sharp(localFile)
      .rotate()
      .flatten({ background: '#ffffff' })
      .jpeg({ quality: 90 })
      .toFile(jpegPath);
    return jpegPath;
  } catch (err) {
    console.warn('[Social] Could not convert image to JPEG:', err.message);
    return localFile;
  }
}

/** Resolve an image to a public URL Meta can fetch, preferring a JPEG copy. */
async function resolveMetaImageUrl(imagePath, serverOrigin) {
  const localFile = resolveLocalFilePath(imagePath);
  if (localFile) {
    const compatible = await ensureMetaCompatibleImage(localFile);
    if (compatible !== localFile) {
      return resolveImageUrl(`/uploads/${path.basename(compatible)}`, serverOrigin);
    }
  }
  return resolveImageUrl(imagePath, serverOrigin);
}

export function formatSocialCaption(template, product, clientOrigin = '') {
  const origin = (clientOrigin || process.env.CLIENT_ORIGIN?.split(',')[0] || 'https://wondercart.pk').replace(/\/$/, '');
  const productUrl = `${origin}/product/${product.slug || product.id}`;
  const buyNowUrl = `${origin}/product/${product.slug || product.id}?buy=true`;

  let discountText = '';
  if (product.compareAtPrice && Number(product.compareAtPrice) > Number(product.price)) {
    const savings = Math.round(Number(product.compareAtPrice) - Number(product.price));
    const percent = Math.round((savings / Number(product.compareAtPrice)) * 100);
    discountText = `🔥 Special Offer: ${percent}% OFF (Was Rs ${Number(product.compareAtPrice).toLocaleString()}, Save Rs ${savings.toLocaleString()})!`;
  }

  // Clean description of HTML tags and special spaces
  const cleanDescription = (product.description || product.richDescription || '')
    .replace(/<[^>]*>?/gm, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();

  const descSnippet = cleanDescription
    ? (cleanDescription.length > 250 ? `${cleanDescription.slice(0, 247)}...` : cleanDescription)
    : '';

  const defaultTemplate =
    '✨ New Arrival at WonderCart! ✨\n\n🛍️ {product_name}\n\n📝 {description}\n\n💰 Price: Rs {price}\n{discount_text}\n\n👉 View Product: {product_url}\n⚡ Buy Now: {buy_now_url}\n\n#WonderCart #BabyShop #OnlineShopping';

  let tpl = template || defaultTemplate;

  // If user template didn't explicitly have {description}, and product has description, insert it nicely
  if (!tpl.includes('{description}') && !tpl.includes('{product_description}') && descSnippet) {
    if (tpl.includes('{product_name}')) {
      tpl = tpl.replace('{product_name}', `{product_name}\n\n📝 ${descSnippet}`);
    }
  }

  return tpl
    .replace(/\{product_name\}/g, product.name || 'Product')
    .replace(/\{brand\}/g, product.brand || 'WonderCart')
    .replace(/\{description\}/g, descSnippet || cleanDescription || '')
    .replace(/\{product_description\}/g, cleanDescription || descSnippet || '')
    .replace(/\{summary\}/g, descSnippet || '')
    .replace(/\{price\}/g, Number(product.price || 0).toLocaleString())
    .replace(/\{compare_at_price\}/g, product.compareAtPrice ? Number(product.compareAtPrice).toLocaleString() : '')
    .replace(/\{discount_text\}/g, discountText)
    .replace(/\{product_url\}/g, productUrl)
    .replace(/\{buy_now_url\}/g, buyNowUrl)
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Resolve an image path to an absolute URL if needed.
 */
export function resolveImageUrl(imagePath, serverOrigin = '') {
  if (!imagePath) return '';
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  const base = (serverOrigin || process.env.BASE_URL || 'http://localhost:5000').replace(/\/$/, '');
  const cleanPath = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;
  return `${base}${cleanPath}`;
}

/**
 * Resolve a local file system path for uploaded images on the server.
 */
export function resolveLocalFilePath(imagePath) {
  if (!imagePath) return null;
  const clean = imagePath.replace(/^https?:\/\/[^\/]+/, '');
  const relPath = clean.startsWith('/') ? clean.slice(1) : clean;
  const basename = path.basename(relPath);

  const candidates = [
    path.resolve(process.cwd(), relPath),
    path.resolve(process.cwd(), 'uploads', basename),
    path.resolve(process.cwd(), 'server', 'uploads', basename),
    path.resolve(process.cwd(), '..', 'uploads', basename),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
      return candidate;
    }
  }
  return null;
}

/**
 * Auto-detect and verify Meta (Facebook & Instagram) credentials from Access Token only,
 * or from Page ID + Access Token.
 */
export async function resolveAndVerifyMetaCredentials({
  pageId = null,
  accessToken,
  instagramAccountId = null,
} = {}) {
  const token = String(accessToken || '').trim();
  const inputPageId = String(pageId || '').trim();
  const inputIgId = String(instagramAccountId || '').trim();

  if (!token) {
    throw new Error('Access Token is required to connect to Meta API.');
  }

  let matchedPage = null;
  let availablePages = [];
  let userProfile = null;
  let lastMetaError = '';

  // 1. Try querying /me/accounts (works when token is User or System User token with pages permissions)
  try {
    const accountsUrl = `${GRAPH_API_BASE}/me/accounts?fields=id,name,access_token,category,picture{url},link,instagram_business_account{id,username,name,profile_picture_url}&access_token=${encodeURIComponent(token)}`;
    const res = await fetch(accountsUrl);
    const data = await res.json();

    if (res.ok && Array.isArray(data.data) && data.data.length > 0) {
      availablePages = data.data.map((p) => ({
        id: String(p.id),
        name: p.name,
        category: p.category || '',
        pictureUrl: p.picture?.data?.url || '',
        link: p.link || `https://facebook.com/${p.id}`,
        pageAccessToken: p.access_token || token,
        instagram: p.instagram_business_account ? {
          id: String(p.instagram_business_account.id),
          username: p.instagram_business_account.username || '',
          name: p.instagram_business_account.name || '',
          pictureUrl: p.instagram_business_account.profile_picture_url || '',
        } : null,
      }));

      // If user specified a pageId, find it; otherwise default to first available page
      if (inputPageId) {
        matchedPage = availablePages.find((p) => p.id === inputPageId) || null;
      }
      if (!matchedPage) {
        matchedPage = availablePages[0];
      }
    } else if (data?.error) {
      lastMetaError = formatMetaError(data, res);
    }
  } catch (err) {
    lastMetaError = err.message;
  }

  // 2. If no page matched via /me/accounts, try querying /me directly (works when token is already a Page Access Token)
  if (!matchedPage) {
    try {
      const meUrl = `${GRAPH_API_BASE}/me?fields=id,name,picture{url},link,username,instagram_business_account{id,username,name,profile_picture_url}&access_token=${encodeURIComponent(token)}`;
      const meRes = await fetch(meUrl);
      const meData = await meRes.json();

      if (meRes.ok && meData.id) {
        if (!inputPageId || inputPageId === String(meData.id)) {
          matchedPage = {
            id: String(meData.id),
            name: meData.name,
            category: '',
            pictureUrl: meData.picture?.data?.url || '',
            link: meData.link || `https://facebook.com/${meData.id}`,
            pageAccessToken: token,
            instagram: meData.instagram_business_account ? {
              id: String(meData.instagram_business_account.id),
              username: meData.instagram_business_account.username || '',
              name: meData.instagram_business_account.name || '',
              pictureUrl: meData.instagram_business_account.profile_picture_url || '',
            } : null,
          };
          availablePages = [matchedPage];
        } else {
          userProfile = { id: meData.id, name: meData.name };
        }
      } else if (meData?.error) {
        lastMetaError = formatMetaError(meData, meRes);
      }
    } catch (err) {
      lastMetaError = err.message;
    }
  }

  // 3. If still no matched page, and user provided inputPageId, try fetching that page directly
  if (!matchedPage && inputPageId) {
    try {
      const pageUrl = `${GRAPH_API_BASE}/${encodeURIComponent(inputPageId)}?fields=id,name,access_token,picture{url},link,username,instagram_business_account{id,username,name,profile_picture_url}&access_token=${encodeURIComponent(token)}`;
      const pageRes = await fetch(pageUrl);
      const pageData = await pageRes.json();

      if (pageRes.ok && pageData.id) {
        matchedPage = {
          id: String(pageData.id),
          name: pageData.name,
          category: '',
          pictureUrl: pageData.picture?.data?.url || '',
          link: pageData.link || `https://facebook.com/${pageData.id}`,
          pageAccessToken: pageData.access_token || token,
          instagram: pageData.instagram_business_account ? {
            id: String(pageData.instagram_business_account.id),
            username: pageData.instagram_business_account.username || '',
            name: pageData.instagram_business_account.name || '',
            pictureUrl: pageData.instagram_business_account.profile_picture_url || '',
          } : null,
        };
        availablePages = [matchedPage];
      } else if (pageData?.error) {
        throw new Error(formatMetaError(pageData, pageRes));
      }
    } catch (err) {
      throw new Error(err.message || 'Failed to verify Facebook Page with given ID.');
    }
  }

  // 4. If we still don't have a matched page:
  if (!matchedPage) {
    if (userProfile) {
      throw new Error(
        `Token belongs to Facebook user "${userProfile.name}", but no Facebook Pages were found with manage permissions. Make sure your Facebook user is an Admin of your Page and has granted "pages_show_list", "pages_read_engagement", and "pages_manage_posts" permissions.`
      );
    }
    throw new Error(lastMetaError || 'Unable to connect to Meta API with this token. Please make sure the token is valid and has not expired.');
  }

  // 5. Handle Instagram Business Account resolution & verification
  let instagramData = matchedPage.instagram || null;
  let instagramError = null;
  const targetIgId = inputIgId || instagramData?.id;

  if (targetIgId) {
    try {
      const igUrl = `${GRAPH_API_BASE}/${encodeURIComponent(targetIgId)}?fields=id,username,name,profile_picture_url&access_token=${encodeURIComponent(matchedPage.pageAccessToken || token)}`;
      const igRes = await fetch(igUrl);
      const igResult = await igRes.json();
      if (igRes.ok && igResult.id) {
        instagramData = {
          id: String(igResult.id),
          name: igResult.name || igResult.username || 'Instagram Business Account',
          username: igResult.username || '',
          pictureUrl: igResult.profile_picture_url || '',
        };
      } else {
        instagramError = formatMetaError(igResult, igRes);
      }
    } catch (igErr) {
      instagramError = igErr.message;
    }
  }

  return {
    success: true,
    page: {
      id: matchedPage.id,
      name: matchedPage.name,
      category: matchedPage.category || '',
      username: matchedPage.username || '',
      link: matchedPage.link,
      pictureUrl: matchedPage.pictureUrl,
    },
    pageAccessToken: matchedPage.pageAccessToken,
    availablePages,
    instagram: instagramData,
    instagramError,
  };
}

/**
 * Test & verify Facebook Page ID and Page Access Token.
 */
export async function verifyFacebookConnection(pageId, pageAccessToken) {
  const result = await resolveAndVerifyMetaCredentials({
    pageId,
    accessToken: pageAccessToken,
  });
  return result.page;
}

/**
 * Test & verify Instagram Business Account ID.
 */
export async function verifyInstagramConnection(igAccountId, accessToken) {
  if (!igAccountId || !accessToken) {
    throw new Error('Both Instagram Business Account ID and Access Token are required.');
  }

  const url = `${GRAPH_API_BASE}/${encodeURIComponent(igAccountId.trim())}?fields=id,username,name,profile_picture_url&access_token=${encodeURIComponent(accessToken.trim())}`;
  
  const response = await fetch(url);
  const data = await response.json();

  if (!response.ok || data.error) {
    throw new Error(formatMetaError(data, response));
  }

  return {
    id: data.id,
    name: data.name || data.username,
    username: data.username || '',
    pictureUrl: data.profile_picture_url || '',
  };
}

/**
 * Publish product to Facebook Page.
 * Supports:
 * - Direct local file binary upload to Facebook (even on localhost!)
 * - Multi-image albums / carousel posts (when 2 or more images are available)
 * - Single photo posts with rich caption
 * - Video posts with direct CTA button
 */
export async function postProductToFacebook({
  product,
  customMessage = null,
  pageId = null,
  accessToken = null,
  clientOrigin = '',
  serverOrigin = '',
  selectedImages = null,
  includeVideo = false,
  mediaMode = 'auto',
  ctaType = 'SHOP_NOW',
  includeShopNowButton = true,
}) {
  const Setting = getSetting();
  const settings = await Setting.getInstance();

  const activePageId = (pageId || settings.facebookPageId || '').trim();
  let tokenToUse = (accessToken || settings.facebookPageAccessToken || '').trim();

  if (!activePageId || !tokenToUse) {
    throw new Error('Facebook Page credentials not configured. Please set them in Admin > Facebook Settings.');
  }

  // Attempt to resolve Page Access Token if a user token was stored
  try {
    const pageTokenUrl = `${GRAPH_API_BASE}/${encodeURIComponent(activePageId)}?fields=id,name,access_token&access_token=${encodeURIComponent(tokenToUse)}`;
    const pageTokenRes = await fetch(pageTokenUrl);
    const pageTokenData = await pageTokenRes.json();
    if (pageTokenRes.ok && pageTokenData.access_token) {
      tokenToUse = pageTokenData.access_token;
    }
  } catch {
    // Keep tokenToUse
  }

  const origin = (clientOrigin || process.env.CLIENT_ORIGIN?.split(',')[0] || 'https://wondercart.pk').replace(/\/$/, '');
  const productUrl = `${origin}/product/${product.slug || product.id}`;
  const buyNowUrl = `${origin}/product/${product.slug || product.id}?buy=true`;

  let caption = customMessage || formatSocialCaption(settings.socialPostTemplate, product, clientOrigin);
  if (includeShopNowButton && !caption.includes(buyNowUrl) && !caption.includes(productUrl)) {
    caption += `\n\n🛍️ Shop Now: ${buyNowUrl}`;
  }

  // Resolve raw images
  const rawImages = Array.isArray(selectedImages) && selectedImages.length > 0
    ? selectedImages
    : (Array.isArray(product.images) ? product.images : []);

  const hasVideo = Boolean(product.video) && (includeVideo || mediaMode === 'video');
  const videoUrl = hasVideo ? resolveImageUrl(product.video, serverOrigin) : '';

  let postResult = null;

  // Helper to upload a single photo to Facebook (supports local file buffer via FormData OR public URL)
  async function uploadPhotoToFacebook({ rawImgPath, captionText, isPublished = true, isTemporary = false }) {
    const localFile = resolveLocalFilePath(rawImgPath);
    const photoUploadUrl = `${GRAPH_API_BASE}/${encodeURIComponent(activePageId)}/photos`;

    if (localFile && fs.existsSync(localFile)) {
      const uploadFile = await ensureMetaCompatibleImage(localFile);
      const fileBuffer = fs.readFileSync(uploadFile);
      const ext = path.extname(uploadFile).toLowerCase();
      const mime = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
      const formData = new FormData();
      formData.append('source', new Blob([fileBuffer], { type: mime }), path.basename(uploadFile));
      if (captionText) formData.append('caption', captionText);
      formData.append('published', String(isPublished));
      if (isTemporary) formData.append('temporary', 'true');
      formData.append('access_token', tokenToUse);

      const res = await fetch(photoUploadUrl, { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(formatMetaError(data, res));
      return data;
    } else {
      const pubUrl = resolveImageUrl(rawImgPath, serverOrigin);
      if (pubUrl && (pubUrl.startsWith('https://') || !pubUrl.includes('localhost'))) {
        const photoPayload = {
          url: pubUrl,
          published: isPublished,
          access_token: tokenToUse,
        };
        if (captionText) photoPayload.caption = captionText;
        if (isTemporary) photoPayload.temporary = true;

        const res = await fetch(photoUploadUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(photoPayload),
        });
        const data = await res.json();
        if (!res.ok || data.error) throw new Error(formatMetaError(data, res));
        return data;
      }
    }
    return null;
  }

  // 1. VIDEO POST
  if (hasVideo && videoUrl && (videoUrl.startsWith('https://') || !videoUrl.includes('localhost'))) {
    try {
      const videoApiUrl = `${GRAPH_API_BASE}/${encodeURIComponent(activePageId)}/videos`;
      const videoBody = {
        file_url: videoUrl,
        title: product.name || 'Product Video',
        description: caption,
        access_token: tokenToUse,
      };

      const res = await fetch(videoApiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(videoBody),
      });

      const data = await res.json();
      if (res.ok && !data.error) {
        postResult = { ...data, type: 'video' };
      }
    } catch (vidErr) {
      console.warn('Facebook video post error, falling back to photo/feed:', vidErr.message);
    }
  }

  // 2. MULTI-IMAGE ALBUM (2 or more photos)
  if (!postResult && rawImages.length >= 2 && mediaMode !== 'single') {
    try {
      const attachedMedia = [];
      const imagesToUpload = rawImages.slice(0, 10);

      for (const img of imagesToUpload) {
        try {
          const uploadedPhoto = await uploadPhotoToFacebook({
            rawImgPath: img,
            isPublished: false,
            isTemporary: true,
          });
          if (uploadedPhoto?.id) {
            attachedMedia.push({ media_fbid: uploadedPhoto.id });
          }
        } catch (singleUploadErr) {
          console.warn('Notice: Multi-photo item upload failed:', singleUploadErr.message);
        }
      }

      if (attachedMedia.length >= 2) {
        const feedUrl = `${GRAPH_API_BASE}/${encodeURIComponent(activePageId)}/feed`;
        const feedPayload = {
          message: caption,
          attached_media: attachedMedia,
          access_token: tokenToUse,
        };

        const multiRes = await fetch(feedUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(feedPayload),
        });

        const multiData = await multiRes.json();
        if (multiRes.ok && !multiData.error) {
          postResult = { ...multiData, type: 'multi_image', count: attachedMedia.length };
        }
      }
    } catch (multiErr) {
      console.warn('Facebook multi-image post error, falling back to single photo:', multiErr.message);
    }
  }

  // 3. SINGLE PHOTO POST WITH CAPTION
  if (!postResult && rawImages.length > 0) {
    try {
      const singlePhoto = await uploadPhotoToFacebook({
        rawImgPath: rawImages[0],
        captionText: caption,
        isPublished: true,
      });
      if (singlePhoto?.id) {
        postResult = { ...singlePhoto, type: 'photo' };
      }
    } catch (singleErr) {
      console.warn('Facebook single photo upload error, falling back to feed:', singleErr.message);
    }
  }

  // 4. FALLBACK FEED POST
  if (!postResult) {
    const feedUrl = `${GRAPH_API_BASE}/${encodeURIComponent(activePageId)}/feed`;
    const feedPayload = {
      message: caption,
      access_token: tokenToUse,
    };

    // Only include link if it is a valid public HTTP/HTTPS URL and not localhost
    const targetLink = buyNowUrl || productUrl;
    if (targetLink && (targetLink.startsWith('https://') || !targetLink.includes('localhost'))) {
      feedPayload.link = targetLink;
    }

    const response = await fetch(feedUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(feedPayload),
    });

    const data = await response.json();
    if (!response.ok || data.error) {
      throw new Error(formatMetaError(data, response) || 'Failed to post on Facebook');
    }
    postResult = { ...data, type: 'feed_link' };
  }

  const postId = postResult.id || postResult.post_id;
  const postUrl = `https://facebook.com/${postId || activePageId}`;

  return {
    success: true,
    platform: 'facebook',
    id: postId,
    postType: postResult.type || 'photo',
    postUrl,
    pageUrl: `https://facebook.com/${activePageId}`,
    message: `Successfully posted to Facebook Page! (${postResult.type || 'photo'})`,
  };
}

/**
 * Publish product to Instagram Business Account.
 */
export async function postProductToInstagram({
  product,
  customCaption = null,
  igAccountId = null,
  accessToken = null,
  clientOrigin = '',
  serverOrigin = '',
  selectedImages = null,
  includeVideo = false,
  mediaMode = 'auto',
  includeShopNowButton = true,
}) {
  const Setting = getSetting();
  const settings = await Setting.getInstance();

  const activeIgId = (igAccountId || settings.instagramAccountId || '').trim();
  const activeToken = (accessToken || settings.facebookPageAccessToken || '').trim();

  if (!activeIgId || !activeToken) {
    throw new Error('Instagram Business Account ID or Access Token not configured. Please set them in Admin > Facebook Settings.');
  }

  const origin = (clientOrigin || process.env.CLIENT_ORIGIN?.split(',')[0] || 'https://wondercart.pk').replace(/\/$/, '');
  const buyNowUrl = `${origin}/product/${product.slug || product.id}?buy=true`;
  const productUrl = `${origin}/product/${product.slug || product.id}`;

  let caption = customCaption || formatSocialCaption(settings.socialPostTemplate, product, clientOrigin);
  if (includeShopNowButton && !caption.includes(buyNowUrl) && !caption.includes(productUrl)) {
    caption += `\n\n🛍️ Shop Now 👉 ${buyNowUrl}`;
  }

  // Resolve media items
  const rawImages = Array.isArray(selectedImages) && selectedImages.length > 0
    ? selectedImages
    : (Array.isArray(product.images) ? product.images : []);

  const imageUrls = (await Promise.all(rawImages.map((img) => resolveMetaImageUrl(img, serverOrigin))))
    .filter((url) => Boolean(url));

  const hasVideo = Boolean(product.video) && (includeVideo || mediaMode === 'video');
  const videoUrl = hasVideo ? resolveImageUrl(product.video, serverOrigin) : '';

  if (imageUrls.length === 0 && !videoUrl) {
    throw new Error('Instagram posts require at least one product photo or video.');
  }

  let creationId = null;
  let postType = 'photo';

  // 1. INSTAGRAM VIDEO / REEL
  if (hasVideo && videoUrl && (videoUrl.startsWith('https://') || !videoUrl.includes('localhost'))) {
    const containerUrl = `${GRAPH_API_BASE}/${encodeURIComponent(activeIgId)}/media`;
    const containerRes = await fetch(containerUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        media_type: 'REELS',
        video_url: videoUrl,
        caption: caption,
        access_token: activeToken,
      }),
    });

    const containerData = await containerRes.json();
    if (containerRes.ok && containerData.id) {
      creationId = containerData.id;
      postType = 'reels_video';
    }
  }

  // 2. MULTI-IMAGE CAROUSEL ALBUM (2 to 10 images)
  if (!creationId && imageUrls.length >= 2 && mediaMode !== 'single') {
    const imagesToUpload = imageUrls.slice(0, 10);
    const itemContainerIds = [];

    for (const imgUrl of imagesToUpload) {
      const itemUrl = `${GRAPH_API_BASE}/${encodeURIComponent(activeIgId)}/media`;
      const itemRes = await fetch(itemUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_url: imgUrl,
          is_carousel_item: true,
          access_token: activeToken,
        }),
      });
      const itemData = await itemRes.json();
      if (itemRes.ok && itemData.id) {
        itemContainerIds.push(itemData.id);
      }
    }

    if (itemContainerIds.length >= 2) {
      const carouselUrl = `${GRAPH_API_BASE}/${encodeURIComponent(activeIgId)}/media`;
      const carouselRes = await fetch(carouselUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          media_type: 'CAROUSEL',
          children: itemContainerIds,
          caption: caption,
          access_token: activeToken,
        }),
      });

      const carouselData = await carouselRes.json();
      if (carouselRes.ok && carouselData.id) {
        creationId = carouselData.id;
        postType = 'carousel_album';
      }
    }
  }

  // 3. SINGLE PHOTO CONTAINER
  if (!creationId && imageUrls.length > 0) {
    const singleImageUrl = imageUrls[0];
    const containerUrl = `${GRAPH_API_BASE}/${encodeURIComponent(activeIgId)}/media`;
    const containerRes = await fetch(containerUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image_url: singleImageUrl,
        caption: caption,
        access_token: activeToken,
      }),
    });

    const containerData = await containerRes.json();
    if (!containerRes.ok || containerData.error) {
      throw new Error(formatMetaError(containerData, containerRes) || 'Failed to create Instagram media container.');
    }
    creationId = containerData.id;
    postType = 'single_photo';
  }

  if (!creationId) {
    throw new Error('Failed to generate Instagram media container for publication.');
  }

  // Step 2: Publish media container
  const publishUrl = `${GRAPH_API_BASE}/${encodeURIComponent(activeIgId)}/media_publish`;
  const publishRes = await fetch(publishUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      creation_id: creationId,
      access_token: activeToken,
    }),
  });

  const publishData = await publishRes.json();
  if (!publishRes.ok || publishData.error) {
    throw new Error(formatMetaError(publishData, publishRes) || 'Failed to publish to Instagram.');
  }

  return {
    success: true,
    platform: 'instagram',
    id: publishData.id,
    postType,
    hasShopNowButton: Boolean(includeShopNowButton),
    message: `Successfully posted to Instagram! (${postType})`,
  };
}

/**
 * Handle auto-posting when a product is created or updated.
 */
export async function dispatchProductSocialPost(product, {
  postToFacebook = false,
  postToInstagram = false,
  customMessage = null,
  clientOrigin = '',
  serverOrigin = '',
  selectedImages = null,
  includeVideo = false,
  mediaMode = 'auto',
  includeShopNowButton = true,
} = {}) {
  const results = { facebook: null, instagram: null, errors: [] };

  if (postToFacebook) {
    try {
      results.facebook = await postProductToFacebook({
        product,
        customMessage,
        clientOrigin,
        serverOrigin,
        selectedImages,
        includeVideo,
        mediaMode,
        includeShopNowButton,
      });
    } catch (err) {
      console.error('Facebook Auto-Post Error:', err.message);
      results.errors.push(`Facebook: ${err.message}`);
    }
  }

  if (postToInstagram) {
    try {
      results.instagram = await postProductToInstagram({
        product,
        customCaption: customMessage,
        clientOrigin,
        serverOrigin,
        selectedImages,
        includeVideo,
        mediaMode,
        includeShopNowButton,
      });
    } catch (err) {
      console.error('Instagram Auto-Post Error:', err.message);
      results.errors.push(`Instagram: ${err.message}`);
    }
  }

  return results;
}

/**
 * Fetch recent posts published to the Facebook Page feed.
 */
export async function getRecentFacebookPosts({
  pageId = null,
  accessToken = null,
  limit = 10,
} = {}) {
  const Setting = getSetting();
  const settings = await Setting.getInstance();

  const activePageId = (pageId || settings.facebookPageId || '').trim();
  let tokenToUse = (accessToken || settings.facebookPageAccessToken || '').trim();

  if (!activePageId || !tokenToUse) {
    throw new Error('Facebook Page credentials not configured.');
  }

  // Attempt to resolve Page Access Token if user token was provided
  try {
    const pageTokenUrl = `${GRAPH_API_BASE}/${encodeURIComponent(activePageId)}?fields=id,name,access_token&access_token=${encodeURIComponent(tokenToUse)}`;
    const pageTokenRes = await fetch(pageTokenUrl);
    const pageTokenData = await pageTokenRes.json();
    if (pageTokenRes.ok && pageTokenData.access_token) {
      tokenToUse = pageTokenData.access_token;
    }
  } catch {
    // Continue with tokenToUse
  }

  const postsUrl = `${GRAPH_API_BASE}/${encodeURIComponent(activePageId)}/posts?fields=id,message,created_time,permalink_url,full_picture,attachments{media,type,url,title}&limit=${Math.min(25, Number(limit) || 10)}&access_token=${encodeURIComponent(tokenToUse)}`;

  const res = await fetch(postsUrl);
  const data = await res.json();

  if (!res.ok || data.error) {
    throw new Error(formatMetaError(data, res));
  }

  const posts = Array.isArray(data.data) ? data.data.map((p) => ({
    id: p.id,
    message: p.message || '',
    createdTime: p.created_time,
    permalinkUrl: p.permalink_url || `https://facebook.com/${p.id}`,
    fullPicture: p.full_picture || p.attachments?.data?.[0]?.media?.image?.src || '',
    attachments: p.attachments?.data || [],
  })) : [];

  return {
    success: true,
    pageId: activePageId,
    pageUrl: `https://facebook.com/${activePageId}`,
    count: posts.length,
    posts,
  };
}

/**
 * Generate Meta OAuth Dialog URL
 */
export function generateMetaOAuthUrl({
  appId = '970580869378166',
  redirectUri = DEFAULT_META_REDIRECT_URI,
  state = 'wondercart_autopost',
  includeInstagram = false,
} = {}) {
  const cleanAppId = String(appId || '970580869378166').trim();
  const cleanRedirectUri = String(redirectUri || DEFAULT_META_REDIRECT_URI).trim();
  const scopeList = [
    'pages_show_list',
    'pages_read_engagement',
    'pages_manage_posts',
  ];
  if (includeInstagram) {
    scopeList.push('instagram_basic', 'instagram_content_publish');
  }
  const scopes = scopeList.join(',');

  return `https://www.facebook.com/${GRAPH_API_VERSION}/dialog/oauth?client_id=${encodeURIComponent(cleanAppId)}&redirect_uri=${encodeURIComponent(cleanRedirectUri)}&scope=${encodeURIComponent(scopes)}&response_type=code&state=${encodeURIComponent(state)}`;
}

/**
 * Exchange OAuth Code for User Access Token, Upgrade to Long-Lived Token,
 * and Retrieve All Facebook Pages & Instagram Accounts.
 */
export async function exchangeMetaOAuthCode({
  code,
  redirectUri,
  appId,
  appSecret,
}) {
  const Setting = getSetting();
  const settings = await Setting.getInstance();

  const activeAppId = (appId || settings.facebookAppId || '970580869378166').trim();
  const activeSecret = (appSecret || settings.facebookAppSecret || process.env.META_APP_SECRET || '').trim();
  const activeRedirectUri = (redirectUri || DEFAULT_META_REDIRECT_URI).trim();

  if (!code) {
    throw new Error('Authorization code is required to complete Facebook login.');
  }
  if (!activeSecret) {
    throw new Error('Meta App Secret is not set. Add it under Admin > Social Settings or set META_APP_SECRET on the server.');
  }

  // 1. Exchange code for access token
  const tokenUrl = `${GRAPH_API_BASE}/oauth/access_token?client_id=${encodeURIComponent(activeAppId)}&redirect_uri=${encodeURIComponent(activeRedirectUri)}&client_secret=${encodeURIComponent(activeSecret)}&code=${encodeURIComponent(code)}`;

  const tokenRes = await fetch(tokenUrl);
  const tokenData = await tokenRes.json();

  if (!tokenRes.ok || tokenData.error) {
    throw new Error(formatMetaError(tokenData, tokenRes) || 'Failed to exchange authorization code for Meta token.');
  }

  let userAccessToken = tokenData.access_token;

  // 2. If appSecret is available, exchange for a 60-day Long-Lived User Access Token
  if (activeSecret && userAccessToken) {
    try {
      const longLivedUrl = `${GRAPH_API_BASE}/oauth/access_token?grant_type=fb_exchange_token&client_id=${encodeURIComponent(activeAppId)}&client_secret=${encodeURIComponent(activeSecret)}&fb_exchange_token=${encodeURIComponent(userAccessToken)}`;
      const longRes = await fetch(longLivedUrl);
      const longData = await longRes.json();
      if (longRes.ok && longData.access_token) {
        userAccessToken = longData.access_token;
      }
    } catch (longErr) {
      console.warn('Notice: Could not exchange for long-lived token, using short-lived token:', longErr.message);
    }
  }

  // 3. Fetch all managed pages with their permanent Page Access Tokens
  const pagesResult = await resolveAndVerifyMetaCredentials({
    accessToken: userAccessToken,
  });

  return {
    success: true,
    userAccessToken,
    availablePages: pagesResult.availablePages || [],
    selectedPage: pagesResult.page || null,
    selectedPageToken: pagesResult.pageAccessToken || userAccessToken,
    instagram: pagesResult.instagram || null,
  };
}
