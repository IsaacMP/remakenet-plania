// "¿Qué quieres crear?": el botón + del organizador. Con ?subject= la nota queda en esa materia.
import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { KIND_ICON, useKindTone } from '@/components/organizer';
import { Card, IconBubble, Row, T } from '@/components/ui';
import { Space } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import type { ItemKind } from '@/lib/types';
import { Icon } from '@/components/icon';

const KINDS: ItemKind[] = ['note', 'idea', 'project', 'event'];

export default function CreateSheet() {
  const { subject } = useLocalSearchParams<{ subject?: string }>();
  const { t } = useTranslation();

  return (
    <View style={styles.root}>
      <T variant="title">{t('organize.ask')}</T>
      <View style={{ gap: Space.sm }}>
        {KINDS.map((kind) => (
          <KindOption
            key={kind}
            kind={kind}
            onPress={() => {
              router.back();
              router.push(subject ? `/item/new?kind=${kind}&subject=${subject}` : `/item/new?kind=${kind}`);
            }}
          />
        ))}
      </View>
    </View>
  );
}

function KindOption({ kind, onPress }: { kind: ItemKind; onPress: () => void }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const tone = useKindTone(kind);
  return (
    <Card onPress={onPress} accessibilityLabel={t(`organize.kinds.${kind}.name`)}>
      <Row>
        <IconBubble name={KIND_ICON[kind]} color={tone.color} bg={tone.bg} size={48} />
        <View style={{ flex: 1 }}>
          <T variant="heading">{t(`organize.kinds.${kind}.name`)}</T>
          <T variant="small" color={theme.textSecondary}>
            {t(`organize.kinds.${kind}.desc`)}
          </T>
        </View>
        <Icon name="chevron" size={16} color={theme.textSecondary} />
      </Row>
    </Card>
  );
}

const styles = StyleSheet.create({
  root: { padding: Space.xl, gap: Space.lg },
});
