// Examen de práctica: una pregunta a la vez, con explicación y la página de donde salió.
// Respuesta correcta: rebote, sonido, confeti y racha. Incorrecta: sacudida y se resalta la buena.
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { BounceIn, Confetti, Reactive } from '@/components/celebrate';
import { Icon } from '@/components/icon';
import { Button, Card, ProgressBar, Row, Screen, SectionTitle, T } from '@/components/ui';
import { Fonts, Radius, Space } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getStudySet, recordQuizAttempt, recordStudy } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { play, preloadSounds } from '@/lib/feedback';
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
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  // Disparadores de animación
  const [popKey, setPopKey] = useState(0);
  const [answerPopKey, setAnswerPopKey] = useState(0);
  const [shakeKey, setShakeKey] = useState(0);
  const [fire, setFire] = useState(0);

  useEffect(() => {
    preloadSounds();
  }, []);

  const qIndex = round[pos];
  const q: Question | undefined = all[qIndex];

  function choose(i: number) {
    play('pop');
    setPicked(i);
  }

  function check() {
    if (picked === null || !q) return;
    setChecked(true);
    if (picked === q.correct_index) {
      play('correct');
      setPopKey((k) => k + 1);
      setFire((f) => f + 1);
      const nextStreak = streak + 1;
      setStreak(nextStreak);
      setBestStreak(Math.max(bestStreak, nextStreak));
    } else {
      play('wrong');
      setShakeKey((k) => k + 1);
      // la respuesta correcta rebota un instante después para llamar la atención
      setTimeout(() => setAnswerPopKey((k) => k + 1), 380);
      setStreak(0);
      setWrong((w) => [...w, qIndex]);
    }
  }

  function next() {
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
    setStreak(0);
    setBestStreak(0);
    setDone(false);
  }

  if (done) {
    return <Result set={set} round={round} wrong={wrong} bestStreak={bestStreak} onRestart={restart} />;
  }
  if (!q) return null;

  const correct = checked && picked === q.correct_index;

  return (
    <View style={{ flex: 1 }}>
      <Screen edges={[]}>
        <View style={{ gap: Space.sm }}>
          <ProgressBar value={(pos + (checked ? 1 : 0)) / round.length} color={theme.coral} />
          <Row style={{ justifyContent: 'space-between' }}>
            <T variant="small" color={theme.textSecondary}>
              {t('quiz.question', { current: pos + 1, total: round.length })}
            </T>
            {streak >= 2 ? (
              <BounceIn triggerKey={streak}>
                <Row gap={4}>
                  <Icon name="flame" size={16} color={theme.coral} />
                  <T variant="bodyStrong" color={theme.coral}>
                    {t('quiz.streak', { count: streak })}
                  </T>
                </Row>
              </BounceIn>
            ) : null}
          </Row>
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
              bg = theme.skySoft;
              border = theme.sky;
            }
            const dimmed = checked && !isAnswer && !isPicked;
            return (
              <Reactive
                key={`${pos}-${i}`}
                popKey={isPicked && correct ? popKey : isAnswer && checked && !correct ? answerPopKey : 0}
                shakeKey={isPicked && checked && !correct ? shakeKey : 0}>
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ selected: isPicked, disabled: checked }}
                  disabled={checked}
                  onPress={() => choose(i)}
                  style={({ pressed }) => [
                    styles.option,
                    { backgroundColor: bg, borderColor: border, opacity: dimmed ? 0.5 : pressed ? 0.85 : 1 },
                    pressed && { transform: [{ scale: 0.98 }] },
                  ]}>
                  <View
                    style={[
                      styles.letter,
                      { borderColor: border, backgroundColor: (checked && isAnswer) || (checked && isPicked) ? border : 'transparent' },
                    ]}>
                    {icon ? (
                      <Icon name={icon === 'check' ? 'check' : 'close'} size={16} color={theme.surface} />
                    ) : (
                      <T variant="bodyStrong">{String.fromCharCode(65 + i)}</T>
                    )}
                  </View>
                  <T style={{ flex: 1 }}>{opt}</T>
                </Pressable>
              </Reactive>
            );
          })}
        </View>

        {checked ? (
          <Animated.View entering={FadeInDown.springify().damping(14)} key={`fb-${pos}`}>
            <Card
              style={{ gap: Space.xs, backgroundColor: correct ? theme.tintSoft : theme.sunSoft, borderColor: correct ? theme.tint : theme.sun, borderWidth: 2 }}
              accessibilityLiveRegion="polite">
              <Row gap={Space.sm}>
                <Icon name={correct ? 'sparkle' : 'idea'} size={22} color={correct ? theme.tint : theme.sunText} />
                <T variant="heading" color={correct ? theme.tint : theme.text} style={{ flex: 1 }}>
                  {correct ? t('quiz.correct') : t('quiz.incorrect', { answer: q.options[q.correct_index] })}
                </T>
              </Row>
              <T>{q.explanation}</T>
              {q.source ? (
                <T variant="small" color={theme.textSecondary}>
                  {t('quiz.source', { source: q.source })}
                </T>
              ) : null}
            </Card>
          </Animated.View>
        ) : null}

        {checked ? (
          <Button label={pos + 1 < round.length ? t('quiz.next') : t('quiz.finish')} onPress={next} />
        ) : (
          <Button label={t('quiz.check')} onPress={check} disabled={picked === null} />
        )}
        <Button label={t('quiz.exit')} variant="ghost" onPress={() => router.back()} />
      </Screen>
      <Confetti fire={fire} count={streak >= 3 ? 34 : 20} spread={streak >= 3 ? 200 : 150} duration={1000} />
    </View>
  );
}

function Result({
  set,
  round,
  wrong,
  bestStreak,
  onRestart,
}: {
  set: QuizSet;
  round: number[];
  wrong: number[];
  bestStreak: number;
  onRestart: (onlyWrong: boolean) => void;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const score = round.length - wrong.length;
  const ratio = round.length ? score / round.length : 0;
  const message = ratio >= 0.9 ? t('quiz.great') : ratio >= 0.6 ? t('quiz.good') : t('quiz.keepGoing');
  const color = ratio >= 0.9 ? theme.tint : ratio >= 0.6 ? theme.sunText : theme.coral;
  const missed = useMemo(() => wrong.map((i) => set.content.questions[i]), [wrong, set]);

  // El puntaje sube contando, y al llegar se celebra
  const [shown, setShown] = useState(0);
  const [fire, setFire] = useState(0);
  useEffect(() => {
    if (score === 0) return;
    const step = Math.max(40, Math.round(900 / score));
    let n = 0;
    const timer = setInterval(() => {
      n += 1;
      setShown(n);
      if (n >= score) {
        clearInterval(timer);
        if (ratio >= 0.6) {
          play('win');
          setFire(1);
        }
      }
    }, step);
    return () => clearInterval(timer);
  }, [score, ratio]);

  return (
    <View style={{ flex: 1 }}>
      <Screen edges={[]}>
        <Card style={{ alignItems: 'center', gap: Space.md, paddingVertical: Space.xxl }}>
          <BounceIn triggerKey={fire}>
            <T style={[styles.score, { color }]}>{t('quiz.resultTitle', { score: shown, total: round.length })}</T>
          </BounceIn>
          <T variant="heading" style={{ textAlign: 'center' }}>
            {message}
          </T>
          {bestStreak >= 3 ? (
            <Row gap={6}>
              <Icon name="flame" size={18} color={theme.coral} />
              <T variant="bodyStrong" color={theme.coral}>
                {t('quiz.bestStreak', { count: bestStreak })}
              </T>
            </Row>
          ) : null}
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
      <Confetti fire={fire} count={ratio >= 0.9 ? 70 : 45} spread={280} duration={1600} style={{ justifyContent: 'flex-start', paddingTop: 140 }} />
    </View>
  );
}

const styles = StyleSheet.create({
  question: { fontFamily: Fonts.displayBold, fontSize: 22, lineHeight: 28, letterSpacing: -0.3 },
  option: { flexDirection: 'row', alignItems: 'center', gap: Space.md, padding: Space.md, borderRadius: Radius.lg, borderWidth: 2, minHeight: 60 },
  letter: { width: 32, height: 32, borderRadius: 10, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  score: { fontFamily: Fonts.display, fontSize: 52, lineHeight: 58, letterSpacing: -1.5, fontVariant: ['tabular-nums'] },
});
