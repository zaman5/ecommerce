import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { Router } from 'express';
import multer from 'multer';
import { protect, restrictTo } from '../middleware/auth.js';
import { authenticatedRateLimiter } from '../middleware/rateLimiter.js';
import { validateBody } from '../middleware/validator.js';
import { emailTemplateUpdateSchema, emailTestSendSchema } from '../validators/schemas.js';
import { UPLOAD_DIR, validateImageContent } from './uploadRoutes.js';
import {
  getTemplates,
  getTemplateByType,
  updateTemplate,
  testSend,
} from '../controllers/emailController.js';

const ALLOWED_ATTACHMENT_MIMES = new Map([
  ['application/pdf', '.pdf'],
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
  ['text/plain', '.txt'],
]);

/**
 * Validates binary content / magic bytes for email attachments (PDF, Images, TXT)
 */
function validateAttachmentContent(filePath, mimeType) {
  try {
    const fd = fs.openSync(filePath, 'r');
    const buffer = Buffer.alloc(32);
    const bytesRead = fs.readSync(fd, buffer, 0, 32, 0);
    fs.closeSync(fd);

    if (bytesRead < 2) return false;

    // Check for disguised executable headers (Windows MZ / Linux ELF / Shebang)
    if (buffer[0] === 0x4d && buffer[1] === 0x5a) return false; // MZ header
    if (buffer[0] === 0x7f && buffer[1] === 0x45 && buffer[2] === 0x4c && buffer[3] === 0x46) return false; // ELF header

    if (mimeType === 'application/pdf') {
      // PDF magic bytes: %PDF (0x25 0x50 0x44 0x46)
      return buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46;
    }

    if (mimeType.startsWith('image/')) {
      return validateImageContent(filePath);
    }

    if (mimeType === 'text/plain') {
      // Reject binary control characters in text files
      for (let i = 0; i < bytesRead; i++) {
        const byte = buffer[i];
        if (byte < 0x09 || (byte > 0x0d && byte < 0x20)) return false;
      }
      return true;
    }

    return false;
  } catch (err) {
    console.error('🚨 [Attachment Validation Error]', err);
    return false;
  }
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = ALLOWED_ATTACHMENT_MIMES.get(file.mimetype) || '.bin';
    cb(null, `att-${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024, files: 1 }, // 10MB max attachment
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_ATTACHMENT_MIMES.has(file.mimetype)) {
      return cb(new Error('Only PDF, JPG, PNG, WebP, or TXT attachments are allowed. Executable files are strictly forbidden.'));
    }
    cb(null, true);
  },
});

const router = Router();

router.use(protect);
router.use(restrictTo('admin', 'shopmanager'));
router.use(authenticatedRateLimiter);

router.get('/', getTemplates);
router.get('/:type', getTemplateByType);
router.put('/:type', validateBody(emailTemplateUpdateSchema), updateTemplate);
router.post('/test-send', validateBody(emailTestSendSchema), testSend);

// Upload email attachment
router.post('/attachment', (req, res) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      const tooBig = err.code === 'LIMIT_FILE_SIZE';
      return res.status(400).json({ message: tooBig ? 'Attachment file is larger than 10MB.' : err.message });
    }
    if (!req.file) return res.status(400).json({ message: 'No file was uploaded.' });

    // Validate binary content & magic bytes
    if (!validateAttachmentContent(req.file.path, req.file.mimetype)) {
      try { fs.unlinkSync(req.file.path); } catch (e) {}
      return res.status(400).json({
        status: 400,
        error: 'Validation Error',
        message: 'Invalid attachment content. Executable or corrupted files are strictly forbidden.',
      });
    }

    res.status(201).json({
      name: req.file.originalname,
      url: `/uploads/${req.file.filename}`,
      size: req.file.size,
    });
  });
});

export default router;
