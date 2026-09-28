import { AppPalette } from '@/constants/app-colors';
import { useAppTheme, useThemedStyles } from '@/hooks/use-app-theme';
import { Ionicons } from '@expo/vector-icons';
import { useSession } from '@/contexts/session';
import { DarkModeToggle } from '@/components/dark-mode-toggle';
import { useQueue } from '@/contexts/queue';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

export default function ProfileScreen() {
  const colors = useAppTheme();
  const styles = useThemedStyles(createStyles);
  const router = useRouter();
  const { signOut } = useSession();

  // 1. Window Assignment State
  const [isWindowModalVisible, setIsWindowModalVisible] = useState(false);
  const { assignedWindow, setAssignedWindow } = useQueue();

  // 2. Change Password Modal State
  const [isChangePasswordVisible, setIsChangePasswordVisible] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // 3. System Notifications Toggle
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  // Registrar Windows List
  const registrarWindows = [
    'Window 1 - Registrar',
    'Window 2 - Registrar',
    'Window 3 - Registrar',
    'Window 4 - Registrar',
  ];

  // Handle Password Update
  const handleChangePassword = () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all password fields.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match.');
      return;
    }

    Alert.alert('Success', 'Your password has been updated successfully!');
    setIsChangePasswordVisible(false);
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleLogout = () => {
    signOut();
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <Text style={styles.pageTitle}>Profile & Settings</Text>

        {/* User Info Header */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>ST</Text>
          </View>
          <View style={styles.profileTextContainer}>
            <Text style={styles.userName}>Juan Dela Cruz</Text>
            <Text style={styles.userRole}>{assignedWindow}</Text>
          </View>
        </View>

        {/* Settings List */}
        <View style={styles.settingsGroup}>
          <DarkModeToggle />
          
          {/* 1. WINDOW ASSIGNMENT */}
          <TouchableOpacity
            style={styles.settingItem}
            activeOpacity={0.6}
            onPress={() => setIsWindowModalVisible(true)}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.settingTitle}>Window Assignment</Text>
              <Text style={styles.settingSub}>{assignedWindow}</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textDisabled} />
          </TouchableOpacity>

          {/* 2. CHANGE PASSWORD */}
          <TouchableOpacity
            style={styles.settingItem}
            activeOpacity={0.6}
            onPress={() => setIsChangePasswordVisible(true)}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.settingTitle}>Change Password</Text>
              <Text style={styles.settingSub}>Update account credentials</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color={colors.textDisabled} />
          </TouchableOpacity>

          {/* 3. SYSTEM NOTIFICATIONS */}
          <View style={styles.settingItem}>
            <View style={{ flex: 1 }}>
              <Text style={styles.settingTitle}>System Notifications</Text>
              <Text style={styles.settingSub}>Queue alerts & sounds</Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: colors.borderStrong, true: colors.blueLight }}
              thumbColor={notificationsEnabled ? colors.brandText : colors.surfaceMuted}
            />
          </View>
        </View>

        {/* LOG OUT BUTTON */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Standardized Bottom Navigation Bar */}
      <View style={styles.navBar}>
        <TouchableOpacity 
          style={styles.navItem} 
          onPress={() => router.replace('/staff/dashboard')}
        >
          <Ionicons name="list-outline" size={22} color={colors.textDisabled} />
          <Text style={styles.navLabel}>Queue</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.navItem} 
          onPress={() => router.replace('/staff/history')}
        >
          <Ionicons name="time-outline" size={22} color={colors.textDisabled} />
          <Text style={styles.navLabel}>History</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem}>
          <Ionicons name="person" size={22} color={colors.brandText} />
          <Text style={[styles.navLabel, styles.navLabelActive]}>Profile</Text>
        </TouchableOpacity>
      </View>

      {/* WINDOW ASSIGNMENT SELECTION MODAL */}
      <Modal
        visible={isWindowModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setIsWindowModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Select Registrar Window</Text>
            <Text style={styles.modalSub}>Choose your current active window</Text>

            {registrarWindows.map((win, index) => {
              const isSelected = assignedWindow === win;
              return (
                <TouchableOpacity
                  key={index}
                  style={[styles.windowOption, isSelected && styles.windowOptionSelected]}
                  onPress={() => {
                    setAssignedWindow(win);
                    setIsWindowModalVisible(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.windowOptionText, isSelected && styles.windowOptionTextSelected]}>
                    {win}
                  </Text>
                  {isSelected && <Ionicons name="checkmark-circle" size={20} color={colors.brandText} />}
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity
              style={[styles.modalBtn, styles.cancelBtn, { marginTop: 12, flex: 0, width: '100%' }]}
              onPress={() => setIsWindowModalVisible(false)}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* CHANGE PASSWORD MODAL */}
      <Modal
        visible={isChangePasswordVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsChangePasswordVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Change Password</Text>
            <Text style={styles.modalSub}>Enter your current and new password below.</Text>

            <TextInput
              style={styles.input}
              placeholder="Current Password"
              placeholderTextColor={colors.textDisabled}
              secureTextEntry
              value={currentPassword}
              onChangeText={setCurrentPassword}
            />

            <TextInput
              style={styles.input}
              placeholder="New Password"
              placeholderTextColor={colors.textDisabled}
              secureTextEntry
              value={newPassword}
              onChangeText={setNewPassword}
            />

            <TextInput
              style={styles.input}
              placeholder="Confirm New Password"
              placeholderTextColor={colors.textDisabled}
              secureTextEntry
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />

            <View style={styles.modalActionRow}>
              <TouchableOpacity
                style={[styles.modalBtn, styles.cancelBtn]}
                onPress={() => setIsChangePasswordVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalBtn, styles.saveBtn]}
                onPress={handleChangePassword}
              >
                <Text style={styles.saveBtnText}>Update</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (colors: AppPalette) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surfaceSubtle,
  },
  scrollContent: {
    padding: 24,
    paddingBottom: 100,
    maxWidth: 440,
    width: '100%',
    alignSelf: 'center',
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: colors.brandText,
    marginBottom: 20,
    marginTop: 10,
  },
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.brand,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
  },
  avatar: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.brandText,
  },
  profileTextContainer: {
    flex: 1,
  },
  userName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  userRole: {
    fontSize: 13,
    color: colors.blueLight,
    marginTop: 2,
  },
  settingsGroup: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
    marginBottom: 24,
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 18,
    borderBottomWidth: 1,
    borderBottomColor: colors.surfaceMuted,
    width: '100%',
  },
  settingTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.textStrong,
  },
  settingSub: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  logoutBtn: {
    backgroundColor: colors.dangerSurface,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  logoutText: {
    color: colors.dangerStrong,
    fontSize: 15,
    fontWeight: '800',
  },

  navBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingVertical: 10,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  navItem: {
    alignItems: 'center',
    justifyContent: 'center',
  },
 navLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.textDisabled,
    marginTop: 2,
  },
  navLabelActive: {
    color: colors.brandText,
    fontWeight: '800',
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: 24,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.brandText,
    marginBottom: 4,
  },
  modalSub: {
    fontSize: 12,
    color: colors.textMuted,
    marginBottom: 16,
  },
  input: {
    backgroundColor: colors.surfaceSubtle,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: colors.textStrong,
    marginBottom: 12,
  },
  modalActionRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelBtn: {
    backgroundColor: colors.surfaceMuted,
  },
  cancelBtnText: {
    color: colors.textMuted,
    fontWeight: '700',
  },
  saveBtn: {
    backgroundColor: colors.brand,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  windowOption: {
    width: '100%',
    minHeight: 52,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
    backgroundColor: colors.surfaceSubtle,
  },
  windowOptionSelected: {
    borderColor: colors.brandText,
    backgroundColor: colors.blueSubtle,
  },
  windowOptionText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textBody,
  },
  windowOptionTextSelected: {
    color: colors.brandText,
    fontWeight: '800',
  },
});
