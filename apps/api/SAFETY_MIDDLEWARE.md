# Safety Middleware Implementation

## Overview

The safety middleware provides comprehensive security and privacy protection for the SafePsy API, including:

1. **Injection Filter**: Detects and blocks/sanitizes SQL injection, XSS, command injection, path traversal, and NoSQL injection attacks
2. **Moderation Hooks**: Content moderation for profanity, hate speech, and threatening language
3. **PII Redaction**: Automatically detects and redacts personally identifiable information (PII) from requests and responses

## Features

### Injection Filter

The injection filter detects and handles various injection attack patterns:

- **SQL Injection**: Detects SQL keywords, operators, and injection patterns
- **XSS (Cross-Site Scripting)**: Detects script tags, event handlers, and JavaScript injection
- **Command Injection**: Detects shell metacharacters and command execution attempts
- **Path Traversal**: Detects directory traversal attempts (`../`, encoded variants)
- **NoSQL Injection**: Detects MongoDB/NoSQL injection patterns

**Configuration:**
- `SAFETY_INJECTION_FILTER_ENABLED`: Enable/disable injection filtering (default: `true`)
- `SAFETY_INJECTION_BLOCK`: Block requests on detection vs. sanitize (default: `false`, but set to `true` in routes)

### Moderation Hooks

Content moderation detects inappropriate content:

- **Profanity**: Basic profanity detection (extensible)
- **Hate Speech**: Hate speech indicators
- **Threats**: Threatening language patterns

**Configuration:**
- `SAFETY_MODERATION_ENABLED`: Enable/disable moderation (default: `true`)
- `SAFETY_MODERATION_BLOCK`: Block requests on violation (default: `false`)
- Custom rules can be added via configuration

### PII Redaction

Automatically detects and redacts personally identifiable information:

- **Email addresses**: `user@example.com` → `[EMAIL_REDACTED]`
- **Phone numbers**: `+1-555-123-4567` → `[PHONE_REDACTED]`
- **Credit card numbers**: `1234-5678-9012-3456` → `[CARD_REDACTED]`
- **SSN (US)**: `123-45-6789` → `[SSN_REDACTED]`
- **IP addresses**: `192.168.1.1` → `[IP_REDACTED]` (optional)

**Configuration:**
- `SAFETY_PII_REDACTION_ENABLED`: Enable/disable PII redaction (default: `true`)
- `SAFETY_PII_REDACT_LOGS`: Redact PII in logs (default: `false`, but set to `true` in routes)
- `SAFETY_PII_REDACT_RESPONSES`: Redact PII in API responses (default: `false`)
- `preserveForAuth`: Preserves PII in auth-related fields (passwords, tokens, signatures, etc.)

## Usage

### Basic Usage

```typescript
import { safetyMiddleware, safetyResponseInterceptor } from '../middleware/safety';

// Apply to route
router.use(safetyMiddleware({
  injectionFilter: {
    enabled: true,
    blockOnDetect: true,
    logDetections: true,
  },
  moderation: {
    enabled: true,
    blockOnDetect: false,
    logDetections: true,
  },
  piiRedaction: {
    enabled: true,
    redactInLogs: true,
    redactInResponses: false,
    preserveForAuth: true,
  },
}));

// Apply response interceptor (optional, for response redaction)
router.use(safetyResponseInterceptor);
```

### Integration in Routes

The safety middleware is integrated into:

- **Chat routes** (`/api/chat`): Blocks injection, logs moderation, redacts PII in logs
- **Contact routes** (`/api/contact`): Blocks injection, logs moderation, redacts PII in logs
- **Subscribe routes** (`/api/subscribe`): Blocks injection, logs moderation, redacts PII in logs

### Utility Functions

```typescript
import { 
  redactPIIFromText, 
  checkInjection, 
  checkModeration 
} from '../middleware/safety';

// Redact PII from a string
const cleanText = redactPIIFromText("Contact me at user@example.com");

// Check for injection patterns
const hasInjection = checkInjection("SELECT * FROM users");

// Check for moderation violations
const hasViolation = checkModeration("inappropriate content");
```

## Environment Variables

Add these to your `.env` file:

```bash
# Injection Filter
SAFETY_INJECTION_FILTER_ENABLED=true
SAFETY_INJECTION_BLOCK=true

# Moderation
SAFETY_MODERATION_ENABLED=true
SAFETY_MODERATION_BLOCK=false

# PII Redaction
SAFETY_PII_REDACTION_ENABLED=true
SAFETY_PII_REDACT_LOGS=true
SAFETY_PII_REDACT_RESPONSES=false
```

## How It Works

1. **Request Processing**: The middleware processes all request data (body, query, params) recursively
2. **Detection**: Scans for injection patterns, moderation violations, and PII
3. **Action**: 
   - Blocks requests if configured to do so
   - Sanitizes content if blocking is disabled
   - Redacts PII according to configuration
4. **Logging**: Logs all detections and redactions for security monitoring
5. **Response Processing**: Optionally redacts PII from responses before sending

## Security Considerations

- **Auth Fields**: PII in authentication-related fields (passwords, tokens, signatures, wallet addresses) is preserved by default
- **False Positives**: Some patterns may trigger false positives. Adjust patterns or use sanitization mode instead of blocking
- **Performance**: The middleware processes all request data recursively. For high-traffic endpoints, consider caching or optimizing patterns
- **Custom Rules**: Add custom moderation rules via the `customRules` configuration option

## Logging

All safety violations and PII redactions are logged with:
- Violation type and details
- Request path and method
- Client information (IP, user agent) - optionally redacted
- Timestamp

Example log entry:
```
Safety violation detected: {
  violations: [
    { path: 'body.messages[0].content', type: 'injection', details: {...} }
  ],
  client: { ip: '[IP_REDACTED]', userAgent: '...', method: 'POST', path: '/api/chat/completions' }
}
```

## Extending the Middleware

### Adding Custom Moderation Rules

```typescript
router.use(safetyMiddleware({
  moderation: {
    enabled: true,
    blockOnDetect: false,
    logDetections: true,
    customRules: [
      '\\b(badword1|badword2)\\b',  // Custom pattern
      '\\b(spam|phishing)\\b',       // Another pattern
    ],
  },
}));
```

### Adding Custom Injection Patterns

Modify `INJECTION_PATTERNS` in `src/middleware/safety.ts`:

```typescript
const INJECTION_PATTERNS = {
  // ... existing patterns
  custom: [
    /your-custom-pattern/gi,
  ],
};
```

## Testing

Test the middleware with various attack patterns:

```bash
# SQL Injection
curl -X POST http://localhost:3001/api/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"SELECT * FROM users"}]}'

# XSS
curl -X POST http://localhost:3001/api/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"<script>alert(1)</script>"}]}'

# PII Detection
curl -X POST http://localhost:3001/api/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"My email is user@example.com"}]}'
```

## Notes

- The middleware processes data recursively, handling nested objects and arrays
- PII redaction preserves the structure of data while replacing sensitive values
- Injection filtering can sanitize or block based on configuration
- Moderation is logged by default but doesn't block unless configured
- All patterns are case-insensitive and use regex for matching

