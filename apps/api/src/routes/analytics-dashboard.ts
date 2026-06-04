/**
 * Analytics Dashboard API
 *
 * Provides endpoints for fetching analytics metrics and funnel data.
 * Used for building dashboards and reports.
 *
 * IMPORTANT: These endpoints should be protected by authentication
 * and only accessible to authorized users (admins, operators).
 */

import { Router, Request, Response } from 'express';
import {
  getFunnelMetrics,
  calculateFunnelConversionRates,
  getDailyMetrics,
  getDeviceBreakdown,
  getSessionsPerVisitor,
  getWalletProviderBreakdown,
  getFunnelDropOffs,
  getRetentionMetrics,
  TimeRange,
} from '../lib/analytics-queries';
import { prisma } from '../lib/prisma';
import logger from '../lib/logger';

const router = Router();

// ============================================================================
// Middleware: Admin Authentication (placeholder)
// ============================================================================

/**
 * TODO: Replace with actual admin authentication middleware.
 * This is a placeholder - implement proper auth before production use.
 */
function adminAuthMiddleware(req: Request, res: Response, next: Function) {
  // In production, verify admin token/session here
  // Example: verify admin JWT, check admin session, etc.

  // For now, allow all requests (REMOVE THIS in production)
  // throw new Error('Admin auth not implemented');

  next();
}

// Apply admin auth to all routes
router.use(adminAuthMiddleware);

// ============================================================================
// Routes
// ============================================================================

/**
 * GET /api/analytics/dashboard/funnel
 *
 * Get complete funnel metrics with conversion rates.
 *
 * Query params:
 * - days: number (default: 30)
 */
router.get('/funnel', async (req: Request, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const range: TimeRange = { startDate };

    const { metrics, conversionRates } = await getFunnelMetrics(range).then((m) => ({
      metrics: m,
      conversionRates: calculateFunnelConversionRates(m),
    }));

    res.json({
      success: true,
      data: {
        metrics,
        conversionRates,
        period: {
          days,
          startDate: startDate.toISOString(),
          endDate: new Date().toISOString(),
        },
      },
    });
  } catch (error) {
    logger.error('Error fetching funnel metrics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch funnel metrics',
    });
  }
});

/**
 * GET /api/analytics/dashboard/daily
 *
 * Get daily breakdown of funnel events.
 *
 * Query params:
 * - days: number (default: 30)
 */
router.get('/daily', async (req: Request, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 30;

    const dailyMetrics = await getDailyMetrics(days);

    res.json({
      success: true,
      data: {
        metrics: dailyMetrics,
        period: {
          days,
        },
      },
    });
  } catch (error) {
    logger.error('Error fetching daily metrics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch daily metrics',
    });
  }
});

/**
 * GET /api/analytics/dashboard/devices
 *
 * Get device type breakdown.
 *
 * Query params:
 * - days: number (default: 30)
 */
router.get('/devices', async (req: Request, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const range: TimeRange = { startDate };
    const breakdown = await getDeviceBreakdown(range);

    res.json({
      success: true,
      data: {
        breakdown,
        period: {
          days,
        },
      },
    });
  } catch (error) {
    logger.error('Error fetching device breakdown:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch device breakdown',
    });
  }
});

/**
 * GET /api/analytics/dashboard/sessions
 *
 * Get session analytics (avg sessions per visitor).
 *
 * Query params:
 * - days: number (default: 30)
 */
router.get('/sessions', async (req: Request, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const range: TimeRange = { startDate };
    const sessions = await getSessionsPerVisitor(range);

    res.json({
      success: true,
      data: {
        sessions,
        period: {
          days,
        },
      },
    });
  } catch (error) {
    logger.error('Error fetching session metrics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch session metrics',
    });
  }
});

/**
 * GET /api/analytics/dashboard/wallet-providers
 *
 * Get wallet provider breakdown.
 *
 * Query params:
 * - days: number (default: 30)
 */
router.get('/wallet-providers', async (req: Request, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const range: TimeRange = { startDate };
    const providers = await getWalletProviderBreakdown(range);

    res.json({
      success: true,
      data: {
        providers,
        period: {
          days,
        },
      },
    });
  } catch (error) {
    logger.error('Error fetching wallet provider breakdown:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch wallet provider breakdown',
    });
  }
});

/**
 * GET /api/analytics/dashboard/dropoffs
 *
 * Get funnel drop-off analysis.
 *
 * Query params:
 * - days: number (default: 30)
 */
router.get('/dropoffs', async (req: Request, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const range: TimeRange = { startDate };
    const dropoffs = await getFunnelDropOffs(range);

    res.json({
      success: true,
      data: {
        dropoffs,
        period: {
          days,
        },
      },
    });
  } catch (error) {
    logger.error('Error fetching drop-off analysis:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch drop-off analysis',
    });
  }
});

/**
 * GET /api/analytics/dashboard/retention
 *
 * Get D1, D7, D30 retention metrics for a specific cohort date.
 *
 * Query params:
 * - date: ISO date string (required) - cohort date to analyze
 */
router.get('/retention', async (req: Request, res: Response) => {
  try {
    const dateParam = req.query.date as string;

    if (!dateParam) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameter: date',
      });
    }

    const cohortDate = new Date(dateParam);

    if (isNaN(cohortDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format. Use ISO 8601 (YYYY-MM-DD)',
      });
    }

    const retention = await getRetentionMetrics(cohortDate);

    res.json({
      success: true,
      data: {
        retention,
        cohortDate: cohortDate.toISOString(),
      },
    });
  } catch (error) {
    logger.error('Error fetching retention metrics:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch retention metrics',
    });
  }
});

/**
 * GET /api/analytics/dashboard/summary
 *
 * Get a complete summary of all analytics.
 *
 * Query params:
 * - days: number (default: 30)
 */
router.get('/summary', async (req: Request, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const range: TimeRange = { startDate };

    const [
      funnelMetrics,
      dailyMetrics,
      deviceBreakdown,
      sessions,
      walletProviders,
      dropoffs,
    ] = await Promise.all([
      getFunnelMetrics(range),
      getDailyMetrics(days),
      getDeviceBreakdown(range),
      getSessionsPerVisitor(range),
      getWalletProviderBreakdown(range),
      getFunnelDropOffs(range),
    ]);

    res.json({
      success: true,
      data: {
        funnel: {
          metrics: funnelMetrics,
          conversionRates: calculateFunnelConversionRates(funnelMetrics),
        },
        daily: dailyMetrics,
        devices: deviceBreakdown,
        sessions,
        walletProviders,
        dropoffs,
        period: {
          days,
          startDate: startDate.toISOString(),
          endDate: new Date().toISOString(),
        },
      },
    });
  } catch (error) {
    logger.error('Error fetching analytics summary:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch analytics summary',
    });
  }
});

export default router;
