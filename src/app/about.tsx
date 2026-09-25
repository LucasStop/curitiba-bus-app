import { CONTACT_EMAIL, PRIVACY_POLICY_URL } from '@/constants/links';
import { Radius, Typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import Constants from 'expo-constants';
import { Stack } from 'expo-router';
import { openBrowserAsync } from 'expo-web-browser';
import { ExternalLink as ExternalLinkIcon, Mail } from 'lucide-react-native';
import React, { useMemo } from 'react';
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function AboutScreen() {
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const version = Constants.expoConfig?.version ?? '';

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right', 'bottom']}>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Sobre',
          headerBackTitle: 'Voltar',
          headerTintColor: theme.text,
          headerStyle: { backgroundColor: theme.background },
          headerShadowVisible: false,
        }}
      />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Curitiba Bus App</Text>
        {!!version && <Text style={styles.muted}>Versão {version}</Text>}

        <Text style={styles.sectionTitle}>Responsabilidade</Text>
        <Text style={styles.body} testID="about-responsibility">
          Aplicativo independente e gratuito, desenvolvido por Lucas Stopinski da Silva, que é o responsável por ele. A
          URBS (Urbanização de Curitiba S.A.) apenas fornece os dados de transporte e não é responsável pelo aplicativo.
        </Text>

        <Text style={styles.sectionTitle}>Fonte dos dados</Text>
        <Text style={styles.body}>
          Linhas, paradas e trajetos: URBS e IPPUC (GeoCuritiba). Posições dos ônibus: URBS, atualizadas a cada 2
          minutos. Previsões de chegada são estimativas pela distância. Algumas linhas podem estar desatualizadas.
        </Text>

        <Text style={styles.sectionTitle}>Privacidade</Text>
        <TouchableOpacity
          style={styles.linkRow}
          onPress={() => openBrowserAsync(PRIVACY_POLICY_URL)}
          testID="about-privacy-policy-link"
          accessibilityRole="link"
          accessibilityLabel="Abrir a política de privacidade">
          <Text style={styles.linkText}>Política de privacidade</Text>
          <ExternalLinkIcon size={16} color={theme.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.linkRow}
          onPress={() => Linking.openURL(`mailto:${CONTACT_EMAIL}`)}
          testID="about-contact-link"
          accessibilityRole="link"
          accessibilityLabel={`Enviar e-mail para ${CONTACT_EMAIL}`}>
          <Text style={styles.linkText}>Contato: {CONTACT_EMAIL}</Text>
          <Mail size={16} color={theme.primary} />
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    content: { padding: 20, paddingBottom: 40 },
    title: {
      fontSize: Typography.screenTitle.fontSize,
      lineHeight: Typography.screenTitle.lineHeight,
      fontWeight: '900',
      color: theme.text,
    },
    muted: { fontSize: Typography.label.fontSize, color: theme.textMuted, marginTop: 2 },
    sectionTitle: {
      fontSize: Typography.label.fontSize,
      fontWeight: '800',
      color: theme.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.6,
      marginTop: 24,
      marginBottom: 8,
    },
    body: { fontSize: Typography.body.fontSize, lineHeight: 22, color: theme.text },
    linkRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      backgroundColor: theme.surface,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: theme.border,
      paddingHorizontal: 14,
      minHeight: 48,
      marginBottom: 8,
    },
    linkText: { fontSize: Typography.body.fontSize, fontWeight: '600', color: theme.primary, flexShrink: 1 },
  });
}
