// Organizador: queda en segundo plano por ahora. Muestra lo que viene y deja apuntarse.
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Badge, Card, IconBubble, Row, Screen, SectionTitle, T } from '@/components/ui';
import { Fonts, Space } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { FUTURE_FEATURES, type FutureFeature } from '@/lib/plans';

const TYPES: { id: FutureFeature; tone: 'sky' | 'sun' | 'tint' | 'coral' }[] = [
  { id: 'organizer_note', tone: 'sky' },
  { id: 'organizer_idea', tone: 'sun' },
  { id: 'organizer_project', tone: 'tint' },
  { id: 'organizer_event', tone: 'coral' },
];

export default function Organize() {
  const { t } = useTranslation();
  const theme = useTheme();
  const tones = {
    sky: [theme.sky, theme.skySoft],
    sun: [theme.sunText, theme.sunSoft],
    tint: [theme.tint, theme.tintSoft],
    coral: [theme.coral, theme.coralSoft],
  };

  return (
    <Screen>
      <T style={[styles.title, { color: theme.text }]}>{t('organize.title')}</T>
      <T color={theme.textSecondary}>{t('organize.intro')}</T>

      <SectionTitle>{t('organize.ask')}</SectionTitle>
      <View style={{ gap: Space.md }}>
        {[TYPES.slice(0, 2), TYPES.slice(2)].map((row, r) => (
          <Row key={r} gap={Space.md} style={{ alignItems: 'stretch' }}>
            {row.map(({ id, tone }) => (
              <Card key={id} onPress={() => router.push(`/waitlist/${id}`)} style={{ flex: 1, gap: Space.md }}>
                <Row style={{ justifyContent: 'space-between' }}>
                  <IconBubble name={FUTURE_FEATURES[id].icon} color={tones[tone][0]} bg={tones[tone][1]} />
                  <Badge label={t('common.soon')} tone={tone} />
                </Row>
                <View style={{ gap: 2 }}>
                  <T variant="heading">{t(`features.${id}.name`)}</T>
                  <T variant="small" color={theme.textSecondary}>
                    {t(`features.${id}.desc`)}
                  </T>
                </View>
              </Card>
            ))}
          </Row>
        ))}
      </View>

      <Card onPress={() => router.push('/waitlist/focus')}>
        <Row>
          <IconBubble name="timer" color={theme.tint} bg={theme.tintSoft} />
          <View style={{ flex: 1 }}>
            <T variant="heading">{t('features.focus.name')}</T>
            <T variant="small" color={theme.textSecondary}>
              {t('features.focus.desc')}
            </T>
          </View>
          <Badge label={t('common.soon')} />
        </Row>
      </Card>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: Fonts.display, fontSize: 32, lineHeight: 36, letterSpacing: -1 },
});
