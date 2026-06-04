/**
 * User-facing copy for wallet identity setup (on-chain DID / Safe ID Token).
 * Lead with outcomes; keep "DID" for advanced/FAQ contexts only.
 */
export const DID_ONBOARDING = {
  unlockTitle: 'Private persistent chat',
  unlockSubtitle:
    'One-time setup ties your conversations to your wallet so they stay encrypted and come back when you return.',
  unlockButton: 'Unlock private persistent chat',
  unlockingButton: 'Unlocking private chat…',
  unlockSuccess:
    'Private chat unlocked. Your conversations can now be saved and restored with your wallet.',
  unlockError: 'Could not unlock private chat. Please try again.',
  setupIssueTitle: 'Backend setup incomplete',
  setupIssueHint: 'Server configuration missing — contact support or check deployment env vars (RPC_URL, DID_REGISTRY_ADDRESS, DATABASE_URL).',
  notVerified:
    'Verify your wallet first to unlock private persistent chat.',
  checking: 'Checking your chat access…',
  activeTitle: 'Private chat unlocked',
  activeHint: 'Encrypted history is tied to your wallet.',
  unlocksList: [
    'Save encrypted chat history across sessions',
    'Restore conversations when you return',
    'Keep control with wallet-based keys (not our servers)',
  ],
  advancedLabel: 'Safe ID Token (on-chain identity)',
  noWallet: 'Connect your wallet to unlock private persistent chat.',
} as const;
