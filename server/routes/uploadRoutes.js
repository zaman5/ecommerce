import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { Router } from 'express';
import multer from 'multer';
import { protect, restrictTo } from '../middleware/auth.js';

export const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
  ['image/gif', '.gif'],
  ['image/avif', '.avif'],
]);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  // The client's filename is never reused — it could contain path separators or
  // an executable extension. The name is generated and the extension is taken
  // from the vetted mimetype instead.
  filename: (req, file, cb) => {
    const ext = ALLOWED.get(file.mimetype) || '.bin';
    cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED.has(file.mimetype)) {
      return cb(new Error('Only JPG, PNG, WebP, GIF or AVIF images are allowed.'));
    }
    cb(null, true);
  },
});

const ALLOWED_VIDEO = new Map([
  ['video/mp4', '.mp4'],
  ['video/webm', '.webm'],
  ['video/ogg', '.ogv'],
  ['video/quicktime', '.mov'],
]);

const videoStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = ALLOWED_VIDEO.get(file.mimetype) || '.mp4';
    cb(null, `vid-${Date.now()}-${crypto.randomBytes(6).toString('hex')}${ext}`);
  },
});

const videoUpload = multer({
  storage: videoStorage,
  limits: { fileSize: 50 * 1024 * 1024, files: 1 }, // 50MB max for videos
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_VIDEO.has(file.mimetype)) {
      return cb(new Error('Only MP4, WebM, OGG or MOV video files are allowed.'));
    }
    cb(null, true);
  },
});

const router = Router();

// POST /api/uploads/image  (admin + shop manager) — returns the URL to store on the product.
router.post('/image', protect, restrictTo('admin', 'shopmanager'), (req, res) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      const tooBig = err.code === 'LIMIT_FILE_SIZE';
      return res.status(400).json({ message: tooBig ? 'That image is larger than 5MB.' : err.message });
    }
    if (!req.file) return res.status(400).json({ message: 'No image was uploaded.' });
    // Same-origin path, so it keeps working whatever host the API is on.
    res.status(201).json({ url: `/uploads/${req.file.filename}`, size: req.file.size });
  });
});

// POST /api/uploads/video  (admin + shop manager) — returns the URL for product video.
router.post('/video', protect, restrictTo('admin', 'shopmanager'), (req, res) => {
  videoUpload.single('video')(req, res, (err) => {
    if (err) {
      const tooBig = err.code === 'LIMIT_FILE_SIZE';
      return res.status(400).json({ message: tooBig ? 'Video file exceeds the 50MB limit.' : err.message });
    }
    if (!req.file) return res.status(400).json({ message: 'No video was uploaded.' });
    res.status(201).json({ url: `/uploads/${req.file.filename}`, size: req.file.size });
  });
});

// POST /api/uploads/payment-screenshot  (public — guests and logged-in users
// upload their JazzCash payment proof at checkout, before placing the order.)
router.post('/payment-screenshot', (req, res) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      const tooBig = err.code === 'LIMIT_FILE_SIZE';
      return res.status(400).json({ message: tooBig ? 'That image is larger than 5MB.' : err.message });
    }
    if (!req.file) return res.status(400).json({ message: 'No screenshot was uploaded.' });
    res.status(201).json({ url: `/uploads/${req.file.filename}`, size: req.file.size });
  });
});

export default router;

