// "Esta función está en proceso de creación": deja tu correo para que te avisemos.
// En funciones Pro, además se entrega un cupón de 65% de descuento.
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as Clipboard from 'expo-clipboard';
import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';

import { Icon } from '@/components/icon';
import { Badge, Button, IconBubble, Row, T } from '@/components/ui';
import { Fonts, Radius, Space } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { AppError, joinWaitlist, myWaitlist } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { FUTURE_FEATURES, type FutureFeature } from '@/lib/plans';

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export default function WaitlistSheet() {
  const { feature: raw } = useLocalSearchParams<{ feature: string }>();
  const feature = (raw in FUTURE_FEATURES ? raw : 'pro_plan') as FutureFeature;
  const config = FUTURE_FEATURES[feature];
  const { t } = useTranslation();
  const theme = useTheme();
  const queryClient = useQueryClient();
  const { profile, session, refreshProfile } = useAuth();

  const joined = useQuery({ queryKey: ['waitlist'], queryFn: myWaitlist });
  const alreadyJoined = joined.data?.includes(feature);

  const [email, setEmail] = useState(profile?.email ?? session?.user.email ?? '');
  const [state, setState] = useState<'idle' | 'saving' | 'invalid' | 'error'>('idle');
  const [coupon, setCoupon] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [copied, setCopied] = useState(false);

  async function submit() {
    if (!EMAIL.test(email.trim())) {
      setState('invalid');
      return;
    }
    setState('saving');
    try {
      const code = await joinWaitlist(feature, email.trim(), config.coupon);
      setCoupon(code);
      setDone(true);
      setState('idle');
      queryClient.invalidateQueries({ queryKey: ['waitlist'] });
      if (code) refreshProfile();
    } catch (err) {
      setState(err instanceof AppError && err.code === 'invalid_email' ? 'invalid' : 'error');
    }
  }

  const shownCoupon = coupon ?? (config.coupon && alreadyJoined ? profile?.coupon_code : null);

  async function copyCoupon() {
    if (!shownCoupon) return;
    await Clipboard.setStringAsync(shownCoupon);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  const showSuccess = done || alreadyJoined;

  return (
    <ScrollView contentContainerStyle={styles.root} keyboardShouldPersistTaps="handled">
      <Row style={{ justifyContent: 'space-between', alignSelf: 'stretch' }}>
        <IconBubble name={config.icon} color={config.coupon ? theme.sunText : theme.tint} bg={config.coupon ? theme.sunSoft : theme.tintSoft} size={56} />
        <Badge label={config.coupon ? t('common.pro') : t('common.soon')} tone={config.coupon ? 'sun' : 'tint'} />
      </Row>

      <View style={{ gap: Space.xs, alignSelf: 'stretch' }}>
        <T variant="title">{t(`features.${feature}.name`)}</T>
        <T color={theme.textSecondary}>{t(`features.${feature}.desc`)}</T>
      </View>

      {showSuccess ? (
        <View style={{ gap: Space.lg, alignSelf: 'stretch' }}>
          <Row gap={Space.sm}>
            <Icon name="check" size={22} color={theme.tint} />
            <T variant="heading" style={{ flex: 1 }}>
              {done ? t('waitlist.joinedTitle') : t('waitlist.already')}
            </T>
          </Row>
          <T color={theme.textSecondary}>{t('waitlist.joinedBody', { email: email.trim() || profile?.email })}</T>

          {shownCoupon ? (
            <View style={[styles.coupon, { borderColor: theme.sun, backgroundColor: theme.sunSoft }]}>
              <Row gap={Space.sm}>
                <Icon name="ticket" size={20} color={theme.sunText} />
                <T variant="caption" color={theme.sunText} style={{ textTransform: 'uppercase' }}>
                  {t('waitlist.couponLabel')}
                </T>
              </Row>
              <T style={[styles.couponCode, { color: theme.text }]} selectable>
                {shownCoupon}
              </T>
              <T variant="small" color={theme.textSecondary}>
                {t('waitlist.couponHint')}
              </T>
              <Button label={copied ? t('common.copied') : t('common.copy')} variant="secondary" icon={copied ? 'check' : undefined} onPress={copyCoupon} />
            </View>
          ) : null}

          <Button label={t('common.done')} onPress={() => router.back()} />
        </View>
      ) : (
        <View style={{ gap: Space.md, alignSelf: 'stretch' }}>
          <View style={[styles.notice, { backgroundColor: theme.surfaceAlt }]}>
            <T variant="bodyStrong">{t('waitlist.title')}</T>
            <T color={theme.textSecondary}>{config.coupon ? t('waitlist.bodyCoupon') : t('waitlist.body')}</T>
          </View>
          <TextInput
            value={email}
            onChangeText={(v) => {
              setEmail(v);
              if (state === 'invalid') setState('idle');
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            autoCorrect={false}
            placeholder="nombre@gmail.com"
            placeholderTextColor={theme.textSecondary}
            accessibilityLabel={t('waitlist.email')}
            style={[styles.input, { color: theme.text, borderColor: state === 'invalid' ? theme.danger : theme.border, backgroundColor: theme.background }]}
          />
          {state === 'invalid' ? <T variant="small" color={theme.danger}>{t('waitlist.invalidEmail')}</T> : null}
          {state === 'error' ? <T variant="small" color={theme.danger}>{t('common.error')}</T> : null}
          <Button
            label={config.coupon ? t('waitlist.submitCoupon') : t('waitlist.submit')}
            variant={config.coupon ? 'sun' : 'primary'}
            icon={config.coupon ? 'ticket' : undefined}
            onPress={submit}
            loading={state === 'saving' || joined.isPending}
          />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: { padding: Space.xl, gap: Space.xl, alignItems: 'center', paddingBottom: Space.xxxl },
  notice: { borderRadius: Radius.lg, padding: Space.lg, gap: Space.xs },
  input: { minHeight: 54, borderRadius: Radius.lg, borderWidth: 1.5, paddingHorizontal: Space.lg, fontFamily: Fonts.bodyMedium, fontSize: 17 },
  coupon: { borderRadius: Radius.xl, borderWidth: 2, borderStyle: 'dashed', padding: Space.lg, gap: Space.sm },
  couponCode: { fontFamily: Fonts.display, fontSize: 30, lineHeight: 36, letterSpacing: 1 },
});
