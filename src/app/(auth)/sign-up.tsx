import { FormField } from '@/components/auth/FormField';
import { authScreenStyles as s } from '@/components/auth/authScreenStyles';
import { Colors } from '@/constants/theme';
import { validateEmail, validatePassword } from '@/lib/validation';
import { useAuth } from '@/providers/AuthProvider';
import { Link, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SignUpScreen() {
  const router = useRouter();
  const { signUp } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sentConfirmation, setSentConfirmation] = useState(false);

  async function onSubmit() {
    const eErr = validateEmail(email);
    const pErr = validatePassword(password);
    setEmailError(eErr);
    setPasswordError(pErr);
    setFormError(null);
    if (eErr || pErr) return;

    setSubmitting(true);
    const result = await signUp(email, password);
    setSubmitting(false);
    if (result.error) {
      setFormError(result.error);
      return;
    }
    if (result.needsEmailConfirmation) {
      setSentConfirmation(true);
      return;
    }
    router.replace('/(tabs)');
  }

  if (sentConfirmation) {
    return (
      <SafeAreaView style={s.container} edges={['left', 'right']}>
        <ScrollView contentContainerStyle={s.content}>
          <Text style={s.title}>Quase lá</Text>
          <Text style={[s.successText, { marginBottom: 24 }]} testID="sign-up-confirmation-message">
            Enviamos um link para confirmar seu e-mail.
          </Text>
          <TouchableOpacity
            onPress={() => router.replace('/(auth)/sign-in')}
            style={s.primaryButton}
            testID="sign-up-go-sign-in"
            accessibilityRole="button"
            accessibilityLabel="Ir para entrar">
            <Text style={s.primaryButtonText}>Entrar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.replace('/(tabs)')}
            style={s.guestButton}
            testID="sign-up-continue-as-guest"
            accessibilityRole="button"
            accessibilityLabel="Continuar como visitante">
            <Text style={s.guestButtonText}>Continuar como visitante</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={s.container} edges={['left', 'right']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
          <Text style={s.title}>Criar conta</Text>
          <Text style={s.subtitle}>Seus favoritos ficam salvos e sincronizados entre aparelhos.</Text>

          <FormField
            label="E-mail"
            value={email}
            onChangeText={setEmail}
            error={emailError}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
            testID="sign-up-email"
          />
          <FormField
            label="Senha"
            value={password}
            onChangeText={setPassword}
            error={passwordError}
            isPassword
            autoComplete="new-password"
            textContentType="newPassword"
            testID="sign-up-password"
          />

          {formError ? (
            <Text style={s.formError} testID="sign-up-form-error">
              {formError}
            </Text>
          ) : null}

          <TouchableOpacity
            style={[s.primaryButton, submitting && s.buttonDisabled]}
            onPress={onSubmit}
            disabled={submitting}
            testID="sign-up-submit"
            accessibilityRole="button"
            accessibilityLabel="Criar conta"
            accessibilityState={{ disabled: submitting, busy: submitting }}>
            {submitting ? <ActivityIndicator color={Colors.light.onPrimary} /> : <Text style={s.primaryButtonText}>Criar conta</Text>}
          </TouchableOpacity>

          <Link href="/(auth)/sign-in" asChild>
            <TouchableOpacity testID="sign-up-go-sign-in" accessibilityRole="button" accessibilityLabel="Já tem conta? Entrar">
              <Text style={s.linkText}>Já tem conta? Entrar</Text>
            </TouchableOpacity>
          </Link>

          <TouchableOpacity
            onPress={() => router.replace('/(tabs)')}
            style={s.guestButton}
            testID="sign-up-continue-as-guest"
            accessibilityRole="button"
            accessibilityLabel="Continuar como visitante">
            <Text style={s.guestButtonText}>Continuar como visitante</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
