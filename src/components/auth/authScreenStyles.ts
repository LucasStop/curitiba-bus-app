import { StyleSheet } from 'react-native';

// Estilo comum das 4 telas de conta (sign-in, sign-up, forgot/reset password). Paleta igual
// ao resto do app hoje (DESIGN.md ainda não aplicou os tokens propostos ao código).
export const authScreenStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 24,
  },
  formError: {
    fontSize: 13,
    color: '#DC2626',
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
    backgroundColor: '#0284C7',
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
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  linkText: {
    fontSize: 13,
    color: '#0284C7',
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
    color: '#64748B',
    fontWeight: '600',
  },
});
