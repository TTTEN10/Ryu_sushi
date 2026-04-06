import logger from './logger';
import axios, { AxiosInstance } from 'axios';
import { DR_SAFE_SYSTEM_PROMPT } from './dr-safe-system-prompt';

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
 * Handles AI completions using GPU service (if AI_GPU_BASE_URL is set) or Scaleway Generative API (fallback)
 * Single source of truth: reads AI_GPU_BASE_URL environment variable, never hardcodes
 */
class AIGatewayService {
  private axiosClient: AxiosInstance | null = null;
  private gpuClient: AxiosInstance | null = null;
  private readonly defaultModel = 'llama-3-70b-instruct'; // Scaleway default model
  private readonly defaultTemperature = 0.7;
  private readonly defaultMaxTokens = 1000;
  private readonly scalewayBaseUrl = 'https://api.scaleway.com/ai/v1alpha1';
  
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
   * Check if GPU service is configured
   */
  private isGPUServiceConfigured(): boolean {
    return !!this.getAIServiceBaseUrl();
  }
  
  /**
   * Get or initialize GPU AI service client
   */
  private getGPUClient(): AxiosInstance {
    if (!this.gpuClient) {
      const baseUrl = this.getAIServiceBaseUrl();
      if (!baseUrl) {
        throw new Error('AI_GPU_BASE_URL not configured');
      }
      
      // Get API key for authentication
      const apiKey = process.env.AI_INTERNAL_API_KEY;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      // Add Authorization header if API key is configured
      if (apiKey) {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }
      
      this.gpuClient = axios.create({
        baseURL: baseUrl,
        headers,
        timeout: 120000, // 2 minutes for long responses
        validateStatus: () => true, // handle retries and errors in callers
      });
      
      logger.info('GPU AI service client initialized' + (apiKey ? ' (with API key)' : ' (no API key)'));
    }
    return this.gpuClient;
  }

  /**
   * Get or initialize Scaleway API client (lazy initialization)
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
      if (!apiKey) {
        logger.warn('SCALEWAY_API_KEY not found in environment variables. Scaleway integration will not work.');
      } else {
        logger.info('Scaleway API key loaded successfully');
      }
      
      this.axiosClient = axios.create({
        baseURL: this.scalewayBaseUrl,
        headers: {
          'X-Auth-Token': apiKey || '',
          'Content-Type': 'application/json',
        },
        timeout: 120000, // 2 minutes timeout for long responses
      });
    }
    return this.axiosClient;
  }

  /**
   * Generate completion response using GPU service or Scaleway API
   * Streams tokens from the configured AI service
   */
  async *generateCompletionStream(
    request: ChatCompletionRequest
  ): AsyncGenerator<SSEMessage, void, unknown> {
    const model = request.model || this.defaultModel;
    const temperature = request.temperature ?? this.defaultTemperature;
    const maxTokens = request.maxTokens ?? this.defaultMaxTokens;

    // Check if GPU service is configured (single source of truth)
    if (this.isGPUServiceConfigured()) {
      yield* this.generateGPUCompletionStream(request, model, temperature, maxTokens);
      return;
    }

    // Fallback to Scaleway
    logger.info(`Generating Scaleway completion: model=${model}, messages=${request.messages.length}`);

    // Check if API key is available
    if (!process.env.SCALEWAY_API_KEY) {
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

    try {
      // Prepare messages for Scaleway - ONLY send role and content (no metadata)
      // Explicitly sanitize to prevent metadata leakage (no userId, sessionId, timestamps, wallet addresses, DID, IP)
      const scalewayMessages = request.messages.map((msg) => ({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content, // Only message content, no identifiers
      }));

      // Add system message if not present
      const hasSystemMessage = scalewayMessages.some((msg) => msg.role === 'system');
      if (!hasSystemMessage) {
        scalewayMessages.unshift({
          role: 'system',
          content: DR_SAFE_SYSTEM_PROMPT,
        });
      }

      // Create Scaleway API request - ONLY send model, messages, temperature, max_tokens
      // DO NOT send: userId, sessionId, wallet addresses, DID, IP addresses, or any other metadata
      const scalewayClient = this.getScalewayClient();
      const response = await scalewayClient.post(
        '/chat/completions',
        {
          model,
          messages: scalewayMessages, // Only role and content, no identifiers
          temperature,
          max_tokens: maxTokens,
          stream: true,
        },
        {
          responseType: 'stream',
        }
      );

      // Send metadata event
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

      // Use a queue-based approach for proper async iteration
      const tokenQueue: string[] = [];
      let streamEnded = false;
      let streamError: Error | null = null;

      // Convert Node.js stream to async iterable using a queue
      const stream = response.data;
      
      stream.on('data', (chunk: Buffer) => {
        buffer += chunk.toString();
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const dataStr = line.slice(6).trim();
            if (dataStr === '[DONE]') {
              continue;
            }

            try {
              const data = JSON.parse(dataStr);
              const choice = data.choices?.[0];
              
              // Handle content delta
              if (choice?.delta?.content) {
                const token = choice.delta.content;
                fullContent += token;
                tokenQueue.push(token);
              }

              // Handle finish reason
              if (choice?.finish_reason) {
                finishReason = choice.finish_reason;
              }
            } catch (parseError) {
              // Skip invalid JSON lines
              continue;
            }
          }
        }
      });

      stream.on('end', () => {
        // Process any remaining buffer
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
                if (choice?.delta?.content) {
                  const token = choice.delta.content;
                  fullContent += token;
                  tokenQueue.push(token);
                }
                if (choice?.finish_reason) {
                  finishReason = choice.finish_reason;
                }
              } catch (parseError) {
                // Skip invalid JSON
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

      // Yield tokens as they arrive
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
          // Wait a bit before checking again
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }

      // Estimate usage (Scaleway may not provide usage in streaming mode)
      // Rough estimate: ~4 characters per token
      const estimatedPromptTokens = Math.ceil(
        scalewayMessages.reduce((sum, msg) => sum + msg.content.length, 0) / 4
      );
      const estimatedCompletionTokens = Math.ceil(fullContent.length / 4);

      // Send done event
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
    } catch (error: any) {
      // Log error without request/response bodies (redacted)
      // DO NOT log: request body, response body, or message content
      logger.error('Scaleway streaming error:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        name: error instanceof Error ? error.name : undefined,
        status: error.response?.status, // Safe: HTTP status code only
        // Explicitly NOT logging: error.response?.data (may contain sensitive payload)
        // Explicitly NOT logging: error.stack (may contain sensitive data in production)
      });
      
      // Check for specific Scaleway API errors
      let errorMessage = 'Unknown error';
      if (error instanceof Error) {
        errorMessage = error.message;
        // Handle Scaleway API specific errors
        if (error.message.includes('API key') || error.message.includes('auth') || error.response?.status === 401) {
          errorMessage = 'Scaleway API key is invalid or missing';
        } else if (error.message.includes('rate limit') || error.response?.status === 429) {
          errorMessage = 'Scaleway API rate limit exceeded. Please try again later.';
        } else if (error.message.includes('quota') || error.response?.status === 403) {
          errorMessage = 'Scaleway API quota exceeded. Please check your account.';
        } else if (error.response?.data) {
          errorMessage = error.response.data.message || errorMessage;
        }
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

  /**
   * Generate streaming completion using GPU service
   */
  async *generateGPUCompletionStream(
    request: ChatCompletionRequest,
    model: string,
    temperature: number,
    maxTokens: number
  ): AsyncGenerator<SSEMessage, void, unknown> {
    logger.info(`Generating GPU completion: model=${model}, messages=${request.messages.length}`);

    try {
      const gpuClient = this.getGPUClient();
      
      // Prepare messages - ONLY send role and content (no metadata)
      const cleanMessages = request.messages.map((msg) => ({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content, // Only message content, no identifiers
      }));

      // Add system message if not present
      const hasSystemMessage = cleanMessages.some((msg) => msg.role === 'system');
      if (!hasSystemMessage) {
        cleanMessages.unshift({
          role: 'system',
          content: DR_SAFE_SYSTEM_PROMPT,
        });
      }

      // Call GPU service with streaming
      const response = await gpuClient.post(
        '/v1/chat/completions',
        {
          model,
          messages: cleanMessages,
          temperature,
          max_tokens: maxTokens,
          stream: true,
        },
        {
          responseType: 'stream',
        }
      );

      // Send metadata event
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
              
              if (choice?.delta?.content) {
                const token = choice.delta.content;
                fullContent += token;
                tokenQueue.push(token);
              }

              if (choice?.finish_reason) {
                finishReason = choice.finish_reason;
              }
            } catch (parseError) {
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
                if (choice?.delta?.content) {
                  const token = choice.delta.content;
                  fullContent += token;
                  tokenQueue.push(token);
                }
                if (choice?.finish_reason) {
                  finishReason = choice.finish_reason;
                }
              } catch (parseError) {
                // Skip invalid JSON
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

      // Yield tokens as they arrive
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
          await new Promise(resolve => setTimeout(resolve, 10));
        }
      }

      // Estimate usage
      const estimatedPromptTokens = Math.ceil(
        cleanMessages.reduce((sum, msg) => sum + msg.content.length, 0) / 4
      );
      const estimatedCompletionTokens = Math.ceil(fullContent.length / 4);

      // Send done event
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
    } catch (error: any) {
      logger.error('GPU service streaming error:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        name: error instanceof Error ? error.name : undefined,
        status: error.response?.status,
      });
      
      let errorMessage = 'Unknown error';
      if (error instanceof Error) {
        errorMessage = error.message;
        if (error.response?.status === 503) {
          errorMessage = 'GPU service model not loaded. Service is starting up.';
        } else if (error.response?.status === 500) {
          errorMessage = 'GPU service internal error';
        }
      }
      
      yield {
        event: SSEEventType.ERROR,
        data: JSON.stringify({
          error: 'GPU service error',
          message: errorMessage,
        }),
      };
    }
  }

  /**
   * Generate a non-streaming completion using GPU service or Scaleway API
   */
  async generateCompletion(
    request: ChatCompletionRequest
  ): Promise<ChatCompletionResponse> {
    const model = request.model || this.defaultModel;
    const temperature = request.temperature ?? this.defaultTemperature;
    const maxTokens = request.maxTokens ?? this.defaultMaxTokens;

    // Check if GPU service is configured (single source of truth)
    if (this.isGPUServiceConfigured()) {
      return this.generateGPUCompletion(request, model, temperature, maxTokens);
    }

    // Fallback to Scaleway
    logger.info(`Generating Scaleway completion (non-streaming): model=${model}`);

    // Check if API key is available
    if (!process.env.SCALEWAY_API_KEY) {
      throw new Error('SCALEWAY_API_KEY not configured');
    }

    try {
      // Prepare messages for Scaleway - ONLY send role and content (no metadata)
      // Explicitly sanitize to prevent metadata leakage (no userId, sessionId, timestamps, wallet addresses, DID, IP)
      const scalewayMessages = request.messages.map((msg) => ({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content, // Only message content, no identifiers
      }));

      // Add system message if not present
      const hasSystemMessage = scalewayMessages.some((msg) => msg.role === 'system');
      if (!hasSystemMessage) {
        scalewayMessages.unshift({
          role: 'system',
          content: DR_SAFE_SYSTEM_PROMPT,
        });
      }

      // Call Scaleway API - ONLY send model, messages, temperature, max_tokens
      // DO NOT send: userId, sessionId, wallet addresses, DID, IP addresses, or any other metadata
      const scalewayClient = this.getScalewayClient();
      const response = await scalewayClient.post('/chat/completions', {
        model,
        messages: scalewayMessages, // Only role and content, no identifiers
        temperature,
        max_tokens: maxTokens,
        stream: false,
      });

      const completion = response.data;
      const choice = completion.choices?.[0];
      if (!choice || !choice.message) {
        throw new Error('No response from Scaleway');
      }

      return {
        id: completion.id || `scaleway-${Date.now()}`,
        model: completion.model || model,
        choices: [
          {
            index: 0,
            message: {
              role: choice.message.role as 'assistant',
              content: choice.message.content || '',
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
    } catch (error: any) {
      // Log error without request/response bodies (redacted)
      // DO NOT log: request body, response body, or message content
      logger.error('Scaleway completion error:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        name: error instanceof Error ? error.name : undefined,
        status: error.response?.status, // Safe: HTTP status code only
        // Explicitly NOT logging: error.response?.data (may contain sensitive payload)
      });
      throw error;
    }
  }

  /**
   * Generate non-streaming completion using GPU service
   */
  async generateGPUCompletion(
    request: ChatCompletionRequest,
    model: string,
    temperature: number,
    maxTokens: number
  ): Promise<ChatCompletionResponse> {
    logger.info(`Generating GPU completion (non-streaming): model=${model}`);

    try {
      const gpuClient = this.getGPUClient();
      
      // Prepare messages - ONLY send role and content (no metadata)
      const cleanMessages = request.messages.map((msg) => ({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content, // Only message content, no identifiers
      }));

      // Add system message if not present
      const hasSystemMessage = cleanMessages.some((msg) => msg.role === 'system');
      if (!hasSystemMessage) {
        cleanMessages.unshift({
          role: 'system',
          content: DR_SAFE_SYSTEM_PROMPT,
        });
      }

      // Call GPU service
      const response = await gpuClient.post('/v1/chat/completions', {
        model,
        messages: cleanMessages,
        temperature,
        max_tokens: maxTokens,
        stream: false,
      });

      const completion = response.data;
      const choice = completion.choices?.[0];
      if (!choice || !choice.message) {
        throw new Error('No response from GPU service');
      }

      return {
        id: completion.id || `gpu-${Date.now()}`,
        model: completion.model || model,
        choices: [
          {
            index: 0,
            message: {
              role: choice.message.role as 'assistant',
              content: choice.message.content || '',
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
    } catch (error: any) {
      logger.error('GPU service completion error:', {
        error: error instanceof Error ? error.message : 'Unknown error',
        name: error instanceof Error ? error.name : undefined,
        status: error.response?.status,
      });
      throw error;
    }
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


