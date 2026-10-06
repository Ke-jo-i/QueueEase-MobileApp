import { Ionicons } from '@expo/vector-icons';
import { useEvent, useEventListener } from 'expo';
import { StatusBar } from 'expo-status-bar';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect } from 'react';
import { ActivityIndicator, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export function ProfileMedia({ onClose }: { onClose: () => void }) {
  const player = useVideoPlayer(require('../../assets/media/profile.mp4'), (instance) => {
    instance.loop = false;
    instance.staysActiveInBackground = false;
    instance.audioMixingMode = 'doNotMix';
  });
  const { status } = useEvent(player, 'statusChange', { status: player.status });
  const close = () => { player.pause(); onClose(); };
  useEventListener(player, 'playToEnd', close);
  useEffect(() => () => { if (Platform.OS === 'web') player.pause(); }, [player]);
  return <Modal visible animationType="fade" presentationStyle="fullScreen" onRequestClose={close} onShow={() => player.play()}>
    <StatusBar style="light" />
    <SafeAreaView style={styles.container}>
      <View style={styles.toolbar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close video" onPress={close} hitSlop={8} style={styles.close}>
          <Ionicons name="close" size={26} color="#fff" />
        </Pressable>
      </View>
      <View style={styles.content}>
        <VideoView player={player} style={styles.video} contentFit="contain" nativeControls fullscreenOptions={{ enable: false }} allowsPictureInPicture={false} />
        {(status === 'idle' || status === 'loading') && <View pointerEvents="none" style={styles.overlay}><ActivityIndicator color="#fff" size="large" /></View>}
        {status === 'error' && <View style={styles.overlay}><Text style={styles.error}>Unable to play video.</Text></View>}
      </View>
    </SafeAreaView>
  </Modal>;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000' },
  toolbar: { flexDirection: 'row', justifyContent: 'flex-end', paddingHorizontal: 16, paddingVertical: 8 },
  close: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center', borderRadius: 24 },
  content: { flex: 1 },
  video: { width: '100%', height: '100%' },
  overlay: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, alignItems: 'center', justifyContent: 'center' },
  error: { color: '#fff', fontSize: 16 },
});
