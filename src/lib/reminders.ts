// Recordatorios de eventos como notificaciones locales (no necesitan servidor).
// Cada celular guarda qué notificación corresponde a cada evento.
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { Item } from '@/lib/types';

const KEY = 'plania.reminders';
const CHANNEL = 'reminders';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

let channelReady = false;
async function ensureChannel() {
  if (channelReady || Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(CHANNEL, {
    name: 'Recordatorios',
    // eslint-disable-next-line import/namespace -- se exporta con export *; TypeScript lo confirma
    importance: Notifications.AndroidImportance.HIGH,
  });
  channelReady = true;
}

async function readMap(): Promise<Record<string, string>> {
  try {
    return JSON.parse((await AsyncStorage.getItem(KEY)) ?? '{}');
  } catch {
    return {};
  }
}

async function writeMap(map: Record<string, string>) {
  await AsyncStorage.setItem(KEY, JSON.stringify(map)).catch(() => {});
}

/** Pide permiso para notificaciones. Devuelve false si el usuario no lo da. */
export async function ensureNotificationPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  const asked = await Notifications.requestPermissionsAsync();
  return asked.granted;
}

export async function cancelReminder(itemId: string) {
  if (Platform.OS === 'web') return;
  const map = await readMap();
  if (map[itemId]) {
    await Notifications.cancelScheduledNotificationAsync(map[itemId]).catch(() => {});
    delete map[itemId];
    await writeMap(map);
  }
}

/** Programa (o reprograma) el aviso de un evento. Sin fecha o sin aviso, solo cancela. */
export async function scheduleReminder(item: Item, texts: { title: string; body: string }) {
  if (Platform.OS === 'web') return;
  await cancelReminder(item.id);
  if (item.kind !== 'event' || !item.starts_at || item.remind_minutes === null) return;
  const when = new Date(new Date(item.starts_at).getTime() - item.remind_minutes * 60_000);
  if (when.getTime() <= Date.now()) return;
  if (!(await ensureNotificationPermission())) return;
  await ensureChannel();
  const id = await Notifications.scheduleNotificationAsync({
    content: { title: texts.title, body: texts.body, data: { itemId: item.id } },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: when, channelId: CHANNEL },
  });
  const map = await readMap();
  map[item.id] = id;
  await writeMap(map);
}
