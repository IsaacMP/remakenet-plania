// Aviso de privacidad y Términos. Se puede abrir sin haber iniciado sesión.
import { Stack, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Screen, T } from '@/components/ui';
import { Fonts, Space } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { type LegalDoc, legalDocument } from '@/legal/documents';

export default function LegalScreen() {
  const { doc } = useLocalSearchParams<{ doc: string }>();
  const { i18n } = useTranslation();
  const theme = useTheme();
  const which: LegalDoc = doc === 'terms' ? 'terms' : 'privacy';
  const content = legalDocument(which, i18n.language === 'en' ? 'en' : 'es');

  return (
    <>
      <Stack.Screen options={{ title: content.title }} />
      <Screen edges={[]}>
        <View style={{ gap: Space.xs }}>
          <T style={[styles.title, { color: theme.text }]}>{content.title}</T>
          <T variant="small" color={theme.textSecondary}>
            {content.updated}
          </T>
        </View>
        <T>{content.intro}</T>
        {content.sections.map((s) => (
          <View key={s.heading} style={{ gap: Space.sm }}>
            <T variant="heading">{s.heading}</T>
            {s.body.map((p, i) => (
              <T key={i} color={theme.textSecondary} style={{ lineHeight: 24 }}>
                {p}
              </T>
            ))}
          </View>
        ))}
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  title: { fontFamily: Fonts.display, fontSize: 28, lineHeight: 32, letterSpacing: -0.6 },
});
