// Tarjetas con repaso espaciado: toca para voltear, "Me la sé" o "Repasar".
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Animated, Pressable, StyleSheet, View } from 'react-native';

import { Button, Card, IconBubble, ProgressBar, Row, Screen, T } from '@/components/ui';
import { Fonts, Radius, Space } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getStudySet, recordStudy, saveCardProgress } from '@/lib/api';
import { play, preloadSounds } from '@/lib/feedback';
import { Confetti } from '@/components/celebrate';
import { useAuth } from '@/lib/auth';
import { dueCards, review } from '@/lib/srs';
import type { CardProgress, StudySet } from '@/lib/types';

type CardsSet = Extract<StudySet, { kind: 'flashcards' }>;

export default function FlashcardsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const theme = useTheme();
  const set = useQuery({ queryKey: ['set', id], queryFn: () => getStudySet(id) });

  if (!set.data || set.data.kind !== 'flashcards') {
    return (
      <Screen edges={[]}>
        <ActivityIndicator color={theme.tint} />
      </Screen>
    );
  }
  return <Session set={set.data} />;
}

function Session({ set }: { set: CardsSet }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const queryClient = useQueryClient();
  const { refreshProfile } = useAuth();
  const cards = set.content.cards;

  const [progress, setProgress] = useState<CardProgress>(set.progress ?? {});
  const [queue, setQueue] = useState<number[]>(() => dueCards(cards.length, set.progress ?? {}));
  const [pos, setPos] = useState(0);
  const [known, setKnown] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [flip] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.spring(flip, { toValue: flipped ? 1 : 0, useNativeDriver: true, friction: 8, tension: 60 }).start();
  }, [flipped, flip]);

  const finished = pos >= queue.length;

  useEffect(() => {
    preloadSounds();
  }, []);

  useEffect(() => {
    if (finished && queue.length > 0) {
      play('win');
      saveCardProgress(set.id, progress).catch(() => {});
      recordStudy().then(() => refreshProfile()).catch(() => {});
      queryClient.invalidateQueries({ queryKey: ['sets'] });
    }
    // Solo al terminar la sesión
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished]);

  function answer(knew: boolean) {
    play(knew ? 'correct' : 'pop');
    const index = queue[pos];
    setProgress((p) => review(p, index, knew));
    if (knew) setKnown((k) => k + 1);
    setFlipped(false);
    setPos((p) => p + 1);
  }

  function restart(all: boolean) {
    const next = all ? cards.map((_, i) => i) : dueCards(cards.length, progress);
    setQueue(next.length ? next : cards.map((_, i) => i));
    setPos(0);
    setKnown(0);
    setFlipped(false);
  }

  if (queue.length === 0) {
    return (
      <Screen edges={[]} contentStyle={{ flexGrow: 1, justifyContent: 'center' }}>
        <Card style={{ alignItems: 'center', gap: Space.lg, paddingVertical: Space.xxl }}>
          <IconBubble name="check" color={theme.tint} bg={theme.tintSoft} size={64} />
          <T variant="heading" style={{ textAlign: 'center' }}>
            {t('flashcards.allCaughtUp')}
          </T>
          <Button label={t('flashcards.studyAll')} onPress={() => restart(true)} style={{ alignSelf: 'stretch' }} />
        </Card>
      </Screen>
    );
  }

  if (finished) {
    return (
      <Screen edges={[]} contentStyle={{ flexGrow: 1, justifyContent: 'center' }}>
        <Card style={{ alignItems: 'center', gap: Space.lg, paddingVertical: Space.xxl }}>
          <IconBubble name="sparkle" color={theme.sunText} bg={theme.sunSoft} size={64} />
          <T variant="title" style={{ textAlign: 'center' }}>
            {t('flashcards.doneTitle')}
          </T>
          <T color={theme.textSecondary} style={{ textAlign: 'center' }}>
            {t('flashcards.doneBody', { known, total: queue.length })}
          </T>
          <View style={{ alignSelf: 'stretch', gap: Space.sm }}>
            <Button label={t('flashcards.again')} onPress={() => restart(false)} />
            <Button label={t('common.done')} variant="secondary" onPress={() => router.back()} />
          </View>
        </Card>
        <Confetti fire={known > 0 ? 1 : 0} count={40} spread={240} />
      </Screen>
    );
  }

  const card = cards[queue[pos]];
  const frontRotate = flip.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '180deg'] });
  const backRotate = flip.interpolate({ inputRange: [0, 1], outputRange: ['180deg', '360deg'] });

  return (
    <Screen edges={[]} scroll={false}>
      <View style={{ gap: Space.sm }}>
        <ProgressBar value={pos / queue.length} color={theme.sun} />
        <T variant="small" color={theme.textSecondary}>
          {t('flashcards.progress', { current: pos + 1, total: queue.length })}
        </T>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={flipped ? card.back : card.front}
        accessibilityHint={flipped ? undefined : t('flashcards.tapToFlip')}
        onPress={() => {
          play('pop');
          setFlipped((f) => !f);
        }}
        style={{ flex: 1 }}>
        <Animated.View
          style={[styles.face, { backgroundColor: theme.surface, borderColor: theme.border, transform: [{ perspective: 1200 }, { rotateY: frontRotate }] }]}>
          <T style={[styles.cardText, { color: theme.text }]}>{card.front}</T>
          <T variant="small" color={theme.textSecondary}>
            {t('flashcards.tapToFlip')}
          </T>
        </Animated.View>
        <Animated.View
          style={[
            styles.face,
            StyleSheet.absoluteFill,
            { backgroundColor: theme.sunSoft, borderColor: theme.sun, transform: [{ perspective: 1200 }, { rotateY: backRotate }] },
          ]}>
          <T style={[styles.cardBack, { color: theme.text }]}>{card.back}</T>
          {card.source ? (
            <T variant="small" color={theme.textSecondary}>
              {t('quiz.source', { source: card.source })}
            </T>
          ) : null}
        </Animated.View>
      </Pressable>

      <Row gap={Space.md}>
        <Button label={t('flashcards.didntKnow')} variant="secondary" icon="refresh" onPress={() => answer(false)} style={{ flex: 1 }} disabled={!flipped} />
        <Button label={t('flashcards.knew')} icon="check" onPress={() => answer(true)} style={{ flex: 1 }} disabled={!flipped} />
      </Row>
    </Screen>
  );
}

const styles = StyleSheet.create({
  face: {
    flex: 1,
    borderRadius: Radius.xl,
    borderWidth: 2,
    padding: Space.xl,
    alignItems: 'center',
    justifyContent: 'center',
    gap: Space.lg,
    backfaceVisibility: 'hidden',
  },
  cardText: { fontFamily: Fonts.display, fontSize: 26, lineHeight: 32, textAlign: 'center', letterSpacing: -0.5 },
  cardBack: { fontFamily: Fonts.bodySemi, fontSize: 20, lineHeight: 28, textAlign: 'center' },
});
