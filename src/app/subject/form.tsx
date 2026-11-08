// Crear o editar una materia (hoja inferior). Con ?id= edita.
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Icon, iconForSubject, SUBJECT_ICONS } from '@/components/icon';
import { Button, Row, T, tap } from '@/components/ui';
import { Fonts, Radius, SubjectColors, type SubjectColor, Space } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { createSubject, getSubject, updateSubject } from '@/lib/api';
import { useSubjectName } from '@/lib/subject-name';
import type { Subject } from '@/lib/types';

export default function SubjectForm() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const theme = useTheme();
  const existing = useQuery({ queryKey: ['subject', id], queryFn: () => getSubject(id!), enabled: Boolean(id) });
  if (id && !existing.data) return <ActivityIndicator color={theme.tint} style={{ marginTop: Space.xxl }} />;
  return <Form id={id} initial={existing.data} />;
}

function Form({ id, initial }: { id?: string; initial?: Subject }) {
  const { t } = useTranslation();
  const theme = useTheme();
  const queryClient = useQueryClient();

  const nameOf = useSubjectName();
  const shownName = initial ? nameOf(initial) : '';
  const [name, setName] = useState(shownName);
  const [color, setColor] = useState<SubjectColor>((initial?.color as SubjectColor) ?? 'teal');
  const [chosenIcon, setChosenIcon] = useState<string | null>(initial?.icon ?? null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  // Mientras no elija ícono, sugerir uno por el nombre
  const icon = chosenIcon ?? (name ? iconForSubject(name) : 'book');

  async function save() {
    setSaving(true);
    setError(false);
    try {
      if (id) {
        // Solo se renombra si cambió el nombre que se ve; así no se pierde la traducción
        await updateSubject(id, name.trim() === shownName ? { color, icon } : { name: name.trim(), color, icon });
        queryClient.invalidateQueries({ queryKey: ['subject', id] });
        router.back();
      } else {
        const created = await createSubject({ name, color, icon });
        router.replace(`/subject/${created.id}`);
      }
      queryClient.invalidateQueries({ queryKey: ['subjects'] });
    } catch {
      setError(true);
      setSaving(false);
    }
  }

  const scheme = theme.scheme;

  return (
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <T variant="title">{id ? t('subject.editTitle') : t('subject.newTitle')}</T>

      <View style={{ gap: Space.sm }}>
        <T variant="caption" color={theme.textSecondary} style={{ textTransform: 'uppercase' }}>
          {t('subject.name')}
        </T>
        <TextInput
          value={name}
          onChangeText={setName}
          autoFocus={!id}
          maxLength={60}
          placeholder={t('subject.namePlaceholder')}
          placeholderTextColor={theme.textSecondary}
          style={[styles.input, { color: theme.text, borderColor: theme.border, backgroundColor: theme.background }]}
          accessibilityLabel={t('subject.name')}
        />
      </View>

      <View style={{ gap: Space.sm }}>
        <T variant="caption" color={theme.textSecondary} style={{ textTransform: 'uppercase' }}>
          {t('subject.color')}
        </T>
        <Row gap={Space.sm} style={{ flexWrap: 'wrap' }}>
          {(Object.keys(SubjectColors) as SubjectColor[]).map((key) => {
            const [strong] = SubjectColors[key][scheme];
            const active = key === color;
            return (
              <Pressable
                key={key}
                accessibilityRole="button"
                accessibilityLabel={key}
                accessibilityState={{ selected: active }}
                onPress={() => {
                  tap();
                  setColor(key);
                }}
                style={[styles.swatch, { backgroundColor: strong, borderColor: active ? theme.text : 'transparent' }]}>
                {active ? <Icon name="check" size={18} color="#FFFFFF" /> : null}
              </Pressable>
            );
          })}
        </Row>
      </View>

      <View style={{ gap: Space.sm }}>
        <T variant="caption" color={theme.textSecondary} style={{ textTransform: 'uppercase' }}>
          {t('subject.icon')}
        </T>
        <Row gap={Space.sm} style={{ flexWrap: 'wrap' }}>
          {SUBJECT_ICONS.map((key) => {
            const active = key === icon;
            const [strong, soft] = SubjectColors[color][scheme];
            return (
              <Pressable
                key={key}
                accessibilityRole="button"
                accessibilityLabel={t(`icons.${key}`)}
                accessibilityState={{ selected: active }}
                onPress={() => {
                  tap();
                  setChosenIcon(key);
                }}
                style={[styles.iconChoice, { backgroundColor: active ? strong : soft }]}>
                <Icon name={key} size={22} color={active ? '#FFFFFF' : strong} />
              </Pressable>
            );
          })}
        </Row>
      </View>

      {error ? <T color={theme.danger}>{t('common.error')}</T> : null}
      <Button label={id ? t('common.save') : t('subject.create')} onPress={save} loading={saving} disabled={!name.trim()} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: Space.xl, gap: Space.xl, paddingBottom: Space.xxxl },
  input: { minHeight: 54, borderRadius: Radius.lg, borderWidth: 1.5, paddingHorizontal: Space.lg, fontFamily: Fonts.bodySemi, fontSize: 18 },
  swatch: { width: 44, height: 44, borderRadius: 22, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  iconChoice: { width: 52, height: 52, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
});
