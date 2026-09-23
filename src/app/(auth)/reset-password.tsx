import { FormField } from '@/components/auth/FormField';
import { useAuthScreenStyles } from '@/components/auth/authScreenStyles';
import { useTheme } from '@/hooks/use-theme';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';
import { validatePassword } from '@/lib/validation';
import { useAuth } from '@/providers/AuthProvider';
import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// O link de recuperação (curitibabusapp://reset-password#access_token=...&refresh_token=...&type=recovery,
// ou ?code=... no fluxo PKCE) chega com os tokens na query OU no fragmento da URL; junta os dois.
function paramsFromUrl(url: string | null): Record<string, string> {
  if (!url) return {};
  const raw = url.split(/[?#]/).slice(1).join('&');
  return Object.fromEntries(new URLSearchParams(raw));
}

type Stage = 'checking' | 'ready' | 'invalid' | 'done';

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { updatePassword } = useAuth();
  const url = Linking.useLinkingURL();
  const s = useAuthScreenStyles();
  const theme = useTheme();

  const [stage, setStage] = useState<Stage>('checking');
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Abre a sessão temporária de recuperação a partir do link, sem passar pelo AuthProvider:
  // setSession/exchangeCodeForSession não são ações de conta, são só a leitura do próprio link.
  useEffect(() => {
    let active = true;
    async function establish() {
      if (!isSupabaseConfigured()) {
        if (active) setStage('invalid');
        return;
      }
      const params = paramsFromUrl(url);
      const supabase = getSupabase();
      try {
        if (params.code) {
          const { error } = await supabase.auth.exchangeCodeForSession(params.code);
          if (error) throw error;
        } else if (params.access_token && params.refresh_token) {
          const { error } = await supabase.auth.setSession({
            access_token: params.access_token,
            refresh_token: params.refresh_token,
          });
          if (error) throw error;
        } else {
          if (active) setStage('invalid');
          return;
        }
        if (active) setStage('ready');
      } catch {
        if (active) setStage('invalid');
      }
    }
    establish();
    return () => {
      active = false;
    };
  }, [url]);

  async function handleSubmit() {
    const pErr = validatePassword(password);
    setPasswordError(pErr);
    setFormError(null);
    if (pErr) return;

    setSubmitting(true);
    const result = await updatePassword(password);
    setSubmitting(false);
    if (result.error) {
      setFormError(result.error);
      return;
    }
    setStage('done');
  }

  return (
    <SafeAreaView style={s.container} edges={['left', 'right']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
          <Text style={s.title}>Nova senha</Text>

          {stage === 'checking' && (
            <View style={{ paddingVertical: 24, alignItems: 'center' }} testID="reset-password-checking">
              <ActivityIndicator color={theme.primary} />
            </View>
          )}

          {stage === 'invalid' && (
            <Text style={s.formError} testID="reset-password-invalid-link">
              Link inválido ou expirado. Peça um novo em &quot;Esqueci minha senha&quot;.
            </Text>
          )}

          {stage === 'done' && (
            <>
              <View style={s.successBox}>
                <Text style={s.successText} testID="reset-password-success-message">
                  Senha atualizada. Você já está conectado.
                </Text>
              </View>
              <TouchableOpacity
                style={s.primaryButton}
                onPress={() => router.replace('/(tabs)')}
                testID="reset-password-go-app"
                accessibilityRole="button"
                accessibilityLabel="Ir para o app">
                <Text style={s.primaryButtonText}>Ir para o app</Text>
              </TouchableOpacity>
            </>
          )}

          {stage === 'ready' && (
            <>
              <Text style={s.subtitle}>Escolha uma nova senha para entrar.</Text>
              <FormField
                label="Nova senha"
                value={password}
                onChangeText={setPassword}
                error={passwordError}
                isPassword
                autoComplete="new-password"
                textContentType="newPassword"
                testID="reset-password-new-password"
              />

              {formError ? (
                <Text style={s.formError} testID="reset-password-form-error">
                  {formError}
                </Text>
              ) : null}

              <TouchableOpacity
                style={[s.primaryButton, submitting && s.buttonDisabled]}
                onPress={handleSubmit}
                disabled={submitting}
                testID="reset-password-submit"
                accessibilityRole="button"
                accessibilityLabel="Salvar nova senha"
                accessibilityState={{ disabled: submitting, busy: submitting }}>
                {submitting ? <ActivityIndicator color={theme.onPrimary} /> : <Text style={s.primaryButtonText}>Salvar nova senha</Text>}
              </TouchableOpacity>
            </>
          )}

          {stage !== 'done' && (
            <TouchableOpacity
              onPress={() => router.replace('/(tabs)')}
              style={s.guestButton}
              testID="reset-password-continue-as-guest"
              accessibilityRole="button"
              accessibilityLabel="Continuar como visitante">
              <Text style={s.guestButtonText}>Continuar como visitante</Text>
            </TouchableOpacity>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
