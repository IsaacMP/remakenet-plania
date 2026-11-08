// Piezas del organizador: tarjeta de cada elemento, selector de materia, fecha, tareas,
// lugar y la fila de herramientas Pro (todavía "Próximamente").
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Linking, Platform, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Icon, type IconName } from '@/components/icon';
import { Badge, Card, IconBubble, ProgressBar, Row, T, tap } from '@/components/ui';
import { Fonts, Radius, Space } from '@/constants/theme';
import { useSubjectColor, useTheme } from '@/hooks/use-theme';
import type { SubjectWithCount } from '@/lib/api';
import { currentLocale } from '@/lib/i18n';
import { FUTURE_FEATURES, type FutureFeature } from '@/lib/plans';
import type { ItemKind, ItemWithSubject, ProjectTask } from '@/lib/types';

// ── Apariencia por tipo ─────────────────────────

export const KIND_ICON: Record<ItemKind, IconName> = { note: 'note', idea: 'idea', project: 'checklist', event: 'calendar' };

export function useKindTone(kind: ItemKind): { color: string; bg: string } {
  const theme = useTheme();
  return {
    note: { color: theme.sky, bg: theme.skySoft },
    idea: { color: theme.sunText, bg: theme.sunSoft },
    project: { color: theme.tint, bg: theme.tintSoft },
    event: { color: theme.coral, bg: theme.coralSoft },
  }[kind];
}

// ── Fechas ──────────────────────────────────────

function locale() {
  return currentLocale() === 'en' ? 'en-US' : 'es-MX';
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** "Hoy", "Mañana" o "jue 12 nov". */
export function formatDay(date: Date, t: (k: string) => string): string {
  const today = new Date();
  const tomorrow = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
  if (sameDay(date, today)) return t('organize.today');
  if (sameDay(date, tomorrow)) return t('organize.tomorrow');
  return date.toLocaleDateString(locale(), { weekday: 'short', day: 'numeric', month: 'short' });
}

export function formatTime(date: Date): string {
  return date.toLocaleTimeString(locale(), { hour: 'numeric', minute: '2-digit' });
}

/** Fecha sin hora (proyectos) guardada como "2026-11-28". */
export function parseDateOnly(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function toDateOnly(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// ── Tarjeta en las listas ───────────────────────

export function ItemCard({ item, showSubject = true }: { item: ItemWithSubject; showSubject?: boolean }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const tone = useKindTone(item.kind);
  const subjectColor = useSubjectColor(item.subjects?.color ?? 'teal');

  let detail: string | null = null;
  let detailColor = theme.textSecondary;
  if (item.kind === 'event' && item.starts_at) {
    const start = new Date(item.starts_at);
    detail = item.all_day ? formatDay(start, t) : `${formatDay(start, t)} · ${formatTime(start)}`;
    if (item.location_name) detail += ` · ${item.location_name}`;
  } else if (item.kind === 'project') {
    const done = item.tasks.filter((x) => x.done).length;
    detail = item.tasks.length ? t('organize.progress', { done, total: item.tasks.length }) : null;
    if (item.due_date) {
      const due = parseDateOnly(item.due_date);
      const overdue = !item.done && due < parseDateOnly(toDateOnly(new Date()));
      const label = overdue ? t('organize.overdue', { date: formatDay(due, t) }) : t('organize.due', { date: formatDay(due, t) });
      detail = detail ? `${detail} · ${label}` : label;
      if (overdue) detailColor = theme.danger;
    }
  } else if (item.body) {
    detail = item.body.replace(/\s+/g, ' ').slice(0, 120);
  }

  const progress = item.kind === 'project' && item.tasks.length ? item.tasks.filter((x) => x.done).length / item.tasks.length : null;

  return (
    <Card onPress={() => router.push(`/item/${item.id}`)} style={{ gap: Space.sm, opacity: item.done ? 0.6 : 1 }}>
      <Row style={{ alignItems: 'flex-start' }}>
        <IconBubble name={KIND_ICON[item.kind]} color={tone.color} bg={tone.bg} size={40} />
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <Row gap={6}>
            <T variant="bodyStrong" numberOfLines={2} style={{ flex: 1, textDecorationLine: item.done ? 'line-through' : 'none' }}>
              {item.title || t('organize.untitled')}
            </T>
            {item.pinned ? <Icon name="pin" size={16} color={theme.coral} /> : null}
          </Row>
          {detail ? (
            <T variant="small" color={detailColor} numberOfLines={2}>
              {detail}
            </T>
          ) : null}
          {showSubject && item.subjects ? (
            <View style={[styles.subjectTag, { backgroundColor: subjectColor.soft }]}>
              <Icon name={item.subjects.icon} size={12} color={subjectColor.strong} />
              <T variant="caption" color={subjectColor.strong} numberOfLines={1}>
                {item.subjects.name}
              </T>
            </View>
          ) : null}
        </View>
      </Row>
      {progress !== null ? <ProgressBar value={progress} color={tone.color} /> : null}
    </Card>
  );
}

// ── Selector de materia ─────────────────────────

export function SubjectPicker({
  subjects,
  value,
  onChange,
}: {
  subjects: SubjectWithCount[];
  value: string | null;
  onChange: (id: string | null) => void;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const options = subjects.filter((s) => !s.is_shared_inbox);
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: Space.sm, paddingRight: Space.lg }}>
      <SubjectChip label={t('organize.noSubject')} selected={value === null} onPress={() => onChange(null)} color={theme.textSecondary} soft={theme.surfaceAlt} />
      {options.map((s) => (
        <SubjectOption key={s.id} subject={s} selected={value === s.id} onPress={() => onChange(s.id)} />
      ))}
    </ScrollView>
  );
}

function SubjectOption({ subject, selected, onPress }: { subject: SubjectWithCount; selected: boolean; onPress: () => void }) {
  const c = useSubjectColor(subject.color);
  return <SubjectChip label={subject.name} icon={subject.icon} selected={selected} onPress={onPress} color={c.strong} soft={c.soft} />;
}

function SubjectChip({
  label,
  icon,
  selected,
  onPress,
  color,
  soft,
}: {
  label: string;
  icon?: string;
  selected: boolean;
  onPress: () => void;
  color: string;
  soft: string;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={() => {
        tap();
        onPress();
      }}
      style={[styles.subjectChip, { backgroundColor: selected ? color : soft, borderColor: selected ? color : 'transparent' }]}>
      {icon ? <Icon name={icon} size={15} color={selected ? theme.surface : color} /> : null}
      <T variant="small" color={selected ? theme.surface : theme.text} numberOfLines={1}>
        {label}
      </T>
    </Pressable>
  );
}

// ── Fecha y hora ────────────────────────────────

/** Botón que abre el selector nativo de fecha u hora. */
export function DateButton({
  value,
  mode,
  onChange,
  placeholder,
  icon = 'calendar',
}: {
  value: Date | null;
  mode: 'date' | 'time';
  onChange: (date: Date) => void;
  placeholder: string;
  icon?: IconName;
}) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [iosOpen, setIosOpen] = useState(false);
  const label = value ? (mode === 'date' ? formatDay(value, t) : formatTime(value)) : placeholder;

  function open() {
    tap();
    const current = value ?? new Date();
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: current,
        mode,
        is24Hour: currentLocale() !== 'en',
        onChange: (event, date) => {
          if (event.type === 'set' && date) onChange(date);
        },
      });
    } else {
      setIosOpen((o) => !o);
    }
  }

  return (
    <View style={{ flex: 1 }}>
      <Pressable
        accessibilityRole="button"
        onPress={open}
        style={[styles.field, { borderColor: theme.border, backgroundColor: theme.background }]}>
        <Icon name={icon} size={18} color={value ? theme.tint : theme.textSecondary} />
        <T color={value ? theme.text : theme.textSecondary} numberOfLines={1} style={{ flex: 1 }}>
          {label}
        </T>
      </Pressable>
      {iosOpen && Platform.OS === 'ios' ? (
        <DateTimePicker
          value={value ?? new Date()}
          mode={mode}
          display={mode === 'date' ? 'inline' : 'spinner'}
          onValueChange={(_e, date) => onChange(date)}
        />
      ) : null}
    </View>
  );
}

// ── Tareas del proyecto ─────────────────────────

let taskCounter = 0;
function newTaskId() {
  taskCounter += 1;
  return `${Date.now().toString(36)}-${taskCounter}`;
}

export function TaskEditor({ tasks, onChange }: { tasks: ProjectTask[]; onChange: (tasks: ProjectTask[]) => void }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [draft, setDraft] = useState('');

  function add() {
    const text = draft.trim();
    if (!text) return;
    onChange([...tasks, { id: newTaskId(), text, done: false }]);
    setDraft('');
  }

  return (
    <View style={{ gap: Space.sm }}>
      {tasks.map((task) => (
        <Row key={task.id} gap={Space.sm}>
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: task.done }}
            accessibilityLabel={task.text}
            hitSlop={8}
            onPress={() => {
              tap();
              onChange(tasks.map((x) => (x.id === task.id ? { ...x, done: !x.done } : x)));
            }}
            style={[styles.check, { borderColor: task.done ? theme.tint : theme.textSecondary, backgroundColor: task.done ? theme.tint : 'transparent' }]}>
            {task.done ? <Icon name="check" size={14} color={theme.onTint} /> : null}
          </Pressable>
          <TextInput
            value={task.text}
            onChangeText={(text) => onChange(tasks.map((x) => (x.id === task.id ? { ...x, text } : x)))}
            style={[styles.taskInput, { color: task.done ? theme.textSecondary : theme.text, textDecorationLine: task.done ? 'line-through' : 'none' }]}
          />
          <Pressable accessibilityRole="button" accessibilityLabel={t('common.delete')} hitSlop={8} onPress={() => onChange(tasks.filter((x) => x.id !== task.id))}>
            <Icon name="close" size={16} color={theme.textSecondary} />
          </Pressable>
        </Row>
      ))}
      <Row gap={Space.sm}>
        <View style={[styles.check, { borderColor: theme.border, borderStyle: 'dashed' }]} />
        <TextInput
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={add}
          returnKeyType="done"
          blurOnSubmit={false}
          placeholder={t('organize.taskPlaceholder')}
          placeholderTextColor={theme.textSecondary}
          style={[styles.taskInput, { color: theme.text }]}
        />
        {draft.trim() ? (
          <Pressable accessibilityRole="button" onPress={add} hitSlop={8}>
            <T variant="bodyStrong" color={theme.tint}>
              {t('organize.addTask')}
            </T>
          </Pressable>
        ) : null}
      </Row>
    </View>
  );
}

// ── Lugar con el mapa del celular ───────────────

export type Place = { name: string; address: string; latitude: number; longitude: number };

function formatAddress(a: Location.LocationGeocodedAddress): string {
  return [a.name && a.name !== a.street ? a.name : null, [a.street, a.streetNumber].filter(Boolean).join(' '), a.district, a.city, a.region]
    .filter((x) => x && String(x).trim())
    .join(', ');
}

export function mapsUrl(place: { latitude: number; longitude: number; name?: string | null }) {
  const q = encodeURIComponent(`${place.latitude},${place.longitude}`);
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}

/**
 * Busca el lugar con el servicio de mapas del propio celular (sin costo ni llaves).
 * Guarda nombre, dirección y coordenadas exactas; se abre en Google Maps con un toque.
 */
export function LocationField({ value, onChange }: { value: Place | null; onChange: (place: Place | null) => void }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const [query, setQuery] = useState('');
  const [state, setState] = useState<'idle' | 'loading' | 'notFound' | 'denied'>('idle');

  async function permission(): Promise<boolean> {
    const current = await Location.getForegroundPermissionsAsync();
    if (current.granted) return true;
    const asked = await Location.requestForegroundPermissionsAsync();
    return asked.granted;
  }

  async function search() {
    const text = query.trim();
    if (!text) return;
    setState('loading');
    try {
      if (!(await permission())) {
        setState('denied');
        return;
      }
      const [hit] = await Location.geocodeAsync(text);
      if (!hit) {
        setState('notFound');
        return;
      }
      const [address] = await Location.reverseGeocodeAsync({ latitude: hit.latitude, longitude: hit.longitude }).catch(() => []);
      onChange({ name: text, address: address ? formatAddress(address) : '', latitude: hit.latitude, longitude: hit.longitude });
      setQuery('');
      setState('idle');
    } catch {
      setState('notFound');
    }
  }

  async function useMine() {
    setState('loading');
    try {
      if (!(await permission())) {
        setState('denied');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const [address] = await Location.reverseGeocodeAsync(pos.coords).catch(() => []);
      const formatted = address ? formatAddress(address) : '';
      onChange({ name: address?.name || formatted.split(',')[0] || t('organize.location'), address: formatted, latitude: pos.coords.latitude, longitude: pos.coords.longitude });
      setState('idle');
    } catch {
      setState('notFound');
    }
  }

  if (value) {
    return (
      <View style={[styles.place, { backgroundColor: theme.coralSoft }]}>
        <Row style={{ alignItems: 'flex-start' }}>
          <Icon name="place" size={20} color={theme.coral} />
          <View style={{ flex: 1, minWidth: 0 }}>
            <T variant="bodyStrong">{value.name}</T>
            {value.address ? (
              <T variant="small" color={theme.textSecondary}>
                {value.address}
              </T>
            ) : null}
          </View>
        </Row>
        <Row gap={Space.lg}>
          <Pressable accessibilityRole="link" onPress={() => Linking.openURL(mapsUrl(value))} hitSlop={6}>
            <T variant="bodyStrong" color={theme.tint}>
              {t('organize.openMaps')}
            </T>
          </Pressable>
          <Pressable accessibilityRole="button" onPress={() => onChange(null)} hitSlop={6}>
            <T variant="bodyStrong" color={theme.textSecondary}>
              {t('organize.removeLocation')}
            </T>
          </Pressable>
        </Row>
      </View>
    );
  }

  return (
    <View style={{ gap: Space.sm }}>
      <Row gap={Space.sm}>
        <View style={[styles.field, { flex: 1, borderColor: theme.border, backgroundColor: theme.background }]}>
          <Icon name="place" size={18} color={theme.textSecondary} />
          <TextInput
            value={query}
            onChangeText={(v) => {
              setQuery(v);
              if (state !== 'loading') setState('idle');
            }}
            onSubmitEditing={search}
            returnKeyType="search"
            placeholder={t('organize.locationPlaceholder')}
            placeholderTextColor={theme.textSecondary}
            style={{ flex: 1, color: theme.text, fontFamily: Fonts.body, fontSize: 16, paddingVertical: 0 }}
          />
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={search}
          disabled={!query.trim() || state === 'loading'}
          style={[styles.searchBtn, { backgroundColor: query.trim() ? theme.tint : theme.surfaceAlt }]}>
          {state === 'loading' ? <ActivityIndicator color={theme.onTint} /> : <T variant="bodyStrong" color={query.trim() ? theme.onTint : theme.textSecondary}>{t('organize.search')}</T>}
        </Pressable>
      </Row>
      <Pressable accessibilityRole="button" onPress={useMine} hitSlop={6} style={{ alignSelf: 'flex-start' }}>
        <T variant="small" color={theme.tint}>
          {t('organize.useMyLocation')}
        </T>
      </Pressable>
      {state === 'notFound' ? <T variant="small" color={theme.danger}>{t('organize.locationNotFound')}</T> : null}
      {state === 'denied' ? <T variant="small" color={theme.danger}>{t('organize.locationPermission')}</T> : null}
    </View>
  );
}

// ── Herramientas Pro (próximamente) ─────────────

export function ProTools({ features }: { features: FutureFeature[] }) {
  const { t } = useTranslation();
  const theme = useTheme();
  if (!features.length) return null;
  return (
    <View style={{ gap: Space.sm }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <T variant="caption" color={theme.textSecondary} style={{ textTransform: 'uppercase' }}>
          {t('organize.proTools')}
        </T>
        <Badge label={`${t('common.pro')} · ${t('common.soon')}`} tone="sun" />
      </Row>
      <View style={{ gap: Space.sm }}>
        {features.map((f) => (
          <Pressable
            key={f}
            accessibilityRole="button"
            accessibilityHint={t('waitlist.title')}
            onPress={() => {
              tap();
              router.push(`/waitlist/${f}`);
            }}
            style={({ pressed }) => [styles.proRow, { borderColor: theme.sun, backgroundColor: theme.sunSoft, opacity: pressed ? 0.8 : 1 }]}>
            <Icon name={FUTURE_FEATURES[f].icon} size={20} color={theme.sunText} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <T variant="bodyStrong">{t(`features.${f}.name`)}</T>
              <T variant="small" color={theme.textSecondary} numberOfLines={2}>
                {t(`features.${f}.desc`)}
              </T>
            </View>
            <Icon name="lock" size={16} color={theme.sunText} />
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  subjectTag: { flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: Radius.pill, marginTop: 4, maxWidth: '100%' },
  subjectChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 9, borderRadius: Radius.pill, borderWidth: 1.5, maxWidth: 220 },
  field: { flexDirection: 'row', alignItems: 'center', gap: Space.sm, minHeight: 50, borderRadius: Radius.lg, borderWidth: 1.5, paddingHorizontal: Space.md },
  check: { width: 24, height: 24, borderRadius: 8, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  taskInput: { flex: 1, fontFamily: Fonts.body, fontSize: 16, paddingVertical: 6 },
  place: { borderRadius: Radius.lg, padding: Space.md, gap: Space.md },
  searchBtn: { minHeight: 50, paddingHorizontal: Space.lg, borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center' },
  proRow: { flexDirection: 'row', alignItems: 'center', gap: Space.md, padding: Space.md, borderRadius: Radius.lg, borderWidth: 1.5, borderStyle: 'dashed' },
});
