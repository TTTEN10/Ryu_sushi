import { ethers } from 'ethers';
import { SUPPORTED_CHAIN_ID } from '../config/supportedChain';

/**
 * DID Identity Token ABI (ERC-721 Soulbound)
 */
/** Write methods on DID identity token (ethers BaseContract does not list custom ABI methods). */
type DIDIdentityTokenWritable = ethers.Contract & {
  updateChatReference(
    chatReference: string,
    encryptedKeyMetadata: Uint8Array
  ): Promise<ethers.ContractTransactionResponse>;
  updateEncryptedKeyMetadata(
    encryptedKeyMetadata: Uint8Array
  ): Promise<ethers.ContractTransactionResponse>;
  updateChatDataReference(chatReference: string): Promise<ethers.ContractTransactionResponse>;
};

const DID_IDENTITY_TOKEN_ABI = [
  // Profile functions
  'function getProfileByOwner(address user) external view returns (tuple(address owner, uint64 createdAt, uint64 lastUpdatedAt, bytes32 chatDataReference, bytes encryptedKeyMetadata))',
  'function updateChatReference(string calldata newRef, bytes calldata newEncryptedKeyMetadata) external',
  'function updateEncryptedKeyMetadata(bytes calldata newEncryptedKeyMetadata) external',
  'function updateChatDataReference(string calldata newRef) external',
  // Basic DID functions
  'function hasDid(address user) external view returns (bool)',
  'function getDidId(address user) external view returns (uint256)',
  'function getChatDataReference(address user) external view returns (bytes32)',
  'function getEncryptedKeyMetadata(address user) external view returns (bytes memory)',
  // ERC-721 functions
  'function ownerOf(uint256 tokenId) external view returns (address)',
];

/**
 * Get DID contract address from environment or use default
 */
function getDIDContractAddress(): string {
  // In production, this should come from environment variable
  // For now, return empty string (will be set when contract is deployed)
  return import.meta.env.VITE_DID_IDENTITY_TOKEN_ADDRESS || '';
}

const WRITE_TX_MAX_ATTEMPTS = 4;
const WRITE_TX_BASE_DELAY_MS = 900;

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function isRetryableWriteError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /nonce|timeout|NETWORK_ERROR|rate limit|too many|ECONNRESET|ETIMEDOUT|replacement|underpriced|ECONNREFUSED|503|502/i.test(
    msg,
  );
}

/**
 * Send a contract write and wait for the receipt, with exponential backoff on
 * transient RPC / nonce errors (user still pays one successful tx gas).
 */
export async function sendContractWriteWithRetry(
  sendTx: () => Promise<ethers.ContractTransactionResponse>,
  options?: { maxAttempts?: number },
): Promise<ethers.ContractTransactionReceipt> {
  const maxAttempts = options?.maxAttempts ?? WRITE_TX_MAX_ATTEMPTS;
  let lastError: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const tx = await sendTx();
      const receipt = await tx.wait();
      if (receipt === null) {
        throw new Error('Transaction receipt not available');
      }
      return receipt;
    } catch (err) {
      lastError = err;
      if (attempt >= maxAttempts || !isRetryableWriteError(err)) {
        throw err;
      }
      await sleep(WRITE_TX_BASE_DELAY_MS * 2 ** (attempt - 1));
    }
  }
  throw lastError;
}

/**
 * Update DID's chat reference and encrypted key metadata on-chain
 * This must be called by the wallet owner (frontend)
 * 
 * @param signer The ethers signer (wallet owner)
 * @param chatReference The chat data reference (hash/CID/DB key as string)
 * @param encryptedKeyMetadata The encrypted key metadata (as bytes)
 * @returns Transaction receipt
 */
export async function updateChatReference(
  signer: ethers.JsonRpcSigner,
  chatReference: string,
  encryptedKeyMetadata: Uint8Array | string
): Promise<ethers.ContractTransactionReceipt> {
  const contractAddress = getDIDContractAddress();
  if (!contractAddress) {
    throw new Error('DID contract address not configured');
  }

  // Verify network
  const network = await signer.provider.getNetwork();
  if (Number(network.chainId) !== SUPPORTED_CHAIN_ID) {
    throw new Error('Please switch to Sepolia Testnet to update DID data');
  }

  // Get wallet address
  const walletAddress = await signer.getAddress();

  // Verify wallet has DID
  const contract = new ethers.Contract(
    contractAddress,
    DID_IDENTITY_TOKEN_ABI,
    signer.provider
  );
  
  const hasDid = await contract.hasDid(walletAddress);
  if (!hasDid) {
    throw new Error('Wallet does not have a DID. Please create one first.');
  }

  // Convert encrypted key metadata to bytes if needed
  let keyMetadataBytes: Uint8Array;
  if (typeof encryptedKeyMetadata === 'string') {
    // If it's a hex string, convert it
    if (encryptedKeyMetadata.startsWith('0x')) {
      keyMetadataBytes = ethers.getBytes(encryptedKeyMetadata);
    } else {
      // Otherwise, treat as base64 or plain string
      keyMetadataBytes = new TextEncoder().encode(encryptedKeyMetadata);
    }
  } else {
    keyMetadataBytes = encryptedKeyMetadata;
  }

  const contractWithSigner = contract.connect(signer) as DIDIdentityTokenWritable;

  return sendContractWriteWithRetry(() =>
    contractWithSigner.updateChatReference(chatReference, keyMetadataBytes),
  );
}

/**
 * Update only encrypted key metadata (preserve chat reference)
 * 
 * @param signer The ethers signer (wallet owner)
 * @param encryptedKeyMetadata The encrypted key metadata (as bytes)
 * @returns Transaction receipt
 */
export async function updateEncryptedKeyMetadata(
  signer: ethers.JsonRpcSigner,
  encryptedKeyMetadata: Uint8Array | string
): Promise<ethers.ContractTransactionReceipt> {
  const contractAddress = getDIDContractAddress();
  if (!contractAddress) {
    throw new Error('DID contract address not configured');
  }

  // Verify network
  const network = await signer.provider.getNetwork();
  if (Number(network.chainId) !== SUPPORTED_CHAIN_ID) {
    throw new Error('Please switch to Sepolia Testnet to update DID data');
  }

  // Get wallet address
  const walletAddress = await signer.getAddress();

  // Verify wallet has DID
  const contract = new ethers.Contract(
    contractAddress,
    DID_IDENTITY_TOKEN_ABI,
    signer.provider
  );
  
  const hasDid = await contract.hasDid(walletAddress);
  if (!hasDid) {
    throw new Error('Wallet does not have a DID. Please create one first.');
  }

  // Convert encrypted key metadata to bytes if needed
  let keyMetadataBytes: Uint8Array;
  if (typeof encryptedKeyMetadata === 'string') {
    if (encryptedKeyMetadata.startsWith('0x')) {
      keyMetadataBytes = ethers.getBytes(encryptedKeyMetadata);
    } else {
      keyMetadataBytes = new TextEncoder().encode(encryptedKeyMetadata);
    }
  } else {
    keyMetadataBytes = encryptedKeyMetadata;
  }

  const contractWithSigner = contract.connect(signer) as DIDIdentityTokenWritable;

  return sendContractWriteWithRetry(() =>
    contractWithSigner.updateEncryptedKeyMetadata(keyMetadataBytes),
  );
}

/**
 * Update only chat data reference (preserve encrypted key)
 * 
 * @param signer The ethers signer (wallet owner)
 * @param chatReference The chat data reference (hash/CID/DB key as string)
 * @returns Transaction receipt
 */
export async function updateChatDataReference(
  signer: ethers.JsonRpcSigner,
  chatReference: string
): Promise<ethers.ContractTransactionReceipt> {
  const contractAddress = getDIDContractAddress();
  if (!contractAddress) {
    throw new Error('DID contract address not configured');
  }

  // Verify network
  const network = await signer.provider.getNetwork();
  if (Number(network.chainId) !== SUPPORTED_CHAIN_ID) {
    throw new Error('Please switch to Sepolia Testnet to update DID data');
  }

  // Get wallet address
  const walletAddress = await signer.getAddress();

  // Verify wallet has DID
  const contract = new ethers.Contract(
    contractAddress,
    DID_IDENTITY_TOKEN_ABI,
    signer.provider
  );
  
  const hasDid = await contract.hasDid(walletAddress);
  if (!hasDid) {
    throw new Error('Wallet does not have a DID. Please create one first.');
  }

  const contractWithSigner = contract.connect(signer) as DIDIdentityTokenWritable;

  return sendContractWriteWithRetry(() => contractWithSigner.updateChatDataReference(chatReference));
}

/**
 * Get DID profile from contract
 * 
 * @param provider The ethers provider
 * @param walletAddress The wallet address
 * @returns DID profile with all fields
 */
export async function getDIDProfile(
  provider: ethers.Provider,
  walletAddress: string
): Promise<{
  owner: string;
  createdAt: bigint;
  lastUpdatedAt: bigint;
  chatDataReference: string;
  encryptedKeyMetadata: string;
}> {
  const contractAddress = getDIDContractAddress();
  if (!contractAddress) {
    throw new Error('DID contract address not configured');
  }

  const contract = new ethers.Contract(
    contractAddress,
    DID_IDENTITY_TOKEN_ABI,
    provider
  );

  const profile = await contract.getProfileByOwner(walletAddress);
  return {
    owner: profile.owner,
    createdAt: profile.createdAt,
    lastUpdatedAt: profile.lastUpdatedAt,
    chatDataReference: profile.chatDataReference,
    encryptedKeyMetadata: profile.encryptedKeyMetadata,
  };
}

/**
 * Get chat data reference from contract
 * 
 * @param provider The ethers provider
 * @param walletAddress The wallet address
 * @returns Chat data reference (bytes32 as hex string)
 */
export async function getChatDataReference(
  provider: ethers.Provider,
  walletAddress: string
): Promise<string> {
  const contractAddress = getDIDContractAddress();
  if (!contractAddress) {
    throw new Error('DID contract address not configured');
  }

  const contract = new ethers.Contract(
    contractAddress,
    DID_IDENTITY_TOKEN_ABI,
    provider
  );

  return await contract.getChatDataReference(walletAddress);
}

/**
 * Get encrypted key metadata from contract
 * 
 * @param provider The ethers provider
 * @param walletAddress The wallet address
 * @returns Encrypted key metadata (as hex string)
 */
export async function getEncryptedKeyMetadata(
  provider: ethers.Provider,
  walletAddress: string
): Promise<string> {
  const contractAddress = getDIDContractAddress();
  if (!contractAddress) {
    throw new Error('DID contract address not configured');
  }

  const contract = new ethers.Contract(
    contractAddress,
    DID_IDENTITY_TOKEN_ABI,
    provider
  );

  const metadata = await contract.getEncryptedKeyMetadata(walletAddress);
  return metadata;
}

