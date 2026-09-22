import { Eye, EyeOff } from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, type TextInputProps, TouchableOpacity, View } from 'react-native';

import { useTheme } from '@/hooks/use-theme';

interface FormFieldProps extends TextInputProps {
  label: string;
  /** Mensagem em pt-BR abaixo do campo. O erro nunca é indicado só por cor (DESIGN.md). */
  error?: string | null;
  /** Mostra o botão de mostrar/ocultar e começa com o texto escondido. */
  isPassword?: boolean;
  testID: string;
}

export function FormField({ label, error, isPassword, testID, ...inputProps }: FormFieldProps) {
  const [hidden, setHidden] = useState(true);
  const theme = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        wrapper: {
          marginBottom: 16,
        },
        label: {
          fontSize: 13,
          fontWeight: '700',
          color: theme.text,
          marginBottom: 6,
        },
        inputRow: {
          position: 'relative',
          justifyContent: 'center',
        },
        input: {
          borderWidth: 1,
          borderColor: theme.border,
          borderRadius: 12,
          paddingHorizontal: 14,
          paddingVertical: 12,
          fontSize: 15,
          color: theme.text,
          backgroundColor: theme.surface,
        },
        inputWithIcon: {
          paddingRight: 44,
        },
        inputError: {
          borderColor: theme.danger,
        },
        eyeButton: {
          position: 'absolute',
          right: 8,
          padding: 8,
        },
        error: {
          marginTop: 6,
          fontSize: 12,
          color: theme.danger,
        },
      }),
    [theme],
  );

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputRow}>
        <TextInput
          {...inputProps}
          secureTextEntry={isPassword ? hidden : inputProps.secureTextEntry}
          style={[styles.input, isPassword && styles.inputWithIcon, error ? styles.inputError : null]}
          placeholderTextColor={theme.textMuted}
          testID={testID}
          accessibilityLabel={label}
        />
        {isPassword && (
          <TouchableOpacity
            onPress={() => setHidden((h) => !h)}
            style={styles.eyeButton}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
            testID={`${testID}-toggle-visibility`}
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Mostrar senha' : 'Ocultar senha'}>
            {hidden ? (
              <Eye size={20} color={theme.textMuted} />
            ) : (
              <EyeOff size={20} color={theme.textMuted} />
            )}
          </TouchableOpacity>
        )}
      </View>
      {error ? (
        <Text style={styles.error} testID={`${testID}-error`}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}
