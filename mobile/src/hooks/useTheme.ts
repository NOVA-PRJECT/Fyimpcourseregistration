import { useColorScheme } from 'react-native';
import { lightColors, darkColors, ThemeColors } from '../theme/colors';
import { typography } from '../theme/typography';
import { spacing, borderRadius, layout } from '../theme/spacing';

export function useTheme() {
  const systemScheme = useColorScheme();
  const isDark = systemScheme === 'dark';
  const colors: ThemeColors = isDark ? darkColors : lightColors;

  return {
    isDark,
    colors,
    typography,
    spacing,
    borderRadius,
    layout,
  };
}
