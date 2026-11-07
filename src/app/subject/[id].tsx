// Una materia: sus documentos y el botón para subir uno nuevo.
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as DocumentPicker from 'expo-document-picker';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, Pressable, StyleSheet } from 'react-native';

import { Icon } from '@/components/icon';
import { Badge, Button, Card, EmptyState, IconBubble, ListRow, Row, Screen, SectionTitle, T } from '@/components/ui';
import { Fonts, Space } from '@/constants/theme';
import { useSubjectColor, useTheme } from '@/hooks/use-theme';
import { ACCEPTED_MIME, deleteSubject, getSubject, listDocuments, listSharedSets, mimeFromName, uploadDocument } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { errorMessage } from '@/lib/errors';
import { PLAN_LIMITS } from '@/lib/plans';
import type { StudyDocument } from '@/lib/types';

export default function SubjectScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { t } = useTranslation();
  const theme = useTheme();
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const plan = profile?.plan ?? 'free';
  const maxMb = PLAN_LIMITS[plan].maxFileMb;

  const subject = useQuery({ queryKey: ['subject', id], queryFn: () => getSubject(id) });
  const docs = useQuery({
    queryKey: ['documents', id],
    queryFn: () => listDocuments(id),
    // Mientras haya algo preparándose, revisar cada 3 segundos
    refetchInterval: (q) => (q.state.data?.some((d) => d.status === 'processing' || d.status === 'uploaded') ? 3000 : false),
  });
  const shared = useQuery({
    queryKey: ['shared-sets', id],
    queryFn: () => listSharedSets(id),
    enabled: Boolean(subject.data?.is_shared_inbox),
  });

  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const c = useSubjectColor(subject.data?.color ?? 'teal');

  async function pickAndUpload() {
    setUploadError(null);
    const result = await DocumentPicker.getDocumentAsync({
      type: Object.keys(ACCEPTED_MIME),
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (result.canceled || !result.assets?.[0]) return;
    const asset = result.assets[0];
    const mimeType = mimeFromName(asset.name, asset.mimeType);
    if (!mimeType) {
      setUploadError(errorMessage(t, 'unsupported'));
      return;
    }
    setUploading(true);
    try {
      const doc = await uploadDocument(id, { uri: asset.uri, name: asset.name, mimeType, size: asset.size ?? 0 }, maxMb);
      queryClient.invalidateQueries({ queryKey: ['documents', id] });
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
      router.push(`/document/${doc.id}`);
    } catch (err) {
      setUploadError(errorMessage(t, err, plan));
      queryClient.invalidateQueries({ queryKey: ['documents', id] });
    } finally {
      setUploading(false);
    }
  }

  function confirmDelete() {
    if (!subject.data) return;
    Alert.alert(t('subject.deleteConfirm', { name: subject.data.name }), undefined, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          await deleteSubject(id);
          queryClient.invalidateQueries({ queryKey: ['subjects'] });
          queryClient.invalidateQueries({ queryKey: ['recent-document'] });
          router.back();
        },
      },
    ]);
  }

  const isInbox = subject.data?.is_shared_inbox;
  const list = docs.data ?? [];

  return (
    <>
      <Stack.Screen
        options={{
          title: '',
          headerRight: () => (
            <Row gap={Space.lg}>
              {!isInbox ? (
                <Pressable accessibilityRole="button" accessibilityLabel={t('subject.editTitle')} onPress={() => router.push(`/subject/form?id=${id}`)} hitSlop={10}>
                  <Icon name="pencil" size={20} color={theme.tint} />
                </Pressable>
              ) : null}
              <Pressable accessibilityRole="button" accessibilityLabel={t('common.delete')} onPress={confirmDelete} hitSlop={10}>
                <Icon name="trash" size={20} color={theme.danger} />
              </Pressable>
            </Row>
          ),
        }}
      />
      <Screen edges={[]}>
        {subject.data ? (
          <Row>
            <IconBubble name={subject.data.icon} color={c.strong} bg={c.soft} size={52} />
            <T style={[styles.title, { color: theme.text }]} numberOfLines={2}>
              {subject.data.name}
            </T>
          </Row>
        ) : (
          <ActivityIndicator color={theme.tint} />
        )}

        {isInbox ? (
          <>
            <T color={theme.textSecondary}>{t('subject.sharedInbox')}</T>
            {(shared.data ?? []).map((s) => (
              <ListRow
                key={s.id}
                icon={s.kind === 'quiz' ? 'quiz' : 'cards'}
                title={s.title}
                subtitle={
                  s.kind === 'quiz'
                    ? t('document.tools.quizHint', { count: s.content.questions.length })
                    : s.kind === 'flashcards'
                      ? t('document.tools.flashcardsHint', { count: s.content.cards.length })
                      : undefined
                }
                tone={{ color: theme.sky, bg: theme.skySoft }}
                onPress={() => router.push(s.kind === 'quiz' ? `/study/quiz/${s.id}` : `/study/flashcards/${s.id}`)}
              />
            ))}
          </>
        ) : (
          <>
            <Card style={{ backgroundColor: c.soft, borderColor: c.soft, gap: Space.md }}>
              <Button label={t('subject.upload')} icon="upload" onPress={pickAndUpload} loading={uploading} />
              <T variant="small" color={theme.textSecondary} style={{ textAlign: 'center' }}>
                {uploading ? t('document.status.uploading') : t('subject.uploadHint', { mb: maxMb })}
              </T>
              {uploadError ? (
                <Row gap={Space.sm} style={{ alignItems: 'flex-start' }}>
                  <Icon name="warning" size={18} color={theme.danger} />
                  <T variant="small" color={theme.danger} style={{ flex: 1 }}>
                    {uploadError}
                  </T>
                </Row>
              ) : null}
            </Card>

            {docs.isSuccess && list.length === 0 ? (
              <EmptyState icon="doc" title={t('subject.emptyTitle')} body={t('subject.emptyBody')} />
            ) : null}

            {list.length ? <SectionTitle>{t('subject.documents')}</SectionTitle> : null}
            {list.map((doc) => (
              <DocumentRow key={doc.id} doc={doc} />
            ))}
          </>
        )}
      </Screen>
    </>
  );
}

function DocumentRow({ doc }: { doc: StudyDocument }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const ext = doc.mime_type.includes('presentation') ? 'PPT' : doc.mime_type.includes('word') ? 'DOC' : 'PDF';
  const working = doc.status === 'processing' || doc.status === 'uploaded';
  return (
    <ListRow
      icon="doc"
      tone={{ color: theme.coral, bg: theme.coralSoft }}
      title={doc.title}
      subtitle={
        working
          ? t('document.status.processing')
          : doc.status === 'failed'
            ? t('document.status.failed')
            : t('document.status.ready')
      }
      onPress={() => router.push(`/document/${doc.id}`)}
      right={
        <Row gap={Space.sm}>
          {working ? <ActivityIndicator color={theme.tint} /> : doc.status === 'failed' ? <Icon name="warning" size={18} color={theme.danger} /> : <Badge label={ext} tone="coral" />}
          <Icon name="chevron" size={16} color={theme.textSecondary} />
        </Row>
      }
    />
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: Fonts.display, fontSize: 28, lineHeight: 32, letterSpacing: -0.8, flex: 1 },
});

