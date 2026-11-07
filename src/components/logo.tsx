import { Text, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

import { Fonts, Palette } from '@/constants/theme';

/** La marca: una P que es hoja (tallo) y órbita (bucle), con la chispa de la idea. */
export function LogoMark({
  size = 64,
  bg = Palette.teal,
  fg = Palette.white,
  dot = Palette.sun,
}: {
  size?: number;
  bg?: string;
  fg?: string;
  dot?: string;
}) {
  return (
    <Svg width={size} height={size} viewBox="0 0 120 120" accessibilityLabel="Plania">
      <Rect x={4} y={4} width={112} height={112} rx={34} fill={bg} />
      <Rect x={34} y={20} width={16} height={72} rx={8} fill={fg} />
      <Path
        d="M42 28 h18 a20 20 0 0 1 0 40 h-18"
        fill="none"
        stroke={fg}
        strokeWidth={16}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx={86} cy={86} r={10} fill={dot} />
    </Svg>
  );
}

export function Wordmark({ size = 40, color }: { size?: number; color: string }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: size * 0.28 }}>
      <LogoMark size={size} />
      <Text style={{ fontFamily: Fonts.display, fontSize: size * 0.82, letterSpacing: -size * 0.035, color }}>
        plania
      </Text>
    </View>
  );
}
