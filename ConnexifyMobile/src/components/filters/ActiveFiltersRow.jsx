import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { spacing } from '../../theme';
import FilterChip from './FilterChip';

const ActiveFiltersRow = ({ filters = [], onRemove }) => {
  if (!filters.length) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
      style={styles.container}
    >
      {filters.map((f) => (
        <FilterChip
          key={f.key}
          label={f.label}
          selected
          onRemove={() => onRemove(f.key)}
        />
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { maxHeight: 44, marginBottom: spacing.sm },
  row:       { alignItems: 'center', paddingHorizontal: spacing.base, paddingVertical: spacing.xs },
});

export default ActiveFiltersRow;
