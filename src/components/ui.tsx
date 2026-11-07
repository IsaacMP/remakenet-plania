// Piezas básicas de la interfaz. Todo toma colores del tema para verse bien en claro y oscuro.
import * as Haptics from 'expo-haptics';
import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Platform,
  Pressable,
  type PressableProps,
  ScrollView,
  type StyleProp,
  StyleSheet,
  Text,
  type TextProps,
  View,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/icon';
import { Radius, Space, Type } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Variant = keyof typeof Type;

export function T({
  variant = 'body',
  color,
  style,
  ...rest
}: TextProps & { variant?: Variant; color?: string }) {
  const theme = useTheme();
  return <Text {...rest} style={[Type[variant], { color: color ?? theme.text }, style]} />;
}

export function tap() {
  if (Platform.OS !== 'web') Haptics.selectionAsync().catch(() => {});
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  icon,
  loading,
  disabled,
  style,
  accessibilityHint,
}: {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'sun';
  icon?: IconName;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityHint?: string;
}) {
  const theme = useTheme();
  const palette = {
    primary: { bg: theme.tint, fg: theme.onTint, border: theme.tint },
    sun: { bg: theme.sun, fg: '#13232E', border: theme.sun },
    secondary: { bg: theme.surface, fg: theme.text, border: theme.border },
    ghost: { bg: 'transparent', fg: theme.tint, border: 'transparent' },
    danger: { bg: theme.dangerSoft, fg: theme.danger, border: theme.dangerSoft },
  }[variant];
  const inactive = disabled || loading;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => [
        styles.button,
        { backgroundColor: palette.bg, borderColor: palette.border, opacity: disabled ? 0.45 : pressed ? 0.85 : 1 },
        pressed && { transform: [{ scale: 0.98 }] },
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={palette.fg} />
      ) : (
        <>
          {icon ? <Icon name={icon} size={20} color={palette.fg} /> : null}
          <T variant="bodyStrong" color={palette.fg} numberOfLines={1}>
            {label}
          </T>
        </>
      )}
    </Pressable>
  );
}

export function Card({
  children,
  style,
  onPress,
  ...rest
}: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void } & Omit<PressableProps, 'style' | 'children'>) {
  const theme = useTheme();
  const base = [styles.card, { backgroundColor: theme.surface, borderColor: theme.border }, style];
  if (!onPress) return <View style={base}>{children}</View>;
  return (
    <Pressable
      accessibilityRole="button"
      {...rest}
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => [base, pressed && { opacity: 0.88, transform: [{ scale: 0.985 }] }]}>
      {children}
    </Pressable>
  );
}

export function Screen({
  children,
  scroll = true,
  edges = ['top'],
  contentStyle,
}: {
  children: ReactNode;
  scroll?: boolean;
  edges?: Edge[];
  contentStyle?: StyleProp<ViewStyle>;
}) {
  const theme = useTheme();
  return (
    <SafeAreaView edges={edges} style={{ flex: 1, backgroundColor: theme.background }}>
      {scroll ? (
        <ScrollView
          contentContainerStyle={[styles.screenContent, contentStyle]}
          contentInsetAdjustmentBehavior="automatic"
          keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.screenContent, { flex: 1 }, contentStyle]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

export function Chip({
  label,
  selected,
  onPress,
  icon,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: IconName;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={() => {
        tap();
        onPress?.();
      }}
      style={({ pressed }) => [
        styles.chip,
        {
          backgroundColor: selected ? theme.tint : theme.surface,
          borderColor: selected ? theme.tint : theme.border,
          opacity: pressed ? 0.8 : 1,
        },
      ]}>
      {icon ? <Icon name={icon} size={16} color={selected ? theme.onTint : theme.textSecondary} /> : null}
      <T variant="small" color={selected ? theme.onTint : theme.text}>
        {label}
      </T>
    </Pressable>
  );
}

export function Badge({ label, tone = 'tint' }: { label: string; tone?: 'tint' | 'sun' | 'sky' | 'coral' }) {
  const theme = useTheme();
  const map = {
    tint: [theme.tintSoft, theme.tint],
    sun: [theme.sunSoft, theme.sunText],
    sky: [theme.skySoft, theme.sky],
    coral: [theme.coralSoft, theme.coral],
  }[tone];
  return (
    <View style={[styles.badge, { backgroundColor: map[0] }]}>
      <T variant="caption" color={map[1]} style={{ textTransform: 'uppercase' }}>
        {label}
      </T>
    </View>
  );
}

export function ProgressBar({ value, color, track }: { value: number; color?: string; track?: string }) {
  const theme = useTheme();
  const pct = Math.max(0, Math.min(1, value));
  return (
    <View
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 0, max: 100, now: Math.round(pct * 100) }}
      style={[styles.track, { backgroundColor: track ?? theme.border }]}>
      <View style={{ width: `${pct * 100}%`, height: '100%', borderRadius: Radius.pill, backgroundColor: color ?? theme.tint }} />
    </View>
  );
}

export function IconBubble({ name, color, bg, size = 44 }: { name: IconName | string; color: string; bg: string; size?: number }) {
  return (
    <View style={{ width: size, height: size, borderRadius: size * 0.32, backgroundColor: bg, alignItems: 'center', justifyContent: 'center' }}>
      <Icon name={name} size={size * 0.5} color={color} />
    </View>
  );
}

export function EmptyState({
  icon,
  title,
  body,
  action,
}: {
  icon: IconName;
  title: string;
  body: string;
  action?: ReactNode;
}) {
  const theme = useTheme();
  return (
    <View style={[styles.empty, { borderColor: theme.border }]}>
      <IconBubble name={icon} color={theme.tint} bg={theme.tintSoft} size={56} />
      <T variant="heading" style={{ textAlign: 'center' }}>
        {title}
      </T>
      <T variant="body" color={theme.textSecondary} style={{ textAlign: 'center', maxWidth: 300 }}>
        {body}
      </T>
      {action}
    </View>
  );
}

export function SectionTitle({ children, right }: { children: string; right?: ReactNode }) {
  const theme = useTheme();
  return (
    <View style={styles.sectionTitle}>
      <T variant="caption" color={theme.textSecondary} style={{ textTransform: 'uppercase' }}>
        {children}
      </T>
      {right}
    </View>
  );
}

export function Row({ children, style, gap = Space.md }: { children: ReactNode; style?: StyleProp<ViewStyle>; gap?: number }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap }, style]}>{children}</View>;
}

export function ListRow({
  icon,
  title,
  subtitle,
  onPress,
  right,
  tone,
}: {
  icon?: IconName;
  title: string;
  subtitle?: string;
  onPress?: () => void;
  right?: ReactNode;
  tone?: { color: string; bg: string };
}) {
  const theme = useTheme();
  return (
    <Card onPress={onPress} style={{ paddingVertical: Space.md }}>
      <Row>
        {icon ? <IconBubble name={icon} size={40} color={tone?.color ?? theme.tint} bg={tone?.bg ?? theme.tintSoft} /> : null}
        <View style={{ flex: 1, minWidth: 0 }}>
          <T variant="bodyStrong" numberOfLines={2}>
            {title}
          </T>
          {subtitle ? (
            <T variant="small" color={theme.textSecondary} numberOfLines={2}>
              {subtitle}
            </T>
          ) : null}
        </View>
        {right ?? (onPress ? <Icon name="chevron" size={16} color={theme.textSecondary} /> : null)}
      </Row>
    </Card>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    borderRadius: Radius.lg,
    borderWidth: 1.5,
    paddingHorizontal: Space.xl,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Space.sm,
  },
  card: { borderRadius: Radius.lg, borderWidth: 1, padding: Space.lg },
  screenContent: { padding: Space.lg, paddingBottom: Space.xxxl * 2, gap: Space.lg },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
  },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.pill },
  track: { height: 8, borderRadius: Radius.pill, overflow: 'hidden', width: '100%' },
  empty: {
    alignItems: 'center',
    gap: Space.md,
    padding: Space.xl,
    borderRadius: Radius.xl,
    borderWidth: 1.5,
    borderStyle: 'dashed',
  },
  sectionTitle: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: Space.sm },
});
