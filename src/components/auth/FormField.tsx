import { Eye, EyeOff } from 'lucide-react-native';
import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, type TextInputProps, TouchableOpacity, View } from 'react-native';

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

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputRow}>
        <TextInput
          {...inputProps}
          secureTextEntry={isPassword ? hidden : inputProps.secureTextEntry}
          style={[styles.input, isPassword && styles.inputWithIcon, error ? styles.inputError : null]}
          placeholderTextColor="#94A3B8"
          testID={testID}
          accessibilityLabel={label}
        />
        {isPassword && (
          <TouchableOpacity
            onPress={() => setHidden((h) => !h)}
            style={styles.eyeButton}
            testID={`${testID}-toggle-visibility`}
            accessibilityRole="button"
            accessibilityLabel={hidden ? 'Mostrar senha' : 'Ocultar senha'}>
            {hidden ? <Eye size={20} color="#64748B" /> : <EyeOff size={20} color="#64748B" />}
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

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
  },
  inputRow: {
    position: 'relative',
    justifyContent: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: '#0F172A',
    backgroundColor: '#FFFFFF',
  },
  inputWithIcon: {
    paddingRight: 44,
  },
  inputError: {
    borderColor: '#DC2626',
  },
  eyeButton: {
    position: 'absolute',
    right: 8,
    padding: 8,
  },
  error: {
    marginTop: 6,
    fontSize: 12,
    color: '#DC2626',
  },
});
