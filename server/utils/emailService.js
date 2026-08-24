import path from 'path';
import fs from 'fs';
import nodemailer from 'nodemailer';
import { getEmailTemplate } from '../models/EmailTemplate.js';
import { UPLOAD_DIR } from '../routes/uploadRoutes.js';

const DEFAULT_TEMPLATES = {
  order_confirmation: {
    type: 'order_confirmation',
    title: 'Order Confirmation',
    subject: 'Order Confirmed: #{{orderNumber}} — Wondercart',
    heading: 'Thank You for Your Order!',
    subtitle: "We've received your order and our team is getting it ready.",
    customMessage: 'Your order has been placed successfully. Below are the complete details of your purchase.',
    closingMessage: 'We will send you another notification with tracking details as soon as your parcel is dispatched.',
    footerText: 'Need help? Contact us at orders@wondercart.pk or WhatsApp 0303-8164288.',
    brandColor: '#1f6b60',
    headerBanner: '',
    isActive: true,
  },
  order_shipped: {
    type: 'order_shipped',
    title: 'Order Dispatched / Shipped',
    subject: 'Your Order is on the Way: #{{orderNumber}} — Wondercart',
    heading: 'Great News, Your Order Has Shipped! 🚚',
    subtitle: 'Your package has been dispatched from our warehouse.',
    customMessage: 'Your parcel is in transit. Please see the courier dispatch and tracking details below.',
    closingMessage: 'Please ensure someone is available at the destination address to receive the package.',
    footerText: 'Have questions about delivery? Reply to this email or contact support@wondercart.pk.',
    brandColor: '#2563eb',
    headerBanner: '',
    isActive: true,
  },
  order_delivered: {
    type: 'order_delivered',
    title: 'Order Delivered',
    subject: 'Order Delivered: #{{orderNumber}} — Wondercart',
    heading: 'Package Delivered! 🎉',
    subtitle: 'Your order has been successfully delivered.',
    customMessage: 'We hope you love your new purchase! Please take a moment to share your feedback and leave a product review.',
    closingMessage: 'Thank you for choosing Wondercart. We look forward to serving you again soon!',
    footerText: 'Thank you for shopping with Wondercart.',
    brandColor: '#16a34a',
    headerBanner: '',
    isActive: true,
  },
};

let transporterInstance = null;

function getTransporter() {
  if (!transporterInstance) {
    const host = process.env.SMTP_HOST || '';
    const port = parseInt(process.env.SMTP_PORT || '465', 10);
    const secure = process.env.SMTP_SECURE !== 'false';
    const user = process.env.SMTP_USER || '';
    const pass = process.env.SMTP_PASS || '';

    transporterInstance = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
      tls: {
        rejectUnauthorized: false,
      },
    });
  }
  return transporterInstance;
}

export async function getTemplate(type) {
  try {
    const EmailTemplate = getEmailTemplate();
    let t = await EmailTemplate.findOne({
      where: { type },
      include: [{ association: 'attachments' }],
    });
    if (!t) {
      const def = DEFAULT_TEMPLATES[type];
      if (def) {
        t = await EmailTemplate.create(def);
      }
    }
    return t || DEFAULT_TEMPLATES[type];
  } catch (err) {
    console.error(`Error loading email template ${type}:`, err);
    return DEFAULT_TEMPLATES[type];
  }
}

export async function getAllTemplates() {
  const types = ['order_confirmation', 'order_shipped', 'order_delivered'];
  const list = [];
  for (const type of types) {
    list.push(await getTemplate(type));
  }
  return list;
}

function formatCurrency(amount) {
  return 'Rs ' + Number(amount || 0).toLocaleString('en-PK');
}

export function buildEmailHtml(template, order, sampleMode = false) {
  const brandColor = template.brandColor || '#1f6b60';
  const orderNum = order?.orderNumber || (sampleMode ? '#BS-SAMPLE-999' : '—');
  const customerName =
    order?.shippingFullName ||
    order?.shippingAddress?.fullName ||
    order?.user?.name ||
    (sampleMode ? 'Valued Customer' : 'Customer');
  const phone = order?.shippingPhone || order?.shippingAddress?.phone || (sampleMode ? '0303-8164288' : '—');
  
  const addressParts = order?.shippingAddress
    ? [
        order.shippingAddress.line1,
        order.shippingAddress.city,
        order.shippingAddress.province,
        order.shippingAddress.postalCode,
      ]
    : [
        order?.shippingLine1,
        order?.shippingCity,
        order?.shippingProvince,
        order?.shippingPostalCode,
      ];
  
  const address = addressParts.filter(Boolean).join(', ') || (sampleMode ? 'House 123, Street 4, Sector F-7/2, Islamabad' : '—');

  const payMethod = (order?.paymentMethod || 'cod').toUpperCase();
  const payStatus = (order?.paymentStatus || 'unpaid').toUpperCase();
  const itemsTotal = formatCurrency(order?.itemsTotal || (sampleMode ? 3500 : 0));
  const shippingFee = formatCurrency(order?.shippingFee || (sampleMode ? 250 : 0));
  const grandTotal = formatCurrency(order?.grandTotal || (sampleMode ? 3750 : 0));

  const items = order?.items?.length
    ? order.items
    : sampleMode
    ? [
        {
          name: 'Wonder Baby Cotton Romper',
          color: 'Sky Blue',
          qty: 2,
          price: 1250,
        },
        {
          name: 'Toddler Learning Soft Blocks Set',
          color: '',
          qty: 1,
          price: 1000,
        },
      ]
    : [];

  const trackingList = order?.tracking || [];
  const trackingNote =
    trackingList.filter((t) => t.status === 'shipped')?.slice(-1)[0]?.note ||
    (sampleMode ? 'Dispatched via Leopard Courier tracking #LEO98471294' : '');

  const replaceTags = (text) => {
    if (!text) return '';
    return text
      .replace(/{{orderNumber}}/g, orderNum)
      .replace(/{{customerName}}/g, customerName)
      .replace(/{{grandTotal}}/g, grandTotal)
      .replace(/{{itemsTotal}}/g, itemsTotal)
      .replace(/{{shippingFee}}/g, shippingFee)
      .replace(/{{phone}}/g, phone)
      .replace(/{{trackingNote}}/g, trackingNote || 'Processing');
  };

  const subject = replaceTags(template.subject);
  const heading = replaceTags(template.heading);
  const subtitle = replaceTags(template.subtitle);
  const customMessage = replaceTags(template.customMessage);
  const closingMessage = replaceTags(template.closingMessage);
  const footerText = replaceTags(template.footerText);

  // Items table rows
  const itemsHtml = items
    .map(
      (item) => `
    <tr style="border-bottom: 1px solid #e2e8f0;">
      <td style="padding: 12px 8px; vertical-align: middle;">
        <strong style="color: #0f172a; font-size: 14px; display: block;">${item.name || 'Product'}</strong>
        ${item.color ? `<span style="font-size: 12px; color: #64748b;">Colour: <b>${item.color}</b></span>` : ''}
      </td>
      <td style="padding: 12px 8px; text-align: center; color: #334155; font-size: 14px; vertical-align: middle;">
        × ${item.qty}
      </td>
      <td style="padding: 12px 8px; text-align: right; color: #0f172a; font-weight: 700; font-size: 14px; vertical-align: middle;">
        ${formatCurrency((item.price || 0) * (item.qty || 1))}
      </td>
    </tr>
  `
    )
    .join('');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; line-height: 1.5;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f1f5f9; padding: 24px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e2e8f0;" cellspacing="0" cellpadding="0">
          
          <!-- Header Banner -->
          <tr>
            <td style="background-color: ${brandColor}; padding: 28px 24px; text-align: center; color: #ffffff;">
              ${
                template.headerBanner
                  ? `<img src="${template.headerBanner}" alt="Banner" style="max-width: 100%; height: auto; border-radius: 8px; margin-bottom: 12px; display: block;">`
                  : ''
              }
              <h1 style="margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; color: #ffffff;">
                ${heading}
              </h1>
              ${
                subtitle
                  ? `<p style="margin: 8px 0 0; font-size: 15px; color: rgba(255,255,255,0.9); font-weight: 500;">${subtitle}</p>`
                  : ''
              }
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 28px 24px;">

              <!-- Custom intro message -->
              ${
                customMessage
                  ? `<p style="font-size: 15px; color: #334155; margin: 0 0 20px; line-height: 1.6;">${customMessage}</p>`
                  : ''
              }

              <!-- Order Summary Box -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 16px 20px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td style="font-size: 13px; color: #64748b; font-weight: 600; text-transform: uppercase;">Order Number</td>
                        <td align="right" style="font-size: 15px; font-weight: 800; color: ${brandColor};">${orderNum}</td>
                      </tr>
                      <tr>
                        <td style="padding-top: 8px; font-size: 13px; color: #64748b; font-weight: 600; text-transform: uppercase;">Payment</td>
                        <td align="right" style="padding-top: 8px; font-size: 14px; font-weight: 700; color: #0f172a;">
                          ${payMethod} (${payStatus})
                        </td>
                      </tr>
                      ${
                        trackingNote
                          ? `
                      <tr>
                        <td style="padding-top: 8px; font-size: 13px; color: #64748b; font-weight: 600; text-transform: uppercase;">Tracking Details</td>
                        <td align="right" style="padding-top: 8px; font-size: 13px; font-weight: 700; color: #0f172a;">
                          ${trackingNote}
                        </td>
                      </tr>`
                          : ''
                      }
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Ordered Items -->
              <h3 style="margin: 0 0 12px; font-size: 16px; font-weight: 800; color: #0f172a;">Items Ordered</h3>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 20px; border-collapse: collapse;">
                <thead>
                  <tr style="background-color: #f8fafc; border-bottom: 2px solid #e2e8f0;">
                    <th align="left" style="padding: 10px 8px; font-size: 12px; color: #64748b; text-transform: uppercase;">Item</th>
                    <th align="center" style="padding: 10px 8px; font-size: 12px; color: #64748b; text-transform: uppercase;">Qty</th>
                    <th align="right" style="padding: 10px 8px; font-size: 12px; color: #64748b; text-transform: uppercase;">Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  ${itemsHtml}
                </tbody>
              </table>

              <!-- Totals -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-bottom: 24px; border-top: 2px solid #e2e8f0; padding-top: 12px;">
                <tr>
                  <td style="padding: 4px 0; font-size: 14px; color: #64748b;">Items Subtotal:</td>
                  <td align="right" style="padding: 4px 0; font-size: 14px; color: #0f172a; font-weight: 600;">${itemsTotal}</td>
                </tr>
                <tr>
                  <td style="padding: 4px 0; font-size: 14px; color: #64748b;">Delivery Fee:</td>
                  <td align="right" style="padding: 4px 0; font-size: 14px; color: #0f172a; font-weight: 600;">${shippingFee}</td>
                </tr>
                <tr>
                  <td style="padding: 10px 0 0; font-size: 17px; font-weight: 800; color: #0f172a;">Grand Total:</td>
                  <td align="right" style="padding: 10px 0 0; font-size: 20px; font-weight: 800; color: ${brandColor};">${grandTotal}</td>
                </tr>
              </table>

              <!-- Shipping Address -->
              <div style="background-color: #f8fafc; border-radius: 12px; padding: 16px; border: 1px solid #e2e8f0; margin-bottom: 24px;">
                <h4 style="margin: 0 0 8px; font-size: 14px; font-weight: 800; color: #0f172a; text-transform: uppercase;">Shipping To:</h4>
                <p style="margin: 0; font-size: 14px; color: #334155; line-height: 1.5;">
                  <strong>${customerName}</strong><br>
                  ${address}<br>
                  Phone: <strong>${phone}</strong>
                </p>
              </div>

              <!-- Closing Note -->
              ${
                closingMessage
                  ? `<p style="font-size: 14px; color: #64748b; margin: 0 0 20px; line-height: 1.5;">${closingMessage}</p>`
                  : ''
              }

              <div style="text-align: center; padding: 12px 0;">
                <a href="https://wondercart.pk" style="background-color: ${brandColor}; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 999px; font-weight: 700; font-size: 14px; display: inline-block;">
                  Visit Wondercart Store
                </a>
              </div>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 24px; text-align: center; font-size: 12px; color: #94a3b8;">
              <p style="margin: 0 0 6px;">${footerText || 'Wondercart — Everything for your family and home.'}</p>
              <p style="margin: 0;">© ${new Date().getFullYear()} Wondercart. All rights reserved.</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

function resolveAttachments(template) {
  if (!template?.attachments?.length) return [];
  return template.attachments
    .map((att) => {
      if (att.path && fs.existsSync(att.path)) {
        return { filename: att.name, path: att.path };
      }
      if (att.url && att.url.startsWith('/uploads/')) {
        const localPath = path.join(UPLOAD_DIR, path.basename(att.url));
        if (fs.existsSync(localPath)) {
          return { filename: att.name, path: localPath };
        }
      }
      return null;
    })
    .filter(Boolean);
}

export async function sendEmail({ to, subject, html, attachments = [] }) {
  if (!to) {
    console.warn('sendEmail skipped: no recipient email provided.');
    return { success: false, message: 'No recipient' };
  }

  const transporter = getTransporter();
  const from = process.env.SMTP_FROM || 'Wondercart Orders <orders@wondercart.pk>';

  try {
    const info = await transporter.sendMail({
      from,
      to,
      subject,
      html,
      attachments,
    });
    console.log(`📧 Email sent to ${to} (MessageId: ${info.messageId})`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error(`❌ Failed to send email to ${to}:`, err.message);
    return { success: false, error: err.message };
  }
}

export async function sendOrderConfirmation(order) {
  const recipient = order?.guestEmail || order?.user?.email || order?.shippingAddress?.email;
  if (!recipient) {
    console.warn(`No email found on order #${order?.orderNumber} for confirmation.`);
    return;
  }
  const tpl = await getTemplate('order_confirmation');
  if (!tpl.isActive) return;

  const html = buildEmailHtml(tpl, order);
  const attachments = resolveAttachments(tpl);
  const subject = tpl.subject.replace(/{{orderNumber}}/g, order.orderNumber);

  return sendEmail({ to: recipient, subject, html, attachments });
}

export async function sendOrderDispatched(order) {
  const recipient = order?.guestEmail || order?.user?.email || order?.shippingAddress?.email;
  if (!recipient) {
    console.warn(`No email found on order #${order?.orderNumber} for dispatch notification.`);
    return;
  }
  const tpl = await getTemplate('order_shipped');
  if (!tpl.isActive) return;

  const html = buildEmailHtml(tpl, order);
  const attachments = resolveAttachments(tpl);
  const subject = tpl.subject.replace(/{{orderNumber}}/g, order.orderNumber);

  return sendEmail({ to: recipient, subject, html, attachments });
}

export async function sendOrderDelivered(order) {
  const recipient = order?.guestEmail || order?.user?.email || order?.shippingAddress?.email;
  if (!recipient) {
    console.warn(`No email found on order #${order?.orderNumber} for delivery notification.`);
    return;
  }
  const tpl = await getTemplate('order_delivered');
  if (!tpl.isActive) return;

  const html = buildEmailHtml(tpl, order);
  const attachments = resolveAttachments(tpl);
  const subject = tpl.subject.replace(/{{orderNumber}}/g, order.orderNumber);

  return sendEmail({ to: recipient, subject, html, attachments });
}

export async function sendTestEmail({ to, type, templateOverrides }) {
  const baseTpl = await getTemplate(type || 'order_confirmation');
  const tpl = { ...(baseTpl.toJSON?.() || baseTpl), ...(templateOverrides || {}) };

  const html = buildEmailHtml(tpl, null, true);
  const attachments = resolveAttachments(tpl);
  const subject = `[TEST] ` + (tpl.subject || 'Wondercart Order Notification').replace(/{{orderNumber}}/g, 'BS-TEST-999');

  return sendEmail({ to, subject, html, attachments });
}
