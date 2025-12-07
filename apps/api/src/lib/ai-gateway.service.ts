import logger from './logger';
import OpenAI from 'openai';

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
 * Handles AI completions using OpenAI API
 */
class AIGatewayService {
  private openai: OpenAI | null = null;
  private readonly defaultModel = 'gpt-4o-mini';
  private readonly defaultTemperature = 0.7;
  private readonly defaultMaxTokens = 1000;

  /**
   * Get or initialize OpenAI client (lazy initialization)
   */
  private getOpenAIClient(): OpenAI {
    if (!this.openai) {
      // Load environment variables if not already loaded
      if (!process.env.OPENAI_API_KEY) {
        try {
          require('dotenv').config();
        } catch (e) {
          // dotenv might already be loaded
        }
      }
      
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        logger.warn('OPENAI_API_KEY not found in environment variables. OpenAI integration will not work.');
      } else {
        logger.info('OpenAI API key loaded successfully');
      }
      this.openai = new OpenAI({
        apiKey: apiKey || '',
      });
    }
    return this.openai;
  }

  /**
   * Generate completion response using OpenAI API
   * Streams tokens from OpenAI
   */
  async *generateCompletionStream(
    request: ChatCompletionRequest
  ): AsyncGenerator<SSEMessage, void, unknown> {
    const model = request.model || this.defaultModel;
    const temperature = request.temperature ?? this.defaultTemperature;
    const maxTokens = request.maxTokens ?? this.defaultMaxTokens;

    logger.info(`Generating OpenAI completion: model=${model}, messages=${request.messages.length}`);

    // Check if API key is available
    if (!process.env.OPENAI_API_KEY) {
      logger.error('OPENAI_API_KEY not configured');
      yield {
        event: SSEEventType.ERROR,
        data: JSON.stringify({
          error: 'OpenAI API key not configured',
          message: 'Please configure OPENAI_API_KEY environment variable',
        }),
      };
      return;
    }

    try {
      // Prepare messages for OpenAI (remove timestamp if present)
      const openaiMessages = request.messages.map((msg) => ({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content,
      }));

      // Add system message if not present
      const hasSystemMessage = openaiMessages.some((msg) => msg.role === 'system');
      if (!hasSystemMessage) {
        openaiMessages.unshift({
          role: 'system',
          content: 'You are a compassionate and professional mental health assistant. Provide supportive, empathetic responses while encouraging users to seek professional help when needed. Always prioritize user safety and wellbeing.',
        });
      }

      // Create OpenAI stream
      const openaiClient = this.getOpenAIClient();
      const stream = await openaiClient.chat.completions.create({
        model,
        messages: openaiMessages,
        temperature,
        max_tokens: maxTokens,
        stream: true,
      });

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
      let usage = {
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
      };

      // Stream tokens from OpenAI
      for await (const chunk of stream) {
        const choice = chunk.choices[0];
        
        // Handle content delta
        if (choice?.delta?.content) {
          const token = choice.delta.content;
          fullContent += token;

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
        }

        // Handle finish reason
        if (choice?.finish_reason) {
          finishReason = choice.finish_reason;
        }
      }

      // Estimate usage (OpenAI doesn't provide usage in streaming mode)
      // Rough estimate: ~4 characters per token
      const estimatedPromptTokens = Math.ceil(
        openaiMessages.reduce((sum, msg) => sum + msg.content.length, 0) / 4
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
    } catch (error) {
      logger.error('OpenAI streaming error:', error);
      logger.error('OpenAI error details:', {
        message: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined,
        name: error instanceof Error ? error.name : undefined,
      });
      
      // Check for specific OpenAI API errors
      let errorMessage = 'Unknown error';
      if (error instanceof Error) {
        errorMessage = error.message;
        // Handle OpenAI API specific errors
        if (error.message.includes('API key')) {
          errorMessage = 'OpenAI API key is invalid or missing';
        } else if (error.message.includes('rate limit')) {
          errorMessage = 'OpenAI API rate limit exceeded. Please try again later.';
        } else if (error.message.includes('quota')) {
          errorMessage = 'OpenAI API quota exceeded. Please check your account.';
        }
      }
      
      yield {
        event: SSEEventType.ERROR,
        data: JSON.stringify({
          error: 'OpenAI API error',
          message: errorMessage,
        }),
      };
    }
  }

  /**
   * Generate a non-streaming completion using OpenAI API
   */
  async generateCompletion(
    request: ChatCompletionRequest
  ): Promise<ChatCompletionResponse> {
    const model = request.model || this.defaultModel;
    const temperature = request.temperature ?? this.defaultTemperature;
    const maxTokens = request.maxTokens ?? this.defaultMaxTokens;

    logger.info(`Generating OpenAI completion (non-streaming): model=${model}`);

    // Check if API key is available
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY not configured');
    }

    try {
      // Prepare messages for OpenAI
      const openaiMessages = request.messages.map((msg) => ({
        role: msg.role as 'user' | 'assistant' | 'system',
        content: msg.content,
      }));

      // Add system message if not present
      const hasSystemMessage = openaiMessages.some((msg) => msg.role === 'system');
      if (!hasSystemMessage) {
        openaiMessages.unshift({
          role: 'system',
          content: 'You are a compassionate and professional mental health assistant. Provide supportive, empathetic responses while encouraging users to seek professional help when needed. Always prioritize user safety and wellbeing.',
        });
      }

      // Call OpenAI API
      const openaiClient = this.getOpenAIClient();
      const completion = await openaiClient.chat.completions.create({
        model,
        messages: openaiMessages,
        temperature,
        max_tokens: maxTokens,
      });

      const choice = completion.choices[0];
      if (!choice || !choice.message) {
        throw new Error('No response from OpenAI');
      }

      return {
        id: completion.id,
        model: completion.model,
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
        created: completion.created,
      };
    } catch (error) {
      logger.error('OpenAI completion error:', error);
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


