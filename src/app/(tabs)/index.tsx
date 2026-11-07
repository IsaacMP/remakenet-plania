// Inicio: saludo, racha, "sigue donde te quedaste" y tus materias.
import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import { LogoMark } from '@/components/logo';
import { SubjectTile } from '@/components/subject-tile';
import { Button, Card, EmptyState, IconBubble, ProgressBar, Row, SectionTitle, T } from '@/components/ui';
import { Fonts, Radius, Space } from '@/constants/theme';
import { useSubjectColor, useTheme } from '@/hooks/use-theme';
import { listSubjects, recentDocument, usageThisMonth } from '@/lib/api';
import { firstName, useAuth } from '@/lib/auth';
import { PLAN_LIMITS } from '@/lib/plans';
import { addDays, today } from '@/lib/srs';

export default function Home() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { profile, session, refreshProfile } = useAuth();

  const subjects = useQuery({ queryKey: ['subjects'], queryFn: listSubjects });
  const recent = useQuery({ queryKey: ['recent-document'], queryFn: recentDocument });
  const usage = useQuery({ queryKey: ['usage'], queryFn: usageThisMonth });

  const hour = new Date().getHours();
  const greetingKey = hour < 12 ? 'home.greetingMorning' : hour < 19 ? 'home.greetingAfternoon' : 'home.greetingEvening';
  const plan = profile?.plan ?? 'free';
  const limit = PLAN_LIMITS[plan].generationsPerMonth;

  // La racha sigue viva si estudiaste hoy o ayer
  const last = profile?.last_study_date;
  const streak = last && last >= addDays(today(), -1) ? (profile?.streak_count ?? 0) : 0;

  const list = subjects.data ?? [];
  const pairs: (typeof list)[] = [];
  for (let i = 0; i < list.length; i += 2) pairs.push(list.slice(i, i + 2));

  const refreshing = subjects.isRefetching || recent.isRefetching;
  const onRefresh = () => {
    subjects.refetch();
    recent.refetch();
    usage.refetch();
    refreshProfile();
  };

  return (
    <SafeAreaView edges={['top']} style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.tint} />}>
        <Row style={{ justifyContent: 'space-between' }}>
          <LogoMark size={34} />
          <Button label={t('home.haveCode')} variant="secondary" icon="key" onPress={() => router.push('/code')} style={styles.codeButton} />
        </Row>

        <View style={{ gap: Space.sm }}>
          <T style={[styles.greeting, { color: theme.text }]}>{t(greetingKey, { name: firstName(profile, session) })}</T>
          <Row gap={Space.sm}>
            <Icon name="flame" size={18} color={streak > 0 ? theme.coral : theme.textSecondary} />
            <T variant="bodyStrong" color={streak > 0 ? theme.coral : theme.textSecondary}>
              {streak > 0 ? t('home.streak', { count: streak }) : t('home.streakZero')}
            </T>
          </Row>
        </View>

        {recent.data ? <ContinueCard doc={recent.data} /> : null}

        <SectionTitle
          right={
            list.length ? (
              <Button label={t('home.newSubject')} variant="ghost" icon="plus" onPress={() => router.push('/subject/form')} style={styles.inlineButton} />
            ) : undefined
          }>
          {t('home.subjects')}
        </SectionTitle>

        {subjects.isSuccess && list.length === 0 ? (
          <EmptyState
            icon="book"
            title={t('home.emptyTitle')}
            body={t('home.emptyBody')}
            action={<Button label={t('home.newSubject')} icon="plus" onPress={() => router.push('/subject/form')} />}
          />
        ) : (
          <View style={{ gap: Space.md }}>
            {pairs.map((pair) => (
              <View key={pair[0].id} style={{ flexDirection: 'row', gap: Space.md }}>
                {pair.map((s) => (
                  <SubjectTile key={s.id} subject={s} onPress={() => router.push(`/subject/${s.id}`)} />
                ))}
                {pair.length === 1 ? <View style={{ flex: 1 }} /> : null}
              </View>
            ))}
          </View>
        )}

        {subjects.isError ? (
          <Card>
            <T color={theme.danger}>{t('common.error')}</T>
          </Card>
        ) : null}

        {usage.data !== undefined && plan === 'free' ? (
          <View style={{ gap: Space.sm, marginTop: Space.sm }}>
            <ProgressBar value={usage.data / limit} color={usage.data >= limit ? theme.coral : theme.tint} />
            <T variant="small" color={theme.textSecondary}>
              {t('home.usage', { used: usage.data, limit })}
            </T>
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function ContinueCard({ doc }: { doc: NonNullable<Awaited<ReturnType<typeof recentDocument>>> }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const c = useSubjectColor(doc.subjects?.color ?? 'teal');
  return (
    <Card onPress={() => router.push(`/document/${doc.id}`)} style={{ backgroundColor: theme.text, borderColor: theme.text }}>
      <Row>
        <IconBubble name="doc" color={c.strong} bg={c.soft} />
        <View style={{ flex: 1, minWidth: 0 }}>
          <T variant="caption" color={theme.background} style={{ opacity: 0.7, textTransform: 'uppercase' }}>
            {t('home.continue')}
          </T>
          <T variant="heading" color={theme.background} numberOfLines={2}>
            {doc.title}
          </T>
          <T variant="small" color={theme.background} style={{ opacity: 0.7 }} numberOfLines={1}>
            {doc.subjects?.name}
          </T>
        </View>
        <Icon name="chevron" size={16} color={theme.background} />
      </Row>
    </Card>
  );
}

const styles = StyleSheet.create({
  content: { padding: Space.lg, gap: Space.lg, paddingBottom: 120 },
  greeting: { fontFamily: Fonts.display, fontSize: 30, lineHeight: 34, letterSpacing: -0.8 },
  codeButton: { minHeight: 40, paddingHorizontal: Space.md, borderRadius: Radius.pill },
  inlineButton: { minHeight: 36, paddingHorizontal: Space.sm },
});
