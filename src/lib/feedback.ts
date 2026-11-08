// Sonidos y vibración al responder. Se pueden apagar en Perfil → Sonidos.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { type AudioPlayer, createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import * as Haptics from 'expo-haptics';
import { useSyncExternalStore } from 'react';
import { Platform } from 'react-native';

export type Sound = 'correct' | 'wrong' | 'win' | 'pop';

const SOURCES: Record<Sound, number> = {
  correct: require('@/assets/sounds/correct.wav'),
  wrong: require('@/assets/sounds/wrong.wav'),
  win: require('@/assets/sounds/win.wav'),
  pop: require('@/assets/sounds/pop.wav'),
};
const VOLUME: Record<Sound, number> = { correct: 0.9, wrong: 0.7, win: 0.9, pop: 0.5 };

const STORAGE_KEY = 'plania.sounds';
let enabled = true;
const listeners = new Set<() => void>();
const players: Partial<Record<Sound, AudioPlayer>> = {};
let modeSet = false;

AsyncStorage.getItem(STORAGE_KEY)
  .then((v) => {
    if (v === 'off') {
      enabled = false;
      listeners.forEach((l) => l());
    }
  })
  .catch(() => {});

function player(sound: Sound): AudioPlayer | null {
  try {
    if (!modeSet) {
      modeSet = true;
      // Respeta el modo silencio y no corta la música del usuario
      setAudioModeAsync({ playsInSilentMode: false, interruptionMode: 'mixWithOthers' }).catch(() => {});
    }
    if (!players[sound]) {
      const p = createAudioPlayer(SOURCES[sound]);
      p.volume = VOLUME[sound];
      players[sound] = p;
    }
    return players[sound] ?? null;
  } catch {
    return null;
  }
}

/** Carga los sonidos antes de usarlos para que suenen sin retraso. */
export function preloadSounds() {
  (Object.keys(SOURCES) as Sound[]).forEach((s) => player(s));
}

export function play(sound: Sound) {
  if (Platform.OS !== 'web') {
    if (sound === 'correct' || sound === 'win') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    else if (sound === 'wrong') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
    else Haptics.selectionAsync().catch(() => {});
  }
  if (!enabled) return;
  const p = player(sound);
  if (!p) return;
  p.seekTo(0)
    .then(() => p.play())
    .catch(() => {});
}

export function setSoundsEnabled(value: boolean) {
  enabled = value;
  AsyncStorage.setItem(STORAGE_KEY, value ? 'on' : 'off').catch(() => {});
  listeners.forEach((l) => l());
}

export function useSoundsEnabled(): boolean {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => enabled,
  );
}
