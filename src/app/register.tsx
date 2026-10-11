import { AppPalette } from '@/constants/app-colors';
import { useAppTheme, useThemedStyles } from '@/hooks/use-app-theme';
import { supabase } from '@/lib/supabase';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function RegisterScreen() {
  const colors = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();

  const [fullName, setFullName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Validation Errors
  const [errors, setErrors] = useState<{
    fullName?: string;
    studentId?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    general?: string;
  }>({});

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Password Strength Function
  const getPasswordStrength = (pass: string) => {
    if (!pass) return { label: '', color: 'transparent', score: 0 };
    if (pass.length < 6) return { label: 'Weak', color: '#EF4444', score: 1 };

    let score = 0;
    if (pass.length >= 8) score += 1;
    if (/[A-Z]/.test(pass)) score += 1;
    if (/[0-9]/.test(pass)) score += 1;
    if (/[^A-Za-z0-9]/.test(pass)) score += 1;

    if (score <= 1) return { label: 'Weak', color: '#EF4444', score: 1 };
    if (score <= 3) return { label: 'Medium', color: '#F59E0B', score: 2 };
    return { label: 'Strong', color: '#10B981', score: 3 };
  };

  const passwordStrength = getPasswordStrength(password);

  const resetForm = useCallback(() => {
    setFullName('');
    setStudentId('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setErrors({});
    setShowPassword(false);
    setShowConfirmPassword(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      resetForm();
    }, [resetForm])
  );

  const handleStudentIdChange = (text: string) => {
    const numericOnly = text.replace(/[^0-9]/g, '');
    if (numericOnly.length <= 6) {
      setStudentId(numericOnly);
      if (errors.studentId) {
        setErrors((prev) => ({ ...prev, studentId: undefined }));
      }
    }
  };

  const handleRegister = async () => {
    const cleanName = fullName.trim();
    const cleanId = studentId.trim();
    const cleanEmail = email.trim().toLowerCase();

    const newErrors: typeof errors = {};

    if (!cleanName) newErrors.fullName = 'Full Name is required.';
    if (!cleanId) {
      newErrors.studentId = 'Student ID is required.';
    } else if (cleanId.length !== 6) {
      newErrors.studentId = 'Student ID must be exactly 6 digits.';
    }

    if (!cleanEmail) newErrors.email = 'Institutional Email is required.';
    if (!password) {
      newErrors.password = 'Password is required.';
    } else if (password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters.';
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password.';
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setLoading(true);

    try {
      
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: cleanEmail,
        password: password,
        options: {
          data: {
            full_name: cleanName,
            student_id: cleanId,
          },
        },
      });

      if (authError) {
        if (authError.message.includes('User already registered')) {
          setErrors((prev) => ({
            ...prev,
            general: 'Registered na ang email na ito. Lumipat sa Log In screen o gumamit ng ibang test email.',
          }));
          setLoading(false);
          return;
        }

        setErrors((prev) => ({
          ...prev,
          general: authError.message,
        }));
        setLoading(false);
        return;
      }

      if (authData?.user) {
        
        const { error: profileError } = await supabase.from('profiles').upsert(
          {
            id: authData.user.id,
            full_name: cleanName,
            student_id: cleanId,
            email: cleanEmail,
            password: password,
            role: 'student',
          },
          { onConflict: 'id' }
        );

        if (profileError) {
          console.error('Profile Insert Error:', profileError);
          setErrors((prev) => ({
            ...prev,
            general: `Auth successful, but profile saving failed: ${profileError.message}`,
          }));
          setLoading(false);
          return;
        }

        
        setShowSuccessModal(true);
      }
    } catch (err: any) {
      setErrors((prev) => ({
        ...prev,
        general: err.message || 'An unexpected error occurred.',
      }));
    } finally {
      setLoading(false);
    }
  };

  const handleProceedToLogin = () => {
    setShowSuccessModal(false);
    resetForm();
    router.replace('/login' as any);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.innerContainer}>
            <View style={styles.headerContainer}>
              <Text style={styles.title}>Create Account</Text>
              <Text style={styles.subtitle}>
                Sign up to start scheduling campus appointments
              </Text>
            </View>

            {/* General Error Notification Box */}
            {errors.general && (
              <View style={styles.generalErrorBox}>
                <Ionicons name="alert-circle" size={20} color="#EF4444" />
                <Text style={styles.generalErrorText}>{errors.general}</Text>
              </View>
            )}

            <View style={styles.form}>
              {/* Full Name */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Full Name</Text>
                <TextInput
                  style={[
                    styles.input,
                    errors.fullName ? styles.inputError : null,
                  ]}
                  placeholder="e.g. Ayumi Shi"
                  placeholderTextColor={colors.textDisabled}
                  value={fullName}
                  onChangeText={(text) => {
                    setFullName(text);
                    if (errors.fullName)
                      setErrors((prev) => ({ ...prev, fullName: undefined }));
                  }}
                  autoComplete="off"
                  importantForAutofill="no"
                  {...({ autoComplete: 'off' } as any)}
                />
                {errors.fullName && (
                  <Text style={styles.errorText}>{errors.fullName}</Text>
                )}
              </View>

              {/* Student ID */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Student ID (6 Digits)</Text>
                <TextInput
                  style={[
                    styles.input,
                    errors.studentId ? styles.inputError : null,
                  ]}
                  placeholder="e.g. 147611"
                  placeholderTextColor={colors.textDisabled}
                  value={studentId}
                  onChangeText={handleStudentIdChange}
                  keyboardType="number-pad"
                  maxLength={6}
                  autoComplete="off"
                  importantForAutofill="no"
                  {...({ autoComplete: 'off' } as any)}
                />
                {errors.studentId && (
                  <Text style={styles.errorText}>{errors.studentId}</Text>
                )}
              </View>

              {/* Email */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Institutional Email</Text>
                <TextInput
                  style={[
                    styles.input,
                    errors.email ? styles.inputError : null,
                  ]}
                  placeholder="student@school.edu.ph"
                  placeholderTextColor={colors.textDisabled}
                  value={email}
                  onChangeText={(text) => {
                    setEmail(text);
                    if (errors.email)
                      setErrors((prev) => ({ ...prev, email: undefined }));
                  }}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="off"
                  importantForAutofill="no"
                  textContentType="none"
                  {...({ autoComplete: 'new-password' } as any)}
                />
                {errors.email && (
                  <Text style={styles.errorText}>{errors.email}</Text>
                )}
              </View>

              {/* Password */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Password</Text>
                <View
                  style={[
                    styles.passwordContainer,
                    errors.password ? styles.inputError : null,
                  ]}
                >
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Enter password"
                    placeholderTextColor={colors.textDisabled}
                    secureTextEntry={!showPassword}
                    value={password}
                    onChangeText={(text) => {
                      setPassword(text);
                      if (errors.password)
                        setErrors((prev) => ({ ...prev, password: undefined }));
                      if (confirmPassword && text !== confirmPassword) {
                        setErrors((prev) => ({
                          ...prev,
                          confirmPassword: 'Passwords do not match.',
                        }));
                      } else if (confirmPassword && text === confirmPassword) {
                        setErrors((prev) => ({
                          ...prev,
                          confirmPassword: undefined,
                        }));
                      }
                    }}
                    autoComplete="off"
                    importantForAutofill="no"
                    textContentType="newPassword"
                    {...({ autoComplete: 'new-password' } as any)}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeIcon}
                  >
                    <Ionicons
                      name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                      size={20}
                      color={colors.textDisabled}
                    />
                  </TouchableOpacity>
                </View>

                {password.length > 0 && (
                  <View style={styles.strengthContainer}>
                    <View style={styles.strengthBarBackground}>
                      <View
                        style={[
                          styles.strengthBarFill,
                          {
                            width: `${(passwordStrength.score / 3) * 100}%`,
                            backgroundColor: passwordStrength.color,
                          },
                        ]}
                      />
                    </View>
                    <Text
                      style={[
                        styles.strengthText,
                        { color: passwordStrength.color },
                      ]}
                    >
                      {passwordStrength.label}
                    </Text>
                  </View>
                )}

                {errors.password && (
                  <Text style={styles.errorText}>{errors.password}</Text>
                )}
              </View>

              {/* Confirm Password */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Confirm Password</Text>
                <View
                  style={[
                    styles.passwordContainer,
                    errors.confirmPassword ? styles.inputError : null,
                  ]}
                >
                  <TextInput
                    style={styles.passwordInput}
                    placeholder="Re-enter password"
                    placeholderTextColor={colors.textDisabled}
                    secureTextEntry={!showConfirmPassword}
                    value={confirmPassword}
                    onChangeText={(text) => {
                      setConfirmPassword(text);
                      if (password && text !== password) {
                        setErrors((prev) => ({
                          ...prev,
                          confirmPassword: 'Passwords do not match.',
                        }));
                      } else {
                        setErrors((prev) => ({
                          ...prev,
                          confirmPassword: undefined,
                        }));
                      }
                    }}
                    autoComplete="off"
                    importantForAutofill="no"
                    textContentType="newPassword"
                    {...({ autoComplete: 'new-password' } as any)}
                  />
                  <TouchableOpacity
                    onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={styles.eyeIcon}
                  >
                    <Ionicons
                      name={
                        showConfirmPassword ? 'eye-outline' : 'eye-off-outline'
                      }
                      size={20}
                      color={colors.textDisabled}
                    />
                  </TouchableOpacity>
                </View>
                {errors.confirmPassword && (
                  <Text style={styles.errorText}>{errors.confirmPassword}</Text>
                )}
              </View>

              {/* Sign Up Button */}
              <TouchableOpacity
                style={[styles.signUpBtn, loading && { opacity: 0.7 }]}
                onPress={handleRegister}
                disabled={loading}
                activeOpacity={0.8}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.signUpBtnText}>Sign Up</Text>
                )}
              </TouchableOpacity>

              <View style={styles.loginRow}>
                <Text style={styles.alreadyText}>Already have an account? </Text>
                <TouchableOpacity onPress={() => router.push('/login' as any)}>
                  <Text style={styles.loginText}>Log In</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Success Modal */}
      <Modal
        visible={showSuccessModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSuccessModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.successIconBox}>
              <Ionicons name="checkmark" size={36} color="#FFFFFF" />
            </View>
            <Text style={styles.modalTitle}>Account Created!</Text>
            <Text style={styles.modalSubtext}>
              Your account has been registered successfully. You can now log in to manage your appointments.
            </Text>
            <TouchableOpacity
              style={styles.proceedBtn}
              onPress={handleProceedToLogin}
            >
              <Text style={styles.proceedBtnText}>Proceed to Log In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (colors: AppPalette) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.surface,
    },
    scrollContent: {
      flexGrow: 1,
      justifyContent: 'center',
      paddingHorizontal: 28,
      paddingVertical: 30,
    },
    innerContainer: {
      width: '100%',
      maxWidth: 400,
      alignSelf: 'center',
    },
    headerContainer: {
      alignItems: 'center',
      marginBottom: 24,
    },
    title: {
      fontSize: 26,
      fontWeight: '800',
      color: colors.brandText,
      marginBottom: 6,
    },
    subtitle: {
      fontSize: 13,
      color: colors.textMuted,
      textAlign: 'center',
    },
    generalErrorBox: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: 'rgba(239, 68, 68, 0.15)',
      borderColor: '#EF4444',
      borderWidth: 1,
      padding: 12,
      borderRadius: 10,
      marginBottom: 16,
      gap: 8,
    },
    generalErrorText: {
      color: '#EF4444',
      fontSize: 13,
      flex: 1,
      fontWeight: '500',
    },
    form: {
      width: '100%',
    },
    inputGroup: {
      marginBottom: 16,
    },
    label: {
      fontSize: 13,
      color: colors.textSecondary,
      marginBottom: 6,
      fontWeight: '500',
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 14,
      color: colors.text,
      backgroundColor: colors.surface,
    },
    passwordContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 10,
      backgroundColor: colors.surface,
    },
    passwordInput: {
      flex: 1,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontSize: 14,
      color: colors.text,
    },
    eyeIcon: {
      paddingHorizontal: 12,
    },
    strengthContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 6,
      gap: 8,
    },
    strengthBarBackground: {
      flex: 1,
      height: 4,
      backgroundColor: 'rgba(255, 255, 255, 0.1)',
      borderRadius: 2,
      overflow: 'hidden',
    },
    strengthBarFill: {
      height: '100%',
      borderRadius: 2,
    },
    strengthText: {
      fontSize: 11,
      fontWeight: '700',
      minWidth: 50,
      textAlign: 'right',
    },
    inputError: {
      borderColor: '#EF4444',
      borderWidth: 1.5,
    },
    errorText: {
      color: '#EF4444',
      fontSize: 12,
      marginTop: 4,
      fontWeight: '500',
    },
    signUpBtn: {
      backgroundColor: colors.brand,
      borderRadius: 10,
      paddingVertical: 14,
      alignItems: 'center',
      marginTop: 10,
      marginBottom: 20,
    },
    signUpBtnText: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '700',
    },
    loginRow: {
      flexDirection: 'row',
      justifyContent: 'center',
    },
    alreadyText: {
      fontSize: 13,
      color: colors.textMuted,
    },
    loginText: {
      fontSize: 13,
      color: colors.brandText,
      fontWeight: '700',
      textDecorationLine: 'underline',
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: 'rgba(0, 0, 0, 0.75)',
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 24,
    },
    modalContent: {
      width: '100%',
      maxWidth: 360,
      backgroundColor: '#0F172A',
      borderRadius: 16,
      padding: 24,
      alignItems: 'center',
      borderWidth: 1,
      borderColor: '#1E293B',
    },
    successIconBox: {
      width: 64,
      height: 64,
      borderRadius: 32,
      backgroundColor: '#10B981',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 16,
    },
    modalTitle: {
      fontSize: 22,
      fontWeight: '800',
      color: '#FFFFFF',
      marginBottom: 8,
    },
    modalSubtext: {
      fontSize: 13,
      color: '#94A3B8',
      textAlign: 'center',
      lineHeight: 18,
      marginBottom: 24,
    },
    proceedBtn: {
      width: '100%',
      backgroundColor: '#0284C7',
      borderRadius: 10,
      paddingVertical: 14,
      alignItems: 'center',
    },
    proceedBtnText: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '700',
    },
  });