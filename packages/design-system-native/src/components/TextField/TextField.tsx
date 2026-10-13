import { useState } from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { colors, fontSize, radius, space } from '../../tokens/tokens';

export interface TextFieldProps extends Omit<TextInputProps, 'style'> {
  label: string;
  error?: string;
  hint?: string;
}

export function TextField({ label, error, hint, multiline, onFocus, onBlur, ...props }: TextFieldProps) {
  const [focused, setFocused] = useState(false);
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.textMuted}
        multiline={multiline}
        {...props}
        onFocus={(e) => { setFocused(true); onFocus?.(e); }}
        onBlur={(e) => { setFocused(false); onBlur?.(e); }}
        style={[
          styles.input,
          multiline && styles.multiline,
          focused && styles.focused,
          !!error && styles.invalid,
          props.editable === false && styles.readOnly,
        ]}
      />
      {error ? <Text style={styles.error}>{error}</Text> : hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  field: { gap: space[1], alignSelf: 'stretch' },
  label: { fontSize: fontSize.sm, fontWeight: '600', color: colors.text },
  input: {
    minHeight: 44,
    paddingHorizontal: space[3],
    paddingVertical: space[2],
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.bgElevated,
    fontSize: fontSize.base,
    color: colors.text,
  },
  multiline: { minHeight: 96, textAlignVertical: 'top' },
  focused: { borderColor: colors.primary },
  invalid: { borderColor: colors.error },
  readOnly: { backgroundColor: colors.bgMuted, color: colors.textSecondary },
  error: { fontSize: fontSize.xs, color: colors.error },
  hint: { fontSize: fontSize.xs, color: colors.textMuted },
});
