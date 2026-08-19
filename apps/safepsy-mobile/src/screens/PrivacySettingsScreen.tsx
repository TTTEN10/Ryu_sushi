import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { apiClient } from '../services/api';
import { useAuthStore } from '../store/authStore';
import { RootStackParamList } from '../navigation/types';

type Props = NativeStackScreenProps<RootStackParamList, 'PrivacySettings'>;

export function PrivacySettingsScreen({ navigation }: Props) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const clearSession = useAuthStore((s) => s.clearSession);

  /**
   * Delete account — GDPR Art. 17 (Right to Erasure)
   */
  const handleDeleteAccount = async () => {
    Alert.alert(
      'Delete Account',
      'This is irreversible. All your data will be permanently removed:\n' +
        '- Chat history and encryption keys\n' +
        '- Subscription and billing records\n' +
        '- Crisis Safety Net opt-in data\n' +
        '- RAG audit logs\n\n' +
        'On-chain DID metadata cannot be removed from the blockchain.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'DELETE',
          style: 'destructive',
          onPress: async () => {
            try {
              setIsDeleting(true);

              const response = await apiClient.delete('/account', {
                data: { confirm: 'DELETE_MY_ACCOUNT' },
              });

              if (response.data?.success) {
                Alert.alert(
                  'Account Deleted',
                  'Your account and all associated data have been permanently deleted.',
                  [
                    {
                      text: 'OK',
                      onPress: async () => {
                        await clearSession();
                        navigation.replace('Home');
                      },
                    },
                  ],
                );
              } else {
                Alert.alert(
                  'Delete Failed',
                  response.data?.message || 'Unknown error occurred.',
                );
              }
            } catch (error: any) {
              const message =
                error?.response?.data?.message ||
                error?.message ||
                'Failed to delete account';
              Alert.alert('Error', message);
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ],
    );
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Privacy Settings</Text>
      <Text style={styles.subtitle}>
        Manage your data under GDPR — Right to Access, Portability, and Erasure.
      </Text>

      {/* Data Export */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Data</Text>
        <Text style={styles.description}>
          Download a copy of your encrypted chat history and associated metadata.
        </Text>
        <Pressable
          style={[styles.primaryBtn, isExporting && styles.btnDisabled]}
          onPress={async () => {
            if (isDeleting) return;
            Alert.alert(
              'Export Data',
              'Your chat data will be downloaded as an encrypted JSON file. This may take a moment.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Export',
                  onPress: () => {
                    setIsExporting(true);
                    navigation.navigate('Chat');
                  },
                },
              ],
            );
          }}
          disabled={isExporting || isDeleting}
        >
          <Text style={styles.primaryBtnText}>Export My Data</Text>
        </Pressable>
      </View>

      {/* Privacy Rights */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Your Rights</Text>
        <Text style={styles.bullet}>
          <Text style={styles.bold}>Access:</Text> Request a copy of your data
        </Text>
        <Text style={styles.bullet}>
          <Text style={styles.bold}>Portability:</Text> Download your data in JSON
        </Text>
        <Text style={styles.bullet}>
          <Text style={styles.bold}>Erasure:</Text> Permanently delete your account and all data
        </Text>
        <Text style={styles.bullet}>
          <Text style={styles.bold}>Contact:</Text> privacy@polinapsycho.com
        </Text>
      </View>

      {/* Danger Zone */}
      <View style={styles.dangerSection}>
        <Text style={styles.dangerTitle}>Destructive Actions</Text>
        <Text style={styles.dangerDescription}>
          These actions are irreversible. Please proceed with caution.
        </Text>
        <Pressable
          style={[styles.destructiveBtn, isDeleting && styles.btnDisabled]}
          onPress={handleDeleteAccount}
          disabled={isDeleting || isExporting}
        >
          <Text style={styles.destructiveBtnText}>
            {isDeleting ? 'Deleting...' : 'Delete My Account'}
          </Text>
        </Pressable>
        <Text style={styles.dangerNote}>
          On-chain DID metadata (hashes) remain immutable on the blockchain but no longer point to retrievable data after deletion.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    marginTop: 16,
    marginBottom: 4,
    paddingHorizontal: 20,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22,
    color: '#555',
    marginBottom: 24,
    paddingHorizontal: 20,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 8,
    color: '#111',
  },
  description: {
    fontSize: 15,
    lineHeight: 22,
    color: '#444',
    marginBottom: 12,
  },
  bullet: {
    fontSize: 15,
    lineHeight: 24,
    color: '#333',
    marginBottom: 6,
  },
  bold: {
    fontWeight: '600',
  },
  primaryBtn: {
    backgroundColor: '#1a5f7a',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnDisabled: {
    opacity: 0.5,
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  dangerSection: {
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    marginHorizontal: 20,
    marginBottom: 40,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  dangerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#dc2626',
    marginBottom: 4,
  },
  dangerDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: '#7f1d1d',
    marginBottom: 16,
  },
  destructiveBtn: {
    backgroundColor: '#dc2626',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  destructiveBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  dangerNote: {
    fontSize: 12,
    lineHeight: 18,
    color: '#991b1b',
    marginTop: 10,
  },
});