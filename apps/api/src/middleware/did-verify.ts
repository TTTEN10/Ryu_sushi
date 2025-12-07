import { Request, Response, NextFunction } from 'express';
import { ethers } from 'ethers';
import logger from '../lib/logger';
import { WalletAuthRequest } from './wallet-auth';
import { ETHEREUM_MAINNET_CHAIN_ID } from '../lib/constants';

/**
 * Interface for DID verification request
 */
export interface DIDVerifyRequest extends WalletAuthRequest {
  did?: {
    didHash: string;
    did: string;
    isValid: boolean;
  };
}

/**
 * Configuration for DID verification
 */
interface DIDVerifyConfig {
  registryAddress: string;
  rpcUrl: string;
  chainId: number;
}

// DID Registry ABI (simplified - in production, use full ABI from compilation)
const DID_REGISTRY_ABI = [
  'function getDID(bytes32 didHash) external view returns (string memory did, address owner, uint256 createdAt, uint256 updatedAt, bool revoked)',
  'function isValidDID(bytes32 didHash) external view returns (bool)',
  'function getDIDsByOwner(address owner) external view returns (bytes32[] memory)',
];

/**
 * Get DID verification configuration from environment
 */
function getDIDVerifyConfig(): DIDVerifyConfig | null {
  const registryAddress = process.env.DID_REGISTRY_ADDRESS;
  const rpcUrl = process.env.RPC_URL || process.env.ETH_RPC_URL;
  // Only Ethereum Mainnet is supported
  const chainId = ETHEREUM_MAINNET_CHAIN_ID;

  if (!registryAddress || !rpcUrl) {
    logger.warn('DID verification not configured: missing DID_REGISTRY_ADDRESS or RPC_URL');
    return null;
  }

  return {
    registryAddress,
    rpcUrl,
    chainId,
  };
}

/**
 * Verify DID from smart contract
 * @param didHash The hash of the DID
 * @param walletAddress The wallet address to verify ownership
 * @param config DID verification configuration
 * @returns DID information if valid, null otherwise
 */
async function verifyDIDFromContract(
  didHash: string,
  walletAddress: string,
  config: DIDVerifyConfig
): Promise<{ did: string; owner: string; isValid: boolean } | null> {
  try {
    const provider = new ethers.JsonRpcProvider(config.rpcUrl);
    const registry = new ethers.Contract(
      config.registryAddress,
      DID_REGISTRY_ABI,
      provider
    );

    // Check if DID is valid
    const isValid = await registry.isValidDID(didHash);
    if (!isValid) {
      logger.warn(`DID verification failed: DID ${didHash} is not valid`);
      return null;
    }

    // Get DID information
    const didInfo = await registry.getDID(didHash);
    const [did, owner, , , revoked] = didInfo;

    if (revoked) {
      logger.warn(`DID verification failed: DID ${didHash} has been revoked`);
      return null;
    }

    // Verify ownership
    if (owner.toLowerCase() !== walletAddress.toLowerCase()) {
      logger.warn(
        `DID verification failed: wallet ${walletAddress} does not own DID ${didHash}`
      );
      return null;
    }

    return {
      did,
      owner: owner.toLowerCase(),
      isValid: true,
    };
  } catch (error) {
    logger.error('DID verification error:', error);
    return null;
  }
}

/**
 * Middleware to verify DID from smart contract
 * Expects:
 * - x-did-hash header (or didHash in body)
 * - Wallet authentication (wallet-auth middleware should run first)
 */
export const didVerifyMiddleware = async (
  req: DIDVerifyRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Check if wallet is authenticated
    if (!req.wallet) {
      logger.warn('DID verification failed: wallet not authenticated');
      res.status(401).json({
        success: false,
        message: 'Wallet authentication required',
        error: 'WALLET_NOT_AUTHENTICATED',
      });
      return;
    }

    // Get DID hash from header or body
    const didHash = (req.headers['x-did-hash'] as string) || req.body?.didHash;

    if (!didHash) {
      logger.warn('DID verification failed: missing DID hash');
      res.status(400).json({
        success: false,
        message: 'DID hash is required',
        error: 'MISSING_DID_HASH',
      });
      return;
    }

    // Validate DID hash format (should be bytes32 hex string)
    if (!/^0x[a-fA-F0-9]{64}$/.test(didHash)) {
      logger.warn(`DID verification failed: invalid DID hash format - ${didHash}`);
      res.status(400).json({
        success: false,
        message: 'Invalid DID hash format',
        error: 'INVALID_DID_HASH',
      });
      return;
    }

    // Get configuration
    const config = getDIDVerifyConfig();
    if (!config) {
      logger.warn('DID verification skipped: not configured');
      // Allow request to continue without DID verification if not configured
      req.did = {
        didHash,
        did: '',
        isValid: false,
      };
      next();
      return;
    }

    // Verify DID from contract
    const didInfo = await verifyDIDFromContract(
      didHash,
      req.wallet.address,
      config
    );

    if (!didInfo) {
      logger.warn(`DID verification failed for hash ${didHash}`);
      res.status(403).json({
        success: false,
        message: 'DID verification failed',
        error: 'INVALID_DID',
      });
      return;
    }

    // Attach DID info to request
    req.did = {
      didHash,
      did: didInfo.did,
      isValid: didInfo.isValid,
    };

    logger.info(`DID verified: ${didInfo.did} for wallet ${req.wallet.address}`);
    next();
  } catch (error) {
    logger.error('DID verification middleware error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error during DID verification',
      error: 'DID_VERIFY_ERROR',
    });
  }
};

/**
 * Optional middleware - verify DID but allow request to continue if verification fails
 */
export const didVerifyOptionalMiddleware = async (
  req: DIDVerifyRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.wallet) {
      // No wallet, skip DID verification
      next();
      return;
    }

    const didHash = (req.headers['x-did-hash'] as string) || req.body?.didHash;

    if (!didHash) {
      // No DID hash, skip verification
      next();
      return;
    }

    const config = getDIDVerifyConfig();
    if (!config) {
      req.did = {
        didHash,
        did: '',
        isValid: false,
      };
      next();
      return;
    }

    const didInfo = await verifyDIDFromContract(
      didHash,
      req.wallet.address,
      config
    );

    if (didInfo) {
      req.did = {
        didHash,
        did: didInfo.did,
        isValid: didInfo.isValid,
      };
      logger.info(`DID verified: ${didInfo.did}`);
    } else {
      req.did = {
        didHash,
        did: '',
        isValid: false,
      };
      logger.warn(`DID verification failed for hash ${didHash}, but continuing`);
    }

    next();
  } catch (error) {
    logger.error('Optional DID verification error:', error);
    // Continue even on error
    next();
  }
};


