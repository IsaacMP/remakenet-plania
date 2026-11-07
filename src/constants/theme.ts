// Identidad visual de Plania: verde azulado de marca, girasol para la "chispa",
// coral, cielo y tinta. Mismo sistema que la propuesta de marca.
import { Platform } from 'react-native';

export const Palette = {
  teal: '#0E8F7E',
  sun: '#FFC23D',
  coral: '#F2674A',
  sky: '#3E7CE0',
  ink: '#13232E',
  white: '#FFFFFF',
} as const;

export const Colors = {
  light: {
    background: '#F6FAF9',
    surface: '#FFFFFF',
    surfaceAlt: '#EEF4F3',
    text: '#13232E',
    textSecondary: '#5A6B72',
    border: '#DCE6E4',
    tint: '#0E8F7E',
    tintSoft: '#D7F1EC',
    onTint: '#FFFFFF',
    sun: '#FFC23D',
    sunSoft: '#FFF1CC',
    sunText: '#8A5F00',
    coral: '#F2674A',
    coralSoft: '#FDE3DC',
    sky: '#3E7CE0',
    skySoft: '#DEE9FB',
    success: '#0E8F7E',
    danger: '#D4452B',
    dangerSoft: '#FBE3DE',
    overlay: 'rgba(19,35,46,0.45)',
  },
  dark: {
    background: '#0E171C',
    surface: '#16232A',
    surfaceAlt: '#1D2C34',
    text: '#E8F0EF',
    textSecondary: '#9AAEB2',
    border: '#26363D',
    tint: '#3CC7B2',
    tintSoft: '#123A36',
    onTint: '#0E171C',
    sun: '#FFCB57',
    sunSoft: '#3A3115',
    sunText: '#FFCB57',
    coral: '#FF8468',
    coralSoft: '#3D221C',
    sky: '#7AA7F2',
    skySoft: '#1A2A45',
    success: '#3CC7B2',
    danger: '#FF7A63',
    dangerSoft: '#3D221C',
    overlay: 'rgba(0,0,0,0.6)',
  },
} as const;

export type ThemeColors = { [K in keyof typeof Colors.light]: string };

/** Colores que el alumno puede elegir para una materia. */
export const SubjectColors = {
  teal: { light: ['#0E8F7E', '#D7F1EC'], dark: ['#3CC7B2', '#123A36'] },
  sun: { light: ['#B07800', '#FFF1CC'], dark: ['#FFCB57', '#3A3115'] },
  coral: { light: ['#D4452B', '#FDE3DC'], dark: ['#FF8468', '#3D221C'] },
  sky: { light: ['#2F66C4', '#DEE9FB'], dark: ['#7AA7F2', '#1A2A45'] },
  grape: { light: ['#7A4CC2', '#ECE3FA'], dark: ['#B596F0', '#2B2140'] },
  rose: { light: ['#C23A78', '#FBE1EE'], dark: ['#F28CBC', '#3D1C2C'] },
  leaf: { light: ['#4E8A1F', '#E5F2D8'], dark: ['#9CD46A', '#22331A'] },
  slate: { light: ['#44606E', '#E3EAED'], dark: ['#A9BCC6', '#24333B'] },
} as const;
export type SubjectColor = keyof typeof SubjectColors;

export const Fonts = {
  display: 'BricolageGrotesque_800ExtraBold',
  displayBold: 'BricolageGrotesque_700Bold',
  body: 'Figtree_400Regular',
  bodyMedium: 'Figtree_500Medium',
  bodySemi: 'Figtree_600SemiBold',
  bodyBold: 'Figtree_700Bold',
  mono: Platform.select({ ios: 'Menlo', default: 'monospace' }),
} as const;

export const Space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 } as const;
export const Radius = { sm: 8, md: 12, lg: 16, xl: 22, pill: 999 } as const;

export const Type = {
  hero: { fontFamily: Fonts.display, fontSize: 34, lineHeight: 38, letterSpacing: -1 },
  title: { fontFamily: Fonts.display, fontSize: 26, lineHeight: 30, letterSpacing: -0.6 },
  heading: { fontFamily: Fonts.displayBold, fontSize: 19, lineHeight: 24, letterSpacing: -0.2 },
  body: { fontFamily: Fonts.body, fontSize: 16, lineHeight: 23 },
  bodyStrong: { fontFamily: Fonts.bodySemi, fontSize: 16, lineHeight: 23 },
  small: { fontFamily: Fonts.bodyMedium, fontSize: 14, lineHeight: 19 },
  caption: { fontFamily: Fonts.bodySemi, fontSize: 12, lineHeight: 16, letterSpacing: 0.6 },
} as const;
