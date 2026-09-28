import { AppPalette } from '@/constants/app-colors';
import { useAppTheme, useThemedStyles } from '@/hooks/use-app-theme';
import { Ionicons } from '@expo/vector-icons';
import { useSession } from '@/contexts/session';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';

export default function StaffLoginScreen() {
  const colors = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const { signIn } = useSession();
  const router = useRouter();

  const [staffId, setStaffId] = useState('');
  const [password, setPassword] = useState('');
  const [isModalVisible, setIsModalVisible] = useState(false);

  const handleLogin = () => {
    signIn('staff');
    router.push('/staff/dashboard');
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <View style={styles.content}>
          {/* Logo Badge */}
          <View style={styles.logoBadge}>
            <Text style={styles.logoLetter}>Q</Text>
          </View>

          {/* App Name */}
          <Text style={styles.appName}>QueueEase</Text>

          {/* Badge Tag */}
          <View style={styles.tagBadge}>
            <Text style={styles.tagText}>STAFF PORTAL</Text>
          </View>

          {/* Login Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Welcome Back</Text>
            <Text style={styles.cardSubtitle}>Please sign in to manage queue</Text>

            {/* Staff ID Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Staff ID or Email</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your Staff ID or Email"
                placeholderTextColor={colors.placeholder}
                value={staffId}
                onChangeText={setStaffId}
                autoCapitalize="none"
              />
            </View>

            {/* Password Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <TextInput
                style={styles.input}
                placeholder="••••••••"
                placeholderTextColor={colors.placeholder}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            {/* Login Button */}
            <TouchableOpacity
              style={styles.loginButton}
              onPress={handleLogin}
              activeOpacity={0.8}
            >
              <Text style={styles.loginButtonText}>LOG IN AS STAFF</Text>
            </TouchableOpacity>
          </View>

          {/* Contact Administrator Link */}
          <View style={styles.helpContainer}>
            <Text style={styles.helpText}>Need help? </Text>
            <TouchableOpacity onPress={() => setIsModalVisible(true)}>
              <Text style={styles.helpLink}>Contact Administrator</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>

      {/* POP-UP MODAL: Administrator Contact */}
      <Modal
        visible={isModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setIsModalVisible(false)}>
          <View style={styles.modalOverlay}>
            <TouchableWithoutFeedback>
              <View style={styles.modalContent}>
                <Text style={styles.modalTitle}>Administrator Contact</Text>
                <Text style={styles.modalSubtitle}>
                  If you have trouble logging in or forgot your password, please reach out to system IT:
                </Text>

                <View style={styles.contactCard}>
                  <View style={styles.contactRow}>
                    <Ionicons name="mail-outline" size={20} color={colors.brandText} />
                    <Text style={styles.contactText}>support@queueease.ph</Text>
                  </View>

                  <View style={styles.contactRow}>
                    <Ionicons name="call-outline" size={20} color={colors.brandText} />
                    <Text style={styles.contactText}>Local Ext: 402 (IT Dept)</Text>
                  </View>

                  <View style={styles.contactRow}>
                    <Ionicons name="time-outline" size={20} color={colors.brandText} />
                    <Text style={styles.contactText}>8:00 AM - 5:00 PM</Text>
                  </View>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (colors: AppPalette) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  keyboardView: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  logoBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.infoSurface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  logoLetter: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.brandText,
  },
  appName: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.brandText,
    marginBottom: 10,
  },
  tagBadge: {
    backgroundColor: colors.brand,
    paddingHorizontal: 16,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 24,
  },
  tagText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  card: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.borderSubtle,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.textStrong,
    textAlign: 'center',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 20,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },
  input: {
    backgroundColor: colors.surfaceMuted,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 13,
    color: colors.textStrong,
  },
  loginButton: {
    backgroundColor: colors.brand,
    borderRadius: 10,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 8,
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  helpContainer: {
    flexDirection: 'row',
    marginTop: 24,
  },
  helpText: {
    fontSize: 12,
    color: colors.brandText,
  },
  helpLink: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.brandText,
    textDecorationLine: 'underline',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  modalContent: {
    width: '100%',
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.textStrong,
    marginBottom: 8,
  },
  modalSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 18,
    marginBottom: 20,
  },
  contactCard: {
    backgroundColor: colors.surfaceSubtle,
    borderRadius: 12,
    padding: 16,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 8,
  },
  contactText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginLeft: 12,
  },
});
