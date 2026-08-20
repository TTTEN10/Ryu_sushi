import { Router, Response } from 'express';
import Joi from 'joi';
import logger from '../lib/logger';
import { optionalAuthenticateWallet, AuthenticatedRequest } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { aiGatewayService, ChatCompletionRequest } from '../lib/ai-gateway.service';
import { chatRateLimitMiddleware, guestChatMinuteRateLimitMiddleware } from '../lib/ratelimit';
import { optionalQuotaMiddleware } from '../middleware/quota';
import { guestChatQuotaMiddleware } from '../middleware/guest-quota';
import { guestDeviceCookieMiddleware } from '../middleware/guest-device-cookie';
import { chatConcurrencyMiddleware } from '../middleware/concurrency';
import { subscriptionService } from '../lib/subscription.service';
import { getAllPrices } from '../lib/subscription-config';
import { enhanceWithRAG } from '../lib/chat-rag-context';
import { consentCheckMiddleware } from '../middleware/consent-check';

const chatCompletionSchema = Joi.object({
  messages: Joi.array()
    .items(
      Joi.object({
        role: Joi.string().valid('user', 'assistant', 'system').required(),
        content: Joi.string().min(1).max(10000).required(),
        timestamp: Joi.date().optional(),
      })
    )
    .min(1)
    .max(100)
    .required(),
  model: Joi.string().max(100).optional(),
  temperature: Joi.number().min(0).max(2).optional().default(0.4),
  topP: Joi.number().min(0).max(1).optional().default(0.9),
  maxTokens: Joi.number().integer().min(1).max(4000).optional(),
  stream: Joi.boolean().optional(),
  userId: Joi.string().max(255).optional(),
  sessionId: Joi.string().max(255).optional(),
  mode: Joi.string().valid('guest', 'authenticated').optional(),
});

/**
 * Shared OpenAI-style chat completions (same handler for /api/chat/completions and /beta/chat/completions).
 */
export function mountChatCompletions(router: Router, path: string = '/completions'): void {
  router.post(
    path,
    chatRateLimitMiddleware,
    optionalAuthenticateWallet,
    consentCheckMiddleware as any,
    guestDeviceCookieMiddleware,
    guestChatMinuteRateLimitMiddleware,
    guestChatQuotaMiddleware,
    chatConcurrencyMiddleware,
    optionalQuotaMiddleware,
    validate(chatCompletionSchema),
    async (req: AuthenticatedRequest, res: Response) => {
      try {
        const request: ChatCompletionRequest = req.body;
        const shouldStream = request.stream !== false;
        const isGuestMode = request.mode === 'guest';

        if (isGuestMode) {
          logger.debug('Chat completion: guest mode — skipping quota increment and persistence');
        }

        if (!isGuestMode && req.quota && req.wallet) {
          const { walletAddress } = req.quota;
          const requestId = crypto.randomUUID();
          const recordResult = await subscriptionService.recordUsage(walletAddress, requestId);

          if (!recordResult.recorded) {
            // Idempotent: already recorded — get current quota status
            const quotaCheck = await subscriptionService.checkQuota(walletAddress);
            const allPrices = getAllPrices();

            if (!quotaCheck.allowed) {
              const paywallData = {
                error: 'QUOTA_EXCEEDED',
                message: 'Chat quota exceeded. Upgrade your plan to continue.',
                quota: {
                  dailyUsed: quotaCheck.daily.used,
                  dailyLimit: quotaCheck.daily.limit,
                  weeklyUsed: quotaCheck.weekly.used,
                  weeklyLimit: quotaCheck.weekly.limit,
                  monthlyUsed: quotaCheck.monthly.used,
                  monthlyLimit: quotaCheck.monthly.limit,
                },
                paywall: {
                  showPaywall: true,
                  pricing: allPrices,
                  paymentRecipient: process.env.PAYMENT_TREASURY_ADDRESS || null,
                },
              };

              if (shouldStream) {
                res.setHeader('Content-Type', 'text/event-stream');
                res.setHeader('Cache-Control', 'no-cache');
                res.setHeader('Connection', 'keep-alive');
                res.write(`event: error\n`);
                res.write(`data: ${JSON.stringify(paywallData)}\n\n`);
                res.end();
              } else {
                res.status(429).json(paywallData);
              }
              return;
            }
          }
        }

        const withContext =
          req.query.withContext === 'true' || String(req.query.withContext) === 'true';
        const enhancedRequest = withContext ? await enhanceWithRAG(request) : request;

        if (shouldStream) {
          res.setHeader('Content-Type', 'text/event-stream');
          res.setHeader('Cache-Control', 'no-cache');
          res.setHeader('Connection', 'keep-alive');
          res.setHeader('X-Accel-Buffering', 'no');

          res.write(`event: connected\n`);
          res.write(`data: ${JSON.stringify({ status: 'connected' })}\n\n`);

          try {
            for await (const sseMessage of aiGatewayService.generateCompletionStream(enhancedRequest)) {
              const eventLine = `event: ${sseMessage.event}\n`;
              const dataLine = `data: ${sseMessage.data}\n`;
              const idLine = sseMessage.id ? `id: ${sseMessage.id}\n` : '';
              const retryLine = sseMessage.retry ? `retry: ${sseMessage.retry}\n` : '';

              res.write(eventLine + dataLine + idLine + retryLine + '\n');
            }
          } catch (streamError: any) {
            logger.error('Streaming error:', streamError);
            res.write(`event: error\n`);
            res.write(`data: ${JSON.stringify({ error: 'Streaming error', message: streamError.message })}\n\n`);
          } finally {
            res.end();
          }
        } else {
          const completion = await aiGatewayService.generateCompletion(enhancedRequest);
          res.json(completion);
        }
      } catch (error: any) {
        logger.error('Chat completion error:', error);
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            error: 'Internal server error',
            message: error.message || 'Failed to generate completion',
            code: error.code || 'COMPLETION_ERROR',
          });
        }
      }
    }
  );
}
