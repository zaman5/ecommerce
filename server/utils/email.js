/**
 * One definition of "an email we will accept", used by both registration and
 * guest checkout. They were validating differently before: checkout rejected a
 * malformed address while register let anything through, so an account could
 * exist on an address no confirmation could ever reach.
 *
 * Deliberately loose — the only real proof an address works is sending to it.
 * This catches typos and obvious nonsense, nothing more.
 */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value) {
  return EMAIL_RE.test(String(value || '').trim());
}

export default isValidEmail;
