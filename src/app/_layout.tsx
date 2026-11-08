import '@/lib/i18n';
import '@/lib/appearance';

import { BricolageGrotesque_700Bold, BricolageGrotesque_800ExtraBold } from '@expo-google-fonts/bricolage-grotesque';
import { Figtree_400Regular, Figtree_500Medium, Figtree_600SemiBold, Figtree_700Bold } from '@expo-google-fonts/figtree';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { Fonts } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { AuthProvider, useAuth } from '@/lib/auth';

SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    BricolageGrotesque_700Bold,
    BricolageGrotesque_800ExtraBold,
    Figtree_400Regular,
    Figtree_500Medium,
    Figtree_600SemiBold,
    Figtree_700Bold,
  });

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>{fontsLoaded ? <Navigator /> : null}</AuthProvider>
      </QueryClientProvider>
    </GestureHandlerRootView>
  );
}

function Navigator() {
  const { session, profile, ready } = useAuth();
  const theme = useTheme();
  const { t } = useTranslation();

  useEffect(() => {
    if (ready) SplashScreen.hideAsync();
  }, [ready]);

  if (!ready) return null;

  const navTheme = theme.scheme === 'dark' ? DarkTheme : DefaultTheme;
  const signedIn = Boolean(session);
  const onboarded = Boolean(profile?.onboarded);

  const sheet = {
    presentation: 'formSheet' as const,
    sheetGrabberVisible: true,
    sheetAllowedDetents: [0.75, 1],
    sheetCornerRadius: 24,
    headerShown: false,
    contentStyle: { backgroundColor: theme.surface },
  };

  return (
    <ThemeProvider
      value={{
        ...navTheme,
        colors: { ...navTheme.colors, background: theme.background, card: theme.background, primary: theme.tint, text: theme.text, border: theme.border },
      }}>
      <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerShadowVisible: false,
          headerStyle: { backgroundColor: theme.background },
          headerTintColor: theme.tint,
          headerTitleStyle: { fontFamily: Fonts.displayBold, color: theme.text },
          headerBackButtonDisplayMode: 'minimal',
          contentStyle: { backgroundColor: theme.background },
        }}>
        <Stack.Screen name="legal/[doc]" options={{ title: '' }} />

        <Stack.Protected guard={!signedIn}>
          <Stack.Screen name="sign-in" options={{ headerShown: false }} />
        </Stack.Protected>

        <Stack.Protected guard={signedIn && !onboarded}>
          <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        </Stack.Protected>

        <Stack.Protected guard={signedIn && onboarded}>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="subject/[id]" options={{ title: '' }} />
          <Stack.Screen name="document/[id]" options={{ title: '' }} />
          <Stack.Screen name="study/summary/[id]" options={{ title: t('document.tools.summary') }} />
          <Stack.Screen name="study/flashcards/[id]" options={{ title: t('document.tools.flashcards') }} />
          <Stack.Screen name="study/quiz/[id]" options={{ title: t('document.tools.quiz'), gestureEnabled: false }} />
          <Stack.Screen name="study/match/[id]" options={{ title: t('document.tools.match') }} />
          <Stack.Screen name="item/[id]" options={{ title: '' }} />
          <Stack.Screen name="subject/form" options={sheet} />
          <Stack.Screen name="create" options={{ ...sheet, sheetAllowedDetents: [0.6, 0.9] }} />
          <Stack.Screen name="share/[id]" options={sheet} />
          <Stack.Screen name="code" options={sheet} />
          <Stack.Screen name="waitlist/[feature]" options={{ ...sheet, sheetAllowedDetents: [0.8, 1] }} />
        </Stack.Protected>
      </Stack>
    </ThemeProvider>
  );
}

