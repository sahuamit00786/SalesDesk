import React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from 'react-native';

const KeyboardAware = ({ children, style, contentContainerStyle }) => (
  <KeyboardAvoidingView
    style={[styles.flex, style]}
    behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
  >
    <ScrollView
      contentContainerStyle={[styles.content, contentContainerStyle]}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  </KeyboardAvoidingView>
);

const styles = StyleSheet.create({
  flex:    { flex: 1 },
  content: { flexGrow: 1, paddingBottom: 40 },
});

export default KeyboardAware;
