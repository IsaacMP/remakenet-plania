import { SymbolView } from 'expo-symbols';
import type { ComponentProps } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';

type SymbolName = ComponentProps<typeof SymbolView>['name'];

// Un nombre por ícono → SF Symbols en iOS, Material Symbols en Android y web
const ICONS = {
  book: { ios: 'book.fill', android: 'menu_book', web: 'menu_book' },
  flask: { ios: 'flask.fill', android: 'science', web: 'science' },
  function: { ios: 'function', android: 'function', web: 'function' },
  globe: { ios: 'globe.americas.fill', android: 'public', web: 'public' },
  code: { ios: 'chevron.left.forwardslash.chevron.right', android: 'code', web: 'code' },
  pen: { ios: 'pencil', android: 'edit', web: 'edit' },
  chart: { ios: 'chart.bar.fill', android: 'bar_chart', web: 'bar_chart' },
  heart: { ios: 'heart.fill', android: 'favorite', web: 'favorite' },
  scale: { ios: 'building.columns.fill', android: 'account_balance', web: 'account_balance' },
  music: { ios: 'paintpalette.fill', android: 'palette', web: 'palette' },
  language: { ios: 'character.bubble.fill', android: 'translate', web: 'translate' },
  share: { ios: 'tray.and.arrow.down.fill', android: 'move_to_inbox', web: 'move_to_inbox' },
  plus: { ios: 'plus', android: 'add', web: 'add' },
  upload: { ios: 'arrow.up.doc.fill', android: 'upload_file', web: 'upload_file' },
  doc: { ios: 'doc.text.fill', android: 'description', web: 'description' },
  summary: { ios: 'text.alignleft', android: 'notes', web: 'notes' },
  cards: { ios: 'rectangle.on.rectangle.angled', android: 'style', web: 'style' },
  quiz: { ios: 'checkmark.circle.fill', android: 'quiz', web: 'quiz' },
  match: { ios: 'link', android: 'link', web: 'link' },
  flame: { ios: 'flame.fill', android: 'local_fire_department', web: 'local_fire_department' },
  sparkle: { ios: 'sparkles', android: 'auto_awesome', web: 'auto_awesome' },
  calendar: { ios: 'calendar', android: 'calendar_month', web: 'calendar_month' },
  chat: { ios: 'bubble.left.and.text.bubble.right.fill', android: 'forum', web: 'forum' },
  mic: { ios: 'mic.fill', android: 'mic', web: 'mic' },
  camera: { ios: 'camera.fill', android: 'photo_camera', web: 'photo_camera' },
  mindmap: { ios: 'point.3.connected.trianglepath.dotted', android: 'hub', web: 'hub' },
  timer: { ios: 'timer', android: 'timer', web: 'timer' },
  note: { ios: 'note.text', android: 'sticky_note_2', web: 'sticky_note_2' },
  idea: { ios: 'lightbulb.fill', android: 'lightbulb', web: 'lightbulb' },
  checklist: { ios: 'checklist', android: 'checklist', web: 'checklist' },
  chevron: { ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' },
  close: { ios: 'xmark', android: 'close', web: 'close' },
  trash: { ios: 'trash', android: 'delete', web: 'delete' },
  ticket: { ios: 'ticket.fill', android: 'confirmation_number', web: 'confirmation_number' },
  key: { ios: 'number', android: 'pin', web: 'pin' },
  check: { ios: 'checkmark', android: 'check', web: 'check' },
  wrong: { ios: 'xmark.circle.fill', android: 'cancel', web: 'cancel' },
  send: { ios: 'square.and.arrow.up', android: 'share', web: 'share' },
  refresh: { ios: 'arrow.clockwise', android: 'refresh', web: 'refresh' },
  person: { ios: 'person.crop.circle', android: 'account_circle', web: 'account_circle' },
  warning: { ios: 'exclamationmark.triangle.fill', android: 'warning', web: 'warning' },
  home: { ios: 'house.fill', android: 'home', web: 'home' },
  pencil: { ios: 'pencil', android: 'edit', web: 'edit' },
} as const satisfies Record<string, SymbolName>;

export type IconName = keyof typeof ICONS;

/** Íconos que el alumno puede elegir para una materia. */
export const SUBJECT_ICONS = ['book', 'flask', 'function', 'globe', 'code', 'pen', 'chart', 'heart', 'scale', 'music', 'language'] as const;

export function Icon({
  name,
  size = 22,
  color,
  style,
}: {
  name: IconName | string;
  size?: number;
  color: string;
  style?: StyleProp<ViewStyle>;
}) {
  const symbol = ICONS[name as IconName] ?? ICONS.book;
  return <SymbolView name={symbol} size={size} tintColor={color} style={[{ width: size, height: size }, style]} />;
}

/** Elige un ícono razonable a partir del nombre de una materia. */
export function iconForSubject(name: string): IconName {
  const n = name.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  if (/mat|calc|algebra|geomet|math|estadist|statist/.test(n)) return 'function';
  if (/fisic|quim|biolog|cienc|physic|chem|scien|anatom/.test(n)) return n.includes('anatom') ? 'heart' : 'flask';
  if (/histor|geograf|social|civic/.test(n)) return 'globe';
  if (/program|inform|comput|software|code/.test(n)) return 'code';
  if (/litera|redac|escrit|lectur|reading|writ/.test(n)) return 'pen';
  if (/econom|contab|account|financ|admin|business/.test(n)) return 'chart';
  if (/salud|medic|psicol|psych|health|nurs/.test(n)) return 'heart';
  if (/derech|law|legal/.test(n)) return 'scale';
  if (/arte|music|art|dise/.test(n)) return 'music';
  if (/ingles|english|idiom|language|frances|spanish|espanol/.test(n)) return 'language';
  return 'book';
}
