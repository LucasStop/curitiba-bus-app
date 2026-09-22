import { FormField } from '@/components/auth/FormField';
import { useAuthScreenStyles } from '@/components/auth/authScreenStyles';
import { useTheme } from '@/hooks/use-theme';
import { RESET_SENT_MESSAGE } from '@/lib/authErrors';
import { validateEmail } from '@/lib/validation';
import { useAuth } from '@/providers/AuthProvider';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const { resetPassword } = useAuth();
  const s = useAuthScreenStyles();
  const theme = useTheme();

  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit() {
    const eErr = validateEmail(email);
    setEmailError(eErr);
    setFormError(null);
    if (eErr) return;

    setSubmitting(true);
    const result = await resetPassword(email);
    setSubmitting(false);
    if (result.error) {
      setFormError(result.error);
      return;
    }
    setSent(true);
  }

  return (
    <SafeAreaView style={s.container} edges={['left', 'right']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
          <Text style={s.title}>Esqueci minha senha</Text>
          <Text style={s.subtitle}>Enviamos um link para redefinir a senha no e-mail informado.</Text>

          {sent ? (
            <View style={s.successBox}>
              <Text style={s.successText} testID="forgot-password-success-message">
                {RESET_SENT_MESSAGE}
              </Text>
            </View>
          ) : (
            <>
              <FormField
                label="E-mail"
                value={email}
                onChangeText={setEmail}
                error={emailError}
                keyboardType="email-address"
                autoCapitalize="none"
                autoComplete="email"
                textContentType="emailAddress"
                testID="forgot-password-email"
              />

              {formError ? (
                <Text style={s.formError} testID="forgot-password-form-error">
                  {formError}
                </Text>
              ) : null}

              <TouchableOpacity
                style={[s.primaryButton, submitting && s.buttonDisabled]}
                onPress={onSubmit}
                disabled={submitting}
                testID="forgot-password-submit"
                accessibilityRole="button"
                accessibilityLabel="Enviar link de recuperação"
                accessibilityState={{ disabled: submitting, busy: submitting }}>
                {submitting ? <ActivityIndicator color={theme.onPrimary} /> : <Text style={s.primaryButtonText}>Enviar link</Text>}
              </TouchableOpacity>
            </>
          )}

          <TouchableOpacity
            onPress={() => router.replace('/(tabs)')}
            style={s.guestButton}
            testID="forgot-password-continue-as-guest"
            accessibilityRole="button"
            accessibilityLabel="Continuar como visitante">
            <Text style={s.guestButtonText}>Continuar como visitante</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
