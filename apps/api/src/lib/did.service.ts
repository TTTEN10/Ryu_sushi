import { ethers } from 'ethers';
import logger from './logger';
import { ETHEREUM_MAINNET_CHAIN_ID } from './constants';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Load DID Identity Token ABI from artifact
 * Falls back to minimal ABI if artifact not found
 */
function loadDIDIdentityTokenABI(): any[] {
  try {
    // Try to load from artifact
    const artifactPath = path.join(__dirname, '../../artifacts/contracts/DIDIdentityToken.sol/DIDIdentityToken.json');
    if (fs.existsSync(artifactPath)) {
      const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
      if (artifact.abi && Array.isArray(artifact.abi)) {
        logger.info('Loaded full ABI from artifact');
        return artifact.abi;
      }
    }
  } catch (error) {
    logger.warn('Could not load ABI from artifact, using minimal ABI', error);
  }

  // Fallback to minimal ABI
  return [
    // Profile functions
    'function getProfileByOwner(address user) external view returns (tuple(address owner, uint64 createdAt, uint64 lastUpdatedAt, bytes32 chatDataReference, bytes encryptedKeyMetadata))',
    'function getProfile(uint256 tokenId) external view returns (tuple(address owner, uint64 createdAt, uint64 lastUpdatedAt, bytes32 chatDataReference, bytes encryptedKeyMetadata))',
    'function updateChatReference(string calldata newRef, bytes calldata newEncryptedKeyMetadata) external',
    'function updateEncryptedKeyMetadata(bytes calldata newEncryptedKeyMetadata) external',
    'function updateChatDataReference(string calldata newRef) external',
    // Basic DID functions
    'function hasDid(address user) external view returns (bool)',
    'function getDidId(address user) external view returns (uint256)',
    'function getChatDataReference(address user) external view returns (bytes32)',
    'function getEncryptedKeyMetadata(address user) external view returns (bytes memory)',
    // Revocation functions
    'function isRevoked(address user) external view returns (bool)',
    'function isRevokedById(uint256 tokenId) external view returns (bool)',
    'function revokeDid(bool clearChatReference) external',
    'function revokeDid() external',
    // Migration functions
    'function migrateDid(address oldWallet, address newWallet, bool clearChatReference) external',
    // Minting functions
    'function createDid(address user) external returns (uint256)',
    'function createMyDid() external returns (uint256)',
    // Utility functions
    'function totalSupply() external view returns (uint256)',
    'function ownerOf(uint256 tokenId) external view returns (address)',
    // Events
    'event DidCreated(address indexed user, uint256 indexed tokenId, uint64 timestamp)',
    'event DidChatReferenceUpdated(address indexed user, uint256 indexed tokenId, bytes32 indexed chatDataReference, uint64 timestamp)',
    'event DidKeyMetadataUpdated(address indexed user, uint256 indexed tokenId, uint64 timestamp)',
    'event DidRevoked(address indexed user, uint256 indexed tokenId, uint64 timestamp)',
    'event DidMigrated(address indexed oldWallet, address indexed newWallet, uint256 indexed tokenId, uint64 timestamp)',
  ];
}

const DID_IDENTITY_TOKEN_ABI = loadDIDIdentityTokenABI();

/**
 * DID Service Configuration
 */
interface DIDServiceConfig {
  contractAddress: string;
  rpcUrl: string;
  chainId: number;
  backendSignerPrivateKey?: string; // Optional: for backend-initiated minting
}

/**
 * DID Profile Structure (matches Solidity struct)
 */
export interface DidProfile {
  owner: string;
  createdAt: bigint;
  lastUpdatedAt: bigint;
  chatDataReference: string; // bytes32 as hex string
  encryptedKeyMetadata: string; // bytes as hex string
}

/**
 * DID Information
 */
export interface DIDInfo {
  hasDid: boolean;
  tokenId: string | null;
  encryptedDataExists: boolean;
  walletAddress: string;
  isRevoked?: boolean; // Whether the DID is revoked
  profile?: DidProfile; // Full profile if available
}

/**
 * Get DID service configuration from environment
 */
function getDIDServiceConfig(): DIDServiceConfig | null {
  const contractAddress = process.env.DID_IDENTITY_TOKEN_ADDRESS;
  const rpcUrl = process.env.RPC_URL || process.env.ETH_RPC_URL;
  const backendSignerPrivateKey = process.env.DID_BACKEND_SIGNER_PRIVATE_KEY;

  if (!contractAddress || !rpcUrl) {
    logger.warn('DID service not configured: missing DID_IDENTITY_TOKEN_ADDRESS or RPC_URL');
    return null;
  }

  return {
    contractAddress,
    rpcUrl,
    chainId: ETHEREUM_MAINNET_CHAIN_ID,
    backendSignerPrivateKey,
  };
}

/**
 * DID Service Class
 */
export class DIDService {
  private config: DIDServiceConfig;
  private provider: ethers.JsonRpcProvider;
  private contract: ethers.Contract;
  private signer: ethers.Wallet | null = null;

  constructor(config: DIDServiceConfig) {
    this.config = config;
    this.provider = new ethers.JsonRpcProvider(config.rpcUrl);
    this.contract = new ethers.Contract(
      config.contractAddress,
      DID_IDENTITY_TOKEN_ABI,
      this.provider
    );

    // Initialize signer if private key is provided
    if (config.backendSignerPrivateKey) {
      this.signer = new ethers.Wallet(config.backendSignerPrivateKey, this.provider);
      this.contract = this.contract.connect(this.signer);
      logger.info('DID service initialized with backend signer');
    } else {
      logger.info('DID service initialized without backend signer (public minting required)');
    }
  }

  /**
   * Check if a wallet has a DID
   */
  async hasDid(walletAddress: string): Promise<boolean> {
    try {
      const has = await this.contract.hasDid(walletAddress);
      return has;
    } catch (error) {
      logger.error('Error checking DID existence:', error);
      throw error;
    }
  }

  /**
   * Get DID information for a wallet
   */
  async getDIDInfo(walletAddress: string): Promise<DIDInfo> {
    try {
      // Validate network
      const network = await this.provider.getNetwork();
      if (Number(network.chainId) !== this.config.chainId) {
        throw new Error(
          `Network mismatch: Expected chain ID ${this.config.chainId} (Ethereum Mainnet), got ${network.chainId}`
        );
      }

      // Validate wallet address
      if (!ethers.isAddress(walletAddress)) {
        throw new Error(`Invalid wallet address: ${walletAddress}`);
      }

      const has = await this.hasDid(walletAddress);
      
      if (!has) {
        return {
          hasDid: false,
          tokenId: null,
          encryptedDataExists: false,
          walletAddress: walletAddress.toLowerCase(),
        };
      }

      const tokenId = await this.contract.getDidId(walletAddress);
      
      // Check if revoked
      const isRevoked = await this.contract.isRevoked(walletAddress);
      
      // Get full profile
      const profile = await this.contract.getProfileByOwner(walletAddress);
      const encryptedDataExists = profile.encryptedKeyMetadata.length > 0 || 
                                  profile.chatDataReference !== ethers.ZeroHash;

      return {
        hasDid: true,
        tokenId: tokenId.toString(),
        encryptedDataExists,
        walletAddress: walletAddress.toLowerCase(),
        isRevoked,
        profile: {
          owner: profile.owner.toLowerCase(),
          createdAt: profile.createdAt,
          lastUpdatedAt: profile.lastUpdatedAt,
          chatDataReference: profile.chatDataReference,
          encryptedKeyMetadata: profile.encryptedKeyMetadata,
        },
      };
    } catch (error) {
      logger.error('Error getting DID info:', error);
      throw error;
    }
  }

  /**
   * Create a DID for a wallet
   * Uses backend signer if available, otherwise requires public minting
   */
  async createDID(walletAddress: string): Promise<{ tokenId: string; txHash: string }> {
    try {
      // Validate network
      const network = await this.provider.getNetwork();
      if (Number(network.chainId) !== this.config.chainId) {
        throw new Error(
          `Network mismatch: Expected chain ID ${this.config.chainId} (Ethereum Mainnet), got ${network.chainId}`
        );
      }

      // Validate wallet address
      if (!ethers.isAddress(walletAddress)) {
        throw new Error(`Invalid wallet address: ${walletAddress}`);
      }

      // Check if DID already exists
      const has = await this.hasDid(walletAddress);
      if (has) {
        const tokenId = await this.contract.getDidId(walletAddress);
        throw new Error(`DID already exists for wallet ${walletAddress} with token ID ${tokenId}`);
      }

      let tx;
      if (this.signer) {
        // Use backend signer to create DID
        tx = await this.contract.createDid(walletAddress);
      } else {
        // Public minting - user must call createMyDid() themselves
        throw new Error('Backend signer not configured. User must create DID via wallet.');
      }

      const receipt = await tx.wait();
      const tokenId = await this.contract.getDidId(walletAddress);

      logger.info(`DID created for ${walletAddress}: token ID ${tokenId}, tx ${receipt.hash}`);

      return {
        tokenId: tokenId.toString(),
        txHash: receipt.hash,
      };
    } catch (error: any) {
      logger.error('Error creating DID:', error);
      throw new Error(`Failed to create DID: ${error.message}`);
    }
  }

  /**
   * Get full profile for a wallet
   */
  async getProfile(walletAddress: string): Promise<DidProfile | null> {
    try {
      const has = await this.hasDid(walletAddress);
      if (!has) {
        return null;
      }

      const profile = await this.contract.getProfileByOwner(walletAddress);
      return {
        owner: profile.owner.toLowerCase(),
        createdAt: profile.createdAt,
        lastUpdatedAt: profile.lastUpdatedAt,
        chatDataReference: profile.chatDataReference,
        encryptedKeyMetadata: profile.encryptedKeyMetadata,
      };
    } catch (error) {
      logger.error('Error getting DID profile:', error);
      throw error;
    }
  }

  /**
   * Get chat data reference for a wallet
   */
  async getChatDataReference(walletAddress: string): Promise<string> {
    try {
      const reference = await this.contract.getChatDataReference(walletAddress);
      return reference;
    } catch (error) {
      logger.error('Error getting chat data reference:', error);
      throw error;
    }
  }

  /**
   * Get encrypted key metadata for a wallet
   */
  async getEncryptedKeyMetadata(walletAddress: string): Promise<string> {
    try {
      const metadata = await this.contract.getEncryptedKeyMetadata(walletAddress);
      return metadata;
    } catch (error) {
      logger.error('Error getting encrypted key metadata:', error);
      throw error;
    }
  }

  /**
   * Update chat reference and encrypted key metadata
   * Note: This must be called by the wallet owner, not the backend
   */
  async updateChatReference(
    walletAddress: string,
    chatReference: string,
    encryptedKeyMetadata: string
  ): Promise<string> {
    try {
      // This function requires the wallet owner to sign the transaction
      // Backend cannot call this on behalf of the user
      throw new Error('updateChatReference must be called directly by the wallet owner via frontend');
    } catch (error: any) {
      logger.error('Error updating chat reference:', error);
      throw error;
    }
  }

  /**
   * Check if a DID is revoked
   */
  async isRevoked(walletAddress: string): Promise<boolean> {
    try {
      const has = await this.hasDid(walletAddress);
      if (!has) {
        return false;
      }
      return await this.contract.isRevoked(walletAddress);
    } catch (error) {
      logger.error('Error checking revocation status:', error);
      throw error;
    }
  }

  /**
   * Migrate DID from old wallet to new wallet
   * Note: This must be called by contract owner or backend signer
   */
  async migrateDid(
    oldWallet: string,
    newWallet: string,
    clearChatReference: boolean = false
  ): Promise<{ oldTokenId: string; newTokenId: string; txHash: string }> {
    try {
      if (!this.signer) {
        throw new Error('Backend signer not configured for migration');
      }

      // Validate network
      const network = await this.provider.getNetwork();
      if (Number(network.chainId) !== this.config.chainId) {
        throw new Error(
          `Network mismatch: Expected chain ID ${this.config.chainId}, got ${network.chainId}`
        );
      }

      // Validate addresses
      if (!ethers.isAddress(oldWallet) || !ethers.isAddress(newWallet)) {
        throw new Error('Invalid wallet address');
      }

      // Get old token ID
      const oldTokenId = await this.contract.getDidId(oldWallet);

      // Call migrateDid on contract
      const tx = await this.contract.migrateDid(oldWallet, newWallet, clearChatReference);
      const receipt = await tx.wait();

      // Get new token ID
      const newTokenId = await this.contract.getDidId(newWallet);

      logger.info(`DID migrated from ${oldWallet} to ${newWallet}: old=${oldTokenId}, new=${newTokenId}`);

      return {
        oldTokenId: oldTokenId.toString(),
        newTokenId: newTokenId.toString(),
        txHash: receipt.hash,
      };
    } catch (error: any) {
      logger.error('Error migrating DID:', error);
      throw new Error(`Failed to migrate DID: ${error.message}`);
    }
  }

  /**
   * Get instance of DID service
   */
  static getInstance(): DIDService | null {
    const config = getDIDServiceConfig();
    if (!config) {
      return null;
    }
    return new DIDService(config);
  }
}

