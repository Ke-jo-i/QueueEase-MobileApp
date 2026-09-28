import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function ForgotPasswordScreen() {
  const router = useRouter();

  // Step state: 1 = Email Input, 2 = Check Email Success, 3 = Create New Password
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Form states
  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleSendResetLink = () => {
    setStep(2); // Lumipat sa "Check Your Email" screen
  };

  const handleBackToLogin = () => {
    router.replace('/login');
  };

  const handleResetPassword = () => {
    router.replace('/login');
  };

  const handleGoBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/login');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          {/* STEP 1: Enter Email (Reset Password) */}
          {step === 1 && (
            <>
              {/* Back Arrow Button */}
              <TouchableOpacity
                style={styles.backButton}
                onPress={handleGoBack}
                activeOpacity={0.7}
              >
                <Ionicons name="chevron-back" size={24} color="#003366" />
              </TouchableOpacity>

              <Text style={styles.title}>Reset Password</Text>
              <Text style={styles.subtitle}>
                Enter your registered Email address. We will send you instructions to reset your password.
              </Text>

              <View style={styles.inputGroup}>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your Email"
                  placeholderTextColor="#94A3B8"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>

              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleSendResetLink}
                activeOpacity={0.8}
              >
                <Text style={styles.primaryButtonText}>SEND RESET LINK</Text>
              </TouchableOpacity>
            </>
          )}

          {/* STEP 2: Password Reset Sent (Check Your Email) */}
          {step === 2 && (
            <View style={styles.centeredStep}>
              {/* Email Icon Box */}
              <View style={styles.iconContainer}>
                <Ionicons name="mail-outline" size={32} color="#003366" />
              </View>

              <Text style={styles.titleCenter}>Check Your Email</Text>
              <Text style={styles.subtitleCenter}>
                We have sent a password reset link to your registered email address
              </Text>

              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => setStep(3)} // Pwede ring handleBackToLogin
                activeOpacity={0.8}
              >
                <Text style={styles.primaryButtonText}>BACK TO LOGIN</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* STEP 3: Create New Password */}
          {step === 3 && (
            <>
              <Text style={styles.title}>Create New Password</Text>
              <Text style={styles.subtitle}>
                Your new password must be different from previously used passwords.
              </Text>

              {/* New Password Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>New Password</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter new password"
                  placeholderTextColor="#94A3B8"
                  value={newPassword}
                  onChangeText={setNewPassword}
                  secureTextEntry
                />
              </View>

              {/* Confirm Password Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Confirm Password</Text>
                <View style={styles.passwordWrapper}>
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Re-enter new password"
                    placeholderTextColor="#94A3B8"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirmPassword}
                  />
                  <TouchableOpacity
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={styles.eyeIcon}
                  >
                    <Ionicons
                      name={showConfirmPassword ? 'eye-outline' : 'eye-off-outline'}
                      size={20}
                      color="#94A3B8"
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleResetPassword}
                activeOpacity={0.8}
              >
                <Text style={styles.primaryButtonText}>RESET PASSWORD</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 40,
    justifyContent: 'center',
  },
  backButton: {
    position: 'absolute',
    top: 20,
    left: 20,
    padding: 8,
    zIndex: 10,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#003366', // Exact dark blue base
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: 32,
  },

  // Centered step styles (Check Email)
  centeredStep: {
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  iconContainer: {
    width: 68,
    height: 68,
    backgroundColor: '#E0F2FE',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  titleCenter: {
    fontSize: 24,
    fontWeight: '800',
    color: '#003366',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitleCenter: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 19,
    textAlign: 'center',
    marginBottom: 32,
  },

  // Form inputs
  inputGroup: {
    marginBottom: 20,
    width: '100%',
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14,
    color: '#0F172A',
  },
  passwordWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 14,
    color: '#0F172A',
  },
  eyeIcon: {
    paddingHorizontal: 14,
  },

  // Primary Button Fixed Color (#003366)
  primaryButton: {
    width: '100%',
    backgroundColor: '#003366', // Dark Solid Blue
    borderRadius: 10,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 10,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
    letterSpacing: 0.8,
  },
});