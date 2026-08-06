export function notFound(req, res) {
  res.status(404).json({ message: `Route not found: ${req.originalUrl}` });
}

export function errorHandler(err, req, res, next) {
  console.error(err);
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0] || 'field';
    return res.status(409).json({ message: `That ${field} is already in use.` });
  }
  if (err.name === 'ValidationError') {
    return res.status(400).json({ message: Object.values(err.errors).map((e) => e.message).join(', ') });
  }
  // A malformed id (e.g. "abc" where an ObjectId is expected) is a bad request,
  // not a server fault — without this it surfaces as a 500.
  if (err.name === 'CastError') {
    return res.status(400).json({ message: `Invalid ${err.path}: ${err.value}` });
  }
  res.status(err.status || 500).json({ message: err.message || 'Something went wrong on the server.' });
}
