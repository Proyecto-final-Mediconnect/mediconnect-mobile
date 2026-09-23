import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';

import { colors, fonts, fontSize, radius, spacing } from './theme';

type TextFieldProps = Omit<TextInputProps, 'secureTextEntry'> & {
  label: string;
  error?: string;
  /** Campo de contraseña: se oculta el texto y se ofrece mostrarlo. */
  password?: boolean;
};

// Equivalente al `TextField` de la web: rótulo arriba, error abajo en rojo y,
// si es contraseña, el ojo para mostrarla.
export function TextField({
  label,
  error,
  password = false,
  ...props
}: TextFieldProps): React.JSX.Element {
  const [visible, setVisible] = useState(false);
  const [foco, setFoco] = useState(false);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      <View>
        <TextInput
          accessibilityLabel={label}
          aria-invalid={!!error}
          placeholderTextColor={colors.mutedSoft}
          secureTextEntry={password && !visible}
          autoCapitalize={password ? 'none' : props.autoCapitalize}
          {...props}
          onFocus={(e) => {
            setFoco(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFoco(false);
            props.onBlur?.(e);
          }}
          style={[
            styles.input,
            password && styles.inputPassword,
            foco && styles.inputFocus,
            !!error && styles.inputError,
          ]}
        />
        {password && (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            aria-pressed={visible}
            hitSlop={spacing.sm}
            onPress={() => setVisible((v) => !v)}
            style={styles.toggle}
          >
            <Ionicons
              name={visible ? 'eye-outline' : 'eye-off-outline'}
              size={20}
              color={colors.muted}
            />
          </Pressable>
        )}
      </View>
      {error ? (
        <Text accessibilityRole="alert" style={styles.error}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { gap: 6 },
  label: { fontFamily: fonts.semibold, fontSize: fontSize.sm, color: colors.brandDeep },
  input: {
    minHeight: 48,
    borderWidth: 1,
    borderColor: colors.lineStrong,
    borderRadius: radius.field,
    backgroundColor: colors.white,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    fontFamily: fonts.medium,
    fontSize: fontSize.lg,
    color: colors.ink,
  },
  inputPassword: { paddingRight: 44 },
  inputFocus: { borderColor: colors.brand },
  inputError: { borderColor: colors.danger },
  toggle: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 0,
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  error: { fontFamily: fonts.medium, fontSize: fontSize.sm, color: colors.danger },
});
