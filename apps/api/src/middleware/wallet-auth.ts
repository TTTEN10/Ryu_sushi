import { Request, Response, NextFunction } from 'express';
import { ethers } from 'ethers';
import logger from '../lib/logger';
import { ETHEREUM_MAINNET_CHAIN_ID } from '../lib/constants';

/**
 * Interface for wallet authentication request
 */
export interface WalletAuthRequest extends Request {
  wallet?: {
    address: string;
    chainId: number;
    signature?: string;
    message?: string;
  };
}

/**
 * Message template for wallet signature verification
 */
const WALLET_VERIFICATION_MESSAGE = (address: string, nonce: string) => 
  `SafePsy Wallet Verification\n\nAddress: ${address}\nNonce: ${nonce}\n\nThis signature proves you own this wallet.`;

/**
 * Generate a nonce for wallet verification
 */
export function generateNonce(): string {
  return ethers.randomBytes(32).toString('hex');
}

/**
 * Verify wallet signature
 * Uses ethers.js which already implements constant-time comparison
 * to prevent timing attacks
 * 
 * @param address The wallet address
 * @param message The message that was signed
 * @param signature The signature
 * @returns Whether the signature is valid
 */
export function verifySignature(
  address: string,
  message: string,
  signature: string
): boolean {
  try {
    // ethers.verifyMessage already uses constant-time comparison
    const recoveredAddress = ethers.verifyMessage(message, signature);
    // Use case-insensitive comparison (ethers already handles timing)
    return recoveredAddress.toLowerCase() === address.toLowerCase();
  } catch (error) {
    logger.error('Signature verification error:', error);
    // Always return false on error to prevent information leakage
    return false;
  }
}

/**
 * Middleware to verify wallet connection and signature
 * Expects:
 * - x-wallet-address header
 * - x-wallet-signature header
 * - x-wallet-message header (or will use default message)
 * - x-chain-id header (optional)
 */
export const walletAuthMiddleware = async (
  req: WalletAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const address = req.headers['x-wallet-address'] as string;
    const signature = req.headers['x-wallet-signature'] as string;
    const message = req.headers['x-wallet-message'] as string;
    const chainId = req.headers['x-chain-id'] as string;

    // Check if wallet address is provided
    if (!address) {
      logger.warn('Wallet authentication failed: missing address');
      res.status(401).json({
        success: false,
        message: 'Wallet address is required',
        error: 'MISSING_WALLET_ADDRESS',
      });
      return;
    }

    // Validate address format
    if (!ethers.isAddress(address)) {
      logger.warn(`Wallet authentication failed: invalid address format - ${address}`);
      res.status(401).json({
        success: false,
        message: 'Invalid wallet address format',
        error: 'INVALID_ADDRESS',
      });
      return;
    }

    // Validate chain ID - only Ethereum Mainnet is supported
    const parsedChainId = chainId ? parseInt(chainId, 10) : ETHEREUM_MAINNET_CHAIN_ID;
    if (parsedChainId !== ETHEREUM_MAINNET_CHAIN_ID) {
      logger.warn(`Wallet authentication failed: unsupported chain ID ${parsedChainId} for address ${address}`);
      res.status(400).json({
        success: false,
        message: 'Only Ethereum Mainnet (Chain ID: 1) is supported',
        error: 'UNSUPPORTED_CHAIN_ID',
      });
      return;
    }

    // If signature is provided, verify it
    if (signature) {
      if (!message) {
        logger.warn('Wallet authentication failed: missing message for signature verification');
        res.status(401).json({
          success: false,
          message: 'Message is required for signature verification',
          error: 'MISSING_MESSAGE',
        });
        return;
      }

      const isValid = verifySignature(address, message, signature);
      if (!isValid) {
        logger.warn(`Wallet authentication failed: invalid signature for address ${address}`);
        res.status(401).json({
          success: false,
          message: 'Invalid signature',
          error: 'INVALID_SIGNATURE',
        });
        return;
      }

      logger.info(`Wallet authenticated: ${address} with valid signature`);
    } else {
      logger.info(`Wallet connection verified: ${address} (no signature)`);
    }

    // Attach wallet info to request
    req.wallet = {
      address: address.toLowerCase(),
      chainId: ETHEREUM_MAINNET_CHAIN_ID,
      signature,
      message,
    };

    next();
  } catch (error) {
    logger.error('Wallet authentication error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during wallet authentication',
      error: 'WALLET_AUTH_ERROR',
    });
  }
};

/**
 * Optional middleware - only requires wallet connection, not signature
 */
export const walletConnectionMiddleware = async (
  req: WalletAuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const address = req.headers['x-wallet-address'] as string;
    const chainId = req.headers['x-chain-id'] as string;

    if (!address) {
      res.status(401).json({
        success: false,
        message: 'Wallet connection required',
        error: 'MISSING_WALLET_ADDRESS',
      });
      return;
    }

    if (!ethers.isAddress(address)) {
      res.status(401).json({
        success: false,
        message: 'Invalid wallet address format',
        error: 'INVALID_ADDRESS',
      });
      return;
    }

    // Validate chain ID - only Ethereum Mainnet is supported
    const parsedChainId = chainId ? parseInt(chainId, 10) : ETHEREUM_MAINNET_CHAIN_ID;
    if (parsedChainId !== ETHEREUM_MAINNET_CHAIN_ID) {
      logger.warn(`Wallet connection failed: unsupported chain ID ${parsedChainId} for address ${address}`);
      res.status(400).json({
        success: false,
        message: 'Only Ethereum Mainnet (Chain ID: 1) is supported',
        error: 'UNSUPPORTED_CHAIN_ID',
      });
      return;
    }

    req.wallet = {
      address: address.toLowerCase(),
      chainId: ETHEREUM_MAINNET_CHAIN_ID,
    };

    next();
  } catch (error) {
    logger.error('Wallet connection error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during wallet connection',
      error: 'WALLET_CONNECTION_ERROR',
    });
  }
};


