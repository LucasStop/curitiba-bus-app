import { FormField } from '@/components/auth/FormField';
import { authScreenStyles as s } from '@/components/auth/authScreenStyles';
import { Colors } from '@/constants/theme';
import { validateEmail, validatePassword } from '@/lib/validation';
import { useAuth } from '@/providers/AuthProvider';
import { Link, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function SignInScreen() {
  const router = useRouter();
  const { signIn } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit() {
    const eErr = validateEmail(email);
    const pErr = validatePassword(password);
    setEmailError(eErr);
    setPasswordError(pErr);
    setFormError(null);
    if (eErr || pErr) return;

    setSubmitting(true);
    const result = await signIn(email, password);
    setSubmitting(false);
    if (result.error) {
      setFormError(result.error);
      return;
    }
    router.replace('/(tabs)');
  }

  return (
    <SafeAreaView style={s.container} edges={['left', 'right']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
          <Text style={s.title}>Entrar</Text>
          <Text style={s.subtitle}>Sincronize seus favoritos entre aparelhos.</Text>

          <FormField
            label="E-mail"
            value={email}
            onChangeText={setEmail}
            error={emailError}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
            testID="sign-in-email"
          />
          <FormField
            label="Senha"
            value={password}
            onChangeText={setPassword}
            error={passwordError}
            isPassword
            autoComplete="password"
            textContentType="password"
            testID="sign-in-password"
          />

          {formError ? (
            <Text style={s.formError} testID="sign-in-form-error">
              {formError}
            </Text>
          ) : null}

          <TouchableOpacity
            style={[s.primaryButton, submitting && s.buttonDisabled]}
            onPress={onSubmit}
            disabled={submitting}
            testID="sign-in-submit"
            accessibilityRole="button"
            accessibilityLabel="Entrar"
            accessibilityState={{ disabled: submitting, busy: submitting }}>
            {submitting ? <ActivityIndicator color={Colors.light.onPrimary} /> : <Text style={s.primaryButtonText}>Entrar</Text>}
          </TouchableOpacity>

          <Link href="/(auth)/forgot-password" asChild>
            <TouchableOpacity testID="sign-in-forgot-password" accessibilityRole="button" accessibilityLabel="Esqueci minha senha">
              <Text style={s.linkText}>Esqueci minha senha</Text>
            </TouchableOpacity>
          </Link>

          <Link href="/(auth)/sign-up" asChild>
            <TouchableOpacity testID="sign-in-go-sign-up" accessibilityRole="button" accessibilityLabel="Criar conta">
              <Text style={s.linkText}>Não tem conta? Criar conta</Text>
            </TouchableOpacity>
          </Link>

          <TouchableOpacity
            onPress={() => router.replace('/(tabs)')}
            style={s.guestButton}
            testID="sign-in-continue-as-guest"
            accessibilityRole="button"
            accessibilityLabel="Continuar como visitante">
            <Text style={s.guestButtonText}>Continuar como visitante</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
