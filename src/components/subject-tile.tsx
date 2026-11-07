import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { T, tap } from '@/components/ui';
import { Radius, Space } from '@/constants/theme';
import { useSubjectColor, useTheme } from '@/hooks/use-theme';
import type { SubjectWithCount } from '@/lib/api';

export function SubjectTile({ subject, onPress }: { subject: SubjectWithCount; onPress: () => void }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const c = useSubjectColor(subject.color);
  const docs = subject.documents?.[0]?.count ?? 0;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${subject.name}, ${t('home.docs', { count: docs })}`}
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => [
        styles.tile,
        { backgroundColor: c.soft, opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
      ]}>
      <View style={[styles.icon, { backgroundColor: theme.surface }]}>
        <Icon name={subject.icon} size={20} color={c.strong} />
      </View>
      <View style={{ gap: 2 }}>
        <T variant="heading" numberOfLines={2} style={{ fontSize: 17, lineHeight: 21 }}>
          {subject.name}
        </T>
        <T variant="small" color={theme.textSecondary}>
          {t('home.docs', { count: docs })}
        </T>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: { flex: 1, minHeight: 132, borderRadius: Radius.xl, padding: Space.lg, justifyContent: 'space-between', gap: Space.md },
  icon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
});
