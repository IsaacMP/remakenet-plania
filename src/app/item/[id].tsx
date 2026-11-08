// Crear o editar una nota, idea, proyecto o evento. /item/new?kind=note&subject=… crea uno nuevo.
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon } from '@/components/icon';
import {
  DateButton,
  KIND_ICON,
  LocationField,
  type Place,
  ProTools,
  SubjectPicker,
  TaskEditor,
  formatDay,
  formatTime,
  parseDateOnly,
  toDateOnly,
  useKindTone,
} from '@/components/organizer';
import { Button, Chip, IconBubble, ProgressBar, Row, T, tap } from '@/components/ui';
import { Fonts, Radius, Space } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { convertIdeaToProject, deleteItem, getItem, listSubjects, saveItem } from '@/lib/api';
import { ORGANIZER_PRO } from '@/lib/plans';
import { cancelReminder, ensureNotificationPermission, scheduleReminder } from '@/lib/reminders';
import type { Item, ItemKind, ProjectTask } from '@/lib/types';

const KINDS: ItemKind[] = ['note', 'idea', 'project', 'event'];
const REMINDERS = { none: null, at: 0, m10: 10, h1: 60, d1: 1440 } as const;
type ReminderKey = keyof typeof REMINDERS;

function reminderKey(minutes: number | null): ReminderKey {
  const found = (Object.keys(REMINDERS) as ReminderKey[]).find((k) => REMINDERS[k] === minutes);
  return found ?? 'none';
}

export default function ItemScreen() {
  const params = useLocalSearchParams<{ id: string; kind?: string; subject?: string }>();
  const isNew = params.id === 'new';
  const theme = useTheme();
  const item = useQuery({ queryKey: ['item', params.id], queryFn: () => getItem(params.id), enabled: !isNew });
  const subjects = useQuery({ queryKey: ['subjects'], queryFn: listSubjects });

  if ((!isNew && !item.data) || !subjects.data) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.background, justifyContent: 'center' }}>
        <ActivityIndicator color={theme.tint} />
      </View>
    );
  }
  const kind = (isNew ? (KINDS.includes(params.kind as ItemKind) ? params.kind : 'note') : item.data!.kind) as ItemKind;
  return <Editor key={params.id} initial={isNew ? null : item.data!} kind={kind} defaultSubject={params.subject ?? null} subjects={subjects.data} />;
}

function Editor({
  initial,
  kind,
  defaultSubject,
  subjects,
}: {
  initial: Item | null;
  kind: ItemKind;
  defaultSubject: string | null;
  subjects: Awaited<ReturnType<typeof listSubjects>>;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const tone = useKindTone(kind);
  const queryClient = useQueryClient();

  const [title, setTitle] = useState(initial?.title ?? '');
  const [body, setBody] = useState(initial?.body ?? '');
  const [subjectId, setSubjectId] = useState<string | null>(initial?.subject_id ?? defaultSubject);
  const [pinned, setPinned] = useState(initial?.pinned ?? false);
  const [done, setDone] = useState(initial?.done ?? false);
  const [dueDate, setDueDate] = useState<Date | null>(initial?.due_date ? parseDateOnly(initial.due_date) : null);
  const [tasks, setTasks] = useState<ProjectTask[]>(initial?.tasks ?? []);
  const [start, setStart] = useState<Date | null>(initial?.starts_at ? new Date(initial.starts_at) : null);
  const [allDay, setAllDay] = useState(initial?.all_day ?? false);
  const [place, setPlace] = useState<Place | null>(
    initial?.latitude != null && initial.longitude != null
      ? { name: initial.location_name ?? '', address: initial.location_address ?? '', latitude: initial.latitude, longitude: initial.longitude }
      : null,
  );
  const [remind, setRemind] = useState<ReminderKey>(initial ? reminderKey(initial.remind_minutes) : 'm10');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const doneTasks = tasks.filter((x) => x.done).length;

  function invalidate(subject: string | null) {
    queryClient.invalidateQueries({ queryKey: ['items'] });
    queryClient.invalidateQueries({ queryKey: ['upcoming'] });
    queryClient.invalidateQueries({ queryKey: ['subject-items'] });
    if (initial) queryClient.invalidateQueries({ queryKey: ['item', initial.id] });
    if (subject) queryClient.invalidateQueries({ queryKey: ['subject-items', subject] });
  }

  async function save() {
    if (!title.trim()) {
      setError(t('organize.needTitle'));
      return;
    }
    if (kind === 'event' && !start) {
      setError(t('organize.needDate'));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      let startsAt: string | null = null;
      if (kind === 'event' && start) {
        const s = new Date(start);
        if (allDay) s.setHours(9, 0, 0, 0);
        startsAt = s.toISOString();
      }
      const saved = await saveItem(initial?.id ?? null, {
        kind,
        title,
        body,
        subject_id: subjectId,
        pinned,
        done,
        due_date: kind === 'project' && dueDate ? toDateOnly(dueDate) : null,
        tasks: kind === 'project' ? tasks.filter((x) => x.text.trim()) : [],
        starts_at: startsAt,
        all_day: kind === 'event' ? allDay : false,
        location_name: kind === 'event' ? (place?.name ?? null) : null,
        location_address: kind === 'event' ? (place?.address ?? null) : null,
        latitude: kind === 'event' ? (place?.latitude ?? null) : null,
        longitude: kind === 'event' ? (place?.longitude ?? null) : null,
        remind_minutes: kind === 'event' ? REMINDERS[remind] : null,
      });
      if (kind === 'event') {
        const when = start ? (allDay ? formatDay(start, t) : `${formatDay(start, t)} · ${formatTime(start)}`) : '';
        if (REMINDERS[remind] !== null && !(await ensureNotificationPermission())) {
          Alert.alert(t('organize.notificationsDenied'));
        }
        await scheduleReminder(saved, { title: saved.title, body: t('organize.reminderBody', { when }) }).catch(() => {});
      }
      invalidate(subjectId);
      router.back();
    } catch {
      setError(t('common.error'));
      setSaving(false);
    }
  }

  function confirmDelete() {
    if (!initial) return;
    Alert.alert(t('organize.deleteConfirm'), undefined, [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          await deleteItem(initial.id);
          await cancelReminder(initial.id);
          invalidate(initial.subject_id);
          router.back();
        },
      },
    ]);
  }

  async function convert() {
    if (!initial) return;
    setSaving(true);
    try {
      const project = await convertIdeaToProject({ ...initial, title, body, subject_id: subjectId });
      invalidate(subjectId);
      router.replace(`/item/${project.id}`);
    } catch {
      setError(t('common.error'));
      setSaving(false);
    }
  }

  // Al elegir fecha conservamos la hora ya elegida, y viceversa
  function setDatePart(d: Date) {
    const base = start ?? new Date(new Date().setHours(9, 0, 0, 0));
    setStart(new Date(d.getFullYear(), d.getMonth(), d.getDate(), base.getHours(), base.getMinutes()));
  }
  function setTimePart(d: Date) {
    const base = start ?? new Date();
    setStart(new Date(base.getFullYear(), base.getMonth(), base.getDate(), d.getHours(), d.getMinutes()));
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: initial ? t(`organize.editTitle.${kind}`) : t(`organize.newTitle.${kind}`),
          headerRight: () =>
            initial ? (
              <Pressable accessibilityRole="button" accessibilityLabel={t('common.delete')} onPress={confirmDelete} hitSlop={10}>
                <Icon name="trash" size={20} color={theme.danger} />
              </Pressable>
            ) : null,
        }}
      />
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: theme.background }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Row>
            <IconBubble name={KIND_ICON[kind]} color={tone.color} bg={tone.bg} size={44} />
            <TextInput
              value={title}
              onChangeText={(v) => {
                setTitle(v);
                if (error) setError(null);
              }}
              autoFocus={!initial}
              maxLength={200}
              multiline
              placeholder={t(`organize.titlePlaceholder.${kind}`)}
              placeholderTextColor={theme.textSecondary}
              accessibilityLabel={t('subject.name')}
              style={[styles.title, { color: theme.text }]}
            />
          </Row>

          {kind === 'event' ? (
            <View style={{ gap: Space.sm }}>
              <Label text={t('organize.date')} />
              <Row gap={Space.sm}>
                <DateButton value={start} mode="date" onChange={setDatePart} placeholder={t('organize.pickDate')} />
                {!allDay ? <DateButton value={start} mode="time" onChange={setTimePart} placeholder={t('organize.time')} icon="clock" /> : null}
              </Row>
              <Row gap={Space.sm}>
                <Chip label={t('organize.allDay')} selected={allDay} onPress={() => setAllDay((v) => !v)} />
              </Row>
            </View>
          ) : null}

          {kind === 'event' ? (
            <View style={{ gap: Space.sm }}>
              <Label text={t('organize.location')} />
              <LocationField value={place} onChange={setPlace} />
            </View>
          ) : null}

          <View style={{ gap: Space.sm }}>
            <TextInput
              value={body}
              onChangeText={setBody}
              multiline
              maxLength={20000}
              placeholder={t(`organize.bodyPlaceholder.${kind}`)}
              placeholderTextColor={theme.textSecondary}
              textAlignVertical="top"
              style={[
                styles.body,
                { color: theme.text, backgroundColor: theme.surface, borderColor: theme.border, minHeight: kind === 'note' ? 220 : 110 },
              ]}
            />
          </View>

          {kind === 'project' ? (
            <View style={{ gap: Space.sm }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <Label text={t('organize.tasks')} />
                {tasks.length ? (
                  <T variant="small" color={theme.textSecondary}>
                    {t('organize.progress', { done: doneTasks, total: tasks.length })}
                  </T>
                ) : null}
              </Row>
              {tasks.length ? <ProgressBar value={doneTasks / tasks.length} color={tone.color} /> : null}
              <TaskEditor tasks={tasks} onChange={setTasks} />
              <Label text={t('organize.dueDate')} />
              <Row gap={Space.sm}>
                <DateButton value={dueDate} mode="date" onChange={setDueDate} placeholder={t('organize.noDate')} />
                {dueDate ? <Chip label={t('organize.clear')} onPress={() => setDueDate(null)} /> : null}
              </Row>
            </View>
          ) : null}

          {kind === 'event' ? (
            <View style={{ gap: Space.sm }}>
              <Label text={t('organize.remind')} />
              <Row gap={Space.sm} style={{ flexWrap: 'wrap' }}>
                {(Object.keys(REMINDERS) as ReminderKey[]).map((k) => (
                  <Chip key={k} label={t(`organize.remindOptions.${k}`)} icon={k === 'none' ? undefined : 'bell'} selected={remind === k} onPress={() => setRemind(k)} />
                ))}
              </Row>
            </View>
          ) : null}

          <View style={{ gap: Space.sm }}>
            <Label text={t('organize.subject')} />
            <SubjectPicker subjects={subjects} value={subjectId} onChange={setSubjectId} />
            <T variant="small" color={theme.textSecondary}>
              {t('organize.subjectHint')}
            </T>
          </View>

          <Pressable
            accessibilityRole="switch"
            accessibilityState={{ checked: pinned }}
            onPress={() => {
              tap();
              setPinned((p) => !p);
            }}
            style={[styles.toggle, { backgroundColor: pinned ? theme.coralSoft : theme.surface, borderColor: pinned ? theme.coral : theme.border }]}>
            <Icon name="pin" size={20} color={pinned ? theme.coral : theme.textSecondary} />
            <View style={{ flex: 1 }}>
              <T variant="bodyStrong">{t('organize.pin')}</T>
              <T variant="small" color={theme.textSecondary}>
                {t('organize.pinHint')}
              </T>
            </View>
            <View style={[styles.switch, { backgroundColor: pinned ? theme.coral : theme.border }]}>
              <View style={[styles.knob, { alignSelf: pinned ? 'flex-end' : 'flex-start', backgroundColor: theme.surface }]} />
            </View>
          </Pressable>

          {kind === 'idea' && initial ? (
            initial.converted_to ? (
              <Button label={t('organize.openProject')} variant="secondary" icon="arrow" onPress={() => router.push(`/item/${initial.converted_to}`)} />
            ) : (
              <Button label={t('organize.convert')} variant="secondary" icon="checklist" onPress={convert} loading={saving} />
            )
          ) : null}

          {kind === 'project' && initial ? (
            <Button label={done ? t('organize.reopen') : t('organize.markDone')} variant="secondary" icon={done ? 'refresh' : 'check'} onPress={() => setDone((d) => !d)} />
          ) : null}

          <ProTools features={ORGANIZER_PRO[kind]} />
        </ScrollView>

        <SafeAreaView edges={['bottom']} style={[styles.footer, { borderColor: theme.border, backgroundColor: theme.background }]}>
          {error ? (
            <T variant="small" color={theme.danger}>
              {error}
            </T>
          ) : null}
          <Button label={t('organize.save')} onPress={save} loading={saving} />
        </SafeAreaView>
      </KeyboardAvoidingView>
    </>
  );
}

function Label({ text }: { text: string }) {
  const theme = useTheme();
  return (
    <T variant="caption" color={theme.textSecondary} style={{ textTransform: 'uppercase' }}>
      {text}
    </T>
  );
}

const styles = StyleSheet.create({
  content: { padding: Space.lg, gap: Space.xl, paddingBottom: Space.xxxl },
  title: { flex: 1, fontFamily: Fonts.display, fontSize: 24, lineHeight: 30, letterSpacing: -0.5, paddingVertical: 0 },
  body: { borderRadius: Radius.lg, borderWidth: 1, padding: Space.lg, fontFamily: Fonts.body, fontSize: 16, lineHeight: 23 },
  toggle: { flexDirection: 'row', alignItems: 'center', gap: Space.md, padding: Space.md, borderRadius: Radius.lg, borderWidth: 1.5 },
  switch: { width: 46, height: 28, borderRadius: 14, padding: 3, justifyContent: 'center' },
  knob: { width: 22, height: 22, borderRadius: 11 },
  footer: { paddingHorizontal: Space.lg, paddingTop: Space.md, paddingBottom: Space.md, gap: Space.sm, borderTopWidth: 1 },
});
