import { useColorScheme } from 'react-native';

import { Colors, SubjectColors, type SubjectColor, type ThemeColors } from '@/constants/theme';

export function useTheme(): ThemeColors & { scheme: 'light' | 'dark' } {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  return { ...Colors[scheme], scheme };
}

/** Color fuerte y suave de una materia según el tema actual. */
export function useSubjectColor(color: string): { strong: string; soft: string } {
  const scheme = useColorScheme() === 'dark' ? 'dark' : 'light';
  const pair = (SubjectColors[color as SubjectColor] ?? SubjectColors.teal)[scheme];
  return { strong: pair[0], soft: pair[1] };
}
