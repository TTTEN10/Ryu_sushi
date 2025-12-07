import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import Joi from 'joi';
import logger from '../lib/logger';
import { authenticateWallet, optionalAuthenticateWallet, AuthenticatedRequest } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { ETHEREUM_MAINNET_CHAIN_ID } from '../lib/constants';
import { DIDService } from '../lib/did.service';
import { ethers } from 'ethers';
import { aiGatewayService, ChatCompletionRequest } from '../lib/ai-gateway.service';
import { safetyResponseInterceptor } from '../middleware/safety';
import { chatRateLimitMiddleware } from '../lib/ratelimit';
import { optionalQuotaMiddleware } from '../middleware/quota';
import { QuotaService } from '../lib/quota.service';
import { subscriptionService } from '../lib/subscription.service';
import { priceOracleService } from '../lib/price-oracle.service';

const router = Router();
const prisma = new PrismaClient();

// Apply safety middleware to all chat routes
router.use(safetyResponseInterceptor);

/**
 * Validation schema for chat save
 */
const chatSaveSchema = Joi.object({
  encryptedChatBlob: Joi.string().required(),
  didTokenId: Joi.string().allow(null).optional(),
});

/**
 * POST /api/chat/save
 * Save encrypted chat history
 * 
 * Input: { encryptedChatBlob: string, didTokenId: string | null }
 * Auth: Required (wallet session)
 * 
 * Flow:
 * 1. Validate authenticated wallet session
 * 2. Ensure caller is DID owner (if DID exists)
 * 3. Store encrypted blob in database
 * 4. Generate hash of encrypted blob
 * 5. Update DID's encryptedData field with hash + encrypted key reference
 */
router.post(
  '/save',
  authenticateWallet,
  validate(chatSaveSchema),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.wallet) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      // Validate chain ID
      if (req.wallet.chainId !== ETHEREUM_MAINNET_CHAIN_ID) {
        return res.status(400).json({
          success: false,
          message: 'Only Ethereum Mainnet is supported',
          error: 'UNSUPPORTED_CHAIN',
        });
      }

      const { encryptedChatBlob, didTokenId } = req.body;
      const walletAddress = req.wallet.walletAddress.toLowerCase();

      // Verify DID ownership if DID exists
      const didService = DIDService.getInstance();
      if (didService) {
        const hasDid = await didService.hasDid(walletAddress);
        if (hasDid) {
          const didInfo = await didService.getDIDInfo(walletAddress);
          if (didTokenId && didInfo.tokenId !== didTokenId) {
            return res.status(403).json({
              success: false,
              message: 'DID token ID does not match authenticated wallet',
              error: 'DID_MISMATCH',
            });
          }
        } else if (didTokenId) {
          return res.status(404).json({
            success: false,
            message: 'DID not found for wallet',
            error: 'DID_NOT_FOUND',
          });
        }
      }

      // Generate hash of encrypted blob (for on-chain storage)
      const encoder = new TextEncoder();
      const blobBytes = encoder.encode(encryptedChatBlob);
      const hash = await crypto.subtle.digest('SHA-256', blobBytes);
      const blobHash = ethers.hexlify(new Uint8Array(hash));

      // Store or update encrypted chat in database
      const encryptedChat = await prisma.encryptedChat.upsert({
        where: { walletAddress },
        update: {
          encryptedBlob: encryptedChatBlob,
          encryptedBlobHash: blobHash,
          didTokenId: didTokenId || null,
          updatedAt: new Date(),
        },
        create: {
          walletAddress,
          encryptedBlob: encryptedChatBlob,
          encryptedBlobHash: blobHash,
          didTokenId: didTokenId || null,
        },
      });

      // Update DID's chat reference with hash
      // The chat reference is stored as bytes32 (hash) in the DID profile
      if (didService) {
        const didInfo = await didService.getDIDInfo(walletAddress);
        if (didInfo?.hasDid) {
          // Get existing profile to preserve encrypted key metadata
          const profile = await didService.getProfile(walletAddress);
          
          // Convert blob hash to bytes32 format (remove 0x prefix if present, ensure 32 bytes)
          const hashBytes = ethers.getBytes(blobHash);
          const hashBytes32 = ethers.zeroPadValue(ethers.hexlify(hashBytes.slice(0, 32)), 32);
          
          // Use the hash as the chat reference (string format for frontend)
          const chatReference = blobHash;

          logger.info(`Chat saved for ${walletAddress}, hash: ${blobHash}`);

          res.json({
            success: true,
            message: 'Chat saved successfully',
            data: {
              chatId: encryptedChat.id,
              blobHash,
              didTokenId: didInfo.tokenId,
              // Return the chat reference that should be stored in DID
              chatReference,
              // Preserve existing encrypted key metadata if it exists
              preserveEncryptedKeyMetadata: profile?.encryptedKeyMetadata || null,
              // Indicates frontend should call updateChatReference
              requiresDidUpdate: true,
            },
          });
          } catch (didError) {
            logger.error('Error updating DID data:', didError);
            // Still return success for chat save, but note DID update failed
            res.json({
              success: true,
              message: 'Chat saved, but DID update may be needed',
              data: {
                chatId: encryptedChat.id,
                blobHash,
                didTokenId: didInfo.tokenId,
                requiresDidUpdate: true,
                warning: 'DID update should be performed by wallet owner',
              },
            });
          }
        } else {
        // No DID yet, just save chat
        res.json({
          success: true,
          message: 'Chat saved successfully',
          data: {
            chatId: encryptedChat.id,
            blobHash,
            didTokenId: null,
            requiresDidUpdate: false,
          },
        });
      }
    } catch (error: any) {
      logger.error('Chat save error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to save chat',
      });
    }
  }
);

/**
 * GET /api/chat/load
 * Load encrypted chat history for authenticated wallet
 * 
 * Auth: Required (wallet session)
 * 
 * Flow:
 * 1. Validate authenticated wallet session
 * 2. Load encrypted chat from database
 * 3. Return encrypted blob (frontend will decrypt)
 */
router.get(
  '/load',
  authenticateWallet,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.wallet) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      // Validate chain ID
      if (req.wallet.chainId !== ETHEREUM_MAINNET_CHAIN_ID) {
        return res.status(400).json({
          success: false,
          message: 'Only Ethereum Mainnet is supported',
          error: 'UNSUPPORTED_CHAIN',
        });
      }

      const walletAddress = req.wallet.walletAddress.toLowerCase();

      // Load encrypted chat from database
      const encryptedChat = await prisma.encryptedChat.findUnique({
        where: { walletAddress },
      });

      if (!encryptedChat) {
        return res.json({
          success: true,
          data: {
            hasChat: false,
            encryptedChatBlob: null,
            blobHash: null,
          },
        });
      }

      // Optionally verify hash matches DID if DID exists
      const didService = DIDService.getInstance();
      if (didService) {
        const hasDid = await didService.hasDid(walletAddress);
        if (hasDid) {
          try {
            const profile = await didService.getProfile(walletAddress);
            if (profile) {
              // Convert bytes32 chat reference to hex string for comparison
              const chatRefHex = profile.chatDataReference;
              if (chatRefHex && chatRefHex !== '0x0000000000000000000000000000000000000000000000000000000000000000') {
                // Compare with stored hash (may need to normalize format)
                const storedHash = encryptedChat.encryptedBlobHash.toLowerCase();
                const refHash = chatRefHex.toLowerCase();
                if (refHash !== storedHash && !storedHash.startsWith(refHash.slice(0, 10))) {
                  logger.warn(`Chat hash mismatch for ${walletAddress}`);
                  // Still return chat, but note the mismatch
                }
              }
            }
          } catch (error) {
            // Ignore DID check errors
            logger.warn('Could not verify chat hash with DID:', error);
          }
        }
      }

      logger.info(`Chat loaded for ${walletAddress}`);

      res.json({
        success: true,
        data: {
          hasChat: true,
          encryptedChatBlob: encryptedChat.encryptedBlob,
          blobHash: encryptedChat.encryptedBlobHash,
          didTokenId: encryptedChat.didTokenId,
          updatedAt: encryptedChat.updatedAt.toISOString(),
        },
      });
    } catch (error: any) {
      logger.error('Chat load error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to load chat',
      });
    }
  }
);

/**
 * Validation schema for chat completions
 */
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
  temperature: Joi.number().min(0).max(2).optional(),
  maxTokens: Joi.number().integer().min(1).max(4000).optional(),
  stream: Joi.boolean().optional(),
  userId: Joi.string().max(255).optional(),
  sessionId: Joi.string().max(255).optional(),
});

/**
 * POST /api/chat/completions
 * Main chat completion endpoint with optional SSE streaming
 * 
 * Auth: Optional (wallet session recommended for encrypted chat)
 */
router.post(
  '/completions',
  chatRateLimitMiddleware,
  optionalAuthenticateWallet,
  optionalQuotaMiddleware, // Check quota but allow if not authenticated
  validate(chatCompletionSchema),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      const request: ChatCompletionRequest = req.body;
      const shouldStream = request.stream !== false; // Default to streaming

      // Check quota if DID is authenticated
      if (req.quota && req.wallet) {
        const { did, service } = req.quota;
        const walletAddress = req.wallet.walletAddress.toLowerCase();
        const incrementResult = await service.incrementUsage(did);
        
        // Update quota status with subscription limits
        const quotaStatus = await service.getQuotaStatus(did, walletAddress);
        
        if (!incrementResult.success) {
          // Get pricing information for paywall (dynamic ETH price)
          const premiumPricing = await priceOracleService.getPremiumPricing();
          const pricing = {
            PREMIUM: {
              crypto: {
                ETH: premiumPricing.ETH,
                USDT: premiumPricing.USDT,
                USDC: premiumPricing.USDC,
              },
              stripe: process.env.STRIPE_PRICE_PREMIUM || null,
            },
          };

          const paywallData = {
            error: 'QUOTA_EXCEEDED',
            message: 'Chat quota exceeded. Upgrade to Premium to continue.',
            quota: {
              dailyUsed: incrementResult.status.dailyUsed,
              dailyLimit: incrementResult.status.dailyLimit,
              monthlyUsed: incrementResult.status.monthlyUsed,
              monthlyLimit: incrementResult.status.monthlyLimit,
              resetDailyAt: incrementResult.status.resetDailyAt,
              resetMonthlyAt: incrementResult.status.resetMonthlyAt,
            },
            paywall: {
              showPaywall: true,
              pricing,
              paymentRecipient: process.env.CRYPTO_PAYMENT_CONTRACT_ADDRESS || null,
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

      if (shouldStream) {
        // Set SSE headers
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');

        // Send connected event
        res.write(`event: connected\n`);
        res.write(`data: ${JSON.stringify({ status: 'connected' })}\n\n`);

        try {
          // Stream completion
          for await (const sseMessage of aiGatewayService.generateCompletionStream(request)) {
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
        // Non-streaming response
        const completion = await aiGatewayService.generateCompletion(request);
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

/**
 * GET /api/chat/quota
 * Get quota status for authenticated DID
 * 
 * Auth: Required (wallet session)
 */
router.get(
  '/quota',
  authenticateWallet,
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.wallet) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
        });
      }

      const walletAddress = req.wallet.walletAddress.toLowerCase();
      const quotaService = QuotaService.getInstance();

      // Get DID from wallet address
      const did = await quotaService.getDIDFromWallet(walletAddress);

      if (!did) {
        return res.json({
          success: true,
          message: 'No DID found for wallet',
          data: {
            hasDid: false,
            quota: null,
          },
        });
      }

      // Get quota status (pass wallet address for subscription check)
      const quotaStatus = await quotaService.getQuotaStatus(did, walletAddress);
      
      // Get subscription info
      const subscription = await subscriptionService.getOrCreateSubscription(walletAddress);

      res.json({
        success: true,
        data: {
          hasDid: true,
          did,
          quota: quotaStatus,
          subscription: {
            tier: subscription.tier,
            status: subscription.status,
            dailyLimit: subscription.dailyLimit,
            monthlyLimit: subscription.monthlyLimit,
          },
        },
      });
    } catch (error: any) {
      logger.error('Quota status error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get quota status',
      });
    }
  }
);

/**
 * GET /api/chat/health
 * Health check for chat endpoints
 */
router.get('/health', (_req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Chat endpoints are healthy',
    timestamp: new Date().toISOString(),
  });
});

export default router;
