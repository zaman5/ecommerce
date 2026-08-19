import EmailTemplate from '../models/EmailTemplate.js';
import { getAllTemplates, getTemplate, sendTestEmail } from '../utils/emailService.js';

export async function getTemplates(req, res) {
  try {
    const list = await getAllTemplates();
    res.json(list);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch email templates.' });
  }
}

export async function getTemplateByType(req, res) {
  try {
    const { type } = req.params;
    const template = await getTemplate(type);
    if (!template) {
      return res.status(404).json({ message: 'Template not found.' });
    }
    res.json(template);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch template.' });
  }
}

export async function updateTemplate(req, res) {
  try {
    const { type } = req.params;
    const {
      title,
      subject,
      heading,
      subtitle,
      customMessage,
      closingMessage,
      footerText,
      brandColor,
      headerBanner,
      attachments,
      isActive,
    } = req.body;

    let template = await EmailTemplate.findOne({ type });
    if (!template) {
      template = new EmailTemplate({ type, title: title || type });
    }

    if (title !== undefined) template.title = title;
    if (subject !== undefined) template.subject = subject;
    if (heading !== undefined) template.heading = heading;
    if (subtitle !== undefined) template.subtitle = subtitle;
    if (customMessage !== undefined) template.customMessage = customMessage;
    if (closingMessage !== undefined) template.closingMessage = closingMessage;
    if (footerText !== undefined) template.footerText = footerText;
    if (brandColor !== undefined) template.brandColor = brandColor;
    if (headerBanner !== undefined) template.headerBanner = headerBanner;
    if (attachments !== undefined) template.attachments = attachments;
    if (isActive !== undefined) template.isActive = isActive;

    await template.save();
    res.json(template);
  } catch (err) {
    res.status(400).json({ message: err.message || 'Failed to update email template.' });
  }
}

export async function testSend(req, res) {
  try {
    const { to, type, template } = req.body;
    if (!to) {
      return res.status(400).json({ message: 'Recipient email is required for test send.' });
    }

    const result = await sendTestEmail({ to, type, templateOverrides: template });
    if (result.success) {
      res.json({ message: `Test email sent successfully to ${to}!`, messageId: result.messageId });
    } else {
      res.status(500).json({ message: result.error || 'Failed to send test email.' });
    }
  } catch (err) {
    res.status(500).json({ message: err.message || 'Error occurred while sending test email.' });
  }
}
