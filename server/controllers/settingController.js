import { getSetting } from '../models/Setting.js';
import { verifyFacebookConnection, verifyInstagramConnection } from '../services/socialService.js';

// GET /api/settings/public  (public — returns site name, logo, jazzcash info)
export async function getPublicSettings(req, res, next) {
  try {
    const Setting = getSetting();
    const settings = await Setting.getInstance();
    res.json({
      siteName: settings.siteName || 'WonderCart',
      logoUrl: settings.logoUrl || '/uploads/logo.png',
      jazzcashPhone: settings.jazzcashPhone || '03038164288',
      jazzcashQrImage: settings.jazzcashQrImage || '',
    });
  } catch (err) {
    next(err);
  }
}

// PUT /api/settings/general  (admin only — update site name and logo URL)
export async function updateGeneralSettings(req, res, next) {
  try {
    const Setting = getSetting();
    const { siteName, logoUrl } = req.body;
    const settings = await Setting.getInstance();

    if (siteName !== undefined) settings.siteName = String(siteName).trim();
    if (logoUrl !== undefined) settings.logoUrl = String(logoUrl).trim();

    await settings.save();
    res.json({
      siteName: settings.siteName,
      logoUrl: settings.logoUrl,
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/settings/jazzcash  (public — shown at checkout)
export async function getJazzCash(req, res, next) {
  try {
    const Setting = getSetting();
    const settings = await Setting.getInstance();
    res.json({
      phone: settings.jazzcashPhone,
      qrImage: settings.jazzcashQrImage,
    });
  } catch (err) {
    next(err);
  }
}

// PUT /api/settings/jazzcash  (admin only)
export async function updateJazzCash(req, res, next) {
  try {
    const Setting = getSetting();
    const { phone, qrImage } = req.body;
    const settings = await Setting.getInstance();

    if (phone !== undefined) settings.jazzcashPhone = phone.trim();
    if (qrImage !== undefined) settings.jazzcashQrImage = qrImage;

    await settings.save();
    res.json({
      phone: settings.jazzcashPhone,
      qrImage: settings.jazzcashQrImage,
    });
  } catch (err) {
    next(err);
  }
}

// GET /api/settings/social  (admin only)
export async function getSocialSettings(req, res, next) {
  try {
    const Setting = getSetting();
    const settings = await Setting.getInstance();
    res.json({
      facebookPageId: settings.facebookPageId || '',
      facebookPageAccessToken: settings.facebookPageAccessToken || '',
      facebookAutoPost: Boolean(settings.facebookAutoPost),
      instagramAccountId: settings.instagramAccountId || '',
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
      facebookPageId,
      facebookPageAccessToken,
      facebookAutoPost,
      instagramAccountId,
      instagramAutoPost,
      socialPostTemplate,
    } = req.body;

    const settings = await Setting.getInstance();

    if (facebookPageId !== undefined) settings.facebookPageId = String(facebookPageId).trim();
    if (facebookPageAccessToken !== undefined) settings.facebookPageAccessToken = String(facebookPageAccessToken).trim();
    if (facebookAutoPost !== undefined) settings.facebookAutoPost = Boolean(facebookAutoPost);
    if (instagramAccountId !== undefined) settings.instagramAccountId = String(instagramAccountId).trim();
    if (instagramAutoPost !== undefined) settings.instagramAutoPost = Boolean(instagramAutoPost);
    if (socialPostTemplate !== undefined) settings.socialPostTemplate = String(socialPostTemplate);

    await settings.save();

    res.json({
      facebookPageId: settings.facebookPageId,
      facebookPageAccessToken: settings.facebookPageAccessToken,
      facebookAutoPost: settings.facebookAutoPost,
      instagramAccountId: settings.instagramAccountId,
      instagramAutoPost: settings.instagramAutoPost,
      socialPostTemplate: settings.socialPostTemplate,
      isConfigured: Boolean(settings.facebookPageId && settings.facebookPageAccessToken),
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

    if (!pageId || !token) {
      return res.status(400).json({
        success: false,
        message: 'Facebook Page ID and Page Access Token are required to test connection.',
      });
    }

    // Test Facebook Page
    const pageData = await verifyFacebookConnection(pageId, token);
    
    let instagramData = null;
    let instagramError = null;

    if (igId) {
      try {
        instagramData = await verifyInstagramConnection(igId, token);
      } catch (igErr) {
        instagramError = igErr.message;
      }
    }

    res.json({
      success: true,
      message: `Successfully connected to Facebook Page: "${pageData.name}"!`,
      page: pageData,
      instagram: instagramData,
      instagramError,
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: err.message || 'Failed to connect to Meta API.',
    });
  }
}
