import { getSetting } from '../models/Setting.js';

const GRAPH_API_VERSION = 'v19.0';
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

/**
 * Format a social post caption using the configured template and product data.
 */
export function formatSocialCaption(template, product, clientOrigin = '') {
  const origin = (clientOrigin || process.env.CLIENT_ORIGIN?.split(',')[0] || 'http://localhost:4200').replace(/\/$/, '');
  const productUrl = `${origin}/product/${product.slug || product.id}`;
  
  let discountText = '';
  if (product.compareAtPrice && Number(product.compareAtPrice) > Number(product.price)) {
    const savings = Math.round(Number(product.compareAtPrice) - Number(product.price));
    const percent = Math.round((savings / Number(product.compareAtPrice)) * 100);
    discountText = `🔥 Special Offer: ${percent}% OFF (Was Rs ${Number(product.compareAtPrice).toLocaleString()}, Save Rs ${savings.toLocaleString()})!`;
  }

  const defaultTemplate =
    '✨ New Arrival at WonderCart! ✨\n\n🛍️ {product_name}\n💰 Price: Rs {price}\n{discount_text}\n\n👉 Order now: {product_url}\n\n#WonderCart #BabyShop #OnlineShopping';

  const tpl = template || defaultTemplate;

  return tpl
    .replace(/\{product_name\}/g, product.name || 'Product')
    .replace(/\{brand\}/g, product.brand || 'WonderCart')
    .replace(/\{price\}/g, Number(product.price || 0).toLocaleString())
    .replace(/\{compare_at_price\}/g, product.compareAtPrice ? Number(product.compareAtPrice).toLocaleString() : '')
    .replace(/\{discount_text\}/g, discountText)
    .replace(/\{product_url\}/g, productUrl)
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
 * Test & verify Facebook Page ID and Page Access Token.
 */
export async function verifyFacebookConnection(pageId, pageAccessToken) {
  if (!pageId || !pageAccessToken) {
    throw new Error('Both Facebook Page ID and Page Access Token are required.');
  }

  const url = `${GRAPH_API_BASE}/${encodeURIComponent(pageId.trim())}?fields=id,name,picture{url},link,username&access_token=${encodeURIComponent(pageAccessToken.trim())}`;
  
  const response = await fetch(url);
  const data = await response.json();

  if (!response.ok || data.error) {
    const errorMsg = data.error?.message || `Facebook API error (${response.status})`;
    throw new Error(errorMsg);
  }

  return {
    id: data.id,
    name: data.name,
    username: data.username || '',
    link: data.link || `https://facebook.com/${data.id}`,
    pictureUrl: data.picture?.data?.url || '',
  };
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
    const errorMsg = data.error?.message || `Instagram API error (${response.status})`;
    throw new Error(errorMsg);
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
 */
export async function postProductToFacebook({
  product,
  customMessage = null,
  pageId = null,
  accessToken = null,
  clientOrigin = '',
  serverOrigin = '',
}) {
  const Setting = getSetting();
  const settings = await Setting.getInstance();

  const activePageId = (pageId || settings.facebookPageId || '').trim();
  const activeToken = (accessToken || settings.facebookPageAccessToken || '').trim();

  if (!activePageId || !activeToken) {
    throw new Error('Facebook Page credentials not configured. Please set them in Admin > Facebook Settings.');
  }

  const caption = customMessage || formatSocialCaption(settings.socialPostTemplate, product, clientOrigin);
  const rawImage = Array.isArray(product.images) && product.images.length > 0 ? product.images[0] : '';
  const imageUrl = resolveImageUrl(rawImage, serverOrigin);

  let postResult;

  // If we have a publicly accessible photo URL, use Facebook photos endpoint for best visual engagement
  if (imageUrl && (imageUrl.startsWith('https://') || !imageUrl.includes('localhost'))) {
    const photoUrl = `${GRAPH_API_BASE}/${encodeURIComponent(activePageId)}/photos`;
    const response = await fetch(photoUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: imageUrl,
        caption: caption,
        access_token: activeToken,
      }),
    });

    const data = await response.json();
    if (!response.ok || data.error) {
      // If photo upload fails due to image URL, fallback to feed post
      const fallbackUrl = `${GRAPH_API_BASE}/${encodeURIComponent(activePageId)}/feed`;
      const origin = (clientOrigin || process.env.CLIENT_ORIGIN?.split(',')[0] || '').replace(/\/$/, '');
      const link = origin ? `${origin}/product/${product.slug || product.id}` : undefined;

      const feedRes = await fetch(fallbackUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: caption,
          link,
          access_token: activeToken,
        }),
      });
      const feedData = await feedRes.json();
      if (!feedRes.ok || feedData.error) {
        throw new Error(data.error?.message || feedData.error?.message || 'Failed to post on Facebook');
      }
      postResult = feedData;
    } else {
      postResult = data;
    }
  } else {
    // Feed post
    const feedUrl = `${GRAPH_API_BASE}/${encodeURIComponent(activePageId)}/feed`;
    const origin = (clientOrigin || process.env.CLIENT_ORIGIN?.split(',')[0] || '').replace(/\/$/, '');
    const link = origin ? `${origin}/product/${product.slug || product.id}` : undefined;

    const response = await fetch(feedUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: caption,
        link,
        access_token: activeToken,
      }),
    });

    const data = await response.json();
    if (!response.ok || data.error) {
      throw new Error(data.error?.message || 'Failed to post on Facebook');
    }
    postResult = data;
  }

  return {
    success: true,
    platform: 'facebook',
    id: postResult.id || postResult.post_id,
    message: 'Successfully posted to Facebook Page!',
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
}) {
  const Setting = getSetting();
  const settings = await Setting.getInstance();

  const activeIgId = (igAccountId || settings.instagramAccountId || '').trim();
  const activeToken = (accessToken || settings.facebookPageAccessToken || '').trim();

  if (!activeIgId || !activeToken) {
    throw new Error('Instagram Business Account ID or Access Token not configured. Please set them in Admin > Facebook Settings.');
  }

  const rawImage = Array.isArray(product.images) && product.images.length > 0 ? product.images[0] : '';
  const imageUrl = resolveImageUrl(rawImage, serverOrigin);

  if (!imageUrl) {
    throw new Error('Instagram posts require at least one product photo.');
  }

  const caption = customCaption || formatSocialCaption(settings.socialPostTemplate, product, clientOrigin);

  // Step 1: Create media container
  const containerUrl = `${GRAPH_API_BASE}/${encodeURIComponent(activeIgId)}/media`;
  const containerRes = await fetch(containerUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      image_url: imageUrl,
      caption: caption,
      access_token: activeToken,
    }),
  });

  const containerData = await containerRes.json();
  if (!containerRes.ok || containerData.error) {
    throw new Error(containerData.error?.message || 'Failed to create Instagram container.');
  }

  const creationId = containerData.id;

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
    throw new Error(publishData.error?.message || 'Failed to publish to Instagram.');
  }

  return {
    success: true,
    platform: 'instagram',
    id: publishData.id,
    message: 'Successfully posted to Instagram!',
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
} = {}) {
  const results = { facebook: null, instagram: null, errors: [] };

  if (postToFacebook) {
    try {
      results.facebook = await postProductToFacebook({
        product,
        customMessage,
        clientOrigin,
        serverOrigin,
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
      });
    } catch (err) {
      console.error('Instagram Auto-Post Error:', err.message);
      results.errors.push(`Instagram: ${err.message}`);
    }
  }

  return results;
}
