import { UniqueConstraintError, ValidationError as SeqValidationError } from 'sequelize';

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

  // 3. SEQUELIZE VALIDATION ERROR (HTTP 400 Bad Request)
  if (err instanceof SeqValidationError || err.name === 'SequelizeValidationError') {
    const safeMessages = err.errors?.map((e) => {
      // Strip any internal path or SQL strings if present
      return (e.message || 'Invalid input.').replace(/at .*/i, '').trim();
    }) || ['Invalid input data provided.'];

    return res.status(400).json({
      status: 400,
      error: 'Validation Error',
      message: safeMessages[0] || 'Validation error.',
      details: safeMessages,
    });
  }

  // 4. JSON BODY PARSER SYNTAX ERROR (HTTP 400 Bad Request)
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      status: 400,
      error: 'Bad Request',
      message: 'Invalid JSON payload in request body.',
    });
  }

  // 5. CLIENT-FACING OPERATIONAL ERRORS (HTTP 400 - 499)
  const statusCode = typeof err.status === 'number' && err.status >= 400 && err.status < 500 ? err.status : 500;

  if (statusCode < 500) {
    let safeMessage = err.message || 'Invalid request.';
    // If the message contains file system path separators, backslashes, or SQL keywords, sanitize it
    if (
      safeMessage.includes('\\') ||
      safeMessage.includes('/var/') ||
      safeMessage.includes('/home/') ||
      safeMessage.includes('C:') ||
      /\b(SELECT|INSERT|UPDATE|DELETE|FROM|WHERE|TABLE)\b/i.test(safeMessage)
    ) {
      safeMessage = 'Invalid request parameters.';
    }

    return res.status(statusCode).json({
      status: statusCode,
      error: err.name || 'Client Error',
      message: safeMessage,
    });
  }

  // 6. INTERNAL SERVER ERRORS (HTTP 500) — STRICTLY SANITIZED FOR CLIENTS
  return res.status(500).json({
    status: 500,
    error: 'Internal Server Error',
    message: 'An unexpected server error occurred. Please try again later.',
  });
}
