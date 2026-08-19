import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useWallet } from '../contexts/WalletContext';
import { User, Calendar, Clock, MessageSquare, Loader2, AlertCircle, RefreshCw, Download, Trash2, CheckCircle, Key, ShieldAlert } from 'lucide-react';
import Header from './Header';
import Footer from './Footer';
import DIDTokenVisualization from './DIDTokenVisualization';
import { exportChatData } from '../utils/chat-retrieval';
import { updateChatDataReference, getDIDProfile } from '../utils/did-contract';
import { decryptSymmetricKey, decryptChatHistory } from '../utils/did-encryption';
import { onchainMetadataToEncryptedChatKey } from '../utils/did-key-metadata';
import { apiFetch } from '../config/api';

interface DIDProfile {
  owner: string;
  createdAt: string;
  lastUpdatedAt: string;
  chatDataReference: string;
  hasChatReference: boolean;
}

interface DIDInfo {
  hasDid: boolean;
  tokenId: string | null;
  walletAddress: string;
  profile?: DIDProfile;
}

interface DecryptedMetadata {
  encryptedKey?: string;
  updatedAt?: string;
  [key: string]: any; // Allow for additional metadata fields
}

export default function AboutMe() {
  const navigate = useNavigate();
  const { authState, logout } = useAuth();
  const { wallet, signer } = useWallet();
  const [didInfo, setDidInfo] = useState<DIDInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [decryptedMetadata, setDecryptedMetadata] = useState<DecryptedMetadata | null>(null);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [decryptionError, setDecryptionError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletionError, setDeletionError] = useState<string | null>(null);

  useEffect(() => {
    if (authState.isVerified && authState.walletAddress) {
      loadDIDInfo();
    } else {
      setDidInfo(null);
      setDecryptedMetadata(null);
    }
  }, [authState.isVerified, authState.walletAddress, wallet, signer]);

  // Load and decrypt metadata when DID info is loaded and wallet is available
  useEffect(() => {
    if (didInfo?.hasDid && wallet && signer && authState.isVerified) {
      loadAndDecryptMetadata();
    } else {
      setDecryptedMetadata(null);
    }
  }, [didInfo?.hasDid, wallet, signer, authState.isVerified]);

  const loadDIDInfo = async () => {
    if (!authState.isVerified || !authState.walletAddress) {
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      const response = await apiFetch('/did/info', {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Please verify your wallet to view your profile');
        }
        throw new Error('Failed to load profile information');
      }

      const data = await response.json();
      if (data.success) {
        setDidInfo(data.data);
      } else {
        throw new Error(data.message || 'Failed to load profile information');
      }
    } catch (err: any) {
      console.error('Error loading DID info:', err);
      setError(err.message || 'Failed to load profile information');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Load encryptedKeyMetadata from contract and decrypt it
   */
  const loadAndDecryptMetadata = async () => {
    if (!wallet || !signer || !authState.walletAddress) {
      return;
    }

    try {
      setIsDecrypting(true);
      setDecryptionError(null);

      // Get provider from signer
      const provider = signer.provider;
      if (!provider) {
        throw new Error('Provider not available');
      }

      // Fetch profile from contract (includes encryptedKeyMetadata)
      const profile = await getDIDProfile(provider, authState.walletAddress);

      // Check if encryptedKeyMetadata exists and is not empty
      if (!profile.encryptedKeyMetadata || profile.encryptedKeyMetadata === '0x' || profile.encryptedKeyMetadata.length === 0) {
        setDecryptedMetadata(null);
        return;
      }

      // Convert hex string to string
      // The encryptedKeyMetadata is stored as bytes in the contract
      // We need to convert it from hex to a readable string
      let encryptedKeyString: string;
      
      // The encryptedKeyMetadata from contract is a hex string (0x...)
      // We need to convert it to a regular string
      if (profile.encryptedKeyMetadata && profile.encryptedKeyMetadata !== '0x') {
        encryptedKeyString = onchainMetadataToEncryptedChatKey(profile.encryptedKeyMetadata) || '';
      } else {
        encryptedKeyString = '';
      }

      // Check if the string is empty or just whitespace
      if (!encryptedKeyString || encryptedKeyString.trim().length === 0) {
        setDecryptedMetadata(null);
        return;
      }

      // Decrypt the metadata using wallet signature
      // The format is: signature:encryptedKey
      const decryptedKey = await decryptSymmetricKey(
        encryptedKeyString,
        wallet.address,
        signer
      );

      // The decrypted key is the symmetric key (32 bytes)
      // We'll show information about the decrypted metadata
      // The encryptedKeyMetadata typically contains the encrypted symmetric key
      // After decryption, we have the actual symmetric key
      const metadata: DecryptedMetadata = {
        symmetricKeyStatus: 'Decrypted successfully',
        keyLength: `${decryptedKey.length} bytes (AES-256)`,
        keyType: 'Symmetric encryption key',
        lastUpdated: profile.lastUpdatedAt 
          ? formatDate(Number(profile.lastUpdatedAt) * 1000)
          : 'Unknown',
      };

      // Try to parse as JSON if it contains additional metadata
      try {
        const metadataString = new TextDecoder().decode(decryptedKey);
        // Check if it looks like JSON
        if (metadataString.trim().startsWith('{') || metadataString.trim().startsWith('[')) {
          const parsed = JSON.parse(metadataString);
          // Merge parsed JSON with basic info
          setDecryptedMetadata({ ...metadata, ...parsed });
        } else {
          setDecryptedMetadata(metadata);
        }
      } catch {
        // Not JSON, just show the key info
        setDecryptedMetadata(metadata);
      }
    } catch (err: any) {
      console.error('Error decrypting metadata:', err);
      setDecryptionError(err.message || 'Failed to decrypt metadata. Make sure you are using the correct wallet.');
      setDecryptedMetadata(null);
    } finally {
      setIsDecrypting(false);
    }
  };

  const formatAddress = (address: string) => {
    if (!address) return 'N/A';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatDate = (timestamp: string | number | bigint) => {
    if (!timestamp) return 'N/A';
    try {
      // Handle bigint or string timestamps (Unix timestamp in seconds)
      const numTimestamp = typeof timestamp === 'bigint' 
        ? Number(timestamp) 
        : typeof timestamp === 'string' 
        ? parseInt(timestamp, 10) 
        : timestamp;
      
      // If timestamp is in seconds, convert to milliseconds
      const date = new Date(numTimestamp > 1000000000000 ? numTimestamp : numTimestamp * 1000);
      
      if (isNaN(date.getTime())) {
        return 'Invalid date';
      }
      
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (err) {
      return 'Invalid date';
    }
  };

  const getLastSession = () => {
    if (!didInfo?.profile) return null;
    
    return formatDate(didInfo.profile.lastUpdatedAt);
  };

  /**
   * Export chat data
   * Uses retrieval function: pointer → download blob → decrypt → export
   */
  const handleExport = async () => {
    if (!wallet || !didInfo?.profile?.hasChatReference) {
      setError('No chat data to export');
      return;
    }
    if (!signer) {
      setError('Connect your wallet to export chat data.');
      return;
    }

    try {
      setIsExporting(true);
      setError(null);
      setSuccessMessage(null);

      if (!signer.provider) {
        throw new Error('Wallet provider not available');
      }

      const profile = await getDIDProfile(signer.provider, wallet.address);
      const encKeyStr = onchainMetadataToEncryptedChatKey(profile.encryptedKeyMetadata);
      if (!encKeyStr) {
        throw new Error(
          'No chat encryption key on your ID token. Save the chat once from the main chat screen so your key is stored on-chain.',
        );
      }

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      const response = await apiFetch('/chat/load', {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error('Failed to load chat data');
      }

      const data = await response.json();
      if (!data.success || !data.data.hasChat) {
        throw new Error('No chat data found');
      }

      const symmetricKey = await decryptSymmetricKey(encKeyStr, wallet.address, signer);
      const decryptedJson = await decryptChatHistory(data.data.encryptedChatBlob, symmetricKey);

      const exportData = {
        messages: JSON.parse(decryptedJson) as unknown[],
        blobHash: data.data.blobHash,
        exportedAt: new Date().toISOString(),
        walletAddress: wallet.address,
        note: 'Plaintext messages exported locally. Keep this file private.',
      };

      exportChatData(exportData);
      setSuccessMessage('Chat data exported successfully');
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error('Export error:', err);
      setError(err.message || 'Failed to export chat data');
    } finally {
      setIsExporting(false);
    }
  };

  /**
   * Revoke chat data reference
   * Clears the chat reference from DID profile
   */
  const handleRevoke = async () => {
    if (!wallet || !signer || !didInfo?.profile?.hasChatReference) {
      setError('No chat reference to revoke');
      return;
    }

    if (!confirm('Are you sure you want to revoke the chat data reference? This will clear the pointer from your ID token profile. The encrypted data will remain in the database but will no longer be linked to your ID token.')) {
      return;
    }

    try {
      setIsRevoking(true);
      setError(null);
      setSuccessMessage(null);

      // Clear chat reference by setting it to empty string (which becomes bytes32(0))
      await updateChatDataReference(signer, '');
      
      setSuccessMessage('Chat reference revoked successfully');
      
      // Reload DID info to reflect changes
      await loadDIDInfo();
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      console.error('Revoke error:', err);
      setError(err.message || 'Failed to revoke chat reference');
    } finally {
      setIsRevoking(false);
    }
  };

  /**
   * Delete account — GDPR Art. 17 (Right to Erasure)
   * Permanently removes all user data from SafePsy.
   */
  const handleDeleteAccount = async () => {
    if (!confirm(
      'DELETE MY ACCOUNT\n\n' +
      'This is irreversible. All your data will be permanently removed:\n' +
      '- Chat history and encryption keys\n' +
      '- Subscription and billing records\n' +
      '- Crisis Safety Net opt-in data\n' +
      '- RAG audit logs\n\n' +
      'On-chain DID metadata (hashes) cannot be removed from the blockchain.\n\n' +
      'Type "DELETE MY ACCOUNT" in the next prompt to confirm.'
    )) {
      return;
    }

    const confirmation = prompt('Type "DELETE MY ACCOUNT" to confirm:');
    if (confirmation !== 'DELETE MY ACCOUNT') {
      setDeletionError('Deletion cancelled — confirmation did not match.');
      return;
    }

    try {
      setIsDeleting(true);
      setDeletionError(null);

      const response = await apiFetch('/account', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: 'DELETE_MY_ACCOUNT' }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'Failed to delete account');
      }

      setSuccessMessage('Account deleted successfully. Redirecting...');
      await logout();
      setTimeout(() => navigate('/'), 1500);
    } catch (err: any) {
      console.error('Deletion error:', err);
      setDeletionError(err.message || 'Failed to delete account');
    } finally {
      setIsDeleting(false);
    }
  };

  if (!authState.isVerified) {
    return (
      <div className="min-h-screen flex flex-col">
        <Header />
        <main id="main-content" className="flex-1" role="main" aria-label="About Me" tabIndex={-1}>
          <section className="section-padding py-8 lg:py-12">
            <div className="container-max">
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-6 max-w-2xl mx-auto">
                <div className="flex items-center gap-3 text-yellow-800 dark:text-yellow-200">
                  <AlertCircle className="w-6 h-6" />
                  <div>
                    <h3 className="text-lg font-semibold mb-1">Wallet Not Verified</h3>
                    <p className="text-sm">Please connect and verify your wallet to view My ID token.</p>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      {/* Main Content */}
      <main id="main-content" className="flex-1" role="main" aria-label="About Me" tabIndex={-1}>
        <section className="section-padding py-8 lg:py-12">
          <div className="container-max">
            {/* Hero Section */}
            <div className="text-center mb-12 sm:mb-16 px-4 fade-in">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl xl:text-6xl text-heading leading-tight mb-4 sm:mb-6">
                <span className="bg-gradient-to-r from-primary-600 to-secondary-600 bg-clip-text text-transparent text-[1.2em] font-bold stagger-item">
                  My ID token
                </span>
              </h1>
              <p className="text-base sm:text-lg lg:text-xl text-body leading-relaxed max-w-3xl mx-auto">
                View your ID token, encrypted chat references, and profile details
              </p>
            </div>

            {/* DID Token Visualization */}
            <div className="mb-8 sm:mb-12 fade-in max-w-4xl mx-auto">
              <DIDTokenVisualization />
            </div>

            {/* Profile Card */}
            <div className="bg-white/70 backdrop-blur-sm rounded-2xl sm:rounded-3xl p-6 sm:p-8 lg:p-12 shadow-lg border border-neutral-dark/20 dark:bg-black/30 dark:border-white/20 mb-12 sm:mb-16 fade-in card-hover max-w-4xl mx-auto">
              {/* Header with Refresh Button */}
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl sm:text-3xl text-heading font-bold">
                  Profile Information
                </h2>
                <button
                  onClick={loadDIDInfo}
                  disabled={isLoading}
                  className="p-2 text-gray-600 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                  title="Refresh"
                >
                  <RefreshCw className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} />
                </button>
              </div>

              {isLoading && !didInfo ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-primary-600" />
                  <span className="ml-3 text-body">Loading profile information...</span>
                </div>
              ) : error ? (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6 mb-4">
                  <div className="flex items-center gap-3 text-red-800 dark:text-red-200">
                    <AlertCircle className="w-6 h-6" />
                    <div>
                      <h3 className="text-lg font-semibold mb-1">Error</h3>
                      <p className="text-sm">{error}</p>
                    </div>
                  </div>
                </div>
              ) : successMessage ? (
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-6 mb-4">
                  <div className="flex items-center gap-3 text-green-800 dark:text-green-200">
                    <CheckCircle className="w-6 h-6" />
                    <div>
                      <h3 className="text-lg font-semibold mb-1">Success</h3>
                      <p className="text-sm">{successMessage}</p>
                    </div>
                  </div>
                </div>
              ) : !didInfo?.hasDid ? (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl p-6">
                  <div className="flex items-center gap-3 text-yellow-800 dark:text-yellow-200">
                    <AlertCircle className="w-6 h-6" />
                    <div>
                      <h3 className="text-lg font-semibold mb-1">No ID token found</h3>
                      <p className="text-sm">You do not have an ID token yet. Create one to get started.</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Wallet Owner Name */}
                  <div className="bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-800/20 border border-primary-200 dark:border-primary-800 rounded-xl p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-primary-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <User className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-sm font-semibold text-primary-800 dark:text-primary-200 mb-1 uppercase tracking-wide">
                          Wallet Owner
                        </h3>
                        <p className="text-2xl font-bold text-heading mb-2">
                          {formatAddress(didInfo.walletAddress)}
                        </p>
                        <p className="text-xs text-body font-mono break-all">
                          {didInfo.walletAddress}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Creation Date */}
                  <div className="bg-gradient-to-br from-secondary-50 to-secondary-100 dark:from-secondary-900/20 dark:to-secondary-800/20 border border-secondary-200 dark:border-secondary-800 rounded-xl p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-secondary-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <Calendar className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-sm font-semibold text-secondary-800 dark:text-secondary-200 mb-1 uppercase tracking-wide">
                          Creation Date
                        </h3>
                        <p className="text-xl font-semibold text-heading">
                          {didInfo.profile?.createdAt 
                            ? formatDate(didInfo.profile.createdAt)
                            : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Last Session */}
                  <div className="bg-gradient-to-br from-accent-50 to-accent-100 dark:from-accent-900/20 dark:to-accent-800/20 border border-accent-200 dark:border-accent-800 rounded-xl p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-accent-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <Clock className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-sm font-semibold text-accent-800 dark:text-accent-200 mb-1 uppercase tracking-wide">
                          Last Session
                        </h3>
                        <p className="text-xl font-semibold text-heading">
                          {getLastSession() || 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Last Chat with Export/Revoke Actions */}
                  <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border border-purple-200 dark:border-purple-800 rounded-xl p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <MessageSquare className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-sm font-semibold text-purple-800 dark:text-purple-200 mb-1 uppercase tracking-wide">
                          Last Chat
                        </h3>
                        {didInfo.profile?.hasChatReference ? (
                          <div>
                            <p className="text-xl font-semibold text-heading mb-1">
                              {formatDate(didInfo.profile.lastUpdatedAt)}
                            </p>
                            <p className="text-xs text-body mb-4">
                              Chat reference: {formatAddress(didInfo.profile.chatDataReference)}
                            </p>
                            
                            {/* Export and Revoke Buttons */}
                            <div className="flex flex-wrap gap-3 mt-4">
                              <button
                                onClick={handleExport}
                                disabled={isExporting}
                                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                              >
                                {isExporting ? (
                                  <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Exporting...</span>
                                  </>
                                ) : (
                                  <>
                                    <Download className="w-4 h-4" />
                                    <span>Export Chat</span>
                                  </>
                                )}
                              </button>
                              <button
                                onClick={handleRevoke}
                                disabled={isRevoking || !signer}
                                className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                              >
                                {isRevoking ? (
                                  <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Revoking...</span>
                                  </>
                                ) : (
                                  <>
                                    <Trash2 className="w-4 h-4" />
                                    <span>Revoke Pointer</span>
                                  </>
                                )}
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-lg text-body italic">
                            No chat history yet
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Decrypted Metadata */}
                  <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/20 dark:to-indigo-800/20 border border-indigo-200 dark:border-indigo-800 rounded-xl p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-indigo-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <Key className="w-6 h-6 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-sm font-semibold text-indigo-800 dark:text-indigo-200 mb-1 uppercase tracking-wide">
                          Decrypted Metadata
                        </h3>
                        {isDecrypting ? (
                          <div className="flex items-center gap-2 mt-2">
                            <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                            <span className="text-sm text-body">Decrypting metadata...</span>
                          </div>
                        ) : decryptionError ? (
                          <div className="mt-2">
                            <p className="text-sm text-red-600 dark:text-red-400 mb-2">{decryptionError}</p>
                            <button
                              onClick={loadAndDecryptMetadata}
                              disabled={isDecrypting}
                              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline disabled:opacity-50"
                            >
                              Try again
                            </button>
                          </div>
                        ) : decryptedMetadata ? (
                          <div className="mt-2 space-y-2">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs text-indigo-600 dark:text-indigo-400">
                                Metadata decrypted successfully
                              </span>
                              <button
                                onClick={loadAndDecryptMetadata}
                                disabled={isDecrypting}
                                className="p-1 text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-200 transition-colors disabled:opacity-50"
                                title="Refresh metadata"
                              >
                                <RefreshCw className={`w-4 h-4 ${isDecrypting ? 'animate-spin' : ''}`} />
                              </button>
                            </div>
                            {Object.entries(decryptedMetadata).map(([key, value]) => (
                              <div key={key} className="text-sm border-b border-indigo-200 dark:border-indigo-800 pb-2 last:border-0 last:pb-0">
                                <span className="font-semibold text-heading capitalize">
                                  {key.replace(/([A-Z])/g, ' $1').trim()}:
                                </span>{' '}
                                <span className="text-body">
                                  {typeof value === 'object' && value !== null ? (
                                    <pre className="mt-1 p-2 bg-white/50 dark:bg-black/30 rounded text-xs overflow-x-auto max-h-40 overflow-y-auto">
                                      {JSON.stringify(value, null, 2)}
                                    </pre>
                                  ) : (
                                    String(value)
                                  )}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="mt-2">
                            <p className="text-sm text-body italic mb-2">
                              No encrypted metadata found in your ID token profile
                            </p>
                            <button
                              onClick={loadAndDecryptMetadata}
                              disabled={isDecrypting}
                              className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline disabled:opacity-50"
                            >
                              Check again
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Additional Info */}
                  {didInfo.tokenId && (
                    <div className="bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
                      <p className="text-xs text-body">
                        <span className="font-semibold">ID Token ID:</span>{' '}
                        <span className="font-mono">{didInfo.tokenId}</span>
                      </p>
                    </div>
                  )}

                  {/* Danger Zone — GDPR Art. 17: Right to Erasure */}
                  <div className="bg-red-50/70 dark:bg-red-900/10 border border-red-200 dark:border-red-800 rounded-xl p-6">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 bg-red-600 rounded-full flex items-center justify-center flex-shrink-0">
                        <ShieldAlert className="w-5 h-5 text-white" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-bold text-red-800 dark:text-red-200 mb-1">
                          Delete Account
                        </h3>
                        <p className="text-sm text-body mb-3">
                          Permanently erase all your data from SafePsy. This action is <strong>irreversible</strong> and removes chat history, encryption keys, subscription records, crisis opt-in data, and audit logs. On-chain DID metadata cannot be removed from the blockchain.
                        </p>

                        {deletionError && (
                          <div className="bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg p-3 mb-3">
                            <p className="text-sm text-red-800 dark:text-red-200">{deletionError}</p>
                          </div>
                        )}

                        {successMessage?.includes('deleted') && (
                          <div className="bg-green-100 dark:bg-green-900/30 border border-green-300 dark:border-green-700 rounded-lg p-3 mb-3">
                            <p className="text-sm text-green-800 dark:text-green-200">{successMessage}</p>
                          </div>
                        )}

                        <button
                          onClick={handleDeleteAccount}
                          disabled={isDeleting || isExporting || isRevoking}
                          className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium w-full sm:w-auto"
                        >
                          {isDeleting ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              <span>Deleting…</span>
                            </>
                          ) : (
                            <>
                              <Trash2 className="w-4 h-4" />
                              <span>Delete My Account</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}

