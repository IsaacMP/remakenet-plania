// Animaciones de respuesta: confeti, sacudida (incorrecto) y rebote (correcto).
import { type ReactNode, useEffect } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withDelay,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { Palette } from '@/constants/theme';

const COLORS = [Palette.teal, Palette.sun, Palette.coral, Palette.sky, '#B596F0', '#9CD46A'];

/** Número pseudoaleatorio estable (0–1) a partir de enteros, para que cada ráfaga sea distinta. */
function rand(i: number, seed: number, k: number): number {
  const x = Math.sin(i * 12.9898 + seed * 78.233 + k * 37.719) * 43758.5453;
  return x - Math.floor(x);
}

function Particle({ index, seed, spread, duration }: { index: number; seed: number; spread: number; duration: number }) {
  const p = useSharedValue(0);
  const angle = rand(index, seed, 1) * Math.PI * 2;
  const distance = spread * (0.45 + rand(index, seed, 2) * 0.55);
  const size = 6 + rand(index, seed, 3) * 7;
  const spin = (rand(index, seed, 4) - 0.5) * 900;
  const color = COLORS[Math.floor(rand(index, seed, 5) * COLORS.length)];
  const round = rand(index, seed, 6) > 0.5;

  useEffect(() => {
    p.value = 0;
    p.value = withTiming(1, { duration, easing: Easing.out(Easing.cubic) });
  }, [seed, p, duration]);

  const style = useAnimatedStyle(() => ({
    opacity: p.value === 0 ? 0 : 1 - p.value * p.value,
    transform: [
      { translateX: Math.cos(angle) * distance * p.value },
      // la gravedad hace caer los papelitos al final
      { translateY: Math.sin(angle) * distance * p.value + 160 * p.value * p.value },
      { rotate: `${spin * p.value}deg` },
      { scale: 1 - p.value * 0.3 },
    ],
  }));

  return (
    <Animated.View
      style={[
        { position: 'absolute', width: size, height: round ? size : size * 0.45, borderRadius: round ? size : 2, backgroundColor: color },
        style,
      ]}
    />
  );
}

/**
 * Ráfaga de confeti. Cada vez que cambia `fire` (y es mayor que 0), dispara.
 * Se dibuja encima de todo y no bloquea los toques.
 */
export function Confetti({
  fire,
  count = 36,
  spread = 220,
  duration = 1300,
  style,
}: {
  fire: number;
  count?: number;
  spread?: number;
  duration?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const reduced = useReducedMotion();
  if (fire <= 0 || reduced) return null;
  return (
    <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.center, style]}>
      {Array.from({ length: count }, (_, i) => (
        <Particle key={`${fire}-${i}`} index={i} seed={fire} spread={spread} duration={duration} />
      ))}
    </View>
  );
}

/**
 * Envuelve un elemento para sacudirlo (incorrecto) o hacerlo rebotar (correcto).
 * Cambia `shakeKey` o `popKey` para disparar la animación.
 */
export function Reactive({
  children,
  shakeKey = 0,
  popKey = 0,
  style,
}: {
  children: ReactNode;
  shakeKey?: number;
  popKey?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const x = useSharedValue(0);
  const scale = useSharedValue(1);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (!shakeKey || reduced) return;
    x.value = withSequence(
      withTiming(-12, { duration: 50 }),
      withTiming(12, { duration: 70 }),
      withTiming(-9, { duration: 70 }),
      withTiming(9, { duration: 70 }),
      withTiming(-4, { duration: 60 }),
      withTiming(0, { duration: 50 }),
    );
  }, [shakeKey, reduced, x]);

  useEffect(() => {
    if (!popKey || reduced) return;
    scale.value = withSequence(withTiming(1.12, { duration: 120 }), withSpring(1, { damping: 7, stiffness: 220 }));
  }, [popKey, reduced, scale]);

  const animated = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }, { scale: scale.value }] }));
  return <Animated.View style={[style, animated]}>{children}</Animated.View>;
}

/** Insignia que aparece rebotando, por ejemplo "¡3 seguidas!". */
export function BounceIn({ children, triggerKey, style }: { children: ReactNode; triggerKey: number; style?: StyleProp<ViewStyle> }) {
  const s = useSharedValue(0);
  useEffect(() => {
    s.value = 0;
    s.value = withDelay(60, withSpring(1, { damping: 9, stiffness: 180 }));
  }, [triggerKey, s]);
  const animated = useAnimatedStyle(() => ({ opacity: Math.min(1, s.value * 1.5), transform: [{ scale: 0.6 + s.value * 0.4 }] }));
  return <Animated.View style={[style, animated]}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', zIndex: 50 },
});
