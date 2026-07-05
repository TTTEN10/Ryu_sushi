/** Shared, framework-agnostic form validation helpers. */

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isEmail(value) {
  return EMAIL_RE.test(String(value || "").trim());
}

export function isRequired(value) {
  return String(value || "").trim().length > 0;
}

export function minLen(value, n) {
  return String(value || "").trim().length >= n;
}

/**
 * Validate the full contact form. Returns an object of field -> error message
 * (empty object means valid).
 */
export function validateContact(v) {
  const errors = {};
  if (!isRequired(v.name)) errors.name = "Please tell us your name.";
  if (!isEmail(v.email)) errors.email = "Enter a valid email address.";
  if (!isRequired(v.subject)) errors.subject = "Select a subject.";
  if (!minLen(v.message, 10))
    errors.message = "A little more detail helps us prepare (10+ characters).";
  if (!v.consent) errors.consent = "Please accept the privacy terms to continue.";
  return errors;
}
