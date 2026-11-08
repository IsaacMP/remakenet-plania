// Selector de idioma compacto (ES | EN) para las pantallas de inicio.
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { T, tap } from '@/components/ui';
import { Radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { type AppLocale, setAppLocale } from '@/lib/i18n';

const OPTIONS: { id: AppLocale; label: string; name: string }[] = [
  { id: 'es', label: 'ES', name: 'Español' },
  { id: 'en', label: 'EN', name: 'English' },
];

export function LanguageToggle({ onChange }: { onChange?: (locale: AppLocale) => void }) {
  const { i18n } = useTranslation();
  const theme = useTheme();
  const current: AppLocale = i18n.language === 'en' ? 'en' : 'es';

  return (
    <View accessibilityRole="radiogroup" style={[styles.wrap, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      {OPTIONS.map((o) => {
        const active = o.id === current;
        return (
          <Pressable
            key={o.id}
            accessibilityRole="radio"
            accessibilityLabel={o.name}
            accessibilityState={{ selected: active }}
            onPress={() => {
              if (active) return;
              tap();
              setAppLocale(o.id);
              onChange?.(o.id);
            }}
            style={[styles.option, active && { backgroundColor: theme.tint }]}>
            <T variant="caption" color={active ? theme.onTint : theme.textSecondary}>
              {o.label}
            </T>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', borderRadius: Radius.pill, borderWidth: 1, padding: 3, alignSelf: 'flex-start' },
  option: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: Radius.pill, minWidth: 44, alignItems: 'center' },
});
