// Examen de práctica: una pregunta a la vez, con explicación y la página de donde salió.
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { Button, Card, ProgressBar, Row, Screen, SectionTitle, T, tap } from '@/components/ui';
import { Fonts, Radius, Space } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getStudySet, recordQuizAttempt, recordStudy } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import type { Question, StudySet } from '@/lib/types';

type QuizSet = Extract<StudySet, { kind: 'quiz' }>;

export default function QuizScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const set = useQuery({ queryKey: ['set', id], queryFn: () => getStudySet(id) });
  if (!set.data || set.data.kind !== 'quiz') {
    return (
      <Screen edges={[]}>
        <ActivityIndicator color={theme.tint} />
      </Screen>
    );
  }
  return <Exam set={set.data} />;
}

function Exam({ set }: { set: QuizSet }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const queryClient = useQueryClient();
  const { refreshProfile } = useAuth();
  const all = set.content.questions;

  // Índices de las preguntas de esta ronda (todas, o solo las falladas)
  const [round, setRound] = useState<number[]>(() => all.map((_, i) => i));
  const [pos, setPos] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const [wrong, setWrong] = useState<number[]>([]);
  const [done, setDone] = useState(false);

  const qIndex = round[pos];
  const q: Question | undefined = all[qIndex];

  function check() {
    if (picked === null || !q) return;
    tap();
    setChecked(true);
    if (picked !== q.correct_index) setWrong((w) => [...w, qIndex]);
  }

  async function next() {
    tap();
    if (pos + 1 < round.length) {
      setPos(pos + 1);
      setPicked(null);
      setChecked(false);
      return;
    }
    setDone(true);
    const score = round.length - wrong.length;
    // Solo cuenta como intento si respondió el examen completo
    if (round.length === all.length) {
      recordQuizAttempt(set.id, score, round.length, wrong).catch(() => {});
      queryClient.invalidateQueries({ queryKey: ['best'] });
    }
    recordStudy().then(() => refreshProfile()).catch(() => {});
  }

  function restart(onlyWrong: boolean) {
    setRound(onlyWrong ? wrong : all.map((_, i) => i));
    setPos(0);
    setPicked(null);
    setChecked(false);
    setWrong([]);
    setDone(false);
  }

  if (done) {
    return <Result set={set} round={round} wrong={wrong} onRestart={restart} />;
  }
  if (!q) return null;

  const correct = checked && picked === q.correct_index;

  return (
    <Screen edges={[]}>
      <View style={{ gap: Space.sm }}>
        <ProgressBar value={(pos + (checked ? 1 : 0)) / round.length} color={theme.coral} />
        <T variant="small" color={theme.textSecondary}>
          {t('quiz.question', { current: pos + 1, total: round.length })}
        </T>
      </View>

      <T style={[styles.question, { color: theme.text }]}>{q.question}</T>

      <View style={{ gap: Space.sm }} accessibilityRole="radiogroup">
        {q.options.map((opt, i) => {
          const isPicked = picked === i;
          const isAnswer = i === q.correct_index;
          let bg = theme.surface;
          let border = theme.border;
          let icon: 'check' | 'wrong' | null = null;
          if (checked && isAnswer) {
            bg = theme.tintSoft;
            border = theme.tint;
            icon = 'check';
          } else if (checked && isPicked) {
            bg = theme.dangerSoft;
            border = theme.danger;
            icon = 'wrong';
          } else if (isPicked) {
            border = theme.text;
          }
          return (
            <Pressable
              key={i}
              accessibilityRole="radio"
              accessibilityState={{ selected: isPicked, disabled: checked }}
              disabled={checked}
              onPress={() => {
                tap();
                setPicked(i);
              }}
              style={({ pressed }) => [styles.option, { backgroundColor: bg, borderColor: border, opacity: pressed ? 0.85 : 1 }]}>
              <View style={[styles.letter, { borderColor: isPicked || (checked && isAnswer) ? border : theme.border }]}>
                <T variant="bodyStrong">{String.fromCharCode(65 + i)}</T>
              </View>
              <T style={{ flex: 1 }}>{opt}</T>
              {icon ? <Icon name={icon} size={22} color={icon === 'check' ? theme.tint : theme.danger} /> : null}
            </Pressable>
          );
        })}
      </View>

      {checked ? (
        <Card style={{ gap: Space.xs, backgroundColor: correct ? theme.tintSoft : theme.sunSoft, borderColor: 'transparent' }} accessibilityLiveRegion="polite">
          <T variant="heading" color={correct ? theme.tint : theme.text}>
            {correct ? t('quiz.correct') : t('quiz.incorrect', { answer: q.options[q.correct_index] })}
          </T>
          <T>{q.explanation}</T>
          {q.source ? (
            <T variant="small" color={theme.textSecondary}>
              {t('quiz.source', { source: q.source })}
            </T>
          ) : null}
        </Card>
      ) : null}

      {checked ? (
        <Button label={pos + 1 < round.length ? t('quiz.next') : t('quiz.finish')} onPress={next} />
      ) : (
        <Button label={t('quiz.check')} onPress={check} disabled={picked === null} />
      )}
      <Button label={t('quiz.exit')} variant="ghost" onPress={() => router.back()} />
    </Screen>
  );
}

function Result({
  set,
  round,
  wrong,
  onRestart,
}: {
  set: QuizSet;
  round: number[];
  wrong: number[];
  onRestart: (onlyWrong: boolean) => void;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const score = round.length - wrong.length;
  const ratio = round.length ? score / round.length : 0;
  const message = ratio >= 0.9 ? t('quiz.great') : ratio >= 0.6 ? t('quiz.good') : t('quiz.keepGoing');
  const color = ratio >= 0.9 ? theme.tint : ratio >= 0.6 ? theme.sunText : theme.coral;
  const missed = useMemo(() => wrong.map((i) => set.content.questions[i]), [wrong, set]);

  return (
    <Screen edges={[]}>
      <Card style={{ alignItems: 'center', gap: Space.md, paddingVertical: Space.xxl }}>
        <T style={[styles.score, { color }]}>{t('quiz.resultTitle', { score, total: round.length })}</T>
        <T variant="heading" style={{ textAlign: 'center' }}>
          {message}
        </T>
      </Card>

      <View style={{ gap: Space.sm }}>
        {wrong.length ? <Button label={t('quiz.retryWrong')} icon="refresh" onPress={() => onRestart(true)} /> : null}
        <Button label={t('quiz.retryAll')} variant={wrong.length ? 'secondary' : 'primary'} onPress={() => onRestart(false)} />
        <Button label={t('common.done')} variant="ghost" onPress={() => router.back()} />
      </View>

      {missed.length ? (
        <>
          <SectionTitle>{t('quiz.review')}</SectionTitle>
          {missed.map((q, i) => (
            <Card key={i} style={{ gap: Space.xs }}>
              <T variant="bodyStrong">{q.question}</T>
              <Row gap={Space.sm}>
                <Icon name="check" size={18} color={theme.tint} />
                <T color={theme.tint} style={{ flex: 1 }}>
                  {q.options[q.correct_index]}
                </T>
              </Row>
              <T variant="small" color={theme.textSecondary}>
                {q.explanation} {q.source ? `· ${q.source}` : ''}
              </T>
            </Card>
          ))}
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  question: { fontFamily: Fonts.displayBold, fontSize: 22, lineHeight: 28, letterSpacing: -0.3 },
  option: { flexDirection: 'row', alignItems: 'center', gap: Space.md, padding: Space.md, borderRadius: Radius.lg, borderWidth: 2, minHeight: 60 },
  letter: { width: 32, height: 32, borderRadius: 10, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  score: { fontFamily: Fonts.display, fontSize: 48, lineHeight: 52, letterSpacing: -1.5 },
});
