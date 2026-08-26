import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { Router } from 'express';
import multer from 'multer';
import { protect, restrictTo } from '../middleware/auth.js';
import { uploadRateLimiter } from '../middleware/rateLimiter.js';

// Dedicated isolated upload storage directory (outside public source files)
export const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
try {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  // Ensure Apache / cPanel cannot execute any scripts inside the uploads directory
  const htaccessPath = path.join(UPLOAD_DIR, '.htaccess');
  if (!fs.existsSync(htaccessPath)) {
    fs.writeFileSync(
      htaccessPath,
      `# Prevent any script execution in uploads storage
Options -ExecCGI -Indexes
RemoveHandler .php .phtml .php3 .php4 .php5 .php7 .php8 .phps .cgi .pl .asp .aspx .py .sh .js .html .htm
<Files *>
  SetHandler default-handler
</Files>
<IfModule mod_headers.c>
  Header set X-Content-Type-Options "nosniff"
  Header set Content-Security-Policy "default-src 'none'; media-src 'self'; img-src 'self'"
</IfModule>
`
    );
  }
} catch (e) {
  console.warn('Could not create/harden uploads directory:', e.message);
}

const ALLOWED_IMAGE_MIMES = new Map([
  ['image/jpeg', '.jpg'],
  ['image/png', '.png'],
  ['image/webp', '.webp'],
  ['image/gif', '.gif'],
  ['image/avif', '.avif'],
]);

const ALLOWED_VIDEO_MIMES = new Map([
  ['video/mp4', '.mp4'],
  ['video/webm', '.webm'],
  ['video/ogg', '.ogv'],
  ['video/quicktime', '.mov'],
]);

// Disk storage with random cryptographic unguessable filenames
const imageStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = ALLOWED_IMAGE_MIMES.get(file.mimetype) || '.jpg';
    cb(null, `${Date.now()}-${crypto.randomBytes(12).toString('hex')}${ext}`);
  },
});

const upload = multer({
  storage: imageStorage,
  limits: { fileSize: 5 * 1024 * 1024, files: 1 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_IMAGE_MIMES.has(file.mimetype)) {
      return cb(new Error('Only JPG, PNG, WebP, GIF or AVIF images are allowed.'));
    }
    cb(null, true);
  },
});

const videoStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const ext = ALLOWED_VIDEO_MIMES.get(file.mimetype) || '.mp4';
    cb(null, `vid-${Date.now()}-${crypto.randomBytes(12).toString('hex')}${ext}`);
  },
});

const videoUpload = multer({
  storage: videoStorage,
  limits: { fileSize: 50 * 1024 * 1024, files: 1 }, // 50MB max for videos
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_VIDEO_MIMES.has(file.mimetype)) {
      return cb(new Error('Only MP4, WebM, OGG or MOV video files are allowed.'));
    }
    cb(null, true);
  },
});

/**
 * Validates real binary magic bytes to guarantee file content matches allowed image format.
 * Prevents renamed executable scripts (e.g. exploit.php.png or shell.exe renamed to .jpg).
 */
export function validateImageContent(filePath) {
  try {
    const fd = fs.openSync(filePath, 'r');
    const buffer = Buffer.alloc(32);
    const bytesRead = fs.readSync(fd, buffer, 0, 32, 0);
    fs.closeSync(fd);

    if (bytesRead < 4) return false;

    // JPEG: FF D8 FF
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      return true;
    }

    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47 &&
      buffer[4] === 0x0d &&
      buffer[5] === 0x0a &&
      buffer[6] === 0x1a &&
      buffer[7] === 0x0a
    ) {
      return true;
    }

    // GIF: GIF87a or GIF89a (47 49 46 38)
    if (
      buffer[0] === 0x47 &&
      buffer[1] === 0x49 &&
      buffer[2] === 0x46 &&
      buffer[3] === 0x38
    ) {
      return true;
    }

    // WebP: RIFF .... WEBP
    if (
      buffer.toString('ascii', 0, 4) === 'RIFF' &&
      buffer.toString('ascii', 8, 12) === 'WEBP'
    ) {
      return true;
    }

    // AVIF: ....ftyp (avif / avis / mif1)
    const ftyp = buffer.toString('ascii', 4, 12);
    if (ftyp.startsWith('ftyp') && (ftyp.includes('avif') || ftyp.includes('avis') || ftyp.includes('mif1'))) {
      return true;
    }

    return false;
  } catch (err) {
    console.error('[Magic Byte Validation Error]', err);
    return false;
  }
}

/**
 * Validates real binary magic bytes to guarantee file content matches allowed video format.
 */
export function validateVideoContent(filePath) {
  try {
    const fd = fs.openSync(filePath, 'r');
    const buffer = Buffer.alloc(32);
    const bytesRead = fs.readSync(fd, buffer, 0, 32, 0);
    fs.closeSync(fd);

    if (bytesRead < 4) return false;

    // WebM / MKV (EBML): 1A 45 DF A3
    if (buffer[0] === 0x1a && buffer[1] === 0x45 && buffer[2] === 0xdf && buffer[3] === 0xa3) {
      return true;
    }

    // Ogg: 4F 67 67 53 ('OggS')
    if (buffer.toString('ascii', 0, 4) === 'OggS') {
      return true;
    }

    // MP4 / QuickTime / MOV: ....ftyp or ....moov
    const ftyp = buffer.toString('ascii', 4, 8);
    if (ftyp === 'ftyp' || ftyp === 'moov' || buffer.toString('ascii', 4, 12).startsWith('ftyp')) {
      return true;
    }

    return false;
  } catch (err) {
    console.error('[Video Magic Byte Validation Error]', err);
    return false;
  }
}

const router = Router();
router.use(uploadRateLimiter);

// POST /api/uploads/image (admin + shop manager) — returns the URL to store on the product.
router.post('/image', protect, restrictTo('admin', 'shopmanager'), (req, res) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      console.error('[Image Upload Error]', err);
      const msg = err.code === 'LIMIT_FILE_SIZE'
        ? 'That image is larger than 5MB.'
        : (err.message && !err.message.includes('/') && !err.message.includes('\\') ? err.message : 'Image upload failed.');
      return res.status(400).json({ message: msg });
    }
    if (!req.file) return res.status(400).json({ message: 'No image was uploaded.' });

    // Validate binary content / magic bytes
    if (!validateImageContent(req.file.path)) {
      try { fs.unlinkSync(req.file.path); } catch (e) {}
      return res.status(400).json({
        status: 400,
        error: 'Validation Error',
        message: 'Invalid file content. The uploaded file is not a valid image format.',
      });
    }

    res.status(201).json({ url: `/uploads/${req.file.filename}`, size: req.file.size });
  });
});

// POST /api/uploads/video (admin + shop manager) — returns the URL for product video.
router.post('/video', protect, restrictTo('admin', 'shopmanager'), (req, res) => {
  videoUpload.single('video')(req, res, (err) => {
    if (err) {
      console.error('[Video Upload Error]', err);
      const msg = err.code === 'LIMIT_FILE_SIZE'
        ? 'Video file exceeds the 50MB limit.'
        : (err.message && !err.message.includes('/') && !err.message.includes('\\') ? err.message : 'Video upload failed.');
      return res.status(400).json({ message: msg });
    }
    if (!req.file) return res.status(400).json({ message: 'No video was uploaded.' });

    // Validate binary content / magic bytes
    if (!validateVideoContent(req.file.path)) {
      try { fs.unlinkSync(req.file.path); } catch (e) {}
      return res.status(400).json({
        status: 400,
        error: 'Validation Error',
        message: 'Invalid file content. The uploaded file is not a valid video format.',
      });
    }

    res.status(201).json({ url: `/uploads/${req.file.filename}`, size: req.file.size });
  });
});

// POST /api/uploads/payment-screenshot (public)
router.post('/payment-screenshot', (req, res) => {
  upload.single('image')(req, res, (err) => {
    if (err) {
      console.error('[Payment Screenshot Upload Error]', err);
      const msg = err.code === 'LIMIT_FILE_SIZE'
        ? 'That image is larger than 5MB.'
        : (err.message && !err.message.includes('/') && !err.message.includes('\\') ? err.message : 'Screenshot upload failed.');
      return res.status(400).json({ message: msg });
    }
    if (!req.file) return res.status(400).json({ message: 'No screenshot was uploaded.' });

    // Validate binary content / magic bytes
    if (!validateImageContent(req.file.path)) {
      try { fs.unlinkSync(req.file.path); } catch (e) {}
      return res.status(400).json({
        status: 400,
        error: 'Validation Error',
        message: 'Invalid file content. The uploaded file is not a valid image format.',
      });
    }

    res.status(201).json({ url: `/uploads/${req.file.filename}`, size: req.file.size });
  });
});

export default router;
