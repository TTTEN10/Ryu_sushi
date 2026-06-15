import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  Shield,
  Wallet,
  Hash,
  Calendar,
  FileText,
  Download,
  Trash2,
  AlertTriangle,
  CheckCircle,
  Loader2,
  Copy,
  ExternalLink,
  RefreshCw,
  MessageSquare,
  Key
} from 'lucide-react';
import { useToast } from '../hooks/useToast';
import { apiFetch } from '../config/api';

interface DIDProfileData {
  hasDid: boolean;
  tokenId: string | null;
  walletAddress: string;
  encryptedDataExists: boolean;
  isRevoked?: boolean;
  contractAddress?: string;
  network?: string;
  chainId?: number;
  profile?: {
    owner: string;
    createdAt: string;
    lastUpdatedAt: string;
    chatDataReference: string;
    encryptedKeyMetadataLength: number;
    hasChatReference: boolean;
  };
}

interface DataPointer {
  dataHash: string;
  dataType: string;
  storageLocation: string;
  updatedAt: string;
}

export default function DIDProfile() {
  const { authState } = useAuth();
  const { showToast } = useToast();
  const [profileData, setProfileData] = useState<DIDProfileData | null>(null);
  const [pointers, setPointers] = useState<DataPointer[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isRevoking, setIsRevoking] = useState(false);
  const [showRevokeConfirm, setShowRevokeConfirm] = useState(false);
  const [isExportingChat, setIsExportingChat] = useState(false);
  const [isDeletingChat, setIsDeletingChat] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isRotatingKey, setIsRotatingKey] = useState(false);
  const [showRotateConfirm, setShowRotateConfirm] = useState(false);
  const [lastKeyRotation, setLastKeyRotation] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (authState.isVerified && authState.walletAddress) {
      loadProfileData();
    } else {
      setProfileData(null);
      setPointers([]);
    }
  }, [authState.isVerified, authState.walletAddress]);

  const loadProfileData = async () => {
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
        throw new Error('Failed to load DID profile');
      }

      const data = await response.json();
      if (data.success) {
        setProfileData(data.data);
        // TODO: Load pointers from DIDService contract if available
        // For now, we'll show empty pointers array
        setPointers([]);
      } else {
        throw new Error(data.message || 'Failed to load DID profile');
      }
    } catch (err: any) {
      console.error('Error loading DID profile:', err);
      setError(err.message || 'Failed to load DID profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async () => {
    if (!authState.isVerified || !authState.walletAddress) {
      showToast('error', 'Please verify your wallet first');
      return;
    }

    try {
      setIsExporting(true);
      setError(null);

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      const response = await apiFetch('/did/export', {
        method: 'GET',
        headers,
      });

      if (!response.ok) {
        throw new Error('Failed to export DID data');
      }

      const data = await response.json();
      if (data.success) {
        // Create and download JSON file
        const jsonStr = JSON.stringify(data.data, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `did-profile-${authState.walletAddress.slice(2, 10)}-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showToast('success', 'DID profile exported successfully');
      } else {
        throw new Error(data.message || 'Failed to export DID data');
      }
    } catch (err: any) {
      console.error('Error exporting DID:', err);
      setError(err.message || 'Failed to export DID data');
      showToast('error', err.message || 'Failed to export DID data');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportChat = async () => {
    if (!authState.isVerified || !authState.walletAddress) {
      showToast('error', 'Please verify your wallet first');
      return;
    }

    try {
      setIsExportingChat(true);
      setError(null);

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      const response = await apiFetch('/chat/export', {
        method: 'POST',
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 404) {
          showToast('info', 'No chat history found to export');
          setIsExportingChat(false);
          return;
        }
        throw new Error(errorData.message || 'Failed to export chat data');
      }

      const data = await response.json();
      if (data.success) {
        // Create and download JSON file
        const jsonStr = JSON.stringify(data.data, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `safepsy-chat-${authState.walletAddress.slice(2, 10)}-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        showToast('success', 'Chat history exported successfully. Store this file securely - you will need your wallet to decrypt it.');
      } else {
        throw new Error(data.message || 'Failed to export chat data');
      }
    } catch (err: any) {
      console.error('Error exporting chat:', err);
      setError(err.message || 'Failed to export chat data');
      showToast('error', err.message || 'Failed to export chat data');
    } finally {
      setIsExportingChat(false);
    }
  };

  const handleDeleteChat = async () => {
    if (!authState.isVerified || !authState.walletAddress) {
      showToast('error', 'Please verify your wallet first');
      return;
    }

    if (!showDeleteConfirm) {
      setShowDeleteConfirm(true);
      return;
    }

    try {
      setIsDeletingChat(true);
      setError(null);

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      const response = await apiFetch('/chat', {
        method: 'DELETE',
        headers,
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 404) {
          showToast('info', 'No chat history found to delete');
          setShowDeleteConfirm(false);
          setIsDeletingChat(false);
          return;
        }
        throw new Error(errorData.message || 'Failed to delete chat data');
      }

      const data = await response.json();
      if (data.success) {
        showToast('success', 'Chat history deleted successfully. Note: On-chain references remain but point to deleted data.');
        setShowDeleteConfirm(false);
      } else {
        throw new Error(data.message || 'Failed to delete chat data');
      }
    } catch (err: any) {
      console.error('Error deleting chat:', err);
      setError(err.message || 'Failed to delete chat data');
      showToast('error', err.message || 'Failed to delete chat data');
    } finally {
      setIsDeletingChat(false);
    }
  };

  const handleRevoke = async () => {
    if (!authState.isVerified || !authState.walletAddress) {
      showToast('error', 'Please verify your wallet first');
      return;
    }

    if (!showRevokeConfirm) {
      setShowRevokeConfirm(true);
      return;
    }

    try {
      setIsRevoking(true);
      setError(null);

      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      // First, get revocation instructions from backend
      const response = await apiFetch('/did/revoke', {
        method: 'POST',
        headers,
        body: JSON.stringify({ clearChatReference: true }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to revoke DID');
      }

      const data = await response.json();
      if (data.success) {
        // Backend returns instructions - user needs to call contract directly
        // For now, show success message
        showToast('success', 'Revocation initiated. Please complete the transaction in your wallet.');
        setShowRevokeConfirm(false);
        // Reload profile data
        await loadProfileData();
      } else {
        throw new Error(data.message || 'Failed to revoke DID');
      }
    } catch (err: any) {
      console.error('Error revoking DID:', err);
      setError(err.message || 'Failed to revoke DID');
      showToast('error', err.message || 'Failed to revoke DID');
    } finally {
      setIsRevoking(false);
    }
  };

  const handleRotateKey = async () => {
    if (!authState.isVerified || !authState.walletAddress) {
      showToast('error', 'Please verify your wallet first');
      return;
    }

    if (!showRotateConfirm) {
      setShowRotateConfirm(true);
      return;
    }

    try {
      setIsRotatingKey(true);
      setError(null);

      // The actual key rotation requires the useChatEncryption hook
      // We'll dispatch a custom event that a provider component can handle
      window.dispatchEvent(new CustomEvent('rotate-encryption-key'));

      showToast('success', 'Key rotation initiated. Please wait for confirmation.');
      setShowRotateConfirm(false);
      setLastKeyRotation(new Date().toISOString());

    } catch (err: any) {
      console.error('Error rotating key:', err);
      setError(err.message || 'Failed to rotate encryption key');
      showToast('error', err.message || 'Failed to rotate encryption key');
    } finally {
      setIsRotatingKey(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showToast('success', `${label} copied to clipboard`);
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatDate = (timestamp: string) => {
    try {
      const date = new Date(parseInt(timestamp) * 1000);
      return date.toLocaleString();
    } catch {
      return timestamp;
    }
  };

  const getEtherscanUrl = (address: string) => {
    return `https://etherscan.io/address/${address}`;
  };

  const getEtherscanTokenUrl = (tokenId: string) => {
    const contractAddress = profileData?.contractAddress || '';
    if (!contractAddress) return '';
    return `https://etherscan.io/token/${contractAddress}?a=${tokenId}`;
  };

  if (!authState.isVerified) {
    return null;
  }

  if (isLoading && !profileData) {
    return (
      <div className="p-4 bg-gray-50 dark:bg-gray-900/20 border border-gray-200 dark:border-gray-800 rounded-lg">
        <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin" />
          <p className="text-sm">Loading DID profile...</p>
        </div>
      </div>
    );
  }

  if (!profileData || !profileData.hasDid) {
    return (
      <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
        <div className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
          <AlertTriangle className="w-5 h-5" />
          <p className="text-sm font-medium">No DID found. Please create your DID identity first.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Main Profile Card */}
      <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-indigo-900/20 dark:via-purple-900/20 dark:to-pink-900/20 rounded-2xl p-6 border border-indigo-200 dark:border-indigo-800 shadow-lg">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
              <Shield className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">DID Profile</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">Decentralized Identity</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadProfileData}
              disabled={isLoading}
              className="p-2 text-gray-600 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
            {profileData.isRevoked ? (
              <div className="px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg text-xs font-semibold">
                Revoked
              </div>
            ) : (
              <div className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded-lg text-xs font-semibold flex items-center gap-1">
                <CheckCircle className="w-3 h-3" />
                Active
              </div>
            )}
          </div>
        </div>

        {/* Wallet Address */}
        <div className="mb-4 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-2">
            <Wallet className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Wallet Address</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-sm text-gray-900 dark:text-white">{profileData.walletAddress}</span>
            <button
              onClick={() => copyToClipboard(profileData.walletAddress, 'Address')}
              className="p-1 text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
              title="Copy address"
            >
              <Copy className="w-4 h-4" />
            </button>
            <a
              href={getEtherscanUrl(profileData.walletAddress)}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1 text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
              title="View on Etherscan"
            >
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>
        </div>

        {/* Token ID */}
        {profileData.tokenId && (
          <div className="mb-4 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-2">
              <Hash className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Token ID</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm text-gray-900 dark:text-white">{profileData.tokenId}</span>
              {profileData.contractAddress && (
                <a
                  href={getEtherscanTokenUrl(profileData.tokenId)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1 text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                  title="View token on Etherscan"
                >
                  <ExternalLink className="w-4 h-4" />
                </a>
              )}
            </div>
          </div>
        )}

        {/* Profile Details */}
        {profileData.profile && (
          <div className="mb-4 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-3">
              <FileText className="w-4 h-4 text-gray-500 dark:text-gray-400" />
              <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Profile Details</span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600 dark:text-gray-400">Created:</span>
                <span className="text-gray-900 dark:text-white">{formatDate(profileData.profile.createdAt)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <span className="text-gray-600 dark:text-gray-400">Updated:</span>
                <span className="text-gray-900 dark:text-white">{formatDate(profileData.profile.lastUpdatedAt)}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-600 dark:text-gray-400">Chat Reference:</span>
                <span className="text-gray-900 dark:text-white">
                  {profileData.profile.hasChatReference ? (
                    <span className="font-mono text-xs">{formatAddress(profileData.profile.chatDataReference)}</span>
                  ) : (
                    <span className="text-gray-400">None</span>
                  )}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-600 dark:text-gray-400">Encrypted Key Metadata:</span>
                <span className="text-gray-900 dark:text-white">
                  {profileData.profile.encryptedKeyMetadataLength > 0 ? (
                    `${profileData.profile.encryptedKeyMetadataLength} bytes`
                  ) : (
                    <span className="text-gray-400">None</span>
                  )}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Data Pointers */}
        <div className="mb-4 p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-3">
            <Hash className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            <span className="text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">Data Pointers</span>
            <span className="text-xs text-gray-500 dark:text-gray-400">({pointers.length})</span>
          </div>
          {pointers.length > 0 ? (
            <div className="space-y-2">
              {pointers.map((pointer, index) => (
                <div key={index} className="p-2 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-700">
                  <div className="text-xs font-mono text-gray-900 dark:text-white">{formatAddress(pointer.dataHash)}</div>
                  <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    Type: {pointer.dataType} | Location: {pointer.storageLocation.slice(0, 20)}...
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 dark:text-gray-400">No data pointers found</p>
          )}
        </div>

        {/* DID Action Buttons */}
        <div className="flex items-center gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isExporting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Exporting...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Export DID</span>
              </>
            )}
          </button>
          {!profileData.isRevoked && (
            <button
              onClick={handleRevoke}
              disabled={isRevoking}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRevoking ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Revoking...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  <span>Revoke DID</span>
                </>
              )}
            </button>
          )}
        </div>

        {/* Chat Data Management Section */}
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Chat Data Management
          </h3>

          <div className="flex items-center gap-3 mb-3">
            <button
              onClick={handleExportChat}
              disabled={isExportingChat}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isExportingChat ? (
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
              onClick={handleDeleteChat}
              disabled={isDeletingChat}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isDeletingChat ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  <span>Delete Chat</span>
                </>
              )}
            </button>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleRotateKey}
              disabled={isRotatingKey}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRotatingKey ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Rotating...</span>
                </>
              ) : (
                <>
                  <Key className="w-4 h-4" />
                  <span>Rotate Key</span>
                </>
              )}
            </button>
          </div>

          <div className="mt-3 space-y-2">
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Export your encrypted chat history for backup, or delete it permanently.
              On-chain references (hashes) remain immutable but point to deleted data.
            </p>
            {lastKeyRotation && (
              <p className="text-xs text-gray-500 dark:text-gray-500">
                Last key rotation: {new Date(lastKeyRotation).toLocaleString()}
              </p>
            )}
          </div>
        </div>

        {/* Delete Chat Confirmation */}
        {showDeleteConfirm && (
          <div className="mt-4 p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-orange-800 dark:text-orange-200 mb-2">
                  Warning: Deleting chat history is permanent
                </p>
                <ul className="text-xs text-orange-700 dark:text-orange-300 space-y-1 mb-3">
                  <li>• Your encrypted chat data will be permanently deleted from our servers</li>
                  <li>• This action cannot be undone</li>
                  <li>• On-chain DID metadata (hashes) will remain but point to deleted data</li>
                  <li>• Export your chat first if you want to keep a backup</li>
                </ul>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleDeleteChat}
                    disabled={isDeletingChat}
                    className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isDeletingChat ? 'Confirming...' : 'Confirm Delete'}
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={isDeletingChat}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Revoke Confirmation */}
        {showRevokeConfirm && (
          <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-red-800 dark:text-red-200 mb-2">
                  Warning: Revoking your DID is permanent
                </p>
                <ul className="text-xs text-red-700 dark:text-red-300 space-y-1 mb-3">
                  <li>• Your DID token will be burned (destroyed)</li>
                  <li>• Your address will be permanently banned from receiving new DIDs</li>
                  <li>• This action cannot be undone</li>
                  <li>• You will lose access to all DID-associated features</li>
                </ul>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleRevoke}
                    disabled={isRevoking}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isRevoking ? 'Confirming...' : 'Confirm Revocation'}
                  </button>
                  <button
                    onClick={() => setShowRevokeConfirm(false)}
                    disabled={isRevoking}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Key Rotation Confirmation */}
        {showRotateConfirm && (
          <div className="mt-4 p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
            <div className="flex items-start gap-3">
              <Key className="w-5 h-5 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-semibold text-purple-800 dark:text-purple-200 mb-2">
                  Rotate your encryption key
                </p>
                <ul className="text-xs text-purple-700 dark:text-purple-300 space-y-1 mb-3">
                  <li>• A new encryption key will be generated</li>
                  <li>• Your chat history will be re-encrypted with the new key</li>
                  <li>• The new key will be stored in your DID contract</li>
                  <li>• This is useful if you suspect your key was compromised</li>
                </ul>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleRotateKey}
                    disabled={isRotatingKey}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isRotatingKey ? 'Rotating...' : 'Confirm Key Rotation'}
                  </button>
                  <button
                    onClick={() => setShowRotateConfirm(false)}
                    disabled={isRotatingKey}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-800 dark:text-gray-200 rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        )}
      </div>
    </div>
  );
}

