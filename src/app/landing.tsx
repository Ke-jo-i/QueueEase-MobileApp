import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Platform, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';

export default function LandingScreen() {
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
            <Ionicons name="school-outline" size={26} color="#003366" />
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
            <Ionicons name="person-outline" size={26} color="#003366" />
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
    backgroundColor: '#003366',
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
    color: '#003366',
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: '#003366',
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 32,
  },
  portalCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
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
    borderColor: '#003366',
    backgroundColor: '#F8FAFC',
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
    backgroundColor: '#E0F2FE',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  cardTextContainer: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#003366',
    marginBottom: 2,
  },
  cardSubtitle: {
    fontSize: 12,
    color: '#64748B',
  },
});