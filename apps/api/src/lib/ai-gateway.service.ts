import logger from './logger';
import axios, { AxiosInstance } from 'axios';
import { resolveDrSafeSystemPrompt } from './dr-safe-system-prompt';
import { registerUpstreamUrls, isUpstreamHealthy } from './llm-upstream-health';
import { shouldUseScalewayDirect } from './llm-routing';
import { detectCrisisInMessages, CRISIS_PREPEND_TEXT, CRISIS_RESOURCES } from './crisis-detection';
import { getCachedResponse, cacheResponse, isResponseCacheEnabled } from './response-cache';
import { logScalewayUsage, createUsageRecord } from './scaleway-metrics';
import { Config } from './config';
import { stripMessagesPII } from './pii-stripper';

/**
 * SSE Event Types for AI Streaming
 */
export enum SSEEventType {
  TOKEN = 'token',
  DONE = 'done',
  ERROR = 'error',
  METADATA = 'metadata',
}

/**
 * SSE Message Format
 */
export interface SSEMessage {
  event: SSEEventType;
  data: string;
  id?: string;
  retry?: number;
}

/**
 * Chat Message Interface
 */
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: Date;
}

/**
 * Chat Completion Request
 */
export interface ChatCompletionRequest {
  messages: ChatMessage[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  userId?: string;
  sessionId?: string;
  topP?: number; // Nucleus sampling (0-1, recommended: 0.9)
  /** When `guest`, the API must not persist or quota-link the request (see chat routes). */
  mode?: 'guest' | 'authenticated';
}

/**
 * Chat Completion Response (Non-streaming)
 */
export interface ChatCompletionResponse {
  id: string;
  model: string;
  choices: Array<{
    index: number;
    message: ChatMessage;
    finishReason: string;
  }>;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  created: number;
}

/**
 * Token Stream Callback
 * Called for each token in the stream
 */
export type TokenStreamCallback = (token: string, event: SSEEventType) => void;

/**
 * AI Gateway Service
 * Primary: Scaleway Generative API (direct) when USE_SCALEWAY_DIRECT=1 or no self-hosted URL.
 * Legacy: self-hosted OpenAI-compatible chatbot (AI_GPU_BASE_URL) with Scaleway fallback.
 */
class AIGatewayService {
  private axiosClient: AxiosInstance | null = null;
  private readonly defaultModel = 'mistral-small-3.2-24b-instruct-2506'; // Mistral Small 3.2 - optimized for psychotherapy conversations
  private readonly defaultTemperature = 0.4; // Lower temperature for more focused, consistent responses (psychotherapy context)
  private readonly defaultTopP = 0.9; // Nucleus sampling for balanced creativity/focus
  private readonly defaultMaxTokens = 300; // Shorter responses for conversational flow
  // Scaleway Generative AI endpoint: https://api.scaleway.ai/{project_id}/v1

  private resolveDefaultModel(): string {
    return process.env.SCALEWAY_MODEL?.trim() || this.defaultModel;
  }

  /** After repeated failures, pause calls to that upstream for a short window. */
  private circuitOpenUntil = new Map<string, number>();
  private consecutiveFailures = new Map<string, number>();

  /**
   * Get the AI service base URL (chatbot/GPU service if configured, otherwise Scaleway)
   * Supports AI_GPU_BASE_URL and CHATBOT_BASE_URL (same meaning).
   */
  private getAIServiceBaseUrl(): string | null {
    const gpuBaseUrl = process.env.AI_GPU_BASE_URL || process.env.CHATBOT_BASE_URL;
    if (gpuBaseUrl) {
      logger.info(`Using chatbot/GPU AI service: ${gpuBaseUrl}`);
      return gpuBaseUrl.replace(/\/$/, '');
    }
    return null;
  }
  
  /**
   * Get or initialize Scaleway API client (lazy initialization)
   * Uses the new Scaleway Generative AI endpoint format: https://api.scaleway.ai/{project_id}/v1
   */
  private getScalewayClient(): AxiosInstance {
    if (!this.axiosClient) {
      // Load environment variables if not already loaded
      if (!process.env.SCALEWAY_API_KEY) {
        try {
          require('dotenv').config();
        } catch (e) {
          // dotenv might already be loaded
        }
      }

      const apiKey = process.env.SCALEWAY_API_KEY;
      const projectId = process.env.SCALEWAY_PROJECT_ID || '5dad0cb7-c16a-4447-9a25-e89bd3448e8a';
      const baseUrl = process.env.SCALEWAY_API_BASE_URL || `https://api.scaleway.ai/${projectId}/v1`;

      if (!apiKey) {
        logger.warn('SCALEWAY_API_KEY not found in environment variables. Scaleway integration will not work.');
      } else {
        logger.info(`Scaleway API key loaded successfully. Using endpoint: ${baseUrl}`);
      }

      this.axiosClient = axios.create({
        baseURL: baseUrl,
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: this.getUpstreamTimeoutMs(),
      });
    }
    return this.axiosClient;
  }

  private getUpstreamTimeoutMs(): number {
    const raw = process.env.AI_UPSTREAM_TIMEOUT_MS;
    const n = raw ? parseInt(raw, 10) : 120000;
    return Number.isFinite(n) && n > 0 ? n : 120000;
  }

  /** Optional FastAPI orchestrator / second hop when primary fails (same OpenAI routes). */
  private getChatbotFallbackBaseUrl(): string | null {
    const u = process.env.AI_CHATBOT_FALLBACK_URL?.trim();
    return u ? u.replace(/\/$/, '') : null;
  }

  /** Primary (vLLM or single chatbot URL) then optional fallback — deduped. */
  private getSelfHostedBaseUrlChain(): string[] {
    const primary = this.getAIServiceBaseUrl();
    const fb = this.getChatbotFallbackBaseUrl();
    const out: string[] = [];
    if (primary) out.push(primary);
    if (fb && fb !== primary) out.push(fb);
    return out;
  }

  private hasSelfHostedUpstream(): boolean {
    return this.getSelfHostedBaseUrlChain().length > 0;
  }

  private shouldUseLocalMock(): boolean {
    const nodeEnv = Config.nodeEnv() || 'development';
    if (nodeEnv === 'production') return false;
    // Default to mock mode in local/dev when no upstream credentials exist.
    // Can be explicitly disabled by setting AI_LOCAL_MOCK=0.
    const raw = (process.env.AI_LOCAL_MOCK ?? '').trim();
    if (raw === '0' || raw.toLowerCase() === 'false') return false;
    return true;
  }

  private async *generateLocalMockStream(request: ChatCompletionRequest): AsyncGenerator<SSEMessage, void, unknown> {
    const lastUser = [...request.messages].reverse().find((m) => m.role === 'user')?.content?.trim() || '';
    const content =
      "Local dev mode: the LLM upstream isn't configured, so this is a mock reply.\n\n" +
      (lastUser ? `You said: "${lastUser.slice(0, 400)}"\n\n` : '') +
      'To enable real responses, set one of:\n' +
      '- AI_GPU_BASE_URL (or CHATBOT_BASE_URL) to a self-hosted OpenAI-compatible `/v1/chat/completions`\n' +
      '- SCALEWAY_API_KEY for Scaleway Generative API\n';

    yield {
      event: SSEEventType.METADATA,
      data: JSON.stringify({
        model: 'local-mock',
        temperature: request.temperature ?? this.defaultTemperature,
        maxTokens: request.maxTokens ?? this.defaultMaxTokens,
      }),
    };

    let tokenIndex = 0;
    const tokens = content.split(/(\s+)/).filter((t) => t.length > 0);
    for (const t of tokens) {
      yield {
        event: SSEEventType.TOKEN,
        data: JSON.stringify({
          token: t,
          index: tokenIndex,
          finishReason: null,
        }),
        id: `token-${tokenIndex}`,
      };
      tokenIndex++;
      await new Promise((r) => setTimeout(r, 5));
    }

    yield {
      event: SSEEventType.DONE,
      data: JSON.stringify({
        finishReason: 'stop',
        usage: {
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
        },
      }),
    };
  }

  private generateLocalMockCompletion(request: ChatCompletionRequest): ChatCompletionResponse {
    const lastUser = [...request.messages].reverse().find((m) => m.role === 'user')?.content?.trim() || '';
    const content =
      "Local dev mode: the LLM upstream isn't configured, so this is a mock reply.\n\n" +
      (lastUser ? `You said: "${lastUser.slice(0, 400)}"\n\n` : '') +
      'To enable real responses, set AI_GPU_BASE_URL/CHATBOT_BASE_URL or SCALEWAY_API_KEY.';

    return {
      id: `local-mock-${Date.now()}`,
      model: 'local-mock',
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content,
            timestamp: new Date(),
          },
          finishReason: 'stop',
        },
      ],
      usage: {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
      },
      created: Math.floor(Date.now() / 1000),
    };
  }

  /** Primary + fallback URLs that pass circuit breaker + last health probe. */
  private getReachableSelfHostedChain(): string[] {
    const raw = this.getSelfHostedBaseUrlChain();
    registerUpstreamUrls(raw);
    return raw.filter((u) => {
      if (this.isCircuitOpen(u)) {
        return false;
      }
      return isUpstreamHealthy(u);
    });
  }

  private createOpenAIUpstreamClient(baseUrl: string): AxiosInstance {
    const apiKey = process.env.AI_INTERNAL_API_KEY;
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }
    return axios.create({
      baseURL: baseUrl.replace(/\/$/, ''),
      headers,
      timeout: this.getUpstreamTimeoutMs(),
      validateStatus: () => true,
    });
  }

  private isCircuitOpen(baseUrl: string): boolean {
    const until = this.circuitOpenUntil.get(baseUrl);
    return until != null && Date.now() < until;
  }

  private recordUpstreamFailure(baseUrl: string): void {
    const n = (this.consecutiveFailures.get(baseUrl) || 0) + 1;
    this.consecutiveFailures.set(baseUrl, n);
    if (n >= 5) {
      this.circuitOpenUntil.set(baseUrl, Date.now() + 30000);
      this.consecutiveFailures.set(baseUrl, 0);
      logger.warn('Upstream circuit opened for 30s after 5 failures', { baseUrl });
    }
  }

  private recordUpstreamSuccess(baseUrl: string): void {
    this.consecutiveFailures.delete(baseUrl);
    this.circuitOpenUntil.delete(baseUrl);
  }

  private isRetryableUpstreamError(err: unknown): boolean {
    const anyErr = err as { code?: string; response?: { status?: number } };
    const code = anyErr?.code;
    if (code === 'ECONNABORTED' || code === 'ETIMEDOUT' || code === 'ECONNRESET' || code === 'ENOTFOUND') {
      return true;
    }
    const st = anyErr?.response?.status;
    if (st === 502 || st === 503 || st === 504) return true;
    return false;
  }

  /**
   * Extract text content from a message that may have content as string or content blocks array.
   * Some LLM providers return content as [{type: "text", text: "..."}, ...] instead of plain string.
   */
  private extractTextContent(content: unknown): string {
    if (typeof content === 'string') {
      return content;
    }
    if (Array.isArray(content)) {
      // Content blocks format: [{type: "text", text: "..."}, ...]
      return content
        .filter((block): block is { type: string; text: string } =>
          typeof block === 'object' && block !== null && block.type === 'text' && typeof block.text === 'string'
        )
        .map((block) => block.text)
        .join('');
    }
    return '';
  }

  private buildSanitizedMessages(
    request: ChatCompletionRequest
  ): Array<{ role: 'user' | 'assistant' | 'system'; content: string }> {
    // Defense-in-depth: strip PII patterns from all messages before sending
    // to external AI providers (Scaleway). Primary minimization is architectural
    // (no wallet/email/name in the messages array), but this catches edge cases.
    const cleanedMessages = stripMessagesPII(request.messages);
    const cleanMessages = cleanedMessages.map((msg) => ({
      role: msg.role as 'user' | 'assistant' | 'system',
      content: msg.content,
    }));
    const hasSystemMessage = cleanMessages.some((msg) => msg.role === 'system');
    if (!hasSystemMessage) {
      cleanMessages.unshift({
        role: 'system',
        content: resolveDrSafeSystemPrompt(request.mode),
      });
    }
    return cleanMessages;
  }

  /** Body for self-hosted OpenAI-compatible upstreams; includes optional session correlation for Redis on chatbot. */
  private buildOpenAIUpstreamPayload(
    request: ChatCompletionRequest,
    model: string,
    temperature: number,
    maxTokens: number,
    stream: boolean
  ): Record<string, unknown> {
    const cleanMessages = this.buildSanitizedMessages(request);
    const body: Record<string, unknown> = {
      model,
      messages: cleanMessages,
      temperature,
      max_tokens: maxTokens,
      stream,
    };
    if (request.sessionId) {
      body.sessionId = request.sessionId;
    }
    return body;
  }

  /**
   * Stream from one OpenAI-compatible `/v1/chat/completions` upstream. Throws on transport/HTTP errors (caller retries / fallback).
   */
  private async *streamOpenAIUpstream(
    baseUrl: string,
    request: ChatCompletionRequest,
    model: string,
    temperature: number,
    maxTokens: number
  ): AsyncGenerator<SSEMessage, void, unknown> {
    const client = this.createOpenAIUpstreamClient(baseUrl);
    const cleanMessages = this.buildSanitizedMessages(request);

    const response = await client.post(
      '/v1/chat/completions',
      this.buildOpenAIUpstreamPayload(request, model, temperature, maxTokens, true),
      {
        responseType: 'stream',
      }
    );

    if (response.status >= 400) {
      throw new Error(`upstream HTTP ${response.status}`);
    }

    yield {
      event: SSEEventType.METADATA,
      data: JSON.stringify({
        model,
        temperature,
        maxTokens,
      }),
    };

    let tokenIndex = 0;
    let fullContent = '';
    let finishReason: string | null = null;
    let buffer = '';

    const tokenQueue: string[] = [];
    let streamEnded = false;
    let streamError: Error | null = null;

    const stream = response.data as NodeJS.ReadableStream;

    stream.on('data', (chunk: Buffer) => {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const dataStr = line.slice(6).trim();
          if (dataStr === '[DONE]') {
            continue;
          }

          try {
            const data = JSON.parse(dataStr);
            const choice = data.choices?.[0];

            if (choice?.delta) {
              // Handle both string content and content blocks array
              const delta = choice.delta as { content?: string | Array<{ type: string; text: string }> };
              let tokenText = '';
              if (typeof delta.content === 'string') {
                tokenText = delta.content;
              } else if (Array.isArray(delta.content)) {
                tokenText = delta.content
                  .filter((block) => block.type === 'text')
                  .map((block) => block.text)
                  .join('');
              }
              if (tokenText) {
                fullContent += tokenText;
                tokenQueue.push(tokenText);
              }
            }

            if (choice?.finish_reason) {
              finishReason = choice.finish_reason;
            }
          } catch {
            continue;
          }
        }
      }
    });

    stream.on('end', () => {
      if (buffer.trim()) {
        const lines = buffer.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();
            if (dataStr === '[DONE]') {
              continue;
            }
            try {
              const data = JSON.parse(dataStr);
              const choice = data.choices?.[0];
              if (choice?.delta) {
                const delta = choice.delta as { content?: string | Array<{ type: string; text: string }> };
                let tokenText = '';
                if (typeof delta.content === 'string') {
                  tokenText = delta.content;
                } else if (Array.isArray(delta.content)) {
                  tokenText = delta.content
                    .filter((block) => block.type === 'text')
                    .map((block) => block.text)
                    .join('');
                }
                if (tokenText) {
                  fullContent += tokenText;
                  tokenQueue.push(tokenText);
                }
              }
              if (choice?.finish_reason) {
                finishReason = choice.finish_reason;
              }
            } catch {
              // skip
            }
          }
        }
      }
      streamEnded = true;
    });

    stream.on('error', (error: Error) => {
      streamError = error;
      streamEnded = true;
    });

    while (!streamEnded || tokenQueue.length > 0) {
      if (streamError) {
        throw streamError;
      }

      if (tokenQueue.length > 0) {
        const token = tokenQueue.shift()!;
        yield {
          event: SSEEventType.TOKEN,
          data: JSON.stringify({
            token,
            index: tokenIndex,
            finishReason: null,
          }),
          id: `token-${tokenIndex}`,
        };
        tokenIndex++;
      } else {
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
    }

    const estimatedPromptTokens = Math.ceil(
      cleanMessages.reduce((sum: number, msg: { content: string }) => sum + msg.content.length, 0) / 4
    );
    const estimatedCompletionTokens = Math.ceil(fullContent.length / 4);

    yield {
      event: SSEEventType.DONE,
      data: JSON.stringify({
        finishReason: finishReason || 'stop',
        usage: {
          promptTokens: estimatedPromptTokens,
          completionTokens: estimatedCompletionTokens,
          totalTokens: estimatedPromptTokens + estimatedCompletionTokens,
        },
      }),
    };
  }

  private async postOpenAIUpstream(
    baseUrl: string,
    request: ChatCompletionRequest,
    model: string,
    temperature: number,
    maxTokens: number
  ): Promise<ChatCompletionResponse> {
    const client = this.createOpenAIUpstreamClient(baseUrl);

    const response = await client.post(
      '/v1/chat/completions',
      this.buildOpenAIUpstreamPayload(request, model, temperature, maxTokens, false)
    );

    if (response.status >= 400) {
      throw new Error(`upstream HTTP ${response.status}`);
    }

    const completion = response.data;
    const choice = completion.choices?.[0];
    if (!choice || !choice.message) {
      throw new Error('No response from upstream');
    }

    // Extract text content from message (handle both string and content blocks array)
    const content = this.extractTextContent(choice.message.content);

    return {
      id: completion.id || `upstream-${Date.now()}`,
      model: completion.model || model,
      choices: [
        {
          index: 0,
          message: {
            role: choice.message.role as 'assistant',
            content,
            timestamp: new Date(),
          },
          finishReason: choice.finish_reason || 'stop',
        },
      ],
      usage: {
        promptTokens: completion.usage?.prompt_tokens || 0,
        completionTokens: completion.usage?.completion_tokens || 0,
        totalTokens: completion.usage?.total_tokens || 0,
      },
      created: completion.created || Math.floor(Date.now() / 1000),
    };
  }

  private async *yieldCachedResponseStream(
    content: string
  ): AsyncGenerator<SSEMessage, void, unknown> {
    yield {
      event: SSEEventType.METADATA,
      data: JSON.stringify({
        model: 'cached',
        temperature: 0,
        maxTokens: content.length,
      }),
    };

    let tokenIndex = 0;
    const tokens = content.split(/(\s+)/).filter((t) => t.length > 0);
    for (const token of tokens) {
      yield {
        event: SSEEventType.TOKEN,
        data: JSON.stringify({
          token,
          index: tokenIndex,
          finishReason: null,
        }),
        id: `token-${tokenIndex}`,
      };
      tokenIndex++;
      await new Promise((resolve) => setTimeout(resolve, 5));
    }

    yield {
      event: SSEEventType.DONE,
      data: JSON.stringify({
        finishReason: 'stop',
        usage: {
          promptTokens: 0,
          completionTokens: tokenIndex,
          totalTokens: tokenIndex,
        },
      }),
    };
  }

  /**
   * Stream completion from Scaleway (direct path) with crisis prepend and usage logging.
   */
  private async *generateScalewayCompletionStream(
    request: ChatCompletionRequest,
    model: string,
    temperature: number,
    maxTokens: number
  ): AsyncGenerator<SSEMessage, void, unknown> {
    logger.info(`Generating Scaleway completion (direct): model=${model}, messages=${request.messages.length}`);

    if (!process.env.SCALEWAY_API_KEY) {
      if (this.shouldUseLocalMock()) {
        logger.warn('No LLM upstream configured; using local mock stream (set AI_LOCAL_MOCK=0 to disable).');
        yield* this.generateLocalMockStream(request);
        return;
      }
      logger.error('SCALEWAY_API_KEY not configured');
      yield {
        event: SSEEventType.ERROR,
        data: JSON.stringify({
          error: 'Scaleway API key not configured',
          message: 'Please configure SCALEWAY_API_KEY environment variable',
        }),
      };
      return;
    }

    const crisisResult = detectCrisisInMessages(request.messages);

    try {
      const scalewayMessages = this.buildSanitizedMessages(request);
      const scalewayClient = this.getScalewayClient();
      const response = await scalewayClient.post(
        '/chat/completions',
        {
          model,
          messages: scalewayMessages,
          temperature,
          top_p: request.topP ?? this.defaultTopP,
          max_tokens: maxTokens,
          stream: true,
        },
        {
          responseType: 'stream',
        }
      );

      yield {
        event: SSEEventType.METADATA,
        data: JSON.stringify({
          model,
          temperature,
          maxTokens,
          crisisResources: crisisResult.resources || undefined,
        }),
      };

      let tokenIndex = 0;
      if (crisisResult.isCrisis) {
        yield {
          event: SSEEventType.TOKEN,
          data: JSON.stringify({
            token: CRISIS_PREPEND_TEXT,
            index: tokenIndex,
            finishReason: null,
          }),
          id: `token-${tokenIndex}`,
        };
        tokenIndex++;
      }

      let fullContent = crisisResult.prependText;
      let finishReason: string | null = null;
      let buffer = '';
      const tokenQueue: string[] = [];
      let streamEnded = false;
      let streamError: Error | null = null;
      const stream = response.data;

      stream.on('data', (chunk: Buffer) => {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();
            if (dataStr === '[DONE]') {
              continue;
            }
            try {
              const data = JSON.parse(dataStr);
              const choice = data.choices?.[0];
              if (choice?.delta) {
                const delta = choice.delta as { content?: string | Array<{ type: string; text: string }> };
                let tokenText = '';
                if (typeof delta.content === 'string') {
                  tokenText = delta.content;
                } else if (Array.isArray(delta.content)) {
                  tokenText = delta.content
                    .filter((block) => block.type === 'text')
                    .map((block) => block.text)
                    .join('');
                }
                if (tokenText) {
                  fullContent += tokenText;
                  tokenQueue.push(tokenText);
                }
              }
              if (choice?.finish_reason) {
                finishReason = choice.finish_reason;
              }
            } catch {
              continue;
            }
          }
        }
      });

      stream.on('end', () => {
        if (buffer.trim()) {
          const lines = buffer.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const dataStr = line.slice(6).trim();
              if (dataStr === '[DONE]') {
                continue;
              }
              try {
                const data = JSON.parse(dataStr);
                const choice = data.choices?.[0];
                if (choice?.delta) {
                  const delta = choice.delta as { content?: string | Array<{ type: string; text: string }> };
                  let tokenText = '';
                  if (typeof delta.content === 'string') {
                    tokenText = delta.content;
                  } else if (Array.isArray(delta.content)) {
                    tokenText = delta.content
                      .filter((block) => block.type === 'text')
                      .map((block) => block.text)
                      .join('');
                  }
                  if (tokenText) {
                    fullContent += tokenText;
                    tokenQueue.push(tokenText);
                  }
                }
                if (choice?.finish_reason) {
                  finishReason = choice.finish_reason;
                }
              } catch {
                // skip
              }
            }
          }
        }
        streamEnded = true;
      });

      stream.on('error', (error: Error) => {
        streamError = error;
        streamEnded = true;
      });

      while (!streamEnded || tokenQueue.length > 0) {
        if (streamError) {
          throw streamError;
        }
        if (tokenQueue.length > 0) {
          const token = tokenQueue.shift()!;
          yield {
            event: SSEEventType.TOKEN,
            data: JSON.stringify({
              token,
              index: tokenIndex,
              finishReason: null,
            }),
            id: `token-${tokenIndex}`,
          };
          tokenIndex++;
        } else {
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
      }

      const estimatedPromptTokens = Math.ceil(
        scalewayMessages.reduce((sum, msg) => sum + msg.content.length, 0) / 4
      );
      const estimatedCompletionTokens = Math.ceil(fullContent.length / 4);

      logScalewayUsage(
        createUsageRecord(model, estimatedPromptTokens, estimatedCompletionTokens)
      );

      yield {
        event: SSEEventType.DONE,
        data: JSON.stringify({
          finishReason: finishReason || 'stop',
          usage: {
            promptTokens: estimatedPromptTokens,
            completionTokens: estimatedCompletionTokens,
            totalTokens: estimatedPromptTokens + estimatedCompletionTokens,
          },
        }),
      };
    } catch (error: unknown) {
      const ax = error as {
        message?: string;
        name?: string;
        response?: { status?: number; data?: { message?: string } };
      };
      logger.error('Scaleway streaming error:', {
        error: ax.message ?? 'Unknown error',
        name: ax.name,
        status: ax.response?.status,
      });

      let errorMessage = 'Unknown error';
      const msg = ax.message ?? '';
      const st = ax.response?.status;
      if (msg) {
        errorMessage = msg;
      }
      if (msg.includes('API key') || msg.includes('auth') || st === 401) {
        errorMessage = 'Scaleway API key is invalid or missing';
      } else if (msg.includes('rate limit') || st === 429) {
        errorMessage = 'Scaleway API rate limit exceeded. Please try again later.';
      } else if (msg.includes('quota') || st === 403) {
        errorMessage = 'Scaleway API quota exceeded. Please check your account.';
      } else if (ax.response?.data?.message) {
        errorMessage = ax.response.data.message;
      }

      yield {
        event: SSEEventType.ERROR,
        data: JSON.stringify({
          error: 'Scaleway API error',
          message: errorMessage,
        }),
      };
    }
  }

  private async generateScalewayCompletion(
    request: ChatCompletionRequest,
    model: string,
    temperature: number,
    maxTokens: number
  ): Promise<ChatCompletionResponse> {
    if (isResponseCacheEnabled()) {
      const cached = await getCachedResponse(request.messages);
      if (cached) {
        logger.info('Scaleway response cache hit (non-stream)');
        return {
          id: `cache-${Date.now()}`,
          model: 'cached',
          choices: [
            {
              index: 0,
              message: {
                role: 'assistant',
                content: cached,
                timestamp: new Date(),
              },
              finishReason: 'stop',
            },
          ],
          usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
          created: Math.floor(Date.now() / 1000),
        };
      }
    }

    if (!process.env.SCALEWAY_API_KEY) {
      if (this.shouldUseLocalMock()) {
        return this.generateLocalMockCompletion(request);
      }
      throw new Error('SCALEWAY_API_KEY not configured');
    }

    const crisisResult = detectCrisisInMessages(request.messages);
    const scalewayMessages = this.buildSanitizedMessages(request);
    const scalewayClient = this.getScalewayClient();
    const response = await scalewayClient.post('/chat/completions', {
      model,
      messages: scalewayMessages,
      temperature,
      top_p: request.topP ?? this.defaultTopP,
      max_tokens: maxTokens,
      stream: false,
    });

    const completion = response.data;
    const choice = completion.choices?.[0];
    if (!choice || !choice.message) {
      throw new Error('No response from Scaleway');
    }

    let content = this.extractTextContent(choice.message.content);
    if (crisisResult.isCrisis) {
      content = crisisResult.prependText + content;
    }

    const promptTokens = completion.usage?.prompt_tokens || 0;
    const completionTokens = completion.usage?.completion_tokens || 0;
    logScalewayUsage(createUsageRecord(model, promptTokens, completionTokens));

    if (isResponseCacheEnabled() && content) {
      await cacheResponse(request.messages, content);
    }

    return {
      id: completion.id || `scaleway-${Date.now()}`,
      model: completion.model || model,
      choices: [
        {
          index: 0,
          message: {
            role: choice.message.role as 'assistant',
            content,
            timestamp: new Date(),
          },
          finishReason: choice.finish_reason || 'stop',
        },
      ],
      usage: {
        promptTokens,
        completionTokens,
        totalTokens: completion.usage?.total_tokens || promptTokens + completionTokens,
      },
      created: completion.created || Math.floor(Date.now() / 1000),
    };
  }

  /**
   * Generate completion response using GPU service or Scaleway API
   * Streams tokens from the configured AI service
   */
  async *generateCompletionStream(
    request: ChatCompletionRequest
  ): AsyncGenerator<SSEMessage, void, unknown> {
    const model = request.model || this.resolveDefaultModel();
    const temperature = request.temperature ?? this.defaultTemperature;
    const maxTokens = request.maxTokens ?? this.defaultMaxTokens;

    if (shouldUseScalewayDirect()) {
      yield* this.generateScalewayCompletionStream(request, model, temperature, maxTokens);
      return;
    }

    if (this.hasSelfHostedUpstream()) {
      const rawLen = this.getSelfHostedBaseUrlChain().length;
      const chain = this.getReachableSelfHostedChain();
      if (chain.length === 0 && rawLen > 0) {
        logger.warn('All self-hosted LLM upstreams unhealthy or circuit-open; falling back to Scaleway');
      }
      for (const baseUrl of chain) {
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            yield* this.streamOpenAIUpstream(baseUrl, request, model, temperature, maxTokens);
            this.recordUpstreamSuccess(baseUrl);
            return;
          } catch (err) {
            if (attempt === 0 && this.isRetryableUpstreamError(err)) {
              logger.warn('Retrying upstream stream once', { baseUrl });
              continue;
            }
            logger.warn('Upstream stream failed', {
              baseUrl,
              err: err instanceof Error ? err.message : String(err),
            });
            this.recordUpstreamFailure(baseUrl);
            break;
          }
        }
      }
      logger.info('Self-hosted upstreams exhausted; falling back to Scaleway');
    }

    yield* this.generateScalewayCompletionStream(request, model, temperature, maxTokens);
  }

  /**
   * Generate a non-streaming completion using GPU service or Scaleway API
   */
  async generateCompletion(
    request: ChatCompletionRequest
  ): Promise<ChatCompletionResponse> {
    const model = request.model || this.resolveDefaultModel();
    const temperature = request.temperature ?? this.defaultTemperature;
    const maxTokens = request.maxTokens ?? this.defaultMaxTokens;

    if (shouldUseScalewayDirect()) {
      return this.generateScalewayCompletion(request, model, temperature, maxTokens);
    }

    if (this.hasSelfHostedUpstream()) {
      const rawLen = this.getSelfHostedBaseUrlChain().length;
      const chain = this.getReachableSelfHostedChain();
      if (chain.length === 0 && rawLen > 0) {
        logger.warn(
          'All self-hosted LLM upstreams unhealthy or circuit-open; falling back to Scaleway (non-stream)'
        );
      }
      for (const baseUrl of chain) {
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            const result = await this.postOpenAIUpstream(baseUrl, request, model, temperature, maxTokens);
            this.recordUpstreamSuccess(baseUrl);
            return result;
          } catch (err) {
            if (attempt === 0 && this.isRetryableUpstreamError(err)) {
              logger.warn('Retrying upstream completion once', { baseUrl });
              continue;
            }
            logger.warn('Upstream non-stream failed', {
              baseUrl,
              err: err instanceof Error ? err.message : String(err),
            });
            this.recordUpstreamFailure(baseUrl);
            break;
          }
        }
      }
      logger.info('Self-hosted upstreams exhausted; falling back to Scaleway (non-stream)');
    }

    return this.generateScalewayCompletion(request, model, temperature, maxTokens);
  }

  /**
   * Format SSE message according to SSE specification
   */
  formatSSEMessage(message: SSEMessage): string {
    let sse = '';

    if (message.id) {
      sse += `id: ${message.id}\n`;
    }

    if (message.retry) {
      sse += `retry: ${message.retry}\n`;
    }

    sse += `event: ${message.event}\n`;
    sse += `data: ${message.data}\n\n`;

    return sse;
  }
}

// Export singleton instance
export const aiGatewayService = new AIGatewayService();
export default aiGatewayService;


