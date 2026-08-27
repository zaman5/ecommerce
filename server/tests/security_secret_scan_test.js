import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const ROOT_DIR = path.resolve(process.cwd(), '..');
const SERVER_DIR = path.resolve(process.cwd());
const CLIENT_DIR = path.resolve(ROOT_DIR, 'client');

let passed = 0;
let failed = 0;
const issues = [];

function assert(condition, message, detail = '') {
  if (condition) {
    console.log(`  ✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${message} ${detail ? `-> ${detail}` : ''}`);
    failed++;
    issues.push({ message, detail });
  }
}

// Regex patterns for secret detection
const SECRET_PATTERNS = [
  { name: 'Private Key Header', regex: /-----BEGIN (?:RSA|EC|DSA|OPENSSH) PRIVATE KEY-----/ },
  { name: 'AWS Access Key ID', regex: /AKIA[0-9A-Z]{16}/ },
  { name: 'Stripe Live Secret Key', regex: /sk_live_[0-9a-zA-Z]{24,}/ },
  { name: 'Cloudinary URL with credentials', regex: /cloudinary:\/\/[0-9]+:[a-zA-Z0-9_\-]+@/i },
  { name: 'Database URL with plaintext password', regex: /(?:mysql|postgres|postgresql|mongodb):\/\/[^:]+:[^@\s]+@[^\s/]+/i },
  { name: 'SendGrid API Key', regex: /SG\.[a-zA-Z0-9_\-]{22}\.[a-zA-Z0-9_\-]{43}/ },
];

function scanDirectory(dirPath, ignoreDirs = ['node_modules', '.git', 'dist', '.angular', 'coverage']) {
  const foundFiles = [];
  function recurse(current) {
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const ent of entries) {
      if (ignoreDirs.includes(ent.name)) continue;
      const full = path.join(current, ent.name);
      if (ent.isDirectory()) {
        recurse(full);
      } else if (ent.isFile()) {
        // Skip binaries, images, sqlite files, logs
        if (!/\.(png|jpg|jpeg|gif|webp|ico|svg|sqlite|log|zip|woff|woff2|ttf|eot)$/i.test(ent.name)) {
          foundFiles.push(full);
        }
      }
    }
  }
  recurse(dirPath);
  return foundFiles;
}

async function runSecurityAudit() {
  console.log('===============================================================');
  console.log('🔒 CODEBASE SECURITY AUDIT: SECRET & CREDENTIAL SCANNER');
  console.log('===============================================================\n');

  // 1. Scan Frontend for leaked backend secrets or database configs
  console.log('--- 1. FRONTEND ENVIRONMENT & CLIENT LEAKAGE SCAN ---');
  const clientFiles = scanDirectory(path.join(CLIENT_DIR, 'src'));
  let clientLeakFound = false;

  for (const f of clientFiles) {
    const content = fs.readFileSync(f, 'utf8');
    if (/JWT_SECRET|DB_PASS|SMTP_PASS|ADMIN_PASSWORD/i.test(content)) {
      clientLeakFound = true;
      assert(false, `Frontend file contains forbidden server secret key name: ${path.relative(ROOT_DIR, f)}`);
    }
  }
  assert(!clientLeakFound, 'No server secret keys (JWT_SECRET, DB_PASS, SMTP_PASS) found in client/src');

  // Check client environment.prod.ts
  const prodEnvPath = path.join(CLIENT_DIR, 'src', 'environments', 'environment.prod.ts');
  const prodEnvContent = fs.existsSync(prodEnvPath) ? fs.readFileSync(prodEnvPath, 'utf8') : '';
  assert(prodEnvContent.includes('production: true'), 'environment.prod.ts has production: true');
  assert(!prodEnvContent.includes('password') && !prodEnvContent.includes('secret'), 'environment.prod.ts contains no credentials');

  // 2. Secret Pattern Scanning Across Entire Codebase
  console.log('\n--- 2. HARDCODED SECRET PATTERN MATCHING ---');
  const allSourceFiles = [...clientFiles, ...scanDirectory(SERVER_DIR)];
  let secretMatchFound = false;

  for (const f of allSourceFiles) {
    // Skip test files that simulate regex matching or mock test passwords
    const relPath = path.relative(ROOT_DIR, f);
    if (relPath.includes('security_secret_scan_test.js')) continue;

    const content = fs.readFileSync(f, 'utf8');
    for (const pat of SECRET_PATTERNS) {
      if (pat.regex.test(content)) {
        secretMatchFound = true;
        assert(false, `Matched pattern ${pat.name} in file: ${relPath}`);
      }
    }
  }
  assert(!secretMatchFound, 'Zero hardcoded AWS keys, Stripe keys, Private Keys, or DB connection strings in codebase');

  // 3. Git Tracked Files Audit (.gitignore verification)
  console.log('\n--- 3. GIT SECRET EXCLUSION AUDIT ---');
  try {
    const gitTracked = execSync('git ls-files', { cwd: ROOT_DIR, encoding: 'utf8' }).split('\n').filter(Boolean);
    const forbiddenTracked = gitTracked.filter((f) => {
      const base = path.basename(f);
      return (
        base === '.env' ||
        (base.startsWith('.env.') && base !== '.env.example') ||
        /\.(pem|key|crt|cert|pfx|sqlite)$/i.test(base)
      );
    });

    assert(forbiddenTracked.length === 0, 'No .env files, private keys, or SQLite databases tracked in Git', forbiddenTracked.join(', '));
  } catch (e) {
    console.warn('Git check warning:', e.message);
  }

  // 4. Verification of Environment Variable Sourcing in Server
  console.log('\n--- 4. ENVIRONMENT VARIABLE SOURCING VERIFICATION ---');
  const tokenFile = fs.readFileSync(path.join(SERVER_DIR, 'utils', 'token.js'), 'utf8');
  assert(tokenFile.includes('process.env.JWT_SECRET'), 'JWT token utility sources secret from process.env.JWT_SECRET');
  assert(tokenFile.includes('FATAL: JWT_SECRET'), 'Production guard rejects missing JWT_SECRET');

  const emailFile = fs.readFileSync(path.join(SERVER_DIR, 'utils', 'emailService.js'), 'utf8');
  assert(emailFile.includes('process.env.SMTP_PASS'), 'Email service sources SMTP password from process.env.SMTP_PASS');

  const dbFile = fs.readFileSync(path.join(SERVER_DIR, 'config', 'db.js'), 'utf8');
  assert(dbFile.includes('process.env.DB_PASS'), 'Database config sources password from process.env.DB_PASS');

  console.log('\n===============================================================');
  console.log(`🏁 SECURITY AUDIT: ${passed} PASSED, ${failed} FAILED`);
  console.log('===============================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runSecurityAudit().catch((err) => {
  console.error('Fatal audit error:', err);
  process.exit(1);
});
