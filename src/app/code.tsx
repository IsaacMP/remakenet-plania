// "Tengo un código": vista previa del examen/tarjetas compartidos y guardarlos en mis materias.
// También abre desde un enlace plania://code?c=K7R2QM
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, TextInput, View } from 'react-native';

import { Button, Card, IconBubble, Row, T } from '@/components/ui';
import { Fonts, Radius, Space } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { AppError, importShare, normalizeCode, previewShare } from '@/lib/api';
import type { SharePreview } from '@/lib/types';

export default function CodeSheet() {
  const params = useLocalSearchParams<{ c?: string }>();
  const { t } = useTranslation();
  const theme = useTheme();
  const queryClient = useQueryClient();

  const [code, setCode] = useState(normalizeCode(params.c ?? ''));
  const [saveState, setSaveState] = useState<'idle' | 'saving' | 'notFound' | 'error'>('idle');

  // La vista previa se busca sola en cuanto hay 6 caracteres
  const lookup = useQuery({
    queryKey: ['share-preview', code],
    queryFn: () => previewShare(code),
    enabled: code.length === 6,
    staleTime: 60_000,
  });
  const preview: SharePreview | null = code.length === 6 ? (lookup.data ?? null) : null;
  const state =
    saveState !== 'idle'
      ? saveState
      : code.length === 6 && lookup.isSuccess && !lookup.data
        ? 'notFound'
        : lookup.isError
          ? 'error'
          : 'idle';

  async function save() {
    setSaveState('saving');
    try {
      const newId = await importShare(code);
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      queryClient.invalidateQueries({ queryKey: ['shared-sets'] });
      router.back();
      router.push(preview?.kind === 'quiz' ? `/study/quiz/${newId}` : `/study/flashcards/${newId}`);
    } catch (err) {
      setSaveState(err instanceof AppError && err.code === 'not_found' ? 'notFound' : 'error');
    }
  }

  return (
    <View style={styles.root}>
      <IconBubble name="key" color={theme.sky} bg={theme.skySoft} size={56} />
      <View style={{ gap: Space.xs, alignItems: 'center' }}>
        <T variant="title">{t('share.enterTitle')}</T>
        <T color={theme.textSecondary} style={{ textAlign: 'center' }}>
          {t('share.enterBody')}
        </T>
      </View>

      <TextInput
        value={code}
        onChangeText={(v) => {
          setCode(normalizeCode(v));
          setSaveState('idle');
        }}
        autoCapitalize="characters"
        autoCorrect={false}
        autoFocus={!params.c}
        maxLength={7}
        placeholder="K7R2QM"
        placeholderTextColor={theme.border}
        accessibilityLabel={t('share.enterTitle')}
        style={[styles.input, { color: theme.text, borderColor: state === 'notFound' ? theme.danger : theme.border, backgroundColor: theme.background }]}
      />

      {state === 'notFound' ? <T color={theme.danger}>{t('share.notFound')}</T> : null}
      {state === 'error' ? <T color={theme.danger}>{t('common.error')}</T> : null}

      {preview ? (
        <Card style={{ alignSelf: 'stretch', gap: Space.xs }}>
          <Row>
            <IconBubble name={preview.kind === 'quiz' ? 'quiz' : 'cards'} color={theme.sky} bg={theme.skySoft} size={40} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <T variant="bodyStrong" numberOfLines={2}>
                {preview.title}
              </T>
              <T variant="small" color={theme.textSecondary}>
                {preview.kind === 'quiz'
                  ? t('share.previewQuiz', { count: preview.item_count })
                  : t('share.previewCards', { count: preview.item_count })}
                {preview.owner_name ? ` · ${t('share.from', { name: preview.owner_name })}` : ''}
              </T>
            </View>
          </Row>
        </Card>
      ) : null}

      <View style={{ alignSelf: 'stretch' }}>
        {preview ? (
          <Button label={t('share.save')} onPress={save} loading={state === 'saving'} />
        ) : (
          <Button label={t('share.lookup')} onPress={() => lookup.refetch()} loading={lookup.isFetching} disabled={code.length !== 6} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { padding: Space.xl, gap: Space.lg, alignItems: 'center' },
  input: {
    alignSelf: 'stretch',
    textAlign: 'center',
    fontFamily: Fonts.display,
    fontSize: 36,
    letterSpacing: 8,
    borderWidth: 2,
    borderRadius: Radius.xl,
    paddingVertical: Space.lg,
  },
});
