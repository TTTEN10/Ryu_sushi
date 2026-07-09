import { Router, Request, Response } from 'express';
import Joi from 'joi';
import logger from '../lib/logger';
import { authenticateWallet, AuthenticatedRequest } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { prisma } from '../lib/prisma';
import { encryptAES256GCM, decryptAES256GCM, generateEncryptionKey } from '../lib/crypto';
import { ethers } from 'ethers';
import rateLimit from 'express-rate-limit';

const router = Router();

/**
 * Crisis hotline resources by language
 * Matches the resources in crisis-detection.ts
 */
interface CrisisHotline {
  name: string;
  phone: string;
  website: string;
  availability: string;
  countries: Record<string, { phone: string; website: string }>;
}

const CRISIS_HOTLINES: Record<string, CrisisHotline> = {
  en: {
    name: '988 Suicide & Crisis Lifeline',
    phone: '988 (call/text)',
    website: 'https://988lifeline.org',
    availability: '24/7, free, confidential',
    countries: {
      US: { phone: '988', website: 'https://988lifeline.org' },
      UK: { phone: '116 123', website: 'https://www.samaritans.org' },
      CA: { phone: '1-833-456-4566', website: 'https://talksuicide.ca' },
      AU: { phone: '13 11 14', website: 'https://www.lifeline.org.au' },
    },
  },
  zh: {
    name: 'Beijing Suicide Research and Prevention Center',
    phone: '800-810-1117',
    website: 'https://crisis.org.cn',
    availability: '24/7',
    countries: {
      CN: { phone: '800-810-1117', website: 'https://crisis.org.cn' },
      TW: { phone: '1925', website: 'https://www.tspc.org.tw' },
    },
  },
  hi: {
    name: 'AASRA',
    phone: '+91-22-27546669',
    website: 'https://aasra.info',
    availability: '24x7, India',
    countries: {
      IN: { phone: '+91-22-27546669', website: 'https://aasra.info' },
    },
  },
  es: {
    name: 'Teléfono de la Esperanza',
    phone: '+34 717 003 717',
    website: 'https://telefonodelaesperanza.org',
    availability: 'Spain',
    countries: {
      ES: { phone: '+34 717 003 717', website: 'https://telefonodelaesperanza.org' },
      MX: { phone: '988', website: 'https://saludmental.org.mx' },
      US: { phone: '988', website: 'https://988lifeline.org' },
      AR: { phone: '+54 11 5275-2272', website: 'https://www.fundacionajudar.org' },
    },
  },
  ar: {
    name: 'National Mental Support Line',
    phone: '800 4673 (UAE) / 800 122 2777 (Saudi)',
    website: 'https://icarewellbeing.com',
    availability: '',
    countries: {
      AE: { phone: '800 4673', website: 'https://icarewellbeing.com' },
      SA: { phone: '800 122 2777', website: 'https://mh.gov.sa' },
    },
  },
  fr: {
    name: 'SOS Amitié',
    phone: '09 72 39 40 50',
    website: 'https://sosamitie.org',
    availability: '24/7, France',
    countries: {
      FR: { phone: '09 72 39 40 50', website: 'https://sosamitie.org' },
      CA: { phone: '1-833-456-4566', website: 'https://talksuicide.ca' },
      BE: { phone: '1813', website: 'https://www.tele-accueil.be' },
    },
  },
  bn: {
    name: 'Kaan Pete Roi',
    phone: '01779554391, 01779554392 (Grameenphone) / 01688709965, 01688709966 (Airtel)',
    website: 'https://kaanpeteroi.org',
    availability: '24/7, Bangladesh',
    countries: {
      BD: { phone: '01779554391', website: 'https://kaanpeteroi.org' },
    },
  },
  pt: {
    name: 'SOS Voz Amiga',
    phone: '+351 213 544 545',
    website: 'https://sosvozamiga.org',
    availability: 'Portugal',
    countries: {
      PT: { phone: '+351 213 544 545', website: 'https://sosvozamiga.org' },
      BR: { phone: '188', website: 'https://www.cvv.org.br' },
    },
  },
  ru: {
    name: 'EMERCOM of Russia',
    phone: '112 (emergency) / +7 495 400 99 99',
    website: 'https://emercor.gov.ru',
    availability: '24/7',
    countries: {
      RU: { phone: '+7 495 400 99 99', website: 'https://emercor.gov.ru' },
    },
  },
  ur: {
    name: 'Umang Helpline',
    phone: '0311-7786264',
    website: 'https://umanghelpline.com',
    availability: '24/7, Pakistan',
    countries: {
      PK: { phone: '0311-7786264', website: 'https://umanghelpline.com' },
    },
  },
} as const;

type LanguageCode = string;

/**
 * Rate limiting for crisis opt-in endpoint (PII endpoint - strict limits)
 * Pattern from apps/api/src/lib/ratelimit.ts
 */
const crisisOptInRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 5, // 5 requests per minute
  message: {
    success: false,
    message: 'Too many requests. Please wait before trying again.',
    error: 'RATE_LIMIT_EXCEEDED',
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: Request) => {
    const walletAddress = req.headers['x-wallet-address'] as string;
    return walletAddress ? `wallet:${walletAddress.toLowerCase()}` : req.ip || 'unknown';
  },
});

/**
 * Validation schema for crisis opt-in
 */
const crisisOptInSchema = Joi.object({
  email: Joi.string().email().max(255).optional().allow(''),
  fullName: Joi.string().max(100).optional().allow(''),
  emergencyContact: Joi.string().max(255).optional().allow(''),
  language: Joi.string().valid(...Object.keys(CRISIS_HOTLINES)).required(),
  country: Joi.string().optional().allow(''),
});

/**
 * Generate a consent hash for audit purposes
 * This proves the user consented without storing the actual PII
 */
async function generateConsentHash(
  walletAddress: string,
  email: string | null,
  fullName: string | null,
  timestamp: string
): Promise<string> {
  const data = `${walletAddress.toLowerCase()}|${email || ''}|${fullName || ''}|${timestamp}`;
  const encoder = new TextEncoder();
  const hash = await crypto.subtle.digest('SHA-256', encoder.encode(data));
  return ethers.hexlify(new Uint8Array(hash));
}

/**
 * POST /api/crisis/opt-in
 * Store user's PII for crisis follow-up (opt-in only)
 *
 * Auth: Required (wallet session)
 *
 * Flow:
 * 1. Validate authenticated wallet session
 * 2. Encrypt PII at rest using AES-256-GCM
 * 3. Store with 30-day expiry
 * 4. Generate consent hash for audit
 */
router.post(
  '/opt-in',
  crisisOptInRateLimit,
  authenticateWallet,
  validate(crisisOptInSchema),
  async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.wallet) {
        return res.status(401).json({
          success: false,
          message: 'Authentication required',
          error: 'AUTH_REQUIRED',
        });
      }

      const walletAddress = req.wallet.walletAddress.toLowerCase();
      const { email, fullName, emergencyContact, language, country } = req.body;

      // Validate that at least one contact method is provided
      if (!email && !fullName) {
        return res.status(400).json({
          success: false,
          message: 'Please provide at least an email or full name',
          error: 'MISSING_CONTACT_INFO',
        });
      }

      // Generate encryption key for this record
      const encryptionKey = generateEncryptionKey();

      // Encrypt PII fields
      const encryptedEmail = email ? encryptAES256GCM(email, encryptionKey) : null;
      const encryptedFullName = fullName ? encryptAES256GCM(fullName, encryptionKey) : null;
      const encryptedEmergencyContact = emergencyContact
        ? encryptAES256GCM(emergencyContact, encryptionKey)
        : null;

      // Generate consent hash
      const timestamp = new Date().toISOString();
      const consentHash = await generateConsentHash(
        walletAddress,
        email,
        fullName,
        timestamp
      );

      // Calculate expiry (30 days from now)
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 30);

      // Upsert: update if exists, create if not
      const crisisOptIn = await prisma.crisisOptIn.upsert({
        where: { walletAddress },
        update: {
          email: encryptedEmail,
          fullName: encryptedFullName,
          emergencyContact: encryptedEmergencyContact,
          language,
          consentHash,
          expiresAt,
          triggerCount: { increment: 1 },
          lastCrisisTrigger: new Date(),
        },
        create: {
          walletAddress,
          email: encryptedEmail,
          fullName: encryptedFullName,
          emergencyContact: encryptedEmergencyContact,
          language,
          consentHash,
          expiresAt,
          triggerCount: 1,
          lastCrisisTrigger: new Date(),
        },
      });

      // Log audit event (without PII)
      const hashedWallet = ethers.keccak256(ethers.toUtf8Bytes(walletAddress)).substring(0, 16);
      logger.info(`Crisis opt-in registered for wallet ${hashedWallet}..., language: ${language}`);

      await prisma.securityAuditLog.create({
        data: {
          eventType: 'CRISIS_OPT_IN',
          actor: `${walletAddress.substring(0, 10)}...`,
          resource: `/api/crisis/opt-in`,
          success: true,
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
          details: JSON.stringify({
            language,
            country: country || null,
            hasEmail: !!email,
            hasFullName: !!fullName,
            hasEmergencyContact: !!emergencyContact,
            expiresAt: expiresAt.toISOString(),
          }),
        },
      });

      res.json({
        success: true,
        message: 'Safety Net registered successfully. You can update or remove this at any time.',
        data: {
          language,
          expiresAt: expiresAt.toISOString(),
          hotline: getHotlineForLanguage(language as LanguageCode, country),
        },
      });
    } catch (error: any) {
      logger.error('Crisis opt-in error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to register Safety Net',
        error: 'OPT_IN_ERROR',
      });
    }
  }
);

/**
 * GET /api/crisis/opt-in
 * Get user's current opt-in status
 */
router.get(
  '/opt-in',
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

      const crisisOptIn = await prisma.crisisOptIn.findUnique({
        where: { walletAddress },
        select: {
          language: true,
          createdAt: true,
          expiresAt: true,
          triggerCount: true,
          lastCrisisTrigger: true,
        },
      });

      if (!crisisOptIn) {
        return res.json({
          success: true,
          data: {
            isOptedIn: false,
          },
        });
      }

      res.json({
        success: true,
        data: {
          isOptedIn: true,
          language: crisisOptIn.language,
          createdAt: crisisOptIn.createdAt.toISOString(),
          expiresAt: crisisOptIn.expiresAt.toISOString(),
          triggerCount: crisisOptIn.triggerCount,
          lastCrisisTrigger: crisisOptIn.lastCrisisTrigger?.toISOString(),
          hotline: getHotlineForLanguage(
            crisisOptIn.language as LanguageCode
          ),
        },
      });
    } catch (error: any) {
      logger.error('Crisis opt-in status error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get opt-in status',
      });
    }
  }
);

/**
 * DELETE /api/crisis/opt-in
 * Remove user's opt-in data (user-initiated withdrawal)
 */
router.delete(
  '/opt-in',
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

      await prisma.crisisOptIn.delete({
        where: { walletAddress },
      });

      // Log audit event
      const hashedWallet = ethers.keccak256(ethers.toUtf8Bytes(walletAddress)).substring(0, 16);
      logger.info(`Crisis opt-in withdrawn for wallet ${hashedWallet}...`);

      await prisma.securityAuditLog.create({
        data: {
          eventType: 'CRISIS_OPT_OUT',
          actor: `${walletAddress.substring(0, 10)}...`,
          resource: `/api/crisis/opt-in`,
          success: true,
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
        },
      });

      res.json({
        success: true,
        message: 'Safety Net registration removed successfully.',
      });
    } catch (error: any) {
      logger.error('Crisis opt-out error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to remove opt-in',
      });
    }
  }
);

/**
 * GET /api/crisis/hotlines
 * Get crisis hotline information by language
 * Query params: language (optional), country (optional)
 */
router.get(
  '/hotlines',
  async (req: Request, res: Response) => {
    try {
      const { language, country } = req.query;

      if (language && typeof language === 'string') {
        const lang = language.toLowerCase() as LanguageCode;
        const hotline = CRISIS_HOTLINES[lang];

        if (hotline) {
          // If country specified, return country-specific info
          if (country && typeof country === 'string') {
            const countryCode = country.toUpperCase() as keyof typeof hotline.countries;
            const countryInfo = hotline.countries[countryCode];
            if (countryInfo) {
              return res.json({
                success: true,
                data: {
                  name: hotline.name,
                  phone: countryInfo.phone,
                  website: countryInfo.website,
                  availability: hotline.availability,
                },
              });
            }
          }

          // Return default for language
          return res.json({
            success: true,
            data: {
              name: hotline.name,
              phone: hotline.phone,
              website: hotline.website,
              availability: hotline.availability,
            },
          });
        }
      }

      // Return all hotlines if no language specified
      res.json({
        success: true,
        data: CRISIS_HOTLINES,
      });
    } catch (error: any) {
      logger.error('Hotlines error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to get hotlines',
      });
    }
  }
);

/**
 * POST /api/crisis/trigger
 * Record a crisis detection event (for users who are opted-in)
 * This is called when crisis keywords are detected in chat
 */
router.post(
  '/trigger',
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
      const { language, detectedKeywords } = req.body;

      // Check if user is opted-in
      const crisisOptIn = await prisma.crisisOptIn.findUnique({
        where: { walletAddress },
      });

      if (!crisisOptIn) {
        // User not opted-in - just log the trigger, don't store PII
        return res.json({
          success: true,
          data: {
            isOptedIn: false,
            message: 'User not opted into Safety Net',
          },
        });
      }

      // Update trigger count
      await prisma.crisisOptIn.update({
        where: { walletAddress },
        data: {
          triggerCount: { increment: 1 },
          lastCrisisTrigger: new Date(),
        },
      });

      // Log the trigger (without keyword content for privacy)
      const hashedWallet = ethers.keccak256(ethers.toUtf8Bytes(walletAddress)).substring(0, 16);
      logger.info(`Crisis trigger for opted-in wallet ${hashedWallet}..., language: ${language}`);

      await prisma.securityAuditLog.create({
        data: {
          eventType: 'CRISIS_TRIGGER',
          actor: `${walletAddress.substring(0, 10)}...`,
          resource: `/api/crisis/trigger`,
          success: true,
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
          details: JSON.stringify({
            language,
            keywordCount: detectedKeywords?.length || 0,
            isOptedIn: true,
          }),
        },
      });

      res.json({
        success: true,
        data: {
          isOptedIn: true,
          hotline: getHotlineForLanguage(language as LanguageCode),
        },
      });
    } catch (error: any) {
      logger.error('Crisis trigger error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to record crisis trigger',
      });
    }
  }
);

/**
 * Helper: Get hotline for language/country
 */
function getHotlineForLanguage(
  language: LanguageCode,
  country?: string
): { name: string; phone: string; website: string; availability: string } | null {
  const hotline = CRISIS_HOTLINES[language];
  if (!hotline) return null;

  if (country) {
    const countryCode = country.toUpperCase() as keyof typeof hotline.countries;
    const countryInfo = hotline.countries[countryCode];
    if (countryInfo) {
      return {
        name: hotline.name,
        phone: countryInfo.phone,
        website: countryInfo.website,
        availability: hotline.availability,
      };
    }
  }

  return {
    name: hotline.name,
    phone: hotline.phone,
    website: hotline.website,
    availability: hotline.availability,
  };
}

/**
 * GET /api/crisis/purge
 * Manually trigger purge of expired records (for testing/admin)
 * In production, use a cron job or scheduled task
 */
router.get(
  '/purge',
  async (_req: Request, res: Response) => {
    try {
      const now = new Date();

      const result = await prisma.crisisOptIn.deleteMany({
        where: {
          expiresAt: {
            lt: now,
          },
        },
      });

      logger.info(`Purged ${result.count} expired crisis opt-in records`);

      res.json({
        success: true,
        message: `Purged ${result.count} expired records`,
        data: {
          purgedCount: result.count,
          timestamp: now.toISOString(),
        },
      });
    } catch (error: any) {
      logger.error('Purge error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Failed to purge expired records',
      });
    }
  }
);

export default router;
export { CRISIS_HOTLINES };
