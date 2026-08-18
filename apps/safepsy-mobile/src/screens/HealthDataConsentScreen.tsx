import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, Alert } from 'react-native';
import { RootStackParamList } from '../navigation/types';
import { useAuthStore } from '../store/authStore';

type Props = NativeStackScreenProps<RootStackParamList, 'HealthDataConsent'>;

export function HealthDataConsentScreen({ navigation }: Props) {
  const [healthDataConsent, setHealthDataConsent] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const setConsents = useAuthStore((s) => s.setConsents);
  const isVerified = useAuthStore((s) => s.isVerified);

  const handleContinue = async () => {
    if (!healthDataConsent) {
      Alert.alert('Consent Required', 'Please expressly consent to the processing of your health data to continue.');
      return;
    }

    setIsProcessing(true);
    try {
      // Save health data consent
      await setConsents({ healthDataConsent: true });
      
      // Navigate to chat if user is verified, otherwise to wallet
      if (isVerified) {
        navigation.navigate('Chat');
      } else {
        navigation.navigate('Wallet');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to save consent. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Text style={styles.title}>Health Data Consent</Text>
      
      <Text style={styles.section}>Explicit Health Data Consent</Text>
      <Text style={styles.p}>
        SafePsy is an AI reflection assistant designed to help you organize and reflect on your thoughts using AI.
        This consent is required for processing any health-related information you voluntarily provide.
      </Text>
      
      <View style={styles.checkboxContainer}>
        <View style={styles.checkboxRow}>
          <Pressable 
            style={[styles.checkbox, healthDataConsent && styles.checkboxChecked]} 
            onPress={() => setHealthDataConsent(!healthDataConsent)}
          >
            {healthDataConsent && <Text style={styles.checkmark}>✓</Text>}
          </Pressable>
          <Text style={styles.checkboxLabel}>
            I expressly consent to SafePsy processing information concerning my health that I voluntarily provide in my conversations, 
            solely for the purpose of generating AI responses through its AI assistant.
          </Text>
        </View>
      </View>

      <Text style={styles.section}>How Your Data Is Processed</Text>
      <Text style={styles.p}>
        Your conversations are not stored by SafePsy. Your message is encrypted in transit and transmitted to Scaleway Generative APIs for processing.
        SafePsy does not use your conversations to train AI models or retain conversation history.
      </Text>
      
      <Text style={styles.section}>Privacy by Design</Text>
      <Text style={styles.p}>
        SafePsy does not retain your conversation history. Your messages are encrypted during transmission and processed through Scaleway Generative APIs.
        Standard Scaleway Generative API processing uses a Zero Data Retention model and does not use prompts or outputs to train underlying models.
        In exceptional circumstances involving service misuse, unexpected errors, or security vulnerabilities, Scaleway may temporarily store/access relevant HTTP request content for up to two weeks to investigate the problem.
      </Text>

      <Text style={styles.section}>Important Notes</Text>
      <Text style={styles.p}>
        • This consent is required to use the AI assistant features
        • You can withdraw consent at any time through your settings
        • Your data remains encrypted and private
        • SafePsy does not process health data without your explicit consent
      </Text>

      <Pressable 
        style={[styles.primaryBtn, (!healthDataConsent || isProcessing) && styles.btnDisabled]}
        onPress={handleContinue}
        disabled={!healthDataConsent || isProcessing}
      >
        <Text style={styles.primaryBtnText}>
          {isProcessing ? 'Processing...' : 'Continue'}
        </Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { padding: 20, paddingBottom: 48 },
  title: { fontSize: 22, fontWeight: '700', marginBottom: 16 },
  section: { fontSize: 17, fontWeight: '700', marginTop: 18, marginBottom: 8, color: '#111' },
  p: { fontSize: 16, lineHeight: 24, marginBottom: 12, color: '#222' },
  checkboxContainer: { 
    marginTop: 16, 
    marginBottom: 24,
    backgroundColor: '#f9f9f9',
    padding: 16,
    borderRadius: 8
  },
  checkboxRow: { flexDirection: 'row', alignItems: 'flex-start' },
  checkbox: { 
    width: 24, 
    height: 24, 
    borderWidth: 2, 
    borderColor: '#1a5f7a', 
    borderRadius: 4, 
    marginRight: 12, 
    marginTop: 2,
    justifyContent: 'center',
    alignItems: 'center'
  },
  checkboxChecked: { backgroundColor: '#1a5f7a' },
  checkmark: { color: 'white', fontSize: 16, fontWeight: 'bold' },
  checkboxLabel: { 
    flex: 1, 
    fontSize: 16, 
    lineHeight: 24, 
    color: '#222',
    marginTop: 2
  },
  primaryBtn: {
    marginTop: 24,
    backgroundColor: '#1a5f7a',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  btnDisabled: {
    opacity: 0.5
  },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});