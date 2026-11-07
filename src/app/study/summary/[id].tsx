import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Badge, Card, Screen, SectionTitle, T } from '@/components/ui';
import { Fonts, Radius, Space } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getStudySet } from '@/lib/api';

export default function SummaryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const theme = useTheme();
  const set = useQuery({ queryKey: ['set', id], queryFn: () => getStudySet(id) });

  if (!set.data || set.data.kind !== 'summary') {
    return (
      <Screen edges={[]}>
        <ActivityIndicator color={theme.tint} />
      </Screen>
    );
  }
  const s = set.data.content;

  return (
    <Screen edges={[]}>
      <T style={[styles.title, { color: theme.text }]}>{set.data.title}</T>

      <Card style={{ backgroundColor: theme.tintSoft, borderColor: theme.tintSoft, gap: Space.sm }}>
        <T variant="caption" color={theme.tint} style={{ textTransform: 'uppercase' }}>
          {t('summary.overview')}
        </T>
        <T variant="body" style={{ fontSize: 17, lineHeight: 25 }}>
          {s.overview}
        </T>
      </Card>

      {s.sections.map((section, i) => (
        <View key={i} style={{ gap: Space.sm }}>
          <View style={styles.sectionHead}>
            <T variant="heading" style={{ flex: 1 }}>
              {section.heading}
            </T>
            {section.source ? <Badge label={section.source} tone="sky" /> : null}
          </View>
          {section.points.map((p, j) => (
            <View key={j} style={styles.point}>
              <View style={[styles.dot, { backgroundColor: theme.tint }]} />
              <T style={{ flex: 1 }}>{p}</T>
            </View>
          ))}
        </View>
      ))}

      {s.key_terms.length ? (
        <>
          <SectionTitle>{t('summary.keyTerms')}</SectionTitle>
          <View style={{ gap: Space.sm }}>
            {s.key_terms.map((k, i) => (
              <View key={i} style={[styles.term, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <T variant="bodyStrong">{k.term}</T>
                <T color={theme.textSecondary}>{k.definition}</T>
              </View>
            ))}
          </View>
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: Fonts.display, fontSize: 28, lineHeight: 32, letterSpacing: -0.8 },
  sectionHead: { flexDirection: 'row', alignItems: 'flex-start', gap: Space.sm, marginTop: Space.sm },
  point: { flexDirection: 'row', gap: Space.md, alignItems: 'flex-start' },
  dot: { width: 7, height: 7, borderRadius: 4, marginTop: 9 },
  term: { borderRadius: Radius.md, borderWidth: 1, padding: Space.md, gap: 2 },
});
