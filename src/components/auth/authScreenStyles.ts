import { StyleSheet } from 'react-native';

import { Colors } from '@/constants/theme';

// Estilo comum das 4 telas de conta (sign-in, sign-up, forgot/reset password). Tokens de
// DESIGN.md § Cores (src/constants/theme.ts). successBox/successText ficam em verde escuro
// fixo (não são um token) porque precisam de contraste AA sobre fundo claro — o token `success`
// é o verde médio usado em indicadores "ao vivo", contraste insuficiente para texto de corpo.
export const authScreenStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: Colors.light.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: Colors.light.textMuted,
    marginBottom: 24,
  },
  formError: {
    fontSize: 13,
    color: Colors.light.danger,
    marginBottom: 12,
  },
  successBox: {
    backgroundColor: '#ECFDF5',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  successText: {
    fontSize: 13,
    color: '#065F46',
    lineHeight: 18,
  },
  primaryButton: {
    backgroundColor: Colors.light.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  primaryButtonText: {
    color: Colors.light.onPrimary,
    fontSize: 15,
    fontWeight: '700',
  },
  linkText: {
    fontSize: 13,
    color: Colors.light.primary,
    fontWeight: '600',
    marginTop: 18,
    textAlign: 'center',
  },
  guestButton: {
    marginTop: 28,
    paddingVertical: 10,
    alignItems: 'center',
  },
  guestButtonText: {
    fontSize: 13,
    color: Colors.light.textMuted,
    fontWeight: '600',
  },
});
