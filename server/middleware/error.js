import { UniqueConstraintError, ValidationError as SeqValidationError } from 'sequelize';

export function notFound(req, res) {
  res.status(404).json({ message: `Route not found: ${req.originalUrl}` });
}

export function errorHandler(err, req, res, next) {
  console.error(err);
  // Sequelize unique constraint violation (replaces Mongo code 11000)
  if (err instanceof UniqueConstraintError) {
    const field = err.errors?.[0]?.path || 'field';
    return res.status(409).json({ message: `That ${field} is already in use.` });
  }
  // Sequelize validation error (replaces Mongoose ValidationError)
  if (err instanceof SeqValidationError) {
    return res.status(400).json({ message: err.errors.map((e) => e.message).join(', ') });
  }
  res.status(err.status || 500).json({ message: err.message || 'Something went wrong on the server.' });
}
