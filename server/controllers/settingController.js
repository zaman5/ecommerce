import { getSetting } from '../models/Setting.js';
import { invalidateCache } from '../middleware/cache.js';
import {
  verifyFacebookConnection,
  verifyInstagramConnection,
  resolveAndVerifyMetaCredentials,
} from '../services/socialService.js';

// GET /api/settings/public  (public — returns site name, logo, uan, contact info, payment info, social urls)
export async function getPublicSettings(req, res, next) {
  try {
    const Setting = getSetting();
    const settings = await Setting.getInstance();
    res.json({
      siteName: settings.siteName || 'WonderCart',
      logoUrl: settings.logoUrl || '/uploads/logo.png',
      uan: settings.uan || '[To be updated]',
      supportEmail: settings.supportEmail || 'support@wondercart.pk',
      supportHours: settings.supportHours || 'Monday to Saturday, 9am – 6pm (PKT)',
      easypaisaPhone: settings.jazzcashPhone || '03038164288',
      easypaisaQrImage: settings.jazzcashQrImage || '',
      jazzcashPhone: settings.jazzcashPhone || '03038164288',
      jazzcashQrImage: settings.jazzcashQrImage || '',
      facebookUrl: settings.facebookUrl || 'https://www.facebook.com/share/1GPTAFhAcv/?mibextid=wwXIfr',
      instagramUrl: settings.instagramUrl || 'https://www.instagram.com/wondercartpaksitan?igsh=cG1yNWIzcWpzZjR4&utm_source=qr',
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/settings/contact (public)
export async function getContactSettings(req, res, next) {
  try {
    const Setting = getSetting();
    const settings = await Setting.getInstance();
    res.json({
      uan: settings.uan || '[To be updated]',
      supportEmail: settings.supportEmail || 'support@wondercart.pk',
      supportHours: settings.supportHours || 'Monday to Saturday, 9am – 6pm (PKT)',
    });
  } catch (err) {
    next(err);
  }
}

// PUT /api/settings/contact (admin only — update UAN, email, support hours)
export async function updateContactSettings(req, res, next) {
  try {
    const Setting = getSetting();
    const { uan, supportEmail, supportHours } = req.body;
    const settings = await Setting.getInstance();

    if (uan !== undefined) settings.uan = String(uan).trim();
    if (supportEmail !== undefined) settings.supportEmail = String(supportEmail).trim();
    if (supportHours !== undefined) settings.supportHours = String(supportHours).trim();

    await settings.save();
    invalidateCache(['settings']);

    res.json({
      uan: settings.uan,
      supportEmail: settings.supportEmail,
      supportHours: settings.supportHours,
    });
  } catch (err) {
    next(err);
  }
}

// PUT /api/settings/general  (admin only — update site name, logo URL, UAN)
export async function updateGeneralSettings(req, res, next) {
  try {
    const Setting = getSetting();
    const { siteName, logoUrl, uan, supportEmail, supportHours } = req.body;
    const settings = await Setting.getInstance();

    if (siteName !== undefined) settings.siteName = String(siteName).trim();
    if (logoUrl !== undefined) settings.logoUrl = String(logoUrl).trim();
    if (uan !== undefined) settings.uan = String(uan).trim();
    if (supportEmail !== undefined) settings.supportEmail = String(supportEmail).trim();
    if (supportHours !== undefined) settings.supportHours = String(supportHours).trim();

    await settings.save();
    invalidateCache(['settings']);

    res.json({
      siteName: settings.siteName,
      logoUrl: settings.logoUrl,
      uan: settings.uan,
      supportEmail: settings.supportEmail,
      supportHours: settings.supportHours,
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/settings/easypaisa & /api/settings/jazzcash  (public — shown at checkout)
export async function getPaymentSettings(req, res, next) {
  try {
    const Setting = getSetting();
    const settings = await Setting.getInstance();
    res.json({
      phone: settings.jazzcashPhone || '',
      qrImage: settings.jazzcashQrImage || '',
      easypaisaPhone: settings.jazzcashPhone || '',
      easypaisaQrImage: settings.jazzcashQrImage || '',
    });
  } catch (err) {
    next(err);
  }
}
export const getJazzCash = getPaymentSettings;
export const getEasyPaisa = getPaymentSettings;

// PUT /api/settings/easypaisa & /api/settings/jazzcash  (admin only)
export async function updatePaymentSettings(req, res, next) {
  try {
    const Setting = getSetting();
    const { phone, qrImage, easypaisaPhone, easypaisaQrImage } = req.body;
    const settings = await Setting.getInstance();

    const targetPhone = phone ?? easypaisaPhone;
    const targetQr = qrImage ?? easypaisaQrImage;

    if (targetPhone !== undefined) settings.jazzcashPhone = String(targetPhone).trim();
    if (targetQr !== undefined) settings.jazzcashQrImage = String(targetQr);

    await settings.save();
    invalidateCache(['settings']);

    res.json({
      phone: settings.jazzcashPhone,
      qrImage: settings.jazzcashQrImage,
      easypaisaPhone: settings.jazzcashPhone,
      easypaisaQrImage: settings.jazzcashQrImage,
    });
  } catch (err) {
    next(err);
  }
}
export const updateJazzCash = updatePaymentSettings;
export const updateEasyPaisa = updatePaymentSettings;

// GET /api/settings/social  (admin only)
export async function getSocialSettings(req, res, next) {
  try {
    const Setting = getSetting();
    const settings = await Setting.getInstance();
    res.json({
      facebookUrl: settings.facebookUrl || 'https://www.facebook.com/share/1GPTAFhAcv/?mibextid=wwXIfr',
      instagramUrl: settings.instagramUrl || 'https://www.instagram.com/wondercartpaksitan?igsh=cG1yNWIzcWpzZjR4&utm_source=qr',
      facebookAppId: settings.facebookAppId || '970580869378166',
      // Never send the App Secret to the browser; only say whether one is stored.
      facebookAppSecret: '',
      facebookAppSecretSet: Boolean(settings.facebookAppSecret || process.env.META_APP_SECRET),
      facebookPageId: settings.facebookPageId || '',
      facebookPageName: settings.facebookPageName || '',
      facebookPageAccessToken: settings.facebookPageAccessToken || '',
      facebookAutoPost: Boolean(settings.facebookAutoPost),
      instagramAccountId: settings.instagramAccountId || '',
      instagramUsername: settings.instagramUsername || '',
      instagramAutoPost: Boolean(settings.instagramAutoPost),
      socialPostTemplate: settings.socialPostTemplate || '',
      isConfigured: Boolean(settings.facebookPageId && settings.facebookPageAccessToken),
    });
  } catch (err) {
    next(err);
  }
}

// PUT /api/settings/social  (admin only)
export async function updateSocialSettings(req, res, next) {
  try {
    const Setting = getSetting();
    const {
      facebookUrl,
      instagramUrl,
      facebookAppId,
      facebookAppSecret,
      facebookPageId,
      facebookPageName,
      facebookPageAccessToken,
      facebookAutoPost,
      instagramAccountId,
      instagramUsername,
      instagramAutoPost,
      socialPostTemplate,
    } = req.body;

    const settings = await Setting.getInstance();

    if (facebookUrl !== undefined) settings.facebookUrl = String(facebookUrl).trim();
    if (instagramUrl !== undefined) settings.instagramUrl = String(instagramUrl).trim();
    if (facebookAppId !== undefined) settings.facebookAppId = String(facebookAppId).trim();
    // Blank means "keep the stored secret" since the form never receives it.
    if (facebookAppSecret !== undefined && String(facebookAppSecret).trim()) {
      settings.facebookAppSecret = String(facebookAppSecret).trim();
    }
    if (facebookPageId !== undefined) settings.facebookPageId = String(facebookPageId).trim();
    if (facebookPageName !== undefined) settings.facebookPageName = String(facebookPageName).trim();
    if (facebookPageAccessToken !== undefined) settings.facebookPageAccessToken = String(facebookPageAccessToken).trim();
    if (facebookAutoPost !== undefined) settings.facebookAutoPost = Boolean(facebookAutoPost);
    if (instagramAccountId !== undefined) settings.instagramAccountId = String(instagramAccountId).trim();
    if (instagramUsername !== undefined) settings.instagramUsername = String(instagramUsername).trim();
    if (instagramAutoPost !== undefined) settings.instagramAutoPost = Boolean(instagramAutoPost);
    if (socialPostTemplate !== undefined) settings.socialPostTemplate = String(socialPostTemplate);

    // If token was provided but no Page ID, attempt to auto-resolve
    if (settings.facebookPageAccessToken && !settings.facebookPageId) {
      try {
        const { resolveAndVerifyMetaCredentials } = await import('../services/socialService.js');
        const resolved = await resolveAndVerifyMetaCredentials({
          accessToken: settings.facebookPageAccessToken,
          instagramAccountId: settings.instagramAccountId,
        });
        if (resolved?.page?.id) {
          settings.facebookPageId = resolved.page.id;
          settings.facebookPageName = resolved.page.name || settings.facebookPageName;
          if (resolved.pageAccessToken) {
            settings.facebookPageAccessToken = resolved.pageAccessToken;
          }
          if (resolved.instagram?.id && !settings.instagramAccountId) {
            settings.instagramAccountId = resolved.instagram.id;
            settings.instagramUsername = resolved.instagram.username || settings.instagramUsername;
          }
        }
      } catch (autoErr) {
        // Non-fatal if auto-resolution fails during basic update
      }
    }

    await settings.save();
    invalidateCache(['settings']);

    res.json({
      facebookUrl: settings.facebookUrl,
      instagramUrl: settings.instagramUrl,
      facebookAppId: settings.facebookAppId,
      facebookAppSecret: settings.facebookAppSecret,
      facebookPageId: settings.facebookPageId,
      facebookPageName: settings.facebookPageName,
      facebookPageAccessToken: settings.facebookPageAccessToken,
      facebookAutoPost: settings.facebookAutoPost,
      instagramAccountId: settings.instagramAccountId,
      instagramUsername: settings.instagramUsername,
      instagramAutoPost: settings.instagramAutoPost,
      socialPostTemplate: settings.socialPostTemplate,
      isConfigured: Boolean(settings.facebookPageId && settings.facebookPageAccessToken),
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/settings/social/oauth-url  (admin only)
export async function getMetaOAuthUrl(req, res, next) {
  try {
    const Setting = getSetting();
    const settings = await Setting.getInstance();
    const { redirectUri, includeInstagram } = req.query;

    const { generateMetaOAuthUrl, DEFAULT_META_REDIRECT_URI } = await import('../services/socialService.js');
    const url = generateMetaOAuthUrl({
      appId: settings.facebookAppId || '970580869378166',
      redirectUri: redirectUri || DEFAULT_META_REDIRECT_URI,
      includeInstagram: includeInstagram === 'true',
    });

    res.json({
      success: true,
      url,
      appId: settings.facebookAppId || '970580869378166',
      redirectUri: redirectUri || DEFAULT_META_REDIRECT_URI,
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/settings/social/exchange-token  (admin only)
export async function exchangeMetaToken(req, res) {
  try {
    const { code, redirectUri } = req.body || {};
    if (!code) {
      return res.status(400).json({ success: false, message: 'Authorization code is required.' });
    }

    const { exchangeMetaOAuthCode } = await import('../services/socialService.js');
    const result = await exchangeMetaOAuthCode({
      code,
      redirectUri,
    });

    res.json(result);
  } catch (err) {
    console.error('🚨 [Meta OAuth Exchange Error]:', err.message);
    res.status(400).json({
      success: false,
      message: err.message || 'Failed to exchange Facebook login code.',
    });
  }
}

// POST /api/settings/social/select-page  (admin only)
export async function selectMetaPage(req, res, next) {
  try {
    const Setting = getSetting();
    const settings = await Setting.getInstance();
    const { pageId, pageName, pageAccessToken, instagramAccountId, instagramUsername } = req.body || {};

    if (!pageId || !pageAccessToken) {
      return res.status(400).json({ success: false, message: 'Page ID and Page Access Token are required.' });
    }

    settings.facebookPageId = String(pageId).trim();
    if (pageName) settings.facebookPageName = String(pageName).trim();
    settings.facebookPageAccessToken = String(pageAccessToken).trim();
    settings.facebookAutoPost = true;

    if (instagramAccountId) settings.instagramAccountId = String(instagramAccountId).trim();
    if (instagramUsername) settings.instagramUsername = String(instagramUsername).trim();

    await settings.save();
    invalidateCache(['settings']);

    res.json({
      success: true,
      message: `Facebook connected: ${settings.facebookPageName || settings.facebookPageId} ✅`,
      page: {
        id: settings.facebookPageId,
        name: settings.facebookPageName,
      },
      instagram: settings.instagramAccountId ? {
        id: settings.instagramAccountId,
        username: settings.instagramUsername,
      } : null,
      facebookAutoPost: settings.facebookAutoPost,
      isConfigured: true,
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/settings/social/disconnect  (admin only)
export async function disconnectMeta(req, res, next) {
  try {
    const Setting = getSetting();
    const settings = await Setting.getInstance();

    settings.facebookPageId = '';
    settings.facebookPageName = '';
    settings.facebookPageAccessToken = '';
    settings.facebookAutoPost = false;
    settings.instagramAccountId = '';
    settings.instagramUsername = '';
    settings.instagramAutoPost = false;

    await settings.save();
    invalidateCache(['settings']);

    res.json({
      success: true,
      message: 'Facebook & Instagram disconnected successfully.',
      isConfigured: false,
    });
  } catch (err) {
    next(err);
  }
}

// POST /api/settings/social/test  (admin only)
export async function testSocialConnection(req, res) {
  try {
    const Setting = getSetting();
    const settings = await Setting.getInstance();

    const {
      facebookPageId = settings.facebookPageId,
      facebookPageAccessToken = settings.facebookPageAccessToken,
      instagramAccountId = settings.instagramAccountId,
    } = req.body || {};

    const pageId = String(facebookPageId || '').trim();
    const token = String(facebookPageAccessToken || '').trim();
    const igId = String(instagramAccountId || '').trim();

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Facebook Page Access Token is required to test or auto-detect connection.',
      });
    }

    const { resolveAndVerifyMetaCredentials } = await import('../services/socialService.js');
    const metaResult = await resolveAndVerifyMetaCredentials({
      pageId,
      accessToken: token,
      instagramAccountId: igId,
    });

    res.json({
      success: true,
      message: `Successfully connected to Facebook Page: "${metaResult.page.name}"!`,
      page: metaResult.page,
      resolvedPageId: metaResult.page.id,
      resolvedPageToken: metaResult.pageAccessToken,
      resolvedInstagramId: metaResult.instagram?.id || null,
      availablePages: metaResult.availablePages || [],
      instagram: metaResult.instagram,
      instagramError: metaResult.instagramError,
    });
  } catch (err) {
    console.error('🚨 [Meta Connection Test Error]:', err.message);
    res.status(400).json({
      success: false,
      message: err.message || 'Failed to connect to Meta API. Please check your Access Token.',
    });
  }
}

// GET /api/settings/social/recent-posts (admin & shopmanager)
export async function getRecentSocialPosts(req, res, next) {
  try {
    const { getRecentFacebookPosts } = await import('../services/socialService.js');
    const result = await getRecentFacebookPosts({ limit: req.query.limit || 10 });
    res.json(result);
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message || 'Could not fetch recent posts from Facebook Page.',
      posts: [],
    });
  }
}


