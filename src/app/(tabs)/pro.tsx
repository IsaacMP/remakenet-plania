// Plania Pro: precios, comparación y funciones que vienen. Los pagos están preparados
// (src/lib/purchases.ts) pero apagados; mientras tanto "Quiero Pro" abre la lista con cupón.
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon } from '@/components/icon';
import { LogoMark } from '@/components/logo';
import { Badge, Button, Card, IconBubble, Row, Screen, SectionTitle, T, tap } from '@/components/ui';
import { Fonts, Palette, Radius, Space } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import { currentLocale } from '@/lib/i18n';
import { FUTURE_FEATURES, PLAN_LIMITS, PRO_FEATURE_LIST, PRO_PRICES_MXN } from '@/lib/plans';
import { buyPro, PURCHASES_ENABLED, type ProPackage } from '@/lib/purchases';

export default function ProScreen() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { profile } = useAuth();
  const [pkg, setPkg] = useState<ProPackage>('yearly');
  const isPro = profile?.plan === 'pro';

  async function onCta() {
    if (PURCHASES_ENABLED) {
      await buyPro(pkg);
      return;
    }
    router.push('/waitlist/pro_plan');
  }

  const rows: { label: string; free: string; pro: string }[] = [
    { label: t('pro.rows.generations'), free: String(PLAN_LIMITS.free.generationsPerMonth), pro: String(PLAN_LIMITS.pro.generationsPerMonth) },
    { label: t('pro.rows.fileSize'), free: `${PLAN_LIMITS.free.maxFileMb} MB`, pro: `${PLAN_LIMITS.pro.maxFileMb} MB` },
    { label: t('pro.rows.pages'), free: String(PLAN_LIMITS.free.maxPages), pro: String(PLAN_LIMITS.pro.maxPages) },
    { label: t('pro.rows.share'), free: '✓', pro: '✓' },
  ];

  const until = profile?.pro_until
    ? new Date(profile.pro_until).toLocaleDateString(currentLocale() === 'en' ? 'en-US' : 'es-MX', { day: 'numeric', month: 'long', year: 'numeric' })
    : null;

  return (
    <Screen>
      <View style={[styles.hero, { backgroundColor: Palette.ink }]}>
        <LogoMark size={56} bg={Palette.sun} fg={Palette.ink} dot={Palette.coral} />
        <T style={styles.heroTitle}>{t('pro.title')}</T>
        <T variant="body" color="#C9D6DA">
          {isPro ? (until ? t('pro.activeUntil', { date: until }) : t('pro.youArePro')) : t('pro.subtitle')}
        </T>
      </View>

      {!isPro ? (
        <>
          <Row gap={Space.md} style={{ alignItems: 'stretch' }}>
            <PriceOption
              selected={pkg === 'monthly'}
              onPress={() => setPkg('monthly')}
              label={t('pro.monthly')}
              price={`$${PRO_PRICES_MXN.monthly}`}
              per={t('pro.perMonth')}
            />
            <PriceOption
              selected={pkg === 'yearly'}
              onPress={() => setPkg('yearly')}
              label={t('pro.yearly')}
              price={`$${PRO_PRICES_MXN.yearly}`}
              per={t('pro.perYear')}
              badge={t('pro.save')}
            />
          </Row>
          <Button label={t('pro.cta')} variant="sun" icon="sparkle" onPress={onCta} />
          <T variant="small" color={theme.textSecondary} style={{ textAlign: 'center' }}>
            {t('pro.priceNote')}
          </T>
        </>
      ) : null}

      <SectionTitle>{t('pro.compare')}</SectionTitle>
      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <View style={[styles.tableRow, { backgroundColor: theme.surfaceAlt }]}>
          <T variant="caption" color={theme.textSecondary} style={styles.cellLabel} />
          <T variant="caption" color={theme.textSecondary} style={styles.cell}>
            {t('common.free').toUpperCase()}
          </T>
          <T variant="caption" color={theme.sunText} style={styles.cell}>
            PRO
          </T>
        </View>
        {rows.map((r, i) => (
          <View key={r.label} style={[styles.tableRow, i > 0 && { borderTopWidth: 1, borderColor: theme.border }]}>
            <T variant="small" style={styles.cellLabel}>
              {r.label}
            </T>
            <T variant="bodyStrong" color={theme.textSecondary} style={styles.cell}>
              {r.free}
            </T>
            <T variant="bodyStrong" style={styles.cell}>
              {r.pro}
            </T>
          </View>
        ))}
      </Card>

      <SectionTitle>{t('pro.comingFeatures')}</SectionTitle>
      {PRO_FEATURE_LIST.map((f) => (
        <Card key={f} onPress={() => router.push(`/waitlist/${f}`)}>
          <Row>
            <IconBubble name={FUTURE_FEATURES[f].icon} color={theme.sunText} bg={theme.sunSoft} />
            <View style={{ flex: 1, minWidth: 0 }}>
              <T variant="bodyStrong">{t(`features.${f}.name`)}</T>
              <T variant="small" color={theme.textSecondary}>
                {t(`features.${f}.desc`)}
              </T>
            </View>
            <Icon name="chevron" size={16} color={theme.textSecondary} />
          </Row>
        </Card>
      ))}
    </Screen>
  );
}

function PriceOption({
  selected,
  onPress,
  label,
  price,
  per,
  badge,
}: {
  selected: boolean;
  onPress: () => void;
  label: string;
  price: string;
  per: string;
  badge?: string;
}) {
  const theme = useTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      accessibilityLabel={`${label} ${price} ${per}`}
      onPress={() => {
        tap();
        onPress();
      }}
      style={[
        styles.price,
        { backgroundColor: selected ? theme.sunSoft : theme.surface, borderColor: selected ? theme.sun : theme.border },
      ]}>
      <Row style={{ justifyContent: 'space-between' }}>
        <T variant="bodyStrong">{label}</T>
        {badge ? <Badge label={badge} tone="coral" /> : null}
      </Row>
      <T style={[styles.priceText, { color: theme.text }]}>{price}</T>
      <T variant="small" color={theme.textSecondary}>
        MXN {per}
      </T>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: Radius.xl, padding: Space.xl, gap: Space.md },
  heroTitle: { fontFamily: Fonts.display, fontSize: 34, lineHeight: 38, letterSpacing: -1, color: '#FFFFFF' },
  price: { flex: 1, borderRadius: Radius.lg, borderWidth: 2, padding: Space.lg, gap: 2 },
  priceText: { fontFamily: Fonts.display, fontSize: 30, lineHeight: 36, letterSpacing: -0.8, marginTop: Space.sm },
  tableRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Space.lg, paddingVertical: Space.md, gap: Space.sm },
  cellLabel: { flex: 1.6 },
  cell: { flex: 1, textAlign: 'center' },
});
