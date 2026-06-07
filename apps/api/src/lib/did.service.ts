import { ethers } from 'ethers';
import logger from './logger';
import { SUPPORTED_CHAIN_ID } from './constants';
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

// DIDRegistryV2 ABI (split architecture - no getProfileByOwner)
const DID_REGISTRY_V2_ABI = [
  'function getTokenIdByAddress(address owner) external view returns (uint256)',
  'function isAddressRevoked(address owner) external view returns (bool)',
  'function ownerOf(uint256 tokenId) external view returns (address)',
  'function mint(address to, bytes32 didHash) external returns (uint256)',
];

/**
 * DID Service Configuration
 */
interface DIDServiceConfig {
  contractAddress: string;
  rpcUrl: string;
  chainId: number;
  backendSignerPrivateKey?: string;
  useNewRegistry?: boolean;
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
 * Load Registry/Ownership addresses from deployment registry when env not set (Sepolia)
 */
function loadAddressesFromDeploymentRegistry(): { registry?: string; ownership?: string } {
  try {
    const registryPath = path.join(process.cwd(), 'deployments', 'sepolia-latest.json');
    if (fs.existsSync(registryPath)) {
      const reg = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
      const c = reg?.contracts;
      if (c?.DIDRegistryV2?.address) {
        return { registry: c.DIDRegistryV2.address, ownership: c.DIDOwnershipV2?.address };
      }
    }
  } catch {
    /* ignore */
  }
  return {};
}

/**
 * Get DID service configuration from environment
 * Prefers DID_REGISTRY_ADDRESS (new split architecture) when set.
 * Fallback: deployments/sepolia-latest.json when running on Sepolia.
 * Legacy: DID_IDENTITY_TOKEN_ADDRESS has full profile (getProfileByOwner).
 * New Registry: hasDid/getDidId/isRevoked only; profile data in DIDMetadata (different interface).
 */
function getDIDServiceConfig(): (DIDServiceConfig & { useNewRegistry: boolean }) | null {
  let registryAddress = process.env.DID_REGISTRY_ADDRESS;
  if (!registryAddress) {
    const fallback = loadAddressesFromDeploymentRegistry();
    registryAddress = fallback.registry || undefined;
  }
  const legacyAddress = process.env.DID_IDENTITY_TOKEN_ADDRESS;
  const contractAddress = registryAddress || legacyAddress;
  const rpcUrl = process.env.RPC_URL || process.env.ETH_RPC_URL;
  const backendSignerPrivateKey = process.env.DID_BACKEND_SIGNER_PRIVATE_KEY;

  if (!contractAddress || !rpcUrl) {
    logger.warn('DID service not configured: missing DID_REGISTRY_ADDRESS (or DID_IDENTITY_TOKEN_ADDRESS) or RPC_URL');
    return null;
  }

  return {
    contractAddress,
    rpcUrl,
      chainId: SUPPORTED_CHAIN_ID,
    backendSignerPrivateKey,
    useNewRegistry: !!registryAddress,
  };
}

/**
 * DID Service Class
 */
type DidOnChainSource = 'none' | 'registry' | 'legacy';

export class DIDService {
  private config: DIDServiceConfig & { useNewRegistry: boolean };
  private provider: ethers.JsonRpcProvider;
  private contract: ethers.Contract;
  private signer: ethers.Wallet | null = null;
  private legacyContract: ethers.Contract | null = null;

  constructor(config: DIDServiceConfig & { useNewRegistry: boolean }) {
    this.config = config;
    this.provider = new ethers.JsonRpcProvider(config.rpcUrl);
    const abi = config.useNewRegistry ? DID_REGISTRY_V2_ABI : DID_IDENTITY_TOKEN_ABI;
    this.contract = new ethers.Contract(config.contractAddress, abi, this.provider);

    if (config.backendSignerPrivateKey) {
      this.signer = new ethers.Wallet(config.backendSignerPrivateKey, this.provider);
      this.contract = this.contract.connect(this.signer) as ethers.Contract;
      logger.info(`DID service initialized with backend signer (${config.useNewRegistry ? 'Registry' : 'legacy'})`);
    } else {
      logger.info(`DID service initialized without backend signer (${config.useNewRegistry ? 'Registry' : 'legacy'})`);
    }
  }

  /** Legacy DIDIdentityToken (profile + backend mint). Used when registry has no token for wallet. */
  private getLegacyIdentityContract(): ethers.Contract | null {
    const legacyAddress = process.env.DID_IDENTITY_TOKEN_ADDRESS;
    if (!legacyAddress) {
      return null;
    }
    if (!this.legacyContract) {
      this.legacyContract = new ethers.Contract(
        legacyAddress,
        DID_IDENTITY_TOKEN_ABI,
        this.provider,
      );
    }
    return this.legacyContract;
  }

  /** Resolve whether the wallet DID lives on registry V2, legacy identity token, or neither. */
  private async resolveDidOnChainSource(walletAddress: string): Promise<DidOnChainSource> {
    if (this.config.useNewRegistry) {
      const registryTokenId = await this.contract.getTokenIdByAddress(walletAddress);
      if (registryTokenId !== 0n) {
        return 'registry';
      }
      const legacy = this.getLegacyIdentityContract();
      if (legacy && (await legacy.hasDid(walletAddress))) {
        return 'legacy';
      }
      return 'none';
    }

    if (await this.contract.hasDid(walletAddress)) {
      return 'legacy';
    }
    return 'none';
  }

  /**
   * Check if a wallet has a DID
   */
  async hasDid(walletAddress: string): Promise<boolean> {
    try {
      const source = await this.resolveDidOnChainSource(walletAddress);
      return source !== 'none';
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
          `Network mismatch: Expected chain ID ${this.config.chainId}, got ${network.chainId}`
        );
      }

      // Validate wallet address
      if (!ethers.isAddress(walletAddress)) {
        throw new Error(`Invalid wallet address: ${walletAddress}`);
      }

      const source = await this.resolveDidOnChainSource(walletAddress);

      if (source === 'none') {
        return {
          hasDid: false,
          tokenId: null,
          encryptedDataExists: false,
          walletAddress: walletAddress.toLowerCase(),
        };
      }

      let tokenId: bigint;
      let isRevoked: boolean;
      let profileContract: ethers.Contract | null = null;

      if (source === 'registry') {
        tokenId = await this.contract.getTokenIdByAddress(walletAddress);
        isRevoked = await this.contract.isAddressRevoked(walletAddress);
      } else {
        profileContract = this.getLegacyIdentityContract() ?? this.contract;
        tokenId = await profileContract.getDidId(walletAddress);
        isRevoked = await profileContract.isRevoked(walletAddress);
      }

      // Profile data: only available on legacy DIDIdentityToken
      let encryptedDataExists = false;
      let profile: { owner: string; createdAt: bigint; lastUpdatedAt: bigint; chatDataReference: string; encryptedKeyMetadata: string } | undefined;
      if (profileContract) {
        const p = await profileContract.getProfileByOwner(walletAddress);
        encryptedDataExists = p.encryptedKeyMetadata.length > 0 || p.chatDataReference !== ethers.ZeroHash;
        profile = {
          owner: p.owner.toLowerCase(),
          createdAt: p.createdAt,
          lastUpdatedAt: p.lastUpdatedAt,
          chatDataReference: p.chatDataReference,
          encryptedKeyMetadata: p.encryptedKeyMetadata,
        };
      }

      return {
        hasDid: true,
        tokenId: tokenId.toString(),
        encryptedDataExists,
        walletAddress: walletAddress.toLowerCase(),
        isRevoked,
        profile,
      };
    } catch (error) {
      logger.error('Error getting DID info:', error);
      throw error;
    }
  }

  /**
   * Create a DID for a wallet
   * Uses backend signer if available (sponsored mint), otherwise requires public minting
   * @returns Object with tokenId, txHash, and isSponsored flag indicating if backend paid gas
   */
  async createDID(walletAddress: string): Promise<{ tokenId: string; txHash: string; isSponsored: boolean }> {
    try {
      // Validate network
      const network = await this.provider.getNetwork();
      if (Number(network.chainId) !== this.config.chainId) {
        throw new Error(
          `Network mismatch: Expected chain ID ${this.config.chainId}, got ${network.chainId}`
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

      // Use legacy contract for DID creation (new registry requires MINTER_ROLE via governance)
      // Fall back to legacy DID_IDENTITY_TOKEN_ADDRESS for createDID operations
      const legacyContractAddress = process.env.DID_IDENTITY_TOKEN_ADDRESS;
      if (!legacyContractAddress) {
        throw new Error(
          'DID_IDENTITY_TOKEN_ADDRESS not configured. Backend DID creation requires legacy contract. Set DID_IDENTITY_TOKEN_ADDRESS env var.'
        );
      }

      // Create a contract instance using the legacy address for this operation only
      const legacyAbi = DID_IDENTITY_TOKEN_ABI;
      const legacyContract = new ethers.Contract(legacyContractAddress, legacyAbi, this.provider);

      let tx: ethers.ContractTransactionResponse;
      let isSponsored: boolean;

      if (this.signer) {
        // Backend-sponsored mint: backend pays gas via createDid(address)
        const mintContract = legacyContract.connect(this.signer) as ethers.Contract & {
          createDid: (owner: string) => Promise<ethers.ContractTransactionResponse>;
        };
        tx = await mintContract.createDid(walletAddress);
        isSponsored = true;
        logger.info(`DID created for ${walletAddress}: BACKEND-SPONSORED mint (backend pays gas)`);
      } else {
        // No backend signer configured - cannot sponsor
        throw new Error(
          'Backend signer not configured. To enable gas-sponsored DID minting, set DID_BACKEND_SIGNER_PRIVATE_KEY environment variable.'
        );
      }

      const receipt = await tx.wait();
      if (!receipt) {
        throw new Error('DID creation transaction failed: no receipt');
      }
      // Get tokenId from legacy contract
      const tokenId = await legacyContract.getDidId(walletAddress);

      logger.info(`DID created for ${walletAddress}: token ID ${tokenId}, tx ${receipt.hash}, sponsored=${isSponsored}`);

      return {
        tokenId: tokenId.toString(),
        txHash: receipt.hash,
        isSponsored,
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
      if (!has || this.config.useNewRegistry) {
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
      if (this.config.useNewRegistry) {
        return ethers.ZeroHash;
      }
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
      if (this.config.useNewRegistry) {
        return '0x';
      }
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
      return this.config.useNewRegistry
        ? await this.contract.isAddressRevoked(walletAddress)
        : await this.contract.isRevoked(walletAddress);
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
      if (this.config.useNewRegistry) {
        throw new Error('migrateDid not supported with DIDRegistryV2 (split architecture)');
      }
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

