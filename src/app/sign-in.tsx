import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Icon, type IconName } from '@/components/icon';
import { LanguageToggle } from '@/components/language-toggle';
import { LogoMark } from '@/components/logo';
import { Button, IconBubble, T } from '@/components/ui';
import { Fonts, Radius, Space } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { type SignInResult, useAuth } from '@/lib/auth';

const MESSAGES: Record<Exclude<SignInResult, 'ok'>, string> = {
  cancelled: 'auth.cancelled',
  play_services: 'auth.playServices',
  failed: 'auth.failed',
  not_configured: 'auth.notConfigured',
};

export default function SignIn() {
  const { t } = useTranslation();
  const theme = useTheme();
  const { signInWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onGoogle() {
    setLoading(true);
    setMessage(null);
    const result = await signInWithGoogle();
    setLoading(false);
    if (result !== 'ok') setMessage(t(MESSAGES[result]));
  }

  const bullets: { icon: IconName; text: string; color: string; bg: string }[] = [
    { icon: 'upload', text: t('auth.bullets.upload'), color: theme.coral, bg: theme.coralSoft },
    { icon: 'sparkle', text: t('auth.bullets.tools'), color: theme.sunText, bg: theme.sunSoft },
    { icon: 'send', text: t('auth.bullets.share'), color: theme.sky, bg: theme.skySoft },
  ];

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: theme.background }]}>
      <View style={{ alignItems: 'flex-end' }}>
        <LanguageToggle />
      </View>
      <View style={styles.top}>
        <LogoMark size={88} />
        <T style={[styles.name, { color: theme.text }]}>plania</T>
        <T variant="heading" color={theme.textSecondary} style={{ textAlign: 'center', maxWidth: 300 }}>
          {t('auth.tagline')}
        </T>
      </View>

      <View style={[styles.preview, { backgroundColor: theme.surface, borderColor: theme.border }]}>
        {bullets.map((b) => (
          <View key={b.icon} style={styles.bullet}>
            <IconBubble name={b.icon} color={b.color} bg={b.bg} size={40} />
            <T variant="bodyStrong" style={{ flex: 1 }}>
              {b.text}
            </T>
          </View>
        ))}
      </View>

      <View style={styles.bottom}>
        {message ? (
          <View style={[styles.message, { backgroundColor: theme.dangerSoft }]} accessibilityLiveRegion="polite">
            <Icon name="warning" size={18} color={theme.danger} />
            <T variant="small" color={theme.danger} style={{ flex: 1 }}>
              {message}
            </T>
          </View>
        ) : null}
        <Button label={t('auth.google')} onPress={onGoogle} loading={loading} icon="person" />
        <T variant="small" color={theme.textSecondary} style={{ textAlign: 'center' }}>
          {t('auth.legal')}
        </T>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, padding: Space.xl, justifyContent: 'space-between' },
  top: { alignItems: 'center', gap: Space.md },
  name: { fontFamily: Fonts.display, fontSize: 52, lineHeight: 56, letterSpacing: -2 },
  preview: { borderRadius: Radius.xl, borderWidth: 1, padding: Space.lg, gap: Space.lg },
  bullet: { flexDirection: 'row', alignItems: 'center', gap: Space.md },
  bottom: { gap: Space.md },
  message: { flexDirection: 'row', gap: Space.sm, alignItems: 'center', padding: Space.md, borderRadius: Radius.md },
});
