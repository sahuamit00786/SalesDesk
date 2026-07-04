import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppText from '../design-system/components/AppText';
import IconButton from '../design-system/components/IconButton';
import { ArrowLeft } from '../design-system/icons';
import { useTheme } from '../design-system/ThemeProvider';

/**
 * Header for pushed screens: back + title (+subtitle) + right action slot.
 */
export default function AppHeader({ title, subtitle, back = true, right = null, style, transparent = false }) {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  return (
    <View
      style={[
        styles.wrap,
        {
          paddingTop: insets.top + 6,
          backgroundColor: transparent ? 'transparent' : theme.colors.page,
        },
        style,
      ]}
    >
      <View style={styles.row}>
        {back ? (
          <IconButton
            icon={ArrowLeft}
            accessibilityLabel="Go back"
            onPress={() => navigation.goBack()}
            variant="soft"
          />
        ) : (
          <View style={styles.spacer} />
        )}
        <View style={styles.titles}>
          <AppText variant="subheading" numberOfLines={1} style={styles.title}>
            {title}
          </AppText>
          {subtitle ? (
            <AppText variant="caption" color="inkFaint" numberOfLines={1} style={styles.title}>
              {subtitle}
            </AppText>
          ) : null}
        </View>
        <View style={styles.right}>{right || <View style={styles.spacer} />}</View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { paddingHorizontal: 16, paddingBottom: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  titles: { flex: 1, alignItems: 'center' },
  title: { textAlign: 'center' },
  right: { minWidth: 40, alignItems: 'flex-end', flexDirection: 'row', gap: 8, justifyContent: 'flex-end' },
  spacer: { width: 40 },
});
