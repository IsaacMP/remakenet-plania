// Actividad "Relacionar": une cada concepto con su definición, usando las tarjetas del documento.
// Aciertos con rebote, sonido y combo; errores con sacudida; confeti al terminar.
import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { BounceIn, Confetti, Reactive } from '@/components/celebrate';
import { Icon } from '@/components/icon';
import { Button, Card, IconBubble, Row, Screen, T } from '@/components/ui';
import { Fonts, Radius, Space } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getStudySet, recordStudy } from '@/lib/api';
import { play, preloadSounds } from '@/lib/feedback';
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

type Pair = Flashcard & { i: number };

function Game({ cards }: { cards: Flashcard[] }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [seed, setSeed] = useState(0);
  const pairs = useMemo<Pair[]>(() => shuffle(cards.map((c, i) => ({ ...c, i }))).slice(0, ROUND_SIZE), [cards, seed]); // eslint-disable-line react-hooks/exhaustive-deps
  const left = useMemo(() => shuffle(pairs), [pairs]);
  const right = useMemo(() => shuffle(pairs), [pairs]);

  const [selLeft, setSelLeft] = useState<number | null>(null);
  const [matched, setMatched] = useState<number[]>([]);
  const [mistakes, setMistakes] = useState(0);
  const [combo, setCombo] = useState(0);
  // Contadores que disparan animaciones: cada cambio = una animación nueva
  const [popKeys, setPopKeys] = useState<Record<number, number>>({});
  const [shakeKeys, setShakeKeys] = useState<Record<string, number>>({});
  const [wrongFlash, setWrongFlash] = useState<string | null>(null);
  const [fire, setFire] = useState(0);
  // Empieza a contar con el primer toque
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [seconds, setSeconds] = useState(0);
  const done = matched.length === pairs.length;

  useEffect(() => {
    preloadSounds();
  }, []);

  useEffect(() => {
    if (!done) return;
    recordStudy().catch(() => {});
    const timer = setTimeout(() => {
      play('win');
      setFire((f) => f + 1);
    }, 350);
    return () => clearTimeout(timer);
  }, [done]);

  function bump<K extends string | number>(setter: (fn: (m: Record<K, number>) => Record<K, number>) => void, key: K) {
    setter((m) => ({ ...m, [key]: (m[key] ?? 0) + 1 }));
  }

  function pickLeft(i: number) {
    play('pop');
    if (startedAt === null) setStartedAt(nowMs());
    setSelLeft(selLeft === i ? null : i);
  }

  function pickRight(i: number) {
    if (selLeft === null) {
      // Primero hay que elegir un concepto: sacudir la columna para indicarlo
      play('pop');
      return;
    }
    if (selLeft === i) {
      play('correct');
      if (matched.length + 1 === pairs.length) setSeconds(elapsedSeconds(startedAt));
      bump(setPopKeys, i);
      setCombo((c) => c + 1);
      setMatched((m) => [...m, i]);
      setSelLeft(null);
    } else {
      play('wrong');
      setMistakes((m) => m + 1);
      setCombo(0);
      bump(setShakeKeys, `l${selLeft}`);
      bump(setShakeKeys, `r${i}`);
      setWrongFlash(`r${i}`);
      setTimeout(() => setWrongFlash(null), 500);
    }
  }

  function again() {
    setSeed((s) => s + 1);
    setMatched([]);
    setSelLeft(null);
    setMistakes(0);
    setCombo(0);
    setStartedAt(null);
  }

  if (done) {
    const perfect = mistakes === 0;
    return (
      <Screen edges={[]} contentStyle={{ flexGrow: 1, justifyContent: 'center' }}>
        <Card style={{ alignItems: 'center', gap: Space.lg, paddingVertical: Space.xxl, overflow: 'visible' }}>
          <BounceIn triggerKey={fire}>
            <IconBubble name={perfect ? 'sparkle' : 'match'} color={perfect ? theme.sunText : theme.sky} bg={perfect ? theme.sunSoft : theme.skySoft} size={72} />
          </BounceIn>
          <T variant="title">{t('match.doneTitle')}</T>
          <T color={theme.textSecondary} style={{ textAlign: 'center' }}>
            {t('match.doneBody', { seconds, mistakes })}
          </T>
          <View style={{ alignSelf: 'stretch', gap: Space.sm }}>
            <Button label={t('match.again')} onPress={again} />
            <Button label={t('common.done')} variant="secondary" onPress={() => router.back()} />
          </View>
        </Card>
        <Confetti fire={fire} count={perfect ? 60 : 40} spread={260} />
      </Screen>
    );
  }

  return (
    <Screen edges={[]}>
      <Row style={{ justifyContent: 'space-between' }}>
        <T color={theme.textSecondary} style={{ flex: 1 }}>
          {t('match.instructions')}
        </T>
        <T variant="bodyStrong" color={theme.tint}>
          {matched.length}/{pairs.length}
        </T>
      </Row>

      {combo >= 2 ? (
        <BounceIn triggerKey={combo} style={{ alignSelf: 'center' }}>
          <View style={[styles.combo, { backgroundColor: theme.sunSoft, borderColor: theme.sun }]}>
            <Icon name="flame" size={18} color={theme.coral} />
            <T style={[styles.comboText, { color: theme.text }]}>{t('match.combo', { count: combo })}</T>
          </View>
        </BounceIn>
      ) : null}

      <View style={styles.columns}>
        <View style={styles.col}>
          {left.map((p) => {
            const isMatched = matched.includes(p.i);
            const isSel = selLeft === p.i;
            return (
              <Reactive key={`l${p.i}`} shakeKey={shakeKeys[`l${p.i}`]} popKey={popKeys[p.i]}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSel, disabled: isMatched }}
                  disabled={isMatched}
                  onPress={() => pickLeft(p.i)}
                  style={[
                    styles.item,
                    {
                      backgroundColor: isMatched ? theme.tintSoft : isSel ? theme.skySoft : theme.surface,
                      borderColor: isMatched ? theme.tint : isSel ? theme.sky : theme.border,
                      transform: [{ scale: isSel ? 1.03 : 1 }],
                    },
                  ]}>
                  <T variant="bodyStrong" style={{ fontSize: 15, opacity: isMatched ? 0.55 : 1 }}>
                    {p.front}
                  </T>
                  {isMatched ? <Icon name="check" size={18} color={theme.tint} style={styles.check} /> : null}
                </Pressable>
              </Reactive>
            );
          })}
        </View>
        <View style={styles.col}>
          {right.map((p) => {
            const isMatched = matched.includes(p.i);
            const isWrong = wrongFlash === `r${p.i}`;
            return (
              <Reactive key={`r${p.i}`} shakeKey={shakeKeys[`r${p.i}`]} popKey={popKeys[p.i]}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ disabled: isMatched }}
                  disabled={isMatched}
                  onPress={() => pickRight(p.i)}
                  style={[
                    styles.item,
                    {
                      backgroundColor: isMatched ? theme.tintSoft : isWrong ? theme.dangerSoft : theme.surface,
                      borderColor: isMatched ? theme.tint : isWrong ? theme.danger : theme.border,
                    },
                  ]}>
                  <T variant="small" style={{ opacity: isMatched ? 0.55 : 1 }}>
                    {p.back}
                  </T>
                  {isMatched ? <Icon name="check" size={18} color={theme.tint} style={styles.check} /> : null}
                </Pressable>
              </Reactive>
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
  check: { position: 'absolute', top: 6, right: 6 },
  combo: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 6, borderRadius: Radius.pill, borderWidth: 2 },
  comboText: { fontFamily: Fonts.display, fontSize: 16 },
});
