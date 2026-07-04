import React, { forwardRef, useImperativeHandle, useRef, useState, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { trigger } from 'react-native-haptic-feedback';
import Sheet from './Sheet';
import AppText from './AppText';
import SearchBar from './SearchBar';
import { Check } from '../icons';
import { useTheme } from '../ThemeProvider';

/**
 * Imperative single/multi select bottom sheet.
 * ref.open({ title, options: [{value,label,description?,icon?,color?}], value, onChange, multi, searchable })
 */
const SelectSheet = forwardRef(function SelectSheet(_, ref) {
  const theme = useTheme();
  const sheetRef = useRef(null);
  const [config, setConfig] = useState(null);
  const [query, setQuery] = useState('');
  const [multiValue, setMultiValue] = useState([]);

  useImperativeHandle(ref, () => ({
    open: (cfg) => {
      setConfig(cfg);
      setQuery('');
      setMultiValue(Array.isArray(cfg.value) ? cfg.value : []);
      requestAnimationFrame(() => sheetRef.current?.present());
    },
    close: () => sheetRef.current?.dismiss(),
  }));

  const options = useMemo(() => {
    const list = config?.options || [];
    if (!query.trim()) return list;
    const q = query.toLowerCase();
    return list.filter((o) => String(o.label).toLowerCase().includes(q));
  }, [config, query]);

  const pick = (option) => {
    trigger('selection', { enableVibrateFallback: false });
    if (config?.multi) {
      setMultiValue((prev) =>
        prev.includes(option.value) ? prev.filter((v) => v !== option.value) : [...prev, option.value],
      );
      return;
    }
    config?.onChange?.(option.value, option);
    sheetRef.current?.dismiss();
  };

  const confirmMulti = () => {
    config?.onChange?.(multiValue);
    sheetRef.current?.dismiss();
  };

  const isSelected = (option) =>
    config?.multi ? multiValue.includes(option.value) : config?.value === option.value;

  return (
    <Sheet
      ref={sheetRef}
      title={config?.title}
      scrollable
      snapPoints={options.length > 7 || config?.searchable ? ['70%'] : null}
      onDismiss={() => setConfig(null)}
    >
      {config?.searchable ? (
        <SearchBar value={query} onChangeText={setQuery} placeholder="Search…" style={styles.search} autoFocus={false} />
      ) : null}
      {options.length === 0 ? (
        <AppText variant="body" color="inkFaint" style={styles.empty}>
          No options found
        </AppText>
      ) : (
        options.map((option) => {
          const selected = isSelected(option);
          return (
            <Pressable
              key={String(option.value)}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => pick(option)}
              style={[
                styles.option,
                {
                  backgroundColor: selected ? theme.brandFaint : 'transparent',
                  borderRadius: theme.radius.md,
                },
              ]}
            >
              {option.icon ? (
                <option.icon size={18} color={option.color || (selected ? theme.brand : theme.colors.inkMuted)} strokeWidth={2.1} />
              ) : option.color ? (
                <View style={[styles.dot, { backgroundColor: option.color }]} />
              ) : null}
              <View style={styles.optionTexts}>
                <AppText variant={selected ? 'bodyStrong' : 'body'} color={selected ? 'brand' : 'ink'}>
                  {option.label}
                </AppText>
                {option.description ? (
                  <AppText variant="caption" color="inkFaint" numberOfLines={1}>
                    {option.description}
                  </AppText>
                ) : null}
              </View>
              {selected ? <Check size={18} color={theme.brand} strokeWidth={2.6} /> : null}
            </Pressable>
          );
        })
      )}
      {config?.multi ? (
        <Pressable
          accessibilityRole="button"
          onPress={confirmMulti}
          style={[styles.confirm, { backgroundColor: theme.brand, borderRadius: theme.radius.md }]}
        >
          <AppText variant="bodyStrong" color={theme.onBrand}>
            Apply{multiValue.length ? ` (${multiValue.length})` : ''}
          </AppText>
        </Pressable>
      ) : null}
    </Sheet>
  );
});

const styles = StyleSheet.create({
  search: { marginBottom: 10 },
  empty: { textAlign: 'center', paddingVertical: 24 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 13,
  },
  optionTexts: { flex: 1 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  confirm: { alignItems: 'center', paddingVertical: 14, marginTop: 12 },
});

export default SelectSheet;
