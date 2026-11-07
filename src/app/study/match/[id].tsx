// Actividad "Relacionar": une cada concepto con su definición, usando las tarjetas del documento.
import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { Button, Card, IconBubble, Screen, T, tap } from '@/components/ui';
import { Radius, Space } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getStudySet, recordStudy } from '@/lib/api';
import type { Flashcard } from '@/lib/types';

const ROUND_SIZE = 5;

const nowMs = () => Date.now();
const elapsedSeconds = (start: number | null) => Math.round((nowMs() - (start ?? nowMs())) / 1000);

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function MatchScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const theme = useTheme();
  const set = useQuery({ queryKey: ['set', id], queryFn: () => getStudySet(id) });

  if (!set.data || set.data.kind !== 'flashcards') {
    return (
      <Screen edges={[]}>
        <ActivityIndicator color={theme.tint} />
      </Screen>
    );
  }
  if (set.data.content.cards.length < 4) {
    return (
      <Screen edges={[]}>
        <T>{t('match.notEnough')}</T>
      </Screen>
    );
  }
  return <Game cards={set.data.content.cards} />;
}

function Game({ cards }: { cards: Flashcard[] }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [seed, setSeed] = useState(0);
  const pairs = useMemo(() => shuffle(cards.map((c, i) => ({ ...c, i }))).slice(0, ROUND_SIZE), [cards, seed]); // eslint-disable-line react-hooks/exhaustive-deps
  const left = useMemo(() => shuffle(pairs), [pairs]);
  const right = useMemo(() => shuffle(pairs), [pairs]);

  const [selLeft, setSelLeft] = useState<number | null>(null);
  const [matched, setMatched] = useState<number[]>([]);
  const [shake, setShake] = useState<number | null>(null);
  const [mistakes, setMistakes] = useState(0);
  // Empieza a contar con el primer toque
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [seconds, setSeconds] = useState(0);
  const done = matched.length === pairs.length;

  useEffect(() => {
    if (done) recordStudy().catch(() => {});
  }, [done]);

  function pickRight(i: number) {
    if (selLeft === null) return;
    tap();
    if (selLeft === i) {
      if (matched.length + 1 === pairs.length) setSeconds(elapsedSeconds(startedAt));
      setMatched((m) => [...m, i]);
      setSelLeft(null);
    } else {
      setMistakes((m) => m + 1);
      setShake(i);
      setTimeout(() => setShake(null), 450);
    }
  }

  function again() {
    setSeed((s) => s + 1);
    setMatched([]);
    setSelLeft(null);
    setMistakes(0);
    setStartedAt(null);
  }

  if (done) {
    return (
      <Screen edges={[]} contentStyle={{ flexGrow: 1, justifyContent: 'center' }}>
        <Card style={{ alignItems: 'center', gap: Space.lg, paddingVertical: Space.xxl }}>
          <IconBubble name="match" color={theme.sky} bg={theme.skySoft} size={64} />
          <T variant="title">{t('match.doneTitle')}</T>
          <T color={theme.textSecondary} style={{ textAlign: 'center' }}>
            {t('match.doneBody', { seconds, mistakes })}
          </T>
          <View style={{ alignSelf: 'stretch', gap: Space.sm }}>
            <Button label={t('match.again')} onPress={again} />
            <Button label={t('common.done')} variant="secondary" onPress={() => router.back()} />
          </View>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen edges={[]}>
      <T color={theme.textSecondary}>{t('match.instructions')}</T>
      <View style={styles.columns}>
        <View style={styles.col}>
          {left.map((p) => {
            const isMatched = matched.includes(p.i);
            const isSel = selLeft === p.i;
            return (
              <Pressable
                key={`l${p.i}`}
                accessibilityRole="button"
                accessibilityState={{ selected: isSel, disabled: isMatched }}
                disabled={isMatched}
                onPress={() => {
                  tap();
                  if (startedAt === null) setStartedAt(nowMs());
                  setSelLeft(isSel ? null : p.i);
                }}
                style={[
                  styles.item,
                  {
                    backgroundColor: isMatched ? theme.tintSoft : isSel ? theme.skySoft : theme.surface,
                    borderColor: isMatched ? theme.tint : isSel ? theme.sky : theme.border,
                    opacity: isMatched ? 0.6 : 1,
                  },
                ]}>
                <T variant="bodyStrong" style={{ fontSize: 15 }}>
                  {p.front}
                </T>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.col}>
          {right.map((p) => {
            const isMatched = matched.includes(p.i);
            const isShake = shake === p.i;
            return (
              <Pressable
                key={`r${p.i}`}
                accessibilityRole="button"
                accessibilityState={{ disabled: isMatched }}
                disabled={isMatched}
                onPress={() => pickRight(p.i)}
                style={[
                  styles.item,
                  {
                    backgroundColor: isMatched ? theme.tintSoft : isShake ? theme.dangerSoft : theme.surface,
                    borderColor: isMatched ? theme.tint : isShake ? theme.danger : theme.border,
                    opacity: isMatched ? 0.6 : 1,
                  },
                ]}>
                <T variant="small">{p.back}</T>
              </Pressable>
            );
          })}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  columns: { flexDirection: 'row', gap: Space.sm },
  col: { flex: 1, gap: Space.sm, minWidth: 0 },
  item: { borderRadius: Radius.md, borderWidth: 2, padding: Space.md, minHeight: 72, justifyContent: 'center' },
});
