import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppPalette } from '@/constants/app-colors';
import { useAppTheme } from '@/hooks/use-app-theme';
import { Ionicons } from '@expo/vector-icons';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useEffect, useState } from 'react';
import { Image, Modal, Platform, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

type ProfilePhotoProps = {
  storageId: string;
  initials: string;
  size: number;
  variant: 'staff' | 'student';
};

export function ProfilePhoto({ storageId, initials, size, variant }: ProfilePhotoProps) {
  const colors = useAppTheme();
  const styles = createStyles(colors);
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const storageKey = `queueease.profile-photo.${storageId}`;

  useEffect(() => {
    let active = true;
    AsyncStorage.getItem(storageKey)
      .then((stored) => { if (active) setPhotoUri(stored); })
      .catch(() => { if (active) setError('Could not load photo.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [storageKey]);

  const choosePhoto = async () => {
    setMenuOpen(false);
    setError('');
    try {
      const selected = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.6,
      });
      if (selected.canceled) return;
      const asset = selected.assets[0];
      let nextPhoto: string;
      if (Platform.OS === 'web') {
        const source = new window.Image();
        await new Promise<void>((resolve, reject) => {
          source.onload = () => resolve();
          source.onerror = () => reject(new Error('Image could not be opened'));
          source.src = asset.uri;
        });
        const canvas = document.createElement('canvas');
        canvas.width = 320;
        canvas.height = 320;
        const context = canvas.getContext('2d');
        if (!context) throw new Error('Image could not be processed');
        const side = Math.min(source.width, source.height);
        context.drawImage(source, (source.width - side) / 2, (source.height - side) / 2, side, side, 0, 0, 320, 320);
        nextPhoto = canvas.toDataURL('image/jpeg', 0.72);
      } else {
        const image = ImageManipulator.manipulate(asset.uri);
        image.resize({ width: 320, height: 320 });
        const rendered = await image.renderAsync();
        const saved = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.72, base64: true });
        if (!saved.base64) throw new Error('No image data');
        nextPhoto = `data:image/jpeg;base64,${saved.base64}`;
      }
      await AsyncStorage.setItem(storageKey, nextPhoto);
      setPhotoUri(nextPhoto);
    } catch {
      setError('Could not save photo. Try another image.');
    }
  };

  const removePhoto = async () => {
    setMenuOpen(false);
    setError('');
    try {
      await AsyncStorage.removeItem(storageKey);
      setPhotoUri(null);
    } catch {
      setError('Could not remove photo.');
    }
  };

  return (
    <View style={styles.wrapper}>
      <TouchableOpacity
        style={[styles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: variant === 'staff' ? colors.surface : colors.brand }]}
        onPress={() => setMenuOpen(true)}
        disabled={loading}
        accessibilityRole="button"
        accessibilityLabel="Change profile photo"
      >
        {photoUri ? (
          <Image source={{ uri: photoUri }} style={{ width: size, height: size, borderRadius: size / 2 }} />
        ) : (
          <Text style={[styles.initials, { color: variant === 'staff' ? colors.brandText : '#FFFFFF' }]}>{initials}</Text>
        )}
        <View style={styles.cameraBadge}>
          <Ionicons name="camera" size={12} color="#FFFFFF" />
        </View>
      </TouchableOpacity>
      {!!error && <Text style={styles.error} accessibilityRole="alert">{error}</Text>}
      <Modal visible={menuOpen} transparent animationType="none" onRequestClose={() => setMenuOpen(false)}>
        <Pressable style={styles.overlay} onPress={() => setMenuOpen(false)}>
          <View style={styles.menu}>
            <Text style={styles.menuTitle}>Profile photo</Text>
            <TouchableOpacity style={styles.menuAction} onPress={choosePhoto}>
              <Text style={styles.menuActionText}>Choose from photos</Text>
            </TouchableOpacity>
            {photoUri && <TouchableOpacity style={styles.menuAction} onPress={removePhoto}>
              <Text style={styles.removeText}>Remove photo</Text>
            </TouchableOpacity>}
            <TouchableOpacity style={styles.menuAction} onPress={() => setMenuOpen(false)}>
              <Text style={styles.menuActionText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const createStyles = (colors: AppPalette) => StyleSheet.create({
  wrapper: { marginRight: 16 },
  avatar: { alignItems: 'center', justifyContent: 'center' },
  initials: { fontSize: 18, fontWeight: '800' },
  cameraBadge: { position: 'absolute', right: -3, bottom: -3, width: 22, height: 22, borderRadius: 11, backgroundColor: colors.brandPressed, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: colors.surface },
  error: { color: colors.dangerStrong, fontSize: 10, maxWidth: 70, marginTop: 4 },
  overlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.45)', alignItems: 'center', justifyContent: 'center', padding: 24 },
  menu: { width: '100%', maxWidth: 360, backgroundColor: colors.surface, borderRadius: 16, padding: 20 },
  menuTitle: { fontSize: 18, fontWeight: '800', color: colors.text, marginBottom: 10 },
  menuAction: { minHeight: 48, justifyContent: 'center', borderTopWidth: 1, borderTopColor: colors.borderSubtle },
  menuActionText: { fontSize: 15, fontWeight: '600', color: colors.brandText },
  removeText: { fontSize: 15, fontWeight: '600', color: colors.dangerStrong },
});
