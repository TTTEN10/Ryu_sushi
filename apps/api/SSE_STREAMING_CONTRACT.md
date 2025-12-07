# SSE Streaming Contract Documentation

This document defines the Server-Sent Events (SSE) streaming contract for AI chat completions in SafePsy.

## Overview

The chat completion API supports token-by-token streaming using Server-Sent Events (SSE). This allows real-time display of AI responses as they are generated, providing a better user experience.

## SSE Specification

The implementation follows the [Server-Sent Events W3C specification](https://html.spec.whatwg.org/multipage/server-sent-events.html).

### Event Types

The following event types are used:

- `connected` - Initial connection confirmation
- `token` - Individual token in the stream
- `metadata` - Metadata about the completion (model, parameters, etc.)
- `done` - Completion finished
- `error` - Error occurred during streaming

### Message Format

Each SSE message follows this format:

```
event: <event_type>
data: <json_data>
id: <optional_message_id>
retry: <optional_retry_interval>

```

### Event Details

#### 1. `connected` Event

Sent immediately after connection is established.

```json
{
  "status": "connected"
}
```

**Example:**
```
event: connected
data: {"status":"connected"}

```

#### 2. `metadata` Event

Sent once at the beginning of the stream with completion metadata.

```json
{
  "model": "safepsy-therapy-v1",
  "temperature": 0.7,
  "maxTokens": 1000,
  "totalTokens": 150
}
```

**Example:**
```
event: metadata
data: {"model":"safepsy-therapy-v1","temperature":0.7,"maxTokens":1000,"totalTokens":150}

```

#### 3. `token` Event

Sent for each token in the completion stream.

```json
{
  "token": "Hello",
  "index": 0,
  "finishReason": null
}
```

**Fields:**
- `token` (string): The token text
- `index` (number): Zero-based index of the token
- `finishReason` (string | null): Finish reason if this is the last token, null otherwise

**Example:**
```
event: token
id: token-0
data: {"token":"Hello","index":0,"finishReason":null}

```

#### 4. `done` Event

Sent when the completion is finished.

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

**Fields:**
- `finishReason` (string): Reason for completion ("stop", "length", "error")
- `usage` (object): Token usage statistics
  - `promptTokens` (number): Tokens in the prompt
  - `completionTokens` (number): Tokens in the completion
  - `totalTokens` (number): Total tokens used

**Example:**
```
event: done
data: {"finishReason":"stop","usage":{"promptTokens":50,"completionTokens":150,"totalTokens":200}}

```

#### 5. `error` Event

Sent when an error occurs during streaming.

```json
{
  "error": "Streaming error",
  "message": "Detailed error message"
}
```

**Example:**
```
event: error
data: {"error":"Streaming error","message":"Connection timeout"}

```

## API Endpoint

### POST /api/chat/completions

**Request Headers:**
```
Content-Type: application/json
```

**Request Body:**
```json
{
  "messages": [
    {
      "role": "user",
      "content": "Hello, how are you?"
    }
  ],
  "model": "safepsy-therapy-v1",
  "temperature": 0.7,
  "maxTokens": 1000,
  "stream": true,
  "userId": "user-123",
  "sessionId": "session-456"
}
```

**Response Headers (Streaming):**
```
Content-Type: text/event-stream
Cache-Control: no-cache
Connection: keep-alive
X-Accel-Buffering: no
```

**Response (Streaming):**
```
event: connected
data: {"status":"connected"}

event: metadata
data: {"model":"safepsy-therapy-v1","temperature":0.7,"maxTokens":1000,"totalTokens":150}

event: token
id: token-0
data: {"token":"Hello","index":0,"finishReason":null}

event: token
id: token-1
data: {"token":"!","index":1,"finishReason":null}

...

event: done
data: {"finishReason":"stop","usage":{"promptTokens":10,"completionTokens":150,"totalTokens":160}}

```

## Client Implementation

### JavaScript/TypeScript Example

```typescript
async function streamChatCompletion(messages: ChatMessage[]) {
  const response = await fetch('/api/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messages,
      stream: true,
    }),
  });

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();

  if (!reader) {
    throw new Error('No response body');
  }

  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.startsWith('event: ')) {
        const eventType = line.substring(7);
        // Handle event type
      } else if (line.startsWith('data: ')) {
        const data = JSON.parse(line.substring(6));
        // Handle data based on event type
        if (eventType === 'token') {
          console.log('Token:', data.token);
        }
      }
    }
  }
}
```

### React Hook Example

```typescript
import { useState, useCallback } from 'react';

function useChatStream() {
  const [tokens, setTokens] = useState<string[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const streamCompletion = useCallback(async (messages: ChatMessage[]) => {
    setTokens([]);
    setIsStreaming(true);
    setError(null);

    try {
      const response = await fetch('/api/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages,
          stream: true,
        }),
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error('No response body');
      }

      let buffer = '';
      let currentEvent = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('event: ')) {
            currentEvent = line.substring(7).trim();
          } else if (line.startsWith('data: ')) {
            const data = JSON.parse(line.substring(6));
            
            if (currentEvent === 'token') {
              setTokens((prev) => [...prev, data.token]);
            } else if (currentEvent === 'done') {
              setIsStreaming(false);
            } else if (currentEvent === 'error') {
              setError(data.message);
              setIsStreaming(false);
            }
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setIsStreaming(false);
    }
  }, []);

  return { tokens, isStreaming, error, streamCompletion };
}
```

## Error Handling

### Connection Errors

If the connection is lost or an error occurs:

1. The server sends an `error` event
2. The stream is closed
3. The client should handle the error gracefully

### Retry Logic

The SSE specification supports automatic reconnection:

```
retry: 3000
```

This tells the client to wait 3 seconds before reconnecting.

## Best Practices

1. **Handle Disconnections**: Always handle connection drops gracefully
2. **Buffer Management**: Properly handle partial messages in the buffer
3. **Error Recovery**: Implement retry logic for transient errors
4. **Token Accumulation**: Accumulate tokens on the client side for display
5. **Memory Management**: Clear old tokens if the conversation is very long
6. **Loading States**: Show loading indicators while streaming
7. **Cancel Requests**: Allow users to cancel ongoing streams

## Testing

### Test Endpoint

Use `/api/chat/test-stream` to test SSE connectivity:

```bash
curl -N -H "Content-Type: application/json" \
  -X POST http://localhost:3001/api/chat/test-stream
```

### Example Test

```bash
curl -N -H "Content-Type: application/json" \
  -X POST http://localhost:3001/api/chat/completions \
  -d '{
    "messages": [{"role": "user", "content": "Hello"}],
    "stream": true
  }'
```

## Performance Considerations

1. **Token Delay**: Tokens are streamed with realistic delays (20-50ms per token)
2. **Buffer Size**: Keep buffer sizes reasonable to avoid memory issues
3. **Connection Limits**: Rate limiting is applied to prevent abuse
4. **Nginx Configuration**: Ensure `X-Accel-Buffering: no` is set for proper streaming

## Security Considerations

1. **Rate Limiting**: All chat endpoints have rate limiting
2. **Input Validation**: All inputs are validated using Joi schemas
3. **Size Limits**: Request body size is limited to 100KB
4. **CORS**: Adjust CORS headers for production (currently set to `*` for development)

## Future Enhancements

- [ ] Support for function calling
- [ ] Support for tool use
- [ ] Streaming of function calls
- [ ] Multi-modal support (images, etc.)
- [ ] Conversation history management
- [ ] Token usage tracking per user


