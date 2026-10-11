import Svg, { G, Path } from 'react-native-svg';
import { View } from 'react-native';

export function BrandMark({ size = 32, color }: { size?: number; color: string }) {
  return <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" aria-hidden>
    <Svg width={size} height={size} viewBox="0 0 128 128" fill="none">
    <G transform="rotate(-15 64 64)" stroke={color} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round">
      <Path d="M26 34h76a8 8 0 0 1 8 8v11a11 11 0 0 0 0 22v11a8 8 0 0 1-8 8H26a8 8 0 0 1-8-8V75a11 11 0 0 0 0-22V42a8 8 0 0 1 8-8Z" />
      <Path d="M82 44v7m0 10v6m0 10v7M38 55h25M38 73h17" />
    </G>
  </Svg></View>;
}
