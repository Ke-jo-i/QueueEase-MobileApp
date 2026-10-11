import { Ionicons } from '@expo/vector-icons';
import { useEvent, useEventListener } from 'expo';
import { Asset } from 'expo-asset';
import { StatusBar } from 'expo-status-bar';
import { useVideoPlayer, VideoView } from 'expo-video';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export function ProfileMedia({ onClose }: { onClose: () => void }) {
  const player = useVideoPlayer(null, (instance) => {
    instance.loop = false;
    instance.staysActiveInBackground = false;
    instance.audioMixingMode = 'doNotMix';
  });
  const { status } = useEvent(player, 'statusChange', { status: player.status });
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState({ attempt: -1, failed: false });
  const loading = result.attempt !== attempt;
  const failed = !loading && (result.failed || status === 'error');
  const close = () => { player.pause(); onClose(); };
  useEventListener(player, 'playToEnd', close);
  useEffect(() => {
    let active = true;
    const load = async () => {
      const asset = Asset.fromModule(require('../../assets/media/profile.mp4'));
      if (Platform.OS !== 'web') await asset.downloadAsync();
      if (!active) return;
      const uri = Platform.OS === 'web' ? asset.uri : asset.localUri;
      if (!uri) throw new Error('Media is unavailable.');
      await player.replaceAsync({ uri });
      if (!active) return;
      player.play();
      setResult({ attempt, failed: false });
    };
    void load().catch(() => { if (active) setResult({ attempt, failed: true }); });
    return () => { active = false; };
  }, [attempt, player]);
  useEffect(() => () => { if (Platform.OS === 'web') player.pause(); }, [player]);
  return <Modal visible hardwareAccelerated animationType="fade" presentationStyle="fullScreen" onRequestClose={close}>
    <StatusBar style="light" />
    <SafeAreaView style={styles.container}>
      <View style={styles.toolbar}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close video" onPress={close} hitSlop={8} style={styles.close}>
          <Ionicons name="close" size={26} color="#fff" />
        </Pressable>
      </View>
      <View style={styles.content}>
        <VideoView player={player} style={styles.video} contentFit="contain" nativeControls fullscreenOptions={{ enable: false }} allowsPictureInPicture={false} />
        {!failed && (loading || status === 'idle' || status === 'loading') && <View pointerEvents="none" style={styles.overlay}><ActivityIndicator color="#fff" size="large" /></View>}
        {failed && <View style={[styles.overlay, { gap: 18 }]}><Text style={styles.error}>Unable to play video.</Text><Pressable accessibilityRole="button" accessibilityLabel="Retry playback" onPress={() => setAttempt(value => value + 1)} style={styles.retry}><Text style={styles.error}>Try again</Text></Pressable></View>}
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
  retry: { borderColor: '#fff', borderWidth: 1, borderRadius: 20, paddingHorizontal: 20, paddingVertical: 12 },
});
