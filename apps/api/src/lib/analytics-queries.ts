/**
 * Analytics Dashboard Queries
 *
 * Helper functions for calculating funnel metrics, conversion rates,
 * and retention statistics from the analytics_events table.
 *
 * These queries are designed for building dashboards and reports.
 */

import { prisma } from '../lib/prisma';

// ============================================================================
// Types
// ============================================================================

export interface FunnelMetrics {
  landing_visits: number;
  wallet_clicks: number;
  wallet_successes: number;
  session_successes: number;
  did_successes: number;
  first_messages: number;
  first_replies: number;
  returns_24h: number;
}

export interface FunnelConversionRates {
  wallet_click_to_success: number;
  wallet_success_to_session: number;
  session_to_did: number;
  did_to_first_message: number;
  first_message_to_first_reply: number;
  overall_landing_to_first_reply: number;
  return_rate_24h: number;
}

export interface DailyMetrics {
  date: string;
  landing_visits: number;
  wallet_clicks: number;
  wallet_successes: number;
  session_successes: number;
  did_successes: number;
  first_messages: number;
  first_replies: number;
}

export interface DeviceBreakdown {
  mobile: number;
  tablet: number;
  desktop: number;
  unknown: number;
}

export interface TimeRange {
  startDate?: Date;
  endDate?: Date;
}

// ============================================================================
// Funnel Metrics
// ============================================================================

/**
 * Get complete funnel metrics for a given time range.
 */
export async function getFunnelMetrics(range: TimeRange = {}): Promise<FunnelMetrics> {
  const { startDate, endDate } = range;

  const where = {
    timestamp: {
      ...(startDate && { gte: startDate }),
      ...(endDate && { lte: endDate }),
    },
  };

  const [
    landing_visits,
    wallet_clicks,
    wallet_successes,
    session_successes,
    did_successes,
    first_messages,
    first_replies,
    returns_24h,
  ] = await Promise.all([
    prisma.analyticsEvent.count({
      where: { ...where, eventName: 'landing_visit' },
    }),
    prisma.analyticsEvent.count({
      where: { ...where, eventName: 'wallet_click' },
    }),
    prisma.analyticsEvent.count({
      where: { ...where, eventName: 'wallet_success' },
    }),
    prisma.analyticsEvent.count({
      where: { ...where, eventName: 'session_success' },
    }),
    prisma.analyticsEvent.count({
      where: { ...where, eventName: 'did_success' },
    }),
    prisma.analyticsEvent.count({
      where: { ...where, eventName: 'first_message_sent' },
    }),
    prisma.analyticsEvent.count({
      where: { ...where, eventName: 'first_reply_received' },
    }),
    prisma.analyticsEvent.count({
      where: { ...where, eventName: 'return_24h' },
    }),
  ]);

  return {
    landing_visits,
    wallet_clicks,
    wallet_successes,
    session_successes,
    did_successes,
    first_messages,
    first_replies,
    returns_24h,
  };
}

/**
 * Calculate conversion rates between funnel stages.
 */
export function calculateFunnelConversionRates(metrics: FunnelMetrics): FunnelConversionRates {
  const safeDivide = (numerator: number, denominator: number): number => {
    if (denominator === 0) return 0;
    return numerator / denominator;
  };

  return {
    wallet_click_to_success: safeDivide(metrics.wallet_successes, metrics.wallet_clicks),
    wallet_success_to_session: safeDivide(metrics.session_successes, metrics.wallet_successes),
    session_to_did: safeDivide(metrics.did_successes, metrics.session_successes),
    did_to_first_message: safeDivide(metrics.first_messages, metrics.did_successes),
    first_message_to_first_reply: safeDivide(metrics.first_replies, metrics.first_messages),
    overall_landing_to_first_reply: safeDivide(metrics.first_replies, metrics.landing_visits),
    return_rate_24h: safeDivide(metrics.returns_24h, metrics.landing_visits),
  };
}

/**
 * Get funnel metrics with conversion rates.
 */
export async function getFunnelWithConversionRates(
  range: TimeRange = {}
): Promise<{ metrics: FunnelMetrics; conversionRates: FunnelConversionRates }> {
  const metrics = await getFunnelMetrics(range);
  const conversionRates = calculateFunnelConversionRates(metrics);
  return { metrics, conversionRates };
}

// ============================================================================
// Daily Metrics
// ============================================================================

/**
 * Get daily breakdown of funnel events.
 */
export async function getDailyMetrics(days: number = 30): Promise<DailyMetrics[]> {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const events = await prisma.analyticsEvent.findMany({
    where: {
      timestamp: {
        gte: startDate,
      },
    },
    select: {
      eventName: true,
      timestamp: true,
    },
    orderBy: {
      timestamp: 'asc',
    },
  });

  // Group by date
  const dailyMap = new Map<
    string,
    {
      landing_visits: number;
      wallet_clicks: number;
      wallet_successes: number;
      session_successes: number;
      did_successes: number;
      first_messages: number;
      first_replies: number;
    }
  >();

  for (const event of events) {
    const date = event.timestamp.toISOString().split('T')[0];

    if (!dailyMap.has(date)) {
      dailyMap.set(date, {
        landing_visits: 0,
        wallet_clicks: 0,
        wallet_successes: 0,
        session_successes: 0,
        did_successes: 0,
        first_messages: 0,
        first_replies: 0,
      });
    }

    const day = dailyMap.get(date)!;

    switch (event.eventName) {
      case 'landing_visit':
        day.landing_visits++;
        break;
      case 'wallet_click':
        day.wallet_clicks++;
        break;
      case 'wallet_success':
        day.wallet_successes++;
        break;
      case 'session_success':
        day.session_successes++;
        break;
      case 'did_success':
        day.did_successes++;
        break;
      case 'first_message_sent':
        day.first_messages++;
        break;
      case 'first_reply_received':
        day.first_replies++;
        break;
    }
  }

  // Convert to array and sort by date
  return Array.from(dailyMap.entries())
    .map(([date, metrics]) => ({ date, ...metrics }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

// ============================================================================
// Device Analytics
// ============================================================================

/**
 * Get device type breakdown.
 */
export async function getDeviceBreakdown(range: TimeRange = {}): Promise<DeviceBreakdown> {
  const { startDate, endDate } = range;

  const events = await prisma.analyticsEvent.findMany({
    where: {
      eventName: 'landing_visit',
      timestamp: {
        ...(startDate && { gte: startDate }),
        ...(endDate && { lte: endDate }),
      },
    },
    select: {
      deviceType: true,
    },
  });

  const breakdown: DeviceBreakdown = {
    mobile: 0,
    tablet: 0,
    desktop: 0,
    unknown: 0,
  };

  for (const event of events) {
    const deviceType = (event.deviceType as keyof DeviceBreakdown) || 'unknown';
    if (breakdown.hasOwnProperty(deviceType)) {
      breakdown[deviceType]++;
    } else {
      breakdown.unknown++;
    }
  }

  return breakdown;
}

// ============================================================================
// Session Analytics
// ============================================================================

/**
 * Get sessions per visitor.
 */
export async function getSessionsPerVisitor(range: TimeRange = {}): Promise<{
  avgSessionsPerVisitor: number;
  totalVisitors: number;
  totalSessions: number;
}> {
  const { startDate, endDate } = range;

  const events = await prisma.analyticsEvent.findMany({
    where: {
      timestamp: {
        ...(startDate && { gte: startDate }),
        ...(endDate && { lte: endDate }),
      },
      visitorId: { not: null },
      sessionId: { not: null },
    },
    select: {
      visitorId: true,
      sessionId: true,
    },
    distinct: ['sessionId'],
  });

  // Count unique visitors
  const visitorSet = new Set(events.map((e) => e.visitorId));
  const sessionSet = new Set(events.map((e) => e.sessionId));

  const totalVisitors = visitorSet.size;
  const totalSessions = sessionSet.size;
  const avgSessionsPerVisitor = totalVisitors > 0 ? totalSessions / totalVisitors : 0;

  return {
    avgSessionsPerVisitor,
    totalVisitors,
    totalSessions,
  };
}

// ============================================================================
// Wallet Provider Analytics
// ============================================================================

/**
 * Get wallet provider breakdown.
 */
export async function getWalletProviderBreakdown(range: TimeRange = {}): Promise<
  Record<string, number>
> {
  const { startDate, endDate } = range;

  const events = await prisma.analyticsEvent.findMany({
    where: {
      eventName: 'wallet_click',
      timestamp: {
        ...(startDate && { gte: startDate }),
        ...(endDate && { lte: endDate }),
      },
    },
    select: {
      metadata: true,
    },
  });

  const providers: Record<string, number> = {};

  for (const event of events) {
    try {
      const metadata = JSON.parse(event.metadata as string);
      const provider = (metadata.wallet_provider as string) || 'unknown';
      providers[provider] = (providers[provider] || 0) + 1;
    } catch {
      providers.unknown = (providers.unknown || 0) + 1;
    }
  }

  return providers;
}

// ============================================================================
// Drop-off Analysis
// ============================================================================

/**
 * Identify drop-off points in the funnel.
 */
export async function getFunnelDropOffs(range: TimeRange = {}): Promise<
  Array<{
    stage: string;
    count: number;
    dropOffFromPrevious: number;
    dropOffRate: number;
  }>
> {
  const metrics = await getFunnelMetrics(range);

  const stages = [
    { name: 'landing_visit', count: metrics.landing_visits },
    { name: 'wallet_click', count: metrics.wallet_clicks },
    { name: 'wallet_success', count: metrics.wallet_successes },
    { name: 'session_success', count: metrics.session_successes },
    { name: 'did_success', count: metrics.did_successes },
    { name: 'first_message', count: metrics.first_messages },
    { name: 'first_reply', count: metrics.first_replies },
  ];

  return stages.map((stage, index) => {
    const previousCount = index === 0 ? stage.count : stages[index - 1].count;
    const dropOff = previousCount - stage.count;
    const dropOffRate = previousCount > 0 ? dropOff / previousCount : 0;

    return {
      stage: stage.name,
      count: stage.count,
      dropOffFromPrevious: dropOff,
      dropOffRate,
    };
  });
}

// ============================================================================
// Retention Analytics
// ============================================================================

/**
 * Get D1, D7, D30 retention rates.
 */
export async function getRetentionMetrics(cohortDate: Date): Promise<{
  d1Retention: number;
  d7Retention: number;
  d30Retention: number;
  cohortSize: number;
}> {
  // Get cohort (users who landed on cohortDate)
  const cohortStart = new Date(cohortDate);
  cohortStart.setHours(0, 0, 0, 0);
  const cohortEnd = new Date(cohortStart);
  cohortEnd.setDate(cohortEnd.getDate() + 1);

  const cohortEvents = await prisma.analyticsEvent.findMany({
    where: {
      eventName: 'landing_visit',
      timestamp: {
        gte: cohortStart,
        lt: cohortEnd,
      },
    },
    select: {
      visitorId: true,
    },
  });

  // Filter out null visitorIds and get unique non-null values
  const cohortVisitors = Array.from(new Set(cohortEvents.map((e) => e.visitorId).filter((id): id is string => id !== null)));
  const cohortSize = cohortVisitors.length;

  if (cohortSize === 0) {
    return { d1Retention: 0, d7Retention: 0, d30Retention: 0, cohortSize: 0 };
  }

  // Calculate retention windows
  const d1Start = new Date(cohortEnd);
  const d1End = new Date(d1Start);
  d1End.setDate(d1End.getDate() + 1);

  const d7Start = new Date(cohortEnd);
  const d7End = new Date(d7Start);
  d7End.setDate(d7End.getDate() + 7);

  const d30Start = new Date(cohortEnd);
  const d30End = new Date(d30Start);
  d30End.setDate(d30End.getDate() + 30);

  // Get returning visitors
  const [d1Returns, d7Returns, d30Returns] = await Promise.all([
    prisma.analyticsEvent.findMany({
      where: {
        eventName: 'landing_visit',
        timestamp: { gte: d1Start, lt: d1End },
        visitorId: { in: cohortVisitors },
      },
      select: { visitorId: true },
      distinct: ['visitorId'],
    }),
    prisma.analyticsEvent.findMany({
      where: {
        eventName: 'landing_visit',
        timestamp: { gte: d7Start, lt: d7End },
        visitorId: { in: cohortVisitors },
      },
      select: { visitorId: true },
      distinct: ['visitorId'],
    }),
    prisma.analyticsEvent.findMany({
      where: {
        eventName: 'landing_visit',
        timestamp: { gte: d30Start, lt: d30End },
        visitorId: { in: cohortVisitors },
      },
      select: { visitorId: true },
      distinct: ['visitorId'],
    }),
  ]);

  return {
    d1Retention: d1Returns.length / cohortSize,
    d7Retention: d7Returns.length / cohortSize,
    d30Retention: d30Returns.length / cohortSize,
    cohortSize,
  };
}
