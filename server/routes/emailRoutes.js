import path from 'path';
import crypto from 'crypto';
import { Router } from 'express';
import multer from 'multer';
import { protect, restrictTo } from '../middleware/auth.js';
import { UPLOAD_DIR } from './uploadRoutes.js';
import {
  getTemplates,
  getTemplateByType,
  updateTemplate,
  testSend,
} from '../controllers/emailController.js';

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.bin';
    cb(null, `att-${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024, files: 1 }, // 10MB max attachment
});

const router = Router();

router.use(protect);
router.use(restrictTo('admin', 'shopmanager'));

router.get('/', getTemplates);
router.get('/:type', getTemplateByType);
router.put('/:type', updateTemplate);
router.post('/test-send', testSend);

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
      path: req.file.path,
      size: req.file.size,
    });
  });
});

export default router;
