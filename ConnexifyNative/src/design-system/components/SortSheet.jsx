import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { trigger } from 'react-native-haptic-feedback';
import Sheet from './Sheet';
import AppText from './AppText';
import { SegmentedTabs } from './SegmentedTabs';
import { Check } from '../icons';
import { useTheme } from '../ThemeProvider';

/**
 * Sort picker. ref.open({ options:[{value,label}], value:{field,order}, onApply })
 */
const SortSheet = forwardRef(function SortSheet(_, ref) {
  const theme = useTheme();
  const sheetRef = useRef(null);
  const [config, setConfig] = useState(null);
  const [field, setField] = useState(null);
  const [order, setOrder] = useState('desc');

  useImperativeHandle(ref, () => ({
    open: (cfg) => {
      setConfig(cfg);
      setField(cfg.value?.field || cfg.options?.[0]?.value);
      setOrder(cfg.value?.order || 'desc');
      requestAnimationFrame(() => sheetRef.current?.present());
    },
    close: () => sheetRef.current?.dismiss(),
  }));

  const apply = (nextField, nextOrder) => {
    config?.onApply?.({ field: nextField, order: nextOrder });
    sheetRef.current?.dismiss();
  };

  return (
    <Sheet ref={sheetRef} title="Sort by" onDismiss={() => setConfig(null)}>
      <SegmentedTabs
        tabs={[
          { key: 'desc', label: 'Descending' },
          { key: 'asc', label: 'Ascending' },
        ]}
        value={order}
        onChange={(next) => setOrder(next)}
        style={styles.orderTabs}
      />
      {(config?.options || []).map((option) => {
        const selected = field === option.value;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            onPress={() => {
              trigger('selection', { enableVibrateFallback: false });
              setField(option.value);
              apply(option.value, order);
            }}
            style={[styles.option, { backgroundColor: selected ? theme.brandFaint : 'transparent', borderRadius: theme.radius.md }]}
          >
            <AppText variant={selected ? 'bodyStrong' : 'body'} color={selected ? 'brand' : 'ink'} style={styles.optionLabel}>
              {option.label}
            </AppText>
            {selected ? <Check size={18} color={theme.brand} strokeWidth={2.6} /> : null}
          </Pressable>
        );
      })}
    </Sheet>
  );
});

const styles = StyleSheet.create({
  orderTabs: { marginBottom: 12 },
  option: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 13 },
  optionLabel: { flex: 1 },
});

export default SortSheet;
