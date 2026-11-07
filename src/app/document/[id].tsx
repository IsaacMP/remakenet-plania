// Un documento: mientras se prepara muestra el progreso; listo, muestra sus herramientas de estudio.
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Animated, Easing, Pressable, StyleSheet, View } from 'react-native';

import { Icon, type IconName } from '@/components/icon';
import { LogoMark } from '@/components/logo';
import { Button, Card, IconBubble, Row, Screen, SectionTitle, T, tap } from '@/components/ui';
import { Fonts, Radius, Space } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { bestAttempts, deleteDocument, getDocument, listDocumentSets, processDocument } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { errorMessage } from '@/lib/errors';
import { mastery } from '@/lib/srs';
import type { StudySet } from '@/lib/types';

export default function DocumentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const theme = useTheme();
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const plan = profile?.plan ?? 'free';

  const doc = useQuery({
    queryKey: ['document', id],
    queryFn: () => getDocument(id),
    refetchInterval: (q) => (q.state.data && ['processing', 'uploaded'].includes(q.state.data.status) ? 2500 : false),
  });
  const status = doc.data?.status;

  const sets = useQuery({ queryKey: ['sets', id], queryFn: () => listDocumentSets(id), enabled: status === 'ready' || status === 'processing' });
  const quizzes = (sets.data ?? []).filter((s): s is Extract<StudySet, { kind: 'quiz' }> => s.kind === 'quiz');
  const best = useQuery({
    queryKey: ['best', id, quizzes.map((q) => q.id).join(',')],
    queryFn: () => bestAttempts(quizzes.map((q) => q.id)),
    enabled: quizzes.length > 0,
  });

  // Al terminar de procesar, refrescar material y listas
  const prevStatus = useRef(status);
  useEffect(() => {
    if (prevStatus.current === 'processing' && status !== 'processing') {
      queryClient.invalidateQueries({ queryKey: ['sets', id] });
      queryClient.invalidateQueries({ queryKey: ['documents', doc.data?.subject_id] });
      queryClient.invalidateQueries({ queryKey: ['recent-document'] });
      queryClient.invalidateQueries({ queryKey: ['usage'] });
    }
    prevStatus.current = status;
  }, [status, id, doc.data?.subject_id, queryClient]);

  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  async function run(mode: 'all' | 'quiz') {
    setBusy(true);
    setActionError(null);
    try {
      await processDocument(id, mode);
      await doc.refetch();
    } catch (err) {
      setActionError(errorMessage(t, err, plan));
    } finally {
      setBusy(false);
    }
  }

  function confirmDelete() {
    if (!doc.data) return;
    const d = doc.data;
    Alert.alert(t('document.deleteConfirm'), undefined, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          await deleteDocument(d);
          queryClient.invalidateQueries({ queryKey: ['documents', d.subject_id] });
          queryClient.invalidateQueries({ queryKey: ['subjects'] });
          queryClient.invalidateQueries({ queryKey: ['recent-document'] });
          router.back();
        },
      },
    ]);
  }

  const summary = sets.data?.find((s) => s.kind === 'summary');
  const cards = sets.data?.find((s): s is Extract<StudySet, { kind: 'flashcards' }> => s.kind === 'flashcards');
  const cardCount = cards?.content.cards.length ?? 0;
  const latestQuiz = quizzes[quizzes.length - 1];
  const processingExtra = status === 'processing' && quizzes.length > 0;

  return (
    <>
      <Stack.Screen
        options={{
          headerRight: () => (
            <Pressable accessibilityRole="button" accessibilityLabel={t('common.delete')} onPress={confirmDelete} hitSlop={10}>
              <Icon name="trash" size={20} color={theme.danger} />
            </Pressable>
          ),
        }}
      />
      <Screen edges={[]}>
        {doc.data ? (
          <T style={[styles.title, { color: theme.text }]}>{doc.data.title}</T>
        ) : (
          <ActivityIndicator color={theme.tint} />
        )}

        {(status === 'processing' || status === 'uploaded') && !processingExtra ? <Processing /> : null}

        {status === 'failed' ? (
          <Card style={{ backgroundColor: theme.dangerSoft, borderColor: theme.dangerSoft, gap: Space.md }}>
            <Row gap={Space.sm}>
              <Icon name="warning" size={20} color={theme.danger} />
              <T variant="heading" color={theme.danger} style={{ flex: 1 }}>
                {t('document.status.failed')}
              </T>
            </Row>
            <T color={theme.text}>{errorMessage(t, doc.data?.error_code ?? 'ai_error', plan)}</T>
            <Button label={t('common.retry')} icon="refresh" onPress={() => run('all')} loading={busy} />
          </Card>
        ) : null}

        {actionError ? (
          <Card style={{ backgroundColor: theme.dangerSoft, borderColor: theme.dangerSoft }}>
            <T color={theme.danger}>{actionError}</T>
          </Card>
        ) : null}

        {(status === 'ready' || processingExtra) && sets.data ? (
          <>
            <View style={styles.grid}>
              <Row gap={Space.md}>
                <Tool
                  icon="summary"
                  label={t('document.tools.summary')}
                  hint={t('document.tools.summaryHint')}
                  color={theme.tint}
                  bg={theme.tintSoft}
                  disabled={!summary}
                  onPress={() => summary && router.push(`/study/summary/${summary.id}`)}
                />
                <Tool
                  icon="cards"
                  label={t('document.tools.flashcards')}
                  hint={cards ? `${t('document.tools.flashcardsHint', { count: cardCount })} · ${mastery(cardCount, cards.progress)}%` : ''}
                  color={theme.sunText}
                  bg={theme.sunSoft}
                  disabled={!cards}
                  onPress={() => cards && router.push(`/study/flashcards/${cards.id}`)}
                />
              </Row>
              <Row gap={Space.md}>
                <Tool
                  icon="quiz"
                  label={t('document.tools.quiz')}
                  hint={latestQuiz ? t('document.tools.quizHint', { count: latestQuiz.content.questions.length }) : ''}
                  color={theme.coral}
                  bg={theme.coralSoft}
                  disabled={!latestQuiz}
                  onPress={() => latestQuiz && router.push(`/study/quiz/${latestQuiz.id}`)}
                />
                <Tool
                  icon="match"
                  label={t('document.tools.match')}
                  hint={t('document.tools.matchHint')}
                  color={theme.sky}
                  bg={theme.skySoft}
                  disabled={cardCount < 4}
                  onPress={() => cards && router.push(`/study/match/${cards.id}`)}
                />
              </Row>
            </View>

            {cards ? (
              <Button label={`${t('share.title')} · ${t('document.tools.flashcards')}`} variant="secondary" icon="send" onPress={() => router.push(`/share/${cards.id}`)} />
            ) : null}

            <SectionTitle>{t('document.exams')}</SectionTitle>
            {quizzes.map((q) => {
              const b = best.data?.[q.id];
              return (
                <Card key={q.id} onPress={() => router.push(`/study/quiz/${q.id}`)}>
                  <Row>
                    <IconBubble name="quiz" color={theme.coral} bg={theme.coralSoft} size={40} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <T variant="bodyStrong" numberOfLines={2}>
                        {q.title}
                      </T>
                      <T variant="small" color={theme.textSecondary}>
                        {t('document.tools.quizHint', { count: q.content.questions.length })} ·{' '}
                        {b ? t('document.bestScore', { score: b.score, total: b.total }) : t('document.notTaken')}
                      </T>
                    </View>
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={t('share.title')}
                      hitSlop={10}
                      onPress={() => {
                        tap();
                        router.push(`/share/${q.id}`);
                      }}>
                      <Icon name="send" size={20} color={theme.tint} />
                    </Pressable>
                  </Row>
                </Card>
              );
            })}

            {processingExtra ? (
              <Card>
                <Row>
                  <ActivityIndicator color={theme.tint} />
                  <T variant="bodyStrong" style={{ flex: 1 }}>
                    {t('document.status.processing')}
                  </T>
                </Row>
              </Card>
            ) : (
              <Button label={t('document.newQuiz')} variant="secondary" icon="sparkle" onPress={() => run('quiz')} loading={busy} accessibilityHint={t('document.newQuizHint')} />
            )}
          </>
        ) : null}
      </Screen>
    </>
  );
}

function Tool({
  icon,
  label,
  hint,
  color,
  bg,
  onPress,
  disabled,
}: {
  icon: IconName;
  label: string;
  hint: string;
  color: string;
  bg: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}. ${hint}`}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={() => {
        tap();
        onPress();
      }}
      style={({ pressed }) => [
        styles.tool,
        { backgroundColor: bg, opacity: disabled ? 0.45 : pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
      ]}>
      <View style={[styles.toolIcon, { backgroundColor: theme.surface }]}>
        <Icon name={icon} size={22} color={color} />
      </View>
      <View>
        <T variant="heading">{label}</T>
        <T variant="small" color={theme.textSecondary} numberOfLines={2}>
          {hint}
        </T>
      </View>
    </Pressable>
  );
}

/** El logo "respira" y la chispa gira mientras la IA lee el documento. */
function Processing() {
  const { t } = useTranslation();
  const theme = useTheme();
  const [pulse] = useState(() => new Animated.Value(0));
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 900, easing: Easing.inOut(Easing.quad), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);
  const scale = pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 1.08] });

  return (
    <Card style={{ alignItems: 'center', gap: Space.lg, paddingVertical: Space.xxl }} accessibilityLiveRegion="polite">
      <Animated.View style={{ transform: [{ scale }] }}>
        <LogoMark size={72} />
      </Animated.View>
      <T variant="heading" style={{ textAlign: 'center' }}>
        {t('document.status.processing')}
      </T>
      <T color={theme.textSecondary} style={{ textAlign: 'center', maxWidth: 300 }}>
        {t('document.status.processingHint')}
      </T>
    </Card>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: Fonts.display, fontSize: 28, lineHeight: 32, letterSpacing: -0.8 },
  grid: { gap: Space.md },
  tool: { flex: 1, minHeight: 140, borderRadius: Radius.xl, padding: Space.lg, justifyContent: 'space-between', gap: Space.md },
  toolIcon: { width: 42, height: 42, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
});
