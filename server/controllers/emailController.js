import { getEmailTemplate, getEmailAttachment } from '../models/EmailTemplate.js';
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
    const EmailTemplate = getEmailTemplate();
    const EmailAttachment = getEmailAttachment();
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

    let template = await EmailTemplate.findOne({ where: { type } });
    if (!template) {
      template = await EmailTemplate.create({ type, title: title || type, subject: subject || type });
    }

    const data = {};
    if (title !== undefined) data.title = title;
    if (subject !== undefined) data.subject = subject;
    if (heading !== undefined) data.heading = heading;
    if (subtitle !== undefined) data.subtitle = subtitle;
    if (customMessage !== undefined) data.customMessage = customMessage;
    if (closingMessage !== undefined) data.closingMessage = closingMessage;
    if (footerText !== undefined) data.footerText = footerText;
    if (brandColor !== undefined) data.brandColor = brandColor;
    if (headerBanner !== undefined) data.headerBanner = headerBanner;
    if (isActive !== undefined) data.isActive = isActive;

    await template.update(data);

    if (attachments !== undefined) {
      await EmailAttachment.destroy({ where: { templateId: template.id } });
      if (Array.isArray(attachments) && attachments.length > 0) {
        await EmailAttachment.bulkCreate(
          attachments.map((att) => ({
            templateId: template.id,
            name: att.name || 'attachment',
            url: att.url || '',
            path: att.path || '',
            size: att.size || 0,
          }))
        );
      }
    }

    const reloaded = await EmailTemplate.findByPk(template.id, {
      include: [{ association: 'attachments' }],
    });
    res.json(reloaded);
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
