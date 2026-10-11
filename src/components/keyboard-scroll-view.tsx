import { createContext, useCallback, useEffect, useRef } from 'react';
import { Keyboard, KeyboardAvoidingView, Platform, ScrollView, type ScrollViewProps, type TextInput, type View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export const KeyboardFieldContext = createContext<{
  focus: (input: TextInput | null) => void;
  blur: (input: TextInput | null) => void;
  reveal: (view: View | null) => void;
} | null>(null);

export function KeyboardScrollView({ children, onLayout, onScroll, style, ...props }: ScrollViewProps) {
  const insets = useSafeAreaInsets();
  const scroll = useRef<ScrollView>(null);
  const focused = useRef<TextInput | null>(null);
  const offset = useRef(0);
  const frame = useRef<number | null>(null);
  const reveal = useCallback((view: View | null) => {
    if (!view) return;
    if (Platform.OS === 'web') {
      if (view instanceof HTMLElement) view.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      return;
    }
    scroll.current?.getNativeScrollRef()?.measureInWindow((_x, top, _width, height) => {
      view.measureInWindow((_viewX, viewTop, _viewWidth, viewHeight) => {
        const bottom = Math.min(top + height, Keyboard.metrics()?.screenY ?? top + height);
        const overlap = viewTop + viewHeight + 20 - bottom;
        const above = viewTop - top - 20;
        if (overlap > 0 || above < 0) scroll.current?.scrollTo({ y: Math.max(0, offset.current + (overlap > 0 ? overlap : above)), animated: true });
      });
    });
  }, []);

  const revealFocusedInput = useCallback(() => {
    if (Platform.OS === 'web') return;
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      const input = focused.current;
      if (!input?.isFocused()) return;
      scroll.current?.getNativeScrollRef()?.measureInWindow((_x, top, _width, height) => {
        input.measureInWindow((_inputX, inputTop, _inputWidth, inputHeight) => {
          if (focused.current !== input || !input.isFocused()) return;
          const keyboardTop = Keyboard.metrics()?.screenY ?? top + height;
          const visibleBottom = Math.min(top + height, keyboardTop);
          const overlap = inputTop + inputHeight + 20 - visibleBottom;
          if (overlap > 0) scroll.current?.scrollTo({ y: offset.current + overlap, animated: true });
        });
      });
    });
  }, []);

  useEffect(() => {
    const listener = Keyboard.addListener('keyboardDidShow', revealFocusedInput);
    return () => {
      listener.remove();
      if (frame.current !== null) cancelAnimationFrame(frame.current);
    };
  }, [revealFocusedInput]);

  return <KeyboardAvoidingView style={{ flex: 1 }} enabled={Platform.OS !== 'web'}
    behavior={Platform.OS === 'ios' ? 'padding' : 'height'} keyboardVerticalOffset={insets.top}>
    <KeyboardFieldContext.Provider value={{
      reveal,
      focus: (input) => { focused.current = input; revealFocusedInput(); },
      blur: (input) => { if (focused.current === input) focused.current = null; },
    }}>
      <ScrollView {...props} ref={scroll} style={[{ flex: 1 }, style]} keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'web' ? 'none' : Platform.OS === 'ios' ? 'interactive' : 'on-drag'} scrollEventThrottle={16}
        onLayout={(event) => { onLayout?.(event); revealFocusedInput(); }}
        onScroll={(event) => { offset.current = event.nativeEvent.contentOffset.y; onScroll?.(event); }}>
        {children}
      </ScrollView>
    </KeyboardFieldContext.Provider>
  </KeyboardAvoidingView>;
}
