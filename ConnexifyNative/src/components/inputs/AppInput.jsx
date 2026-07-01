import React, { useState, useRef, useEffect } from 'react';
import { View, TextInput, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '../../theme/ThemeContext';
import { borderRadius, fontSize, fontWeight, spacing } from '../../theme';

const AppInput = ({
  label,
  value,
  onChangeText,
  placeholder,
  iconLeft,
  iconRight,
  onIconRightPress,
  secureTextEntry,
  error,
  multiline,
  numberOfLines,
  keyboardType,
  autoCapitalize = 'none',
  style,
  inputStyle,
  editable = true,
  returnKeyType,
  onSubmitEditing,
  maxLength,
}) => {
  const { theme } = useTheme();
  const [focused, setFocused] = useState(false);
  const [secure, setSecure]   = useState(secureTextEntry);
  const borderAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim  = useRef(new Animated.Value(0)).current;

  // Shake when error appears
  useEffect(() => {
    if (error) {
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 8,  duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -8, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 6,  duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -6, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0,  duration: 60, useNativeDriver: true }),
      ]).start();
    }
  }, [error]);

  const onFocus = () => {
    setFocused(true);
    Animated.timing(borderAnim, { toValue: 1, duration: 200, useNativeDriver: false }).start();
  };

  const onBlur = () => {
    setFocused(false);
    Animated.timing(borderAnim, { toValue: 0, duration: 200, useNativeDriver: false }).start();
  };

  const borderColor = borderAnim.interpolate({
    inputRange:  [0, 1],
    outputRange: [error ? theme.colors.danger : theme.colors.border, theme.colors.primary],
  });

  const s = styles(theme);

  return (
    <Animated.View style={[s.container, style, { transform: [{ translateX: shakeAnim }] }]}>
      {label && <Text style={s.label}>{label}</Text>}
      <Animated.View style={[s.inputWrap, { borderColor }, error && s.errorBorder]}>
        {iconLeft && (
          <Icon
            name={iconLeft}
            size={18}
            color={focused ? theme.colors.primary : theme.colors.textMuted}
            style={s.iconLeft}
          />
        )}
        <TextInput
          style={[
            s.input,
            iconLeft  && s.inputWithLeft,
            iconRight && s.inputWithRight,
            multiline && s.multiline,
            inputStyle,
          ]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={theme.colors.textMuted}
          secureTextEntry={secure}
          onFocus={onFocus}
          onBlur={onBlur}
          multiline={multiline}
          numberOfLines={numberOfLines}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          editable={editable}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          maxLength={maxLength}
        />
        {secureTextEntry ? (
          <TouchableOpacity onPress={() => setSecure(!secure)} style={s.iconRight}>
            <Icon name={secure ? 'eye-off-outline' : 'eye-outline'} size={18} color={theme.colors.textMuted} />
          </TouchableOpacity>
        ) : iconRight ? (
          <TouchableOpacity onPress={onIconRightPress} style={s.iconRight}>
            <Icon name={iconRight} size={18} color={theme.colors.textMuted} />
          </TouchableOpacity>
        ) : null}
      </Animated.View>
      {error && <Text style={s.error}>{error}</Text>}
    </Animated.View>
  );
};

const styles = (theme) => StyleSheet.create({
  container:    { marginBottom: spacing.base },
  label:        { fontSize: fontSize.sm, fontWeight: fontWeight.medium, color: theme.colors.textSecondary, marginBottom: 6 },
  inputWrap: {
    flexDirection:   'row',
    alignItems:      'center',
    backgroundColor: theme.colors.surface,
    borderRadius:    borderRadius.md,
    borderWidth:     1.5,
    borderColor:     theme.colors.border,
    minHeight:       48,
    overflow:        'hidden',
  },
  errorBorder:   { borderColor: theme.colors.danger },
  iconLeft:      { paddingLeft: spacing.md },
  iconRight:     { paddingRight: spacing.md },
  input: {
    flex: 1,
    color:      theme.colors.textPrimary,
    fontSize:   fontSize.base,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  inputWithLeft:  { paddingLeft: spacing.sm },
  inputWithRight: { paddingRight: spacing.sm },
  multiline:      { textAlignVertical: 'top', paddingTop: spacing.sm },
  error:          { fontSize: fontSize.xs, color: theme.colors.danger, marginTop: 4, marginLeft: 2 },
});

export default AppInput;
