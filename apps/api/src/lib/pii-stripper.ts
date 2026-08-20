/**
 * PII Stripper — removes personally identifiable information from text
 * before it is sent to external AI providers (Scaleway, etc.).
 *
 * GDPR Article 25 (Data Protection by Design) requires minimizing personal
 * data in external processing. This function strips common PII patterns
 * from message content at the character level.
 *
 * IMPORTANT: This is a defense-in-depth measure. The primary data minimization
 * is architectural — wallet addresses, emails, and names are not included in
 * the messages array sent to AI providers. This filter catches edge cases where
 * PII might accidentally appear in user message content.
 */

// Ethereum wallet address (0x + 40 hex chars)
const WALLET_ADDRESS_RE = /0x[0-9a-fA-F]{40}/g;

// Email address
const EMAIL_RE = /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g;

// Ethereum-style ENS names
const ENS_RE = /[a-zA-Z0-9\-]+\.(eth|wallet|xyz|l2)$/g;

// Common phone number patterns (E.164 and variants)
const PHONE_RE = /(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g;

// IPv4 addresses
const IPV4_RE = /\b(?:(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\.){3}(?:25[0-5]|2[0-4]\d|[01]?\d\d?)\b/g;

// SSN / national ID patterns (US SSN)
const SSN_RE = /\b\d{3}-?\d{2}-?\d{4}\b/g;

// Strip PII from a string
export function stripPII(text: string): string {
  return text
    .replace(WALLET_ADDRESS_RE, '[wallet address redacted]')
    .replace(EMAIL_RE, '[email redacted]')
    .replace(ENS_RE, '[ENS name redacted]')
    .replace(PHONE_RE, '[phone redacted]')
    .replace(IPV4_RE, '[IP address redacted]')
    .replace(SSN_RE, '[SSN redacted]');
}

// Strip PII from an array of chat messages
export function stripMessagesPII(
  messages: Array<{ role: string; content: string }>
): Array<{ role: string; content: string }> {
  return messages.map((msg) => ({
    role: msg.role,
    content: stripPII(msg.content),
  }));
}