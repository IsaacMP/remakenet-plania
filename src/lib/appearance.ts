// Modo claro / oscuro / el del sistema. Se guarda en el celular.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSyncExternalStore } from 'react';
import { Appearance, Platform } from 'react-native';

export type ThemePreference = 'system' | 'light' | 'dark';

const KEY = 'plania.theme';
let current: ThemePreference = 'system';
const listeners = new Set<() => void>();

function apply(pref: ThemePreference) {
  if (Platform.OS === 'web') return;
  Appearance.setColorScheme(pref === 'system' ? 'unspecified' : pref);
}

AsyncStorage.getItem(KEY)
  .then((v) => {
    if (v === 'light' || v === 'dark') {
      current = v;
      apply(v);
      listeners.forEach((l) => l());
    }
  })
  .catch(() => {});

export function setThemePreference(pref: ThemePreference) {
  current = pref;
  apply(pref);
  AsyncStorage.setItem(KEY, pref).catch(() => {});
  listeners.forEach((l) => l());
}

export function useThemePreference(): ThemePreference {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => current,
  );
}
