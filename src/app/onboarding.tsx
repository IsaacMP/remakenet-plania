// Primer minuto: "¿Qué estudias?" y elegir materias. Sale con algo útil, sin tutorial.
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { iconForSubject, type IconName } from '@/components/icon';
import { LanguageToggle } from '@/components/language-toggle';
import { LogoMark } from '@/components/logo';
import { Button, Card, Chip, IconBubble, Row, T } from '@/components/ui';
import { Fonts, Radius, Space } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { createSubjects, updateProfile } from '@/lib/api';
import { firstName, useAuth } from '@/lib/auth';
import { currentLocale } from '@/lib/i18n';
import type { Profile } from '@/lib/types';

type Level = NonNullable<Profile['level']>;

export default function Onboarding() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { profile, session, refreshProfile } = useAuth();
  const [level, setLevel] = useState<Level | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [custom, setCustom] = useState('');
  const [extra, setExtra] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);

  const levels: { id: Level; icon: IconName }[] = [
    { id: 'prepa', icon: 'pen' },
    { id: 'uni', icon: 'scale' },
    { id: 'other', icon: 'sparkle' },
  ];

  const templates = level ? (t(`onboarding.templates.${level}`, { returnObjects: true }) as string[]) : [];
  const options = [...templates, ...extra];

  function toggle(name: string) {
    setSelected((cur) => (cur.includes(name) ? cur.filter((n) => n !== name) : [...cur, name]));
  }

  function addCustom() {
    const name = custom.trim();
    if (!name) return;
    if (!options.includes(name)) setExtra((e) => [...e, name]);
    if (!selected.includes(name)) setSelected((s) => [...s, name]);
    setCustom('');
  }

  async function finish() {
    if (!level) return;
    setSaving(true);
    setError(false);
    try {
      if (selected.length) await createSubjects(selected, iconForSubject);
      await updateProfile({ level, onboarded: true, locale: currentLocale() });
      await refreshProfile();
    } catch {
      setError(true);
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Row>
          <LogoMark size={36} />
          <T variant="heading" color={theme.textSecondary} style={{ flex: 1 }} numberOfLines={1}>
            {t('onboarding.hello', { name: firstName(profile, session) })}
          </T>
          <LanguageToggle
            onChange={() => {
              // Las materias sugeridas cambian de idioma; empezar la selección de nuevo
              setSelected([]);
              setExtra([]);
            }}
          />
        </Row>

        <View style={{ gap: Space.sm }}>
          <T style={[styles.question, { color: theme.text }]}>{t('onboarding.levelQuestion')}</T>
          <T variant="body" color={theme.textSecondary}>
            {t('onboarding.levelHint')}
          </T>
        </View>

        <View style={{ gap: Space.sm }}>
          {levels.map((l) => {
            const active = level === l.id;
            return (
              <Card
                key={l.id}
                accessibilityState={{ selected: active }}
                onPress={() => {
                  setLevel(l.id);
                  setSelected([]);
                  setExtra([]);
                }}
                style={active ? { borderColor: theme.tint, borderWidth: 2, backgroundColor: theme.tintSoft } : undefined}>
                <Row>
                  <IconBubble name={l.icon} color={active ? theme.onTint : theme.tint} bg={active ? theme.tint : theme.tintSoft} />
                  <T variant="heading">{t(`onboarding.levels.${l.id}`)}</T>
                </Row>
              </Card>
            );
          })}
        </View>

        {level ? (
          <View style={{ gap: Space.md }}>
            <View style={{ gap: Space.xs }}>
              <T variant="title">{t('onboarding.subjectsQuestion')}</T>
              <T variant="body" color={theme.textSecondary}>
                {t('onboarding.subjectsHint')}
              </T>
            </View>
            <View style={styles.chips}>
              {options.map((name) => (
                <Chip
                  key={name}
                  label={name}
                  icon={iconForSubject(name)}
                  selected={selected.includes(name)}
                  onPress={() => toggle(name)}
                />
              ))}
            </View>
            <Row gap={Space.sm}>
              <TextInput
                value={custom}
                onChangeText={setCustom}
                onSubmitEditing={addCustom}
                placeholder={t('onboarding.addCustom')}
                placeholderTextColor={theme.textSecondary}
                returnKeyType="done"
                maxLength={60}
                style={[styles.input, { color: theme.text, backgroundColor: theme.surface, borderColor: theme.border }]}
              />
              <Button label={t('onboarding.add')} variant="secondary" onPress={addCustom} disabled={!custom.trim()} />
            </Row>
          </View>
        ) : null}
      </ScrollView>

      {level ? (
        <View style={[styles.footer, { borderColor: theme.border, backgroundColor: theme.background }]}>
          {error ? (
            <T variant="small" color={theme.danger}>
              {t('common.error')}
            </T>
          ) : null}
          <Button
            label={
              selected.length
                ? `${t('onboarding.start')} · ${t('onboarding.selected', { count: selected.length })}`
                : t('onboarding.start')
            }
            onPress={finish}
            loading={saving}
          />
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  content: { padding: Space.xl, gap: Space.xl, paddingBottom: 140 },
  question: { fontFamily: Fonts.display, fontSize: 34, lineHeight: 38, letterSpacing: -1 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: Space.sm },
  input: { flex: 1, minHeight: 52, borderRadius: Radius.lg, borderWidth: 1.5, paddingHorizontal: Space.lg, fontFamily: Fonts.body, fontSize: 16 },
  footer: { padding: Space.lg, gap: Space.sm, borderTopWidth: 1 },
});
