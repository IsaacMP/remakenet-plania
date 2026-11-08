import { useQuery, useQueryClient } from '@tanstack/react-query';
import Constants from 'expo-constants';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Alert, StyleSheet, View } from 'react-native';

import { Badge, Button, Card, Chip, IconBubble, ListRow, Row, Screen, SectionTitle, T } from '@/components/ui';
import { Fonts, Space } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { deleteAccount, updateProfile, usageThisMonth } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { setThemePreference, useThemePreference } from '@/lib/appearance';
import { setSoundsEnabled, useSoundsEnabled } from '@/lib/feedback';
import { type AppLocale, currentLocale, setAppLocale } from '@/lib/i18n';
import { PLAN_LIMITS } from '@/lib/plans';
import type { Profile } from '@/lib/types';

export default function ProfileScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const queryClient = useQueryClient();
  const { profile, session, signOut, refreshProfile } = useAuth();
  const usage = useQuery({ queryKey: ['usage'], queryFn: usageThisMonth });
  const [locale, setLocale] = useState<AppLocale>(currentLocale());
  const [deleting, setDeleting] = useState(false);
  const sounds = useSoundsEnabled();
  const themePref = useThemePreference();

  const plan = profile?.plan ?? 'free';
  const limit = PLAN_LIMITS[plan].generationsPerMonth;
  const avatar = profile?.avatar_url ?? (session?.user.user_metadata?.avatar_url as string | undefined);

  async function changeLocale(next: AppLocale) {
    setLocale(next);
    await setAppLocale(next);
    updateProfile({ locale: next }).catch(() => {});
  }

  async function changeLevel(level: NonNullable<Profile['level']>) {
    await updateProfile({ level }).catch(() => {});
    refreshProfile();
  }

  function confirmDelete() {
    Alert.alert(t('profile.deleteAccount'), t('profile.deleteConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('profile.deleteConfirmButton'),
        style: 'destructive',
        onPress: async () => {
          setDeleting(true);
          try {
            await deleteAccount();
            queryClient.clear();
          } catch {
            setDeleting(false);
            Alert.alert(t('common.error'));
          }
        },
      },
    ]);
  }

  return (
    <Screen>
      <Row>
        {avatar ? (
          <Image source={{ uri: avatar }} style={styles.avatar} accessibilityIgnoresInvertColors />
        ) : (
          <IconBubble name="person" color={theme.tint} bg={theme.tintSoft} size={64} />
        )}
        <View style={{ flex: 1, minWidth: 0 }}>
          <T style={[styles.name, { color: theme.text }]} numberOfLines={1}>
            {profile?.full_name ?? ''}
          </T>
          <T variant="small" color={theme.textSecondary} numberOfLines={1}>
            {profile?.email ?? session?.user.email}
          </T>
        </View>
      </Row>

      <Card style={{ gap: Space.md }} onPress={() => router.push('/(tabs)/pro')}>
        <Row style={{ justifyContent: 'space-between' }}>
          <T variant="caption" color={theme.textSecondary} style={{ textTransform: 'uppercase' }}>
            {t('profile.plan')}
          </T>
          <Badge label={plan === 'pro' ? 'Pro' : t('common.free')} tone={plan === 'pro' ? 'sun' : 'tint'} />
        </Row>
        <T variant="heading">{plan === 'pro' ? t('profile.planPro') : t('profile.planFree')}</T>
        {usage.data !== undefined ? (
          <T color={theme.textSecondary}>
            {t('profile.usage')}: {t('profile.usageValue', { used: usage.data, limit })}
          </T>
        ) : null}
      </Card>

      {profile?.coupon_code ? (
        <Card style={{ borderColor: theme.sun, borderStyle: 'dashed', borderWidth: 2, backgroundColor: theme.sunSoft }}>
          <T variant="caption" color={theme.sunText} style={{ textTransform: 'uppercase' }}>
            {t('profile.coupon')}
          </T>
          <T style={[styles.coupon, { color: theme.text }]} selectable>
            {profile.coupon_code}
          </T>
        </Card>
      ) : null}

      <SectionTitle>{t('profile.language')}</SectionTitle>
      <Row gap={Space.sm}>
        <Chip label="Español" selected={locale === 'es'} onPress={() => changeLocale('es')} />
        <Chip label="English" selected={locale === 'en'} onPress={() => changeLocale('en')} />
      </Row>

      <SectionTitle>{t('profile.theme')}</SectionTitle>
      <Row gap={Space.sm} style={{ flexWrap: 'wrap' }}>
        <Chip label={t('profile.themeSystem')} selected={themePref === 'system'} onPress={() => setThemePreference('system')} />
        <Chip label={t('profile.themeLight')} icon="sun" selected={themePref === 'light'} onPress={() => setThemePreference('light')} />
        <Chip label={t('profile.themeDark')} icon="moon" selected={themePref === 'dark'} onPress={() => setThemePreference('dark')} />
      </Row>

      <SectionTitle>{t('profile.sounds')}</SectionTitle>
      <Row gap={Space.sm}>
        <Chip label={t('profile.soundsOn')} icon="mic" selected={sounds} onPress={() => setSoundsEnabled(true)} />
        <Chip label={t('profile.soundsOff')} selected={!sounds} onPress={() => setSoundsEnabled(false)} />
      </Row>

      <SectionTitle>{t('profile.level')}</SectionTitle>
      <Row gap={Space.sm} style={{ flexWrap: 'wrap' }}>
        {(['prepa', 'uni', 'other'] as const).map((l) => (
          <Chip key={l} label={t(`onboarding.levels.${l}`)} selected={profile?.level === l} onPress={() => changeLevel(l)} />
        ))}
      </Row>

      <SectionTitle>{t('profile.legal')}</SectionTitle>
      <View style={{ gap: Space.sm }}>
        <ListRow icon="doc" title={t('profile.privacy')} onPress={() => router.push('/legal/privacy')} />
        <ListRow icon="doc" title={t('profile.terms')} onPress={() => router.push('/legal/terms')} />
      </View>

      <View style={{ gap: Space.sm, marginTop: Space.lg }}>
        <Button label={t('profile.signOut')} variant="secondary" onPress={signOut} />
        <Button label={t('profile.deleteAccount')} variant="danger" onPress={confirmDelete} loading={deleting} />
      </View>

      <T variant="small" color={theme.textSecondary} style={{ textAlign: 'center' }}>
        {t('profile.version', { version: Constants.expoConfig?.version ?? '1.0.0' })}
      </T>
    </Screen>
  );
}

const styles = StyleSheet.create({
  avatar: { width: 64, height: 64, borderRadius: 22 },
  name: { fontFamily: Fonts.display, fontSize: 24, lineHeight: 28, letterSpacing: -0.5 },
  coupon: { fontFamily: Fonts.display, fontSize: 26, lineHeight: 32, marginTop: Space.xs },
});
