import type { ConfigContext, ExpoConfig } from 'expo/config';

// El esquema de URL de iOS para Google Sign-In es el "iOS client ID" al revés:
// 1234-abc.apps.googleusercontent.com → com.googleusercontent.apps.1234-abc
const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? '';
const iosUrlScheme = iosClientId
  ? iosClientId.split('.').reverse().join('.')
  : 'com.googleusercontent.apps.configure-me';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Plania',
  slug: 'plania',
  owner: process.env.EXPO_OWNER,
  version: '0.1.0',
  orientation: 'portrait',
  icon: './assets/images/icon.png',
  scheme: 'plania',
  userInterfaceStyle: 'automatic',
  ios: {
    bundleIdentifier: 'com.remakenet.plania',
    supportsTablet: true,
    infoPlist: {
      ITSAppUsesNonExemptEncryption: false,
    },
  },
  android: {
    package: 'com.remakenet.plania',
    adaptiveIcon: {
      backgroundColor: '#0E8F7E',
      foregroundImage: './assets/images/android-icon-foreground.png',
      monochromeImage: './assets/images/android-icon-monochrome.png',
    },
    predictiveBackGestureEnabled: false,
  },
  web: {
    output: 'single',
    favicon: './assets/images/favicon.png',
  },
  plugins: [
    'expo-router',
    [
      'expo-splash-screen',
      {
        backgroundColor: '#F6FAF9',
        image: './assets/images/splash-icon.png',
        imageWidth: 120,
        dark: { backgroundColor: '#0E171C', image: './assets/images/splash-icon.png' },
      },
    ],
    'expo-localization',
    'expo-secure-store',
    ['@react-native-google-signin/google-signin', { iosUrlScheme }],
    'expo-font',
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
  },
  extra: {
    eas: process.env.EAS_PROJECT_ID ? { projectId: process.env.EAS_PROJECT_ID } : undefined,
  },
});
