import React from 'react';
import { View, Image, StyleSheet } from 'react-native';
import AppText from './AppText';
import { useTheme } from '../ThemeProvider';
import { initials } from '../../utils/format';
import { hexAlpha } from '../../utils/darkenHex';

const PALETTE = ['#6D29D9', '#0E7490', '#15803D', '#B45309', '#BE185D', '#4338CA', '#0F766E'];

function colorFor(name) {
  const str = String(name || '');
  let hash = 0;
  for (let i = 0; i < str.length; i += 1) hash = (hash * 31 + str.charCodeAt(i)) | 0;
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

export default function Avatar({ name, uri, size = 40, style }) {
  const theme = useTheme();
  const base = colorFor(name);
  const variant = {
    fontSize: Math.max(10, Math.round(size * 0.36)),
    lineHeight: Math.round(size * 0.46),
    fontFamily: theme.fonts.semibold,
  };

  return (
    <View
      style={[
        styles.wrap,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: hexAlpha(base, theme.dark ? 0.28 : 0.14),
        },
        style,
      ]}
    >
      {uri ? (
        <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} />
      ) : (
        <AppText style={[variant, { color: theme.dark ? '#E9E4F5' : base }]}>{initials(name)}</AppText>
      )}
    </View>
  );
}

export function AvatarStack({ names = [], size = 28, max = 4, style }) {
  const theme = useTheme();
  const visible = names.slice(0, max);
  const extra = names.length - visible.length;
  return (
    <View style={[styles.stack, style]}>
      {visible.map((n, i) => (
        <View
          key={`${n}-${i}`}
          style={{
            marginLeft: i === 0 ? 0 : -size * 0.32,
            borderWidth: 2,
            borderColor: theme.colors.card,
            borderRadius: (size + 4) / 2,
          }}
        >
          <Avatar name={n} size={size} />
        </View>
      ))}
      {extra > 0 ? (
        <View
          style={[
            styles.extra,
            {
              width: size,
              height: size,
              borderRadius: size / 2,
              marginLeft: -size * 0.32,
              backgroundColor: theme.colors.skeleton,
              borderWidth: 2,
              borderColor: theme.colors.card,
            },
          ]}
        >
          <AppText variant="micro" color="inkMuted">
            +{extra}
          </AppText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  stack: { flexDirection: 'row', alignItems: 'center' },
  extra: { alignItems: 'center', justifyContent: 'center' },
});
