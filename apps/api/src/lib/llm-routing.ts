/**
 * LLM routing: direct Scaleway vs legacy FastAPI self-hosted hop.
 */

export function hasSelfHostedUpstreamConfigured(): boolean {
  return Boolean(
    process.env.AI_GPU_BASE_URL?.trim() || process.env.CHATBOT_BASE_URL?.trim()
  );
}

/**
 * When true, the API calls Scaleway Generative API directly (no FastAPI chatbot hop).
 *
 * - USE_SCALEWAY_DIRECT=1 forces direct.
 * - USE_SCALEWAY_DIRECT=0 forces legacy self-hosted when URLs are set.
 * - Unset: direct when no AI_GPU_BASE_URL / CHATBOT_BASE_URL is configured.
 */
export function shouldUseScalewayDirect(): boolean {
  const flag = (process.env.USE_SCALEWAY_DIRECT ?? '').trim().toLowerCase();
  if (flag === '1' || flag === 'true') {
    return true;
  }
  if (flag === '0' || flag === 'false') {
    return false;
  }
  return !hasSelfHostedUpstreamConfigured();
}

export function shouldRunLlmUpstreamHealthPoller(): boolean {
  if (shouldUseScalewayDirect()) {
    return false;
  }
  return hasSelfHostedUpstreamConfigured();
}
