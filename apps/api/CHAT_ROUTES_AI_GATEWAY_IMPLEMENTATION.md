# Chat Routes & AI Gateway Service - Implementation Summary

## Overview

Complete implementation of chat routes and AI gateway service for SafePsy, providing encrypted chat storage and AI-powered mental health assistance with SSE streaming support.

## Files

### 1. Chat Routes (`apps/api/src/routes/chat.ts`)

**Endpoints:**

#### `POST /api/chat/save`
- **Purpose:** Save encrypted chat history
- **Auth:** Required (wallet session)
- **Request Body:**
  ```json
  {
    "encryptedChatBlob": "base64_encrypted_data",
    "didTokenId": "123" // Optional
  }
  ```
- **Response:**
  ```json
  {
    "success": true,
    "data": {
      "chatId": "cuid",
      "blobHash": "0x...",
      "chatReference": "0x...",
      "requiresDidUpdate": true
    }
  }
  ```
- **Features:**
  - Validates wallet authentication
  - Verifies DID ownership if DID exists
  - Generates SHA-256 hash of encrypted blob
  - Stores in database with hash
  - Returns chat reference for DID contract update

#### `GET /api/chat/load`
- **Purpose:** Load encrypted chat history
- **Auth:** Required (wallet session)
- **Response:**
  ```json
  {
    "success": true,
    "data": {
      "hasChat": true,
      "encryptedChatBlob": "base64_encrypted_data",
      "blobHash": "0x...",
      "didTokenId": "123",
      "updatedAt": "2024-01-01T00:00:00.000Z"
    }
  }
  ```
- **Features:**
  - Loads encrypted chat from database
  - Optionally verifies hash against DID contract
  - Returns null if no chat exists

#### `POST /api/chat/completions`
- **Purpose:** AI chat completion with SSE streaming
- **Auth:** Optional (wallet session recommended)
- **Request Body:**
  ```json
  {
    "messages": [
      {
        "role": "user",
        "content": "Hello, I'm feeling anxious"
      }
    ],
    "model": "gpt-4o-mini", // Optional
    "temperature": 0.7, // Optional (0-2)
    "maxTokens": 1000, // Optional (1-4000)
    "stream": true, // Optional (default: true)
    "userId": "user-123", // Optional
    "sessionId": "session-456" // Optional
  }
  ```
- **Response (Streaming):**
  - SSE stream with events: `connected`, `metadata`, `token`, `done`, `error`
- **Response (Non-streaming):**
  ```json
  {
    "success": true,
    "data": {
      "id": "chatcmpl-...",
      "model": "gpt-4o-mini",
      "choices": [...],
      "usage": {...}
    }
  }
  ```
- **Features:**
  - SSE streaming support (default)
  - Non-streaming mode available
  - Rate limiting (20 requests/minute per wallet/IP)
  - Safety middleware (injection filtering, moderation)
  - Client disconnect detection
  - Comprehensive error handling

#### `GET /api/chat/health`
- **Purpose:** Health check for chat endpoints
- **Auth:** None
- **Response:**
  ```json
  {
    "success": true,
    "message": "Chat endpoints are healthy",
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
  ```

### 2. AI Gateway Service (`apps/api/src/lib/ai-gateway.service.ts`)

**Features:**

#### OpenAI Integration
- Lazy initialization of OpenAI client
- Environment variable configuration (`OPENAI_API_KEY`)
- Default model: `gpt-4o-mini`
- Default temperature: `0.7`
- Default max tokens: `1000`

#### Streaming Completion (`generateCompletionStream`)
- Async generator for SSE streaming
- Token-by-token streaming from OpenAI
- Events:
  - `connected`: Initial connection
  - `metadata`: Model and parameters
  - `token`: Individual tokens with index
  - `done`: Completion with usage stats
  - `error`: Error details
- Automatic system message injection (mental health assistant)
- Token usage estimation (streaming mode)
- Comprehensive error handling

#### Non-Streaming Completion (`generateCompletion`)
- Full completion response
- Accurate token usage (from OpenAI)
- Same system message injection
- Error handling

### 3. Rate Limiting (`apps/api/src/lib/ratelimit.ts`)

**Chat Rate Limit:**
- **Window:** 1 minute
- **Max Requests:** 20 per minute
- **Key Generator:** Uses wallet address if authenticated, otherwise IP
- **Skip:** Health check endpoints
- **Message:** User-friendly error message

### 4. Safety Middleware (`apps/api/src/middleware/safety.ts`)

**Applied to all chat routes:**
- **Injection Filtering:** SQL, XSS, command injection, path traversal, NoSQL
- **Moderation:** Profanity, hate speech, threats
- **PII Redaction:** Email, phone, credit card, SSN, IP addresses
- **Configurable:** Block or sanitize on detection
- **Logging:** Violation detection logging

## Security Features

1. **Authentication:**
   - Wallet-based authentication for save/load
   - Optional authentication for completions
   - DID ownership verification

2. **Rate Limiting:**
   - Per-wallet rate limiting
   - IP-based fallback
   - Prevents abuse

3. **Input Validation:**
   - Joi schema validation
   - Message length limits (1-10000 chars)
   - Array size limits (1-100 messages)
   - Parameter bounds checking

4. **Safety Checks:**
   - Injection pattern detection
   - Content moderation
   - PII redaction

5. **Error Handling:**
   - Comprehensive error messages
   - Error codes for programmatic handling
   - Safe error responses (no sensitive data)

## SSE Streaming Contract

### Event Types

1. **`connected`**
   ```json
   {
     "status": "connected",
     "timestamp": "2024-01-01T00:00:00.000Z"
   }
   ```

2. **`metadata`**
   ```json
   {
     "model": "gpt-4o-mini",
     "temperature": 0.7,
     "maxTokens": 1000
   }
   ```

3. **`token`**
   ```json
   {
     "token": "Hello",
     "index": 0,
     "finishReason": null
   }
   ```

4. **`done`**
   ```json
   {
     "finishReason": "stop",
     "usage": {
       "promptTokens": 50,
       "completionTokens": 150,
       "totalTokens": 200
     }
   }
   ```

5. **`error`**
   ```json
   {
     "error": "OpenAI API error",
     "message": "Rate limit exceeded",
     "code": "RATE_LIMIT"
   }
   ```

## Usage Examples

### Save Encrypted Chat

```typescript
const response = await fetch('/api/chat/save', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-wallet-address': walletAddress,
    'x-chain-id': '1',
  },
  credentials: 'include',
  body: JSON.stringify({
    encryptedChatBlob: encryptedData,
    didTokenId: didInfo.tokenId,
  }),
});
```

### Load Encrypted Chat

```typescript
const response = await fetch('/api/chat/load', {
  method: 'GET',
  headers: {
    'x-wallet-address': walletAddress,
    'x-chain-id': '1',
  },
  credentials: 'include',
});
```

### Stream Chat Completion

```typescript
const eventSource = new EventSource('/api/chat/completions', {
  method: 'POST',
  body: JSON.stringify({
    messages: [{ role: 'user', content: 'Hello' }],
    stream: true,
  }),
});

eventSource.addEventListener('token', (e) => {
  const data = JSON.parse(e.data);
  console.log('Token:', data.token);
});

eventSource.addEventListener('done', (e) => {
  const data = JSON.parse(e.data);
  console.log('Usage:', data.usage);
  eventSource.close();
});
```

### Non-Streaming Completion

```typescript
const response = await fetch('/api/chat/completions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    messages: [{ role: 'user', content: 'Hello' }],
    stream: false,
  }),
});

const result = await response.json();
console.log('Completion:', result.data.choices[0].message.content);
```

## Configuration

### Environment Variables

- `OPENAI_API_KEY` - OpenAI API key (required for chat)
- `FRONTEND_URL` - Frontend URL for CORS
- `SAFETY_INJECTION_FILTER_ENABLED` - Enable injection filtering (default: true)
- `SAFETY_MODERATION_ENABLED` - Enable moderation (default: true)
- `SAFETY_PII_REDACTION_ENABLED` - Enable PII redaction (default: true)

### Default Values

- **Model:** `gpt-4o-mini`
- **Temperature:** `0.7`
- **Max Tokens:** `1000`
- **Rate Limit:** 20 requests/minute
- **Body Size Limit:** 100KB for completions, 10KB default

## Error Handling

### Error Codes

- `RATE_LIMIT_EXCEEDED` - Too many requests
- `SAFETY_VIOLATION` - Content safety violation
- `STREAM_ERROR` - Streaming error
- `COMPLETION_ERROR` - Completion generation error
- `VALIDATION_ERROR` - Request validation failed

### Error Response Format

```json
{
  "success": false,
  "error": "Error type",
  "message": "Human-readable message",
  "code": "ERROR_CODE"
}
```

## Testing

### Health Check
```bash
curl http://localhost:3001/api/chat/health
```

### Test Completion (Non-streaming)
```bash
curl -X POST http://localhost:3001/api/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "Hello"}],
    "stream": false
  }'
```

## Future Enhancements

1. **Conversation History Management:**
   - Automatic conversation threading
   - Context window management
   - Conversation summarization

2. **Advanced Safety:**
   - Real-time content moderation API
   - Sentiment analysis
   - Crisis detection

3. **Performance:**
   - Response caching
   - Token usage optimization
   - Connection pooling

4. **Analytics:**
   - Usage tracking
   - Response quality metrics
   - User satisfaction tracking

