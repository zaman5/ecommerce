import {
  UniqueConstraintError,
  ValidationError as SeqValidationError,
  ForeignKeyConstraintError,
  DatabaseError,
} from 'sequelize';

/**
 * 404 Handler for undefined API routes
 */
export function notFound(req, res) {
  res.status(404).json({
    status: 404,
    error: 'Not Found',
    message: `Resource not found: ${req.method} ${req.originalUrl}`,
  });
}

/**
 * Helper to sanitize any accidental path or SQL query fragments from error messages
 */
function sanitizeErrorMessage(msg) {
  if (!msg || typeof msg !== 'string') return 'An error occurred with your request.';
  
  // Check for file system paths, stack trace references, or SQL keywords
  if (
    msg.includes('\\') ||
    msg.includes('C:') ||
    msg.includes('/Users/') ||
    msg.includes('/home/') ||
    msg.includes('/var/') ||
    msg.includes('.js:') ||
    /\b(SELECT|INSERT|UPDATE|DELETE|FROM|WHERE|TABLE|SQLITE_|ER_)\b/i.test(msg)
  ) {
    return 'Invalid request parameters or database constraint violated.';
  }
  return msg.trim();
}

/**
 * Global Express Centralized Error Handler
 * - Logs full stack traces, timestamps, and request context to server logs for debugging.
 * - Sanitizes all client responses: Never exposes stack traces, SQL queries, internal paths, or database internals to users.
 */
export function errorHandler(err, req, res, next) {
  const timestamp = new Date().toISOString();
  const clientIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || req.ip || 'unknown';
  const userId = req.user?.id ? ` (User: ${req.user.id}, Role: ${req.user.role})` : '';

  // 1. FULL SERVER-SIDE LOGGING FOR DEBUGGING
  console.error(`\n🚨 [SERVER ERROR] [${timestamp}] ${req.method} ${req.originalUrl} - IP: ${clientIp}${userId}`);
  console.error(`Message: ${err.message || 'No message'}`);
  if (err.stack) {
    console.error(`Stack trace:\n${err.stack}`);
  }

  // 2. SEQUELIZE UNIQUE CONSTRAINT ERROR (HTTP 409 Conflict)
  if (err instanceof UniqueConstraintError || err.name === 'SequelizeUniqueConstraintError') {
    const rawField = err.errors?.[0]?.path || 'field';
    const cleanField = rawField.replace(/[^a-zA-Z0-9_]/g, '');
    return res.status(409).json({
      status: 409,
      error: 'Conflict',
      message: `That ${cleanField || 'value'} is already in use. Please choose another.`,
    });
  }

  // 3. SEQUELIZE FOREIGN KEY CONSTRAINT ERROR (HTTP 409 Conflict)
  if (err instanceof ForeignKeyConstraintError || err.name === 'SequelizeForeignKeyConstraintError') {
    return res.status(409).json({
      status: 409,
      error: 'Conflict',
      message: 'This record cannot be deleted or modified because it is referenced by other items.',
    });
  }

  // 4. SEQUELIZE VALIDATION ERROR (HTTP 400 Bad Request)
  if (err instanceof SeqValidationError || err.name === 'SequelizeValidationError') {
    const safeMessages = err.errors?.map((e) => {
      return sanitizeErrorMessage(e.message || 'Invalid input.');
    }) || ['Invalid input data provided.'];

    return res.status(400).json({
      status: 400,
      error: 'Validation Error',
      message: safeMessages[0] || 'Validation error.',
      details: safeMessages,
    });
  }

  // 5. MULTER FILE UPLOAD ERRORS (HTTP 400 Bad Request)
  if (err.name === 'MulterError') {
    let msg = 'File upload failed.';
    if (err.code === 'LIMIT_FILE_SIZE') msg = 'Uploaded file exceeds the allowed size limit.';
    if (err.code === 'LIMIT_UNEXPECTED_FILE') msg = 'Unexpected file field in upload request.';
    return res.status(400).json({
      status: 400,
      error: 'Upload Error',
      message: msg,
    });
  }

  // 6. JSON BODY PARSER SYNTAX ERROR (HTTP 400 Bad Request)
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      status: 400,
      error: 'Bad Request',
      message: 'Invalid JSON payload in request body.',
    });
  }

  // 7. SEQUELIZE / RAW DATABASE ERRORS (HTTP 500 — Generic Client Response)
  if (err instanceof DatabaseError || err.name === 'SequelizeDatabaseError') {
    return res.status(500).json({
      status: 500,
      error: 'Internal Server Error',
      message: 'A database error occurred. Please try again later.',
    });
  }

  // 8. CLIENT-FACING OPERATIONAL ERRORS (HTTP 400 - 499)
  const statusCode = typeof err.status === 'number' && err.status >= 400 && err.status < 500 ? err.status : 500;

  if (statusCode < 500) {
    const safeMessage = sanitizeErrorMessage(err.message || 'Invalid request.');
    return res.status(statusCode).json({
      status: statusCode,
      error: err.name || 'Client Error',
      message: safeMessage,
    });
  }

  // 9. INTERNAL SERVER ERRORS (HTTP 500) — STRICTLY SANITIZED FOR CLIENTS
  return res.status(500).json({
    status: 500,
    error: 'Internal Server Error',
    message: 'An unexpected server error occurred. Please try again later.',
  });
}
