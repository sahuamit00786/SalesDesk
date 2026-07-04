import React from 'react';
import { Text } from 'react-native';
import { useTheme } from '../ThemeProvider';

/**
 * Themed text. variant = key of theme.type (display|title|heading|subheading|
 * bodyStrong|body|label|caption|captionStrong|micro). color = theme color key,
 * 'brand', or any raw color string.
 */
export default function AppText({ variant = 'body', color = 'ink', style, children, ...rest }) {
  const theme = useTheme();
  const resolved =
    color === 'brand' ? theme.brand : theme.colors[color] !== undefined ? theme.colors[color] : color;
  return (
    <Text
      {...rest}
      style={[theme.type[variant] || theme.type.body, { color: resolved }, style]}
    >
      {children}
    </Text>
  );
}
