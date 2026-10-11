import { useAudioPlayer } from 'expo-audio';
import { createContext, type PropsWithChildren, useCallback, useContext, useEffect, useMemo, useRef } from 'react';
import { AppState } from 'react-native';
import Animated, { cancelAnimation, Easing, useAnimatedStyle, useReducedMotion, useSharedValue, withTiming } from 'react-native-reanimated';

const ResponseContext = createContext<(key: string) => void>(() => {});
const sources = [require('../../assets/media/a01.mp3'), require('../../assets/media/a02.mp3')];

export function SceneResponses({ children }: PropsWithChildren) {
  const first = useAudioPlayer(null, { updateInterval: 1000 });
  const second = useAudioPlayer(null, { updateInterval: 1000 });
  const players = useMemo(() => [first, second], [first, second]);
  const sequence = useRef({ key: '', count: 0, at: 0 });
  const reversed = useRef(false);
  const angle = useSharedValue(0);
  const reduced = useReducedMotion();
  const signal = useCallback((key: string) => {
    const previous = sequence.current;
    const at = Date.now();
    const count = previous.key === key && at - previous.at < 4000 ? previous.count + 1 : 1;
    sequence.current = { key, at, count: count % 20 };
    if (count !== 20) return;
    if (key === 'profile' || key === 'identity') {
      reversed.current = !reversed.current;
      angle.set(reduced ? reversed.current ? 180 : 0 : withTiming(reversed.current ? 180 : 0, { duration: 650, easing: Easing.bezier(0.34, 1.08, 0.4, 1) }));
    } else {
      const index = key === 'alerts' ? 0 : key === 'tickets' ? 1 : -1;
      if (index < 0) return;
      players.forEach(player => player.pause());
      players[index].replace(sources[index]);
      players[index].play();
    }
  }, [angle, players, reduced]);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') return;
      players.forEach(player => player.pause());
      sequence.current = { key: '', count: 0, at: 0 };
      reversed.current = false;
      angle.set(0);
    });
    return () => { subscription.remove(); cancelAnimation(angle); };
  }, [angle, players]);
  const frame = useAnimatedStyle(() => ({ transform: [{ rotate: `${angle.get()}deg` }] }));
  return <ResponseContext.Provider value={signal}><Animated.View style={[{ flex: 1 }, frame]}>{children}</Animated.View></ResponseContext.Provider>;
}

export const useSceneResponse = () => useContext(ResponseContext);
