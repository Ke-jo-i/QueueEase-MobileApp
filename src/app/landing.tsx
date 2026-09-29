import { AppPalette } from '@/constants/app-colors';
import { useAppTheme, useThemedStyles } from '@/hooks/use-app-theme';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';

export default function LandingScreen() {
  const colors = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();

  const [isStudentHovered, setIsStudentHovered] = useState(false);
  const [isStaffHovered, setIsStaffHovered] = useState(false);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Logo Section sa Taas */}
        <View style={styles.logoContainer}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoText}>Q</Text>
          </View>
          <Text style={styles.appName}>QueueEase</Text>
        </View>

        <Text style={styles.title}>Select Your Portal</Text>
        <Text style={styles.subtitle}>Choose how you want to continue</Text>

        {/* Student Portal Option */}
        <Pressable
          style={({ pressed }) => [
            styles.portalCard,
            isStudentHovered && styles.portalCardHovered,
            pressed && styles.portalCardPressed,
          ]}
          onPress={() => {
            router.push('/login' as any);
          }}
          onHoverIn={() => setIsStudentHovered(true)}
          onHoverOut={() => setIsStudentHovered(false)}
        >
          <View style={styles.iconBox}>
            <Ionicons name="school-outline" size={26} color={colors.brandText} />
          </View>
          <View style={styles.cardTextContainer}>
            <Text style={styles.cardTitle}>Student Portal</Text>
            <Text style={styles.cardSubtitle}>Get queue ticket & track status</Text>
          </View>
        </Pressable>

        {/* Staff Portal Option */}
        <Pressable
          style={({ pressed }) => [
            styles.portalCard,
            isStaffHovered && styles.portalCardHovered,
            pressed && styles.portalCardPressed,
          ]}
          onPress={() => {
            router.push('/staff/login' as any);
          }}
          onHoverIn={() => setIsStaffHovered(true)}
          onHoverOut={() => setIsStaffHovered(false)}
        >
          <View style={styles.iconBox}>
            <Ionicons name="person-outline" size={26} color={colors.brandText} />
          </View>
          <View style={styles.cardTextContainer}>
            <Text style={styles.cardTitle}>Staff Portal</Text>
            <Text style={styles.cardSubtitle}>Manage queue & serve customers</Text>
          </View>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (colors: AppPalette) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    maxWidth: 440,
    width: '100%',
    alignSelf: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  logoBadge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.brand,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  logoText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  appName: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.brandText,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.brandText,
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textMuted,
    textAlign: 'center',
    marginBottom: 32,
  },
  portalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'all 0.2s ease-in-out',
      },
    }),
  },
  portalCardHovered: {
    borderColor: colors.brandText,
    backgroundColor: colors.surfaceSubtle,
    shadowColor: '#003366',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    transform: [{ translateY: -2 }],
  },
  portalCardPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.infoSurface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  cardTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.brandText,
    marginBottom: 2,
    textAlign: 'left',
  },
  cardSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    textAlign: 'left',
  },
});
