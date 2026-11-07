import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from '@/locales/en';
import es from '@/locales/es';

export type AppLocale = 'es' | 'en';
const STORAGE_KEY = 'plania.locale';

/** Español por defecto; inglés si el teléfono está en inglés. */
function deviceLocale(): AppLocale {
  const code = getLocales()[0]?.languageCode ?? 'es';
  return code === 'en' ? 'en' : 'es';
}

i18n.use(initReactI18next).init({
  resources: { es: { translation: es }, en: { translation: en } },
  lng: deviceLocale(),
  fallbackLng: 'es',
  interpolation: { escapeValue: false },
  returnObjects: true,
});

// Si el usuario eligió otro idioma antes, respetarlo
AsyncStorage.getItem(STORAGE_KEY)
  .then((saved) => {
    if ((saved === 'es' || saved === 'en') && saved !== i18n.language) i18n.changeLanguage(saved);
  })
  .catch(() => {});

export async function setAppLocale(locale: AppLocale) {
  await i18n.changeLanguage(locale);
  await AsyncStorage.setItem(STORAGE_KEY, locale).catch(() => {});
}

export function currentLocale(): AppLocale {
  return i18n.language === 'en' ? 'en' : 'es';
}

export default i18n;
