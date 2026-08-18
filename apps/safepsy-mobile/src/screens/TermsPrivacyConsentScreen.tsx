import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, Alert } from 'react-native';
import { RootStackParamList } from '../navigation/types';
import { useAuthStore } from '../store/authStore';

type Props = NativeStackScreenProps<RootStackParamList, 'TermsPrivacyConsent'>;

const TERMS_URL = 'https://polinapsycho.com/terms-of-service';
const PRIVACY_URL = 'https://polinapsycho.com/security-and-privacy-policy';

export function TermsPrivacyConsentScreen({ navigation }: Props) {
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const setConsents = useAuthStore((s) => s.setConsents);

  const handleContinue = async () => {
    if (!termsAccepted) {
      Alert.alert('Consent Required', 'Please accept the Terms of Service and Privacy Policy to continue.');
      return;
    }

    setIsProcessing(true);
    try {
      // Save terms consent
      await setConsents({ termsAccepted: true });
      navigation.navigate('HealthDataConsent');
    } catch (error) {
      Alert.alert('Error', 'Failed to save consent. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.scroll}>
      <Text style={styles.title}>Terms & Privacy Acceptance</Text>
      
      <Text style={styles.section}>Terms of Service and Privacy Policy</Text>
      <Text style={styles.p}>
        By accepting these terms, you acknowledge that you have read and agree to SafePsy's Terms of Service and Privacy Policy.
      </Text>
      
      <Text style={styles.section}>What This Covers</Text>
      <Text style={styles.p}>
        This consent covers the general operation of the DApp, including:
      </Text>
      <Text style={styles.bullet}>• How the application functions</Text>
      <Text style={styles.bullet}>• Your rights and responsibilities as a user</Text>
      <Text style={styles.bullet}>• How your data is collected and processed</Text>
      <Text style={styles.bullet}>• Our commitment to privacy and security</Text>

      <View style={styles.checkboxContainer}>
        <View style={styles.checkboxRow}>
          <Pressable 
            style={[styles.checkbox, termsAccepted && styles.checkboxChecked]} 
            onPress={() => setTermsAccepted(!termsAccepted)}
          >
            {termsAccepted && <Text style={styles.checkmark}>✓</Text>}
          </Pressable>
          <Text style={styles.checkboxLabel}>
            I have read and accept the Terms of Service and Privacy Policy.
          </Text>
        </View>
      </View>

      <Text style={styles.section}>Learn More</Text>
      <Text style={styles.p}>
        For full details, please review our complete Terms of Service and Privacy Policy:
      </Text>
      
      <View style={styles.linksContainer}>
        <Pressable onPress={() => console.log('Open Terms')}>
          <Text style={styles.link}>Terms of Service</Text>
        </Pressable>
        <Pressable onPress={() => console.log('Open Privacy')}>
          <Text style={styles.link}>Privacy Policy</Text>
        </Pressable>
      </View>

      <Pressable 
        style={[styles.primaryBtn, (!termsAccepted || isProcessing) && styles.btnDisabled]}
        onPress={handleContinue}
        disabled={!termsAccepted || isProcessing}
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
  bullet: { fontSize: 16, lineHeight: 24, marginBottom: 6, color: '#222', paddingLeft: 10 },
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
  linksContainer: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginBottom: 24 
  },
  link: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a5f7a',
    textDecorationLine: 'underline'
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