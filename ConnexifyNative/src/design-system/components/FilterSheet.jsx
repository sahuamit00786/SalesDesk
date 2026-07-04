import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Sheet from './Sheet';
import AppText from './AppText';
import Button from './Button';
import Chip from './Chip';
import { useTheme } from '../ThemeProvider';

/**
 * Generic staged filter sheet.
 * ref.open({ sections: [{key,title,options:[{value,label,color?}],multi}], value, onApply })
 * value shape: { [sectionKey]: string | string[] }
 */
const FilterSheet = forwardRef(function FilterSheet(_, ref) {
  const theme = useTheme();
  const sheetRef = useRef(null);
  const [config, setConfig] = useState(null);
  const [draft, setDraft] = useState({});

  useImperativeHandle(ref, () => ({
    open: (cfg) => {
      setConfig(cfg);
      setDraft(cfg.value || {});
      requestAnimationFrame(() => sheetRef.current?.present());
    },
    close: () => sheetRef.current?.dismiss(),
  }));

  const toggle = (section, optionValue) => {
    setDraft((prev) => {
      if (section.multi) {
        const current = Array.isArray(prev[section.key]) ? prev[section.key] : [];
        const next = current.includes(optionValue)
          ? current.filter((v) => v !== optionValue)
          : [...current, optionValue];
        return { ...prev, [section.key]: next };
      }
      return { ...prev, [section.key]: prev[section.key] === optionValue ? null : optionValue };
    });
  };

  const isOn = (section, optionValue) =>
    section.multi
      ? (Array.isArray(draft[section.key]) ? draft[section.key] : []).includes(optionValue)
      : draft[section.key] === optionValue;

  const activeCount = Object.values(draft).filter((v) => (Array.isArray(v) ? v.length : v)).length;

  return (
    <Sheet ref={sheetRef} title="Filters" scrollable snapPoints={['72%']} onDismiss={() => setConfig(null)}>
      {(config?.sections || []).map((section) => (
        <View key={section.key} style={styles.section}>
          <AppText variant="captionStrong" color="inkFaint" style={styles.sectionTitle}>
            {section.title.toUpperCase()}
          </AppText>
          <View style={styles.chips}>
            {section.options.map((option) => (
              <Chip
                key={String(option.value)}
                label={option.label}
                selected={isOn(section, option.value)}
                onPress={() => toggle(section, option.value)}
              />
            ))}
          </View>
        </View>
      ))}
      <View style={styles.footer}>
        <Button
          title="Clear all"
          variant="ghost"
          onPress={() => setDraft({})}
          style={styles.footerBtn}
          haptic={false}
        />
        <Button
          title={activeCount ? `Apply (${activeCount})` : 'Apply'}
          onPress={() => {
            config?.onApply?.(draft);
            sheetRef.current?.dismiss();
          }}
          style={styles.footerBtn}
        />
      </View>
    </Sheet>
  );
});

const styles = StyleSheet.create({
  section: { marginBottom: 18 },
  sectionTitle: { marginBottom: 10, letterSpacing: 0.8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  footer: { flexDirection: 'row', gap: 12, marginTop: 6 },
  footerBtn: { flex: 1 },
});

export default FilterSheet;
