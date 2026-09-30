import { AppPalette } from '@/constants/app-colors';
import { useThemedStyles } from '@/hooks/use-app-theme';
import { Redirect, useRouter } from 'expo-router';
import { useSession } from '@/contexts/session';
import { useEffect, useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
// In-update ang import ng SafeAreaView papuntang react-native-safe-area-context
import { SafeAreaView } from 'react-native-safe-area-context';

export default function EntryScreen() {
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const { signedOutRole } = useSession();
  const [isLoading, setIsLoading] = useState(true);
  const [progressAnim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const animation = Animated.timing(progressAnim, {
      toValue: 1,
      duration: 2500,
      useNativeDriver: false,
    });
    animation.start(({ finished }) => {
      if (finished) setIsLoading(false);
    });
    return () => animation.stop();
  }, [progressAnim]);

  if (signedOutRole) {
    return <Redirect href="/landing" />;
  }

  // 1. SPLASH LOADING SCREEN
  if (isLoading) {
    const progressWidth = progressAnim.interpolate({
      inputRange: [0, 1],
      outputRange: ['0%', '100%'],
    });

    return (
      <SafeAreaView style={styles.splashContainer}>
        <View style={styles.splashContent}>
          <View style={styles.logoBadgeDark}>
            <Text style={styles.logoTextLight}>Q</Text>
          </View>
          <Text style={styles.appNameDark}>QueueEase</Text>
          <Text style={styles.appSubtitle}>Mobile Queue Management System</Text>
        </View>

        <View style={styles.loadingBarContainer}>
          <View style={styles.loadingBarTrack}>
            <Animated.View style={[styles.loadingBarFill, { width: progressWidth }]} />
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // 2. WELCOME SCREEN
  return (
    <SafeAreaView style={styles.welcomeContainer}>
      <View style={styles.welcomeContent}>
        <View style={styles.logoBadgeLight}>
          <Text style={styles.logoTextDark}>Q</Text>
        </View>

        <Text style={styles.welcomeTitle}>Welcome to{"\n"}QueueEase</Text>
        <Text style={styles.welcomeSubtitle}>Manage your queue with ease</Text>

        <TouchableOpacity
          style={styles.getStartedBtn}
          onPress={() => router.push('/landing')}
          activeOpacity={0.8}
        >
          <Text style={styles.getStartedText}>Get Started</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors: AppPalette) => StyleSheet.create({
  splashContainer: {
    flex: 1,
    backgroundColor: colors.surface,
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 60,
  },
  splashContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoBadgeDark: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.brand,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  logoTextLight: {
    fontSize: 30,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  appNameDark: {
    fontSize: 26,
    fontWeight: '800',
    color: colors.brandText,
    marginBottom: 6,
  },
  appSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
  },
  loadingBarContainer: {
    width: '60%',
    alignItems: 'center',
  },
  loadingBarTrack: {
    width: '100%',
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 2,
    overflow: 'hidden',
  },
  loadingBarFill: {
    height: '100%',
    backgroundColor: colors.brand,
  },
  welcomeContainer: {
    flex: 1,
    backgroundColor: colors.brand,
  },
  welcomeContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  logoBadgeLight: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  logoTextDark: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.brandText,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 36,
    marginBottom: 8,
  },
  welcomeSubtitle: {
    fontSize: 14,
    color: '#FFFFFF',
    opacity: 0.85,
    textAlign: 'center',
    marginBottom: 60,
  },
  getStartedBtn: {
    width: '100%',
    backgroundColor: colors.neutralFill,
    borderRadius: 25,
    paddingVertical: 16,
    alignItems: 'center',
  },
  getStartedText: {
    color: colors.brandText,
    fontSize: 15,
    fontWeight: '800',
  },
});
