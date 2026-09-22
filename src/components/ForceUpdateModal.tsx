import * as Linking from 'expo-linking';
import React from 'react';
import { Modal, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { Radius, Spacing, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

interface ForceUpdateModalProps {
  visible: boolean;
  iosUrl: string | null;
  androidUrl: string | null;
}

// Sem onRequestClose que feche o modal e sem botao de fechar: enquanto `visible`, bloqueia
// qualquer tela por baixo (incluindo login). So sai daqui atualizando o app.
export default function ForceUpdateModal({ visible, iosUrl, androidUrl }: ForceUpdateModalProps) {
  const theme = useTheme();
  const storeUrl = Platform.select({ ios: iosUrl, android: androidUrl }) ?? null;

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={[styles.backdrop, { backgroundColor: 'rgba(15, 23, 42, 0.7)' }]}>
        <View style={[styles.card, { backgroundColor: theme.surface }]}>
          <Text style={[Typography.screenTitle, { color: theme.text }]}>Atualização necessária</Text>
          <Text style={[Typography.body, { color: theme.textMuted, marginTop: Spacing.two }]}>
            Uma nova versão do app está disponível. Atualize para continuar usando.
          </Text>
          <Pressable
            accessibilityRole="button"
            disabled={!storeUrl}
            onPress={() => storeUrl && Linking.openURL(storeUrl)}
            style={[styles.button, { backgroundColor: theme.primary, opacity: storeUrl ? 1 : 0.5 }]}
          >
            <Text style={[Typography.itemTitle, { color: theme.onPrimary }]}>Atualizar agora</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: Spacing.four },
  card: { width: '100%', maxWidth: 360, borderRadius: Radius.lg, padding: Spacing.four },
  button: {
    marginTop: Spacing.four,
    borderRadius: Radius.md,
    paddingVertical: Spacing.three,
    alignItems: 'center',
  },
});
