// Connection helper for serverless (Vercel) invocations.
//
// This lives inside server/ on purpose. If the API entry point imported
// 'mongoose' itself it could resolve a *different* copy than the one
// server/models/*.js resolve (root node_modules vs server/node_modules) —
// leaving the models attached to an unconnected instance, where every query
// silently buffers until it times out. Importing from here guarantees the
// connection and the models share one mongoose instance.
//
// config/db.js remains the local-dev equivalent; it calls process.exit(1) on
// failure, which is correct for `npm run dev` but would take down a whole
// serverless container.
import mongoose from 'mongoose';

mongoose.set('strictQuery', true);
// Cap how long a query waits for a live connection. Must stay comfortably
// under the platform's function timeout so a database outage surfaces as our
// own 503 rather than an opaque gateway timeout.
mongoose.set('bufferTimeoutMS', 5000);

// The Node process is reused across invocations, so the connection is cached
// on globalThis and re-awaited rather than reopened per request — otherwise a
// traffic burst opens a pool per request and exhausts the Atlas limit.
const cache = (globalThis.__wondercartMongo ??= { promise: null });

export function connectServerless() {
  if (mongoose.connection.readyState === 1) return Promise.resolve(mongoose.connection);

  if (!cache.promise) {
    const uri = process.env.MONGO_URI;
    if (!uri) {
      return Promise.reject(new Error('MONGO_URI is not set in the Vercel project environment variables.'));
    }

    cache.promise = mongoose
      .connect(uri, {
        // The driver's connect() resolves before any handshake, so this is what
        // actually bounds the wait when the cluster is unreachable.
        serverSelectionTimeoutMS: 8000,
      })
      // Drop a rejected promise so the next request retries instead of
      // replaying the cached failure forever.
      .catch((err) => {
        cache.promise = null;
        throw err;
      });
  }

  return cache.promise;
}
