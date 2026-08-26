import path from 'path';
import crypto from 'crypto';
import { Router } from 'express';
import multer from 'multer';
import { protect, restrictTo } from '../middleware/auth.js';
import { authenticatedRateLimiter } from '../middleware/rateLimiter.js';
import { validateBody } from '../middleware/validator.js';
import { emailTemplateUpdateSchema, emailTestSendSchema } from '../validators/schemas.js';
import { UPLOAD_DIR } from './uploadRoutes.js';
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

    res.status(201).json({
      name: req.file.originalname,
      url: `/uploads/${req.file.filename}`,
      size: req.file.size,
    });
  });
});

export default router;
