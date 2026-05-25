import { describe, expect, it } from 'vitest';
import { getWalletErrorMessage } from '../../utils/errorMessages';

describe('getWalletErrorMessage', () => {
  it('maps user rejection to a short message', () => {
    const raw =
      'user rejected action (action="requestAccess", reason="rejected", info={ "error": { "code": 4001 } }, code=ACTION_REJECTED, version=6.16.0)';
    expect(getWalletErrorMessage(raw)).toBe('Wallet request declined.');
  });

  it('maps ACTION_REJECTED errors', () => {
    expect(getWalletErrorMessage({ code: 'ACTION_REJECTED', message: 'foo' })).toBe(
      'Wallet request declined.',
    );
  });

  it('keeps Sepolia guidance', () => {
    expect(getWalletErrorMessage(new Error('Please switch to Sepolia Testnet to use SafePsy.'))).toBe(
      'Please switch to Sepolia Testnet to use SafePsy.',
    );
  });

  it('sanitizes verbose wallet errors', () => {
    const verbose = 'x'.repeat(150);
    expect(getWalletErrorMessage(verbose)).toBe("Couldn't connect wallet. Please try again.");
  });
});
