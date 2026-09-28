import { AppPalette } from '@/constants/app-colors';
import { useAppTheme, useThemedStyles } from '@/hooks/use-app-theme';
import { Ionicons } from '@expo/vector-icons';
import { useSession } from '@/contexts/session';
import { DarkModeToggle } from '@/components/dark-mode-toggle';
import { useState } from 'react';
import {
  Modal,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

export default function StudentProfileScreen() {
  const colors = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const { signOut } = useSession();

  // Hover states
  const [hoveredButton, setHoveredButton] = useState<string | null>(null);

  // Modal states
  const [activeModal, setActiveModal] = useState<'personal' | 'help' | null>(null);

  const handleLogout = () => {
    signOut();
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Page Title */}
        <Text style={styles.pageTitle}>Student Profile</Text>

        {/* Profile Card Horizontal Layout */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>JD</Text>
          </View>
          <View style={styles.profileDetails}>
            <Text style={styles.userName}>Juan Dela Cruz</Text>
            <Text style={styles.userSubtext}>BS Information Technology • Year 3</Text>
            <Text style={styles.studentId}>ID: 2021-00123 (Tagum Campus)</Text>
          </View>
        </View>

        {/* Menu Buttons Group */}
        <View style={styles.menuGroup}>
          <DarkModeToggle />
          {/* Personal Information Button */}
          <Pressable
            style={({ pressed }) => [
              styles.menuBtn,
              hoveredButton === 'personal' && styles.menuBtnHovered,
              pressed && styles.menuBtnPressed,
            ]}
            onPress={() => setActiveModal('personal')}
            onHoverIn={() => setHoveredButton('personal')}
            onHoverOut={() => setHoveredButton(null)}
          >
            <Text
              style={[
                styles.menuBtnText,
                hoveredButton === 'personal' && styles.menuBtnTextHovered,
              ]}
            >
              Personal Information
            </Text>
          </Pressable>

          {/* Help & Support Button */}
          <Pressable
            style={({ pressed }) => [
              styles.menuBtn,
              hoveredButton === 'help' && styles.menuBtnHovered,
              pressed && styles.menuBtnPressed,
            ]}
            onPress={() => setActiveModal('help')}
            onHoverIn={() => setHoveredButton('help')}
            onHoverOut={() => setHoveredButton(null)}
          >
            <Text
              style={[
                styles.menuBtnText,
                hoveredButton === 'help' && styles.menuBtnTextHovered,
              ]}
            >
              Help & Support
            </Text>
          </Pressable>

          {/* Log Out Button */}
          <Pressable
            style={({ pressed }) => [
              styles.logoutBtn,
              hoveredButton === 'logout' && styles.logoutBtnHovered,
              pressed && styles.logoutBtnPressed,
            ]}
            onPress={handleLogout}
            onHoverIn={() => setHoveredButton('logout')}
            onHoverOut={() => setHoveredButton(null)}
          >
            <Text style={styles.logoutBtnText}>Log Out</Text>
          </Pressable>
        </View>
      </ScrollView>

      {/* --- MODAL 1: Personal Information --- */}
      <Modal visible={activeModal === 'personal'} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Personal Information</Text>
              <TouchableOpacity onPress={() => setActiveModal(null)}>
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Full Name</Text>
                <Text style={styles.infoValue}>Juan Dela Cruz</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Student ID</Text>
                <Text style={styles.infoValue}>2021-00123</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Email</Text>
                <Text style={styles.infoValue}>j.delacruz@university.edu.ph</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Campus</Text>
                <Text style={styles.infoValue}>Tagum Campus</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Course & Year</Text>
                <Text style={styles.infoValue}>BSIT - 3rd Year</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setActiveModal(null)}>
              <Text style={styles.modalCloseBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* --- MODAL 2: Help & Support --- */}
      <Modal visible={activeModal === 'help'} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Help & Support</Text>
              <TouchableOpacity onPress={() => setActiveModal(null)}>
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={styles.helpText}>
                Need assistance with your queue ticket or account? Contact the campus administrator:
              </Text>

              <View style={styles.supportBox}>
                <Ionicons name="mail-outline" size={18} color={colors.brandText} />
                <Text style={styles.supportText}>support@university.edu.ph</Text>
              </View>

              <View style={styles.supportBox}>
                <Ionicons name="call-outline" size={18} color={colors.brandText} />
                <Text style={styles.supportText}>+63 (084) 123-4567</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setActiveModal(null)}>
              <Text style={styles.modalCloseBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (colors: AppPalette) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surface,
  },
  scrollContent: {
    padding: 24,
    maxWidth: 440,
    width: '100%',
    alignSelf: 'center',
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.brandText,
    marginBottom: 20,
  },

  /* Header Card */
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.blueMuted,
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: colors.info,
    marginBottom: 20,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.brand,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  profileDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.textStrong,
    marginBottom: 2,
  },
  userSubtext: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 2,
  },
  studentId: {
    fontSize: 11,
    color: colors.brandText,
    fontWeight: '700',
  },

  /* Buttons */
  menuGroup: {
    gap: 12,
  },
  menuBtn: {
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: colors.border,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      },
    }),
  },
  menuBtnHovered: {
    borderColor: colors.brandText,
    backgroundColor: colors.surfaceSubtle,
    transform: [{ translateY: -1 }],
  },
  menuBtnPressed: {
    opacity: 0.9,
  },
  menuBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.textStrong,
  },
  menuBtnTextHovered: {
    color: colors.brandText,
  },

  /* Logout Button */
  logoutBtn: {
    backgroundColor: colors.dangerPale,
    borderRadius: 14,
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: colors.dangerBorderSubtle,
    marginTop: 4,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      },
    }),
  },
  logoutBtnHovered: {
    backgroundColor: colors.dangerSurface,
    borderColor: colors.danger,
  },
  logoutBtnPressed: {
    opacity: 0.9,
  },
  logoutBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.danger,
  },

  /* Modal Styling */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 380,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.brandText,
  },
  modalBody: {
    marginBottom: 20,
  },
  infoRow: {
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceMuted,
  },
  infoLabel: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 14,
    color: colors.textStrong,
    fontWeight: '700',
  },
  helpText: {
    fontSize: 13,
    color: colors.textMuted,
    marginBottom: 16,
    lineHeight: 18,
  },
  supportBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceSubtle,
    padding: 12,
    borderRadius: 10,
    marginBottom: 8,
    gap: 10,
  },
  supportText: {
    fontSize: 13,
    color: colors.textStrong,
    fontWeight: '600',
  },
  modalCloseBtn: {
    backgroundColor: colors.brand,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
  },
  modalCloseBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
});
