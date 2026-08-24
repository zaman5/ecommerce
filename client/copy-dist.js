import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      if (entry.name !== 'browser') {
        copyDir(srcPath, destPath);
      }
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

const browserDir = path.join(__dirname, 'dist', 'wondercart-client', 'browser');
const parentDir = path.join(__dirname, 'dist', 'wondercart-client');
const rootDistDir = path.join(__dirname, '..', 'dist');

if (fs.existsSync(browserDir)) {
  // 1. Copy everything from browser/ into wondercart-client/ directly
  copyDir(browserDir, parentDir);
  console.log('✅ Flattened browser/ distribution files into client/dist/wondercart-client/');

  // 2. Also copy to root dist/ for serverless/Vercel/cPanel environments
  copyDir(browserDir, rootDistDir);
  console.log('✅ Synced distribution files to root dist/');

  // 3. Search and auto-deploy to public_html (Hostinger / cPanel / Apache document root)
  const candidatePublicHtmlPaths = [
    path.join(__dirname, '..', 'public_html'),
    path.join(__dirname, '..', '..', 'public_html'),
    path.join(__dirname, '..', '..', '..', 'public_html'),
    path.join(__dirname, '..', '..', '..', '..', 'public_html'),
    path.join(process.cwd(), 'public_html'),
    path.join(process.cwd(), '..', 'public_html'),
    path.join(process.cwd(), '..', '..', 'public_html'),
    path.join(process.cwd(), '..', '..', '..', 'public_html'),
    '/home/u813227609/domains/cost-estimations.store/public_html',
  ];

  for (const pubPath of candidatePublicHtmlPaths) {
    try {
      if (fs.existsSync(pubPath) && fs.statSync(pubPath).isDirectory()) {
        copyDir(browserDir, pubPath);
        console.log(`🚀 Successfully synced latest build directly to public_html at: ${pubPath}`);
      }
    } catch (e) {
      // ignore inaccessible paths
    }
  }
} else {
  console.warn('⚠️ browser directory not found at', browserDir);
}
