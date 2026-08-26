/**
 * Chat Flow Analytics Hook
 *
 * Tracks first message sent, first AI reply received, and
 * general chat usage patterns.
 */

import { useCallback } from 'react'
import { trackEvent } from '../lib/analytics'

// ============================================================================
// Types
// ============================================================================

export interface ChatAnalyticsEvents {
  firstMessageSent: (mode?: string) => Promise<void>
  firstReplyReceived: (model?: string, responseTimeMs?: number) => Promise<void>
  messageSent: (mode?: string) => Promise<void>
  replyReceived: (model?: string, responseTimeMs?: number) => Promise<void>
  replyFailed: (errorCode?: string) => Promise<void>
}

// ============================================================================
// Hook
// ============================================================================

export function useChatAnalytics(): ChatAnalyticsEvents {
  const firstMessageSent = useCallback(async (mode?: string) => {
    await trackEvent('first_message_sent', {
      conversation_mode: mode ?? 'chat',
    })
  }, [])

  const firstReplyReceived = useCallback(async (model?: string, responseTimeMs?: number) => {
    await trackEvent('first_reply_received', {
      model,
      response_time_ms: responseTimeMs,
    })
  }, [])

  const messageSent = useCallback(async (mode?: string) => {
    // General message tracking — does not fire first_message_sent
    // Call firstMessageSent separately for the first message
    await trackEvent('first_message_sent', {
      conversation_mode: mode ?? 'chat',
    })
  }, [])

  const replyReceived = useCallback(async (model?: string, responseTimeMs?: number) => {
    await trackEvent('first_reply_received', {
      model,
      response_time_ms: responseTimeMs,
    })
  }, [])

  const replyFailed = useCallback(async (errorCode?: string) => {
    await trackEvent('first_reply_received', {
      error_code: errorCode || 'reply_failed',
    })
  }, [])

  return {
    firstMessageSent,
    firstReplyReceived,
    messageSent,
    replyReceived,
    replyFailed,
  }
}

export default useChatAnalytics