// Compartir un examen o tarjetas con un código de 6 letras.
import { useQuery } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Share, StyleSheet, View } from 'react-native';

import { Button, IconBubble, T } from '@/components/ui';
import { Fonts, Radius, Space } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { createShare, getStudySet } from '@/lib/api';

export default function ShareSheet() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const theme = useTheme();
  const set = useQuery({ queryKey: ['set', id], queryFn: () => getStudySet(id) });
  const share = useQuery({ queryKey: ['share', id], queryFn: () => createShare(id) });
  const [copied, setCopied] = useState(false);

  const code = share.data?.code;
  const pretty = code ? `${code.slice(0, 3)}-${code.slice(3)}` : '';

  async function copy() {
    if (!code) return;
    await Clipboard.setStringAsync(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  async function send() {
    if (!code || !set.data) return;
    await Share.share({ message: t('share.message', { title: set.data.title, code: pretty }) });
  }

  return (
    <View style={styles.root}>
      <IconBubble name="send" color={theme.sky} bg={theme.skySoft} size={56} />
      <T variant="title" style={{ textAlign: 'center' }} numberOfLines={3}>
        {set.data?.title ?? t('share.title')}
      </T>
      <T color={theme.textSecondary} style={{ textAlign: 'center' }}>
        {t('share.body')}
      </T>

      {share.isPending ? (
        <ActivityIndicator color={theme.tint} />
      ) : share.isError ? (
        <T color={theme.danger}>{t('common.error')}</T>
      ) : (
        <View
          style={[styles.code, { backgroundColor: theme.skySoft }]}
          accessible
          accessibilityLabel={code?.split('').join(' ')}>
          <T style={[styles.codeText, { color: theme.sky }]} selectable>
            {pretty}
          </T>
        </View>
      )}

      {share.data && share.data.uses > 0 ? (
        <T variant="small" color={theme.textSecondary}>
          {t('share.uses', { count: share.data.uses })}
        </T>
      ) : null}

      <View style={{ alignSelf: 'stretch', gap: Space.sm }}>
        <Button label={t('share.shareButton')} icon="send" onPress={send} disabled={!code} />
        <Button label={copied ? t('common.copied') : t('common.copy')} variant="secondary" icon={copied ? 'check' : undefined} onPress={copy} disabled={!code} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { padding: Space.xl, gap: Space.lg, alignItems: 'center' },
  code: { borderRadius: Radius.xl, paddingVertical: Space.lg, paddingHorizontal: Space.xl, alignSelf: 'stretch', alignItems: 'center' },
  codeText: { fontFamily: Fonts.display, fontSize: 40, lineHeight: 46, letterSpacing: 6 },
});
