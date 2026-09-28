import { CONTACT_EMAIL, DATA_LICENSE_URL, PRIVACY_POLICY_URL } from '@/constants/links';
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
        <Text style={styles.body} testID="about-data-source">
          Linhas, paradas, trajetos e horários: GTFS da URBS, obtido pelo Portal de Dados Abertos de Curitiba, combinado
          com o GeoCuritiba (IPPUC/URBS). Os dados foram modificados: trajetos simplificados, plataformas agrupadas por
          terminal e horários resumidos. Posições dos ônibus: URBS, atualizadas a cada 2 minutos. Previsões de chegada
          são estimativas pela distância.
        </Text>
        {/* Texto exigido pelas regras de uso do Portal de Dados Abertos de Curitiba. */}
        <Text style={[styles.muted, styles.disclaimer]}>
          O Portal de Dados Abertos de Curitiba e o órgão ou entidade de onde foram acessados os dados não garantem sua
          autenticidade, qualidade, integridade e atualidade após terem sido disponibilizados para uso secundário.
        </Text>
        <TouchableOpacity
          style={styles.linkRow}
          onPress={() => openBrowserAsync(DATA_LICENSE_URL)}
          testID="about-data-license-link"
          accessibilityRole="link"
          accessibilityLabel="Abrir a licença dos dados, Creative Commons Atribuição 4.0">
          <Text style={styles.linkText}>Licença dos dados: CC BY 4.0</Text>
          <ExternalLinkIcon size={16} color={theme.primary} />
        </TouchableOpacity>

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
    disclaimer: { lineHeight: Typography.label.lineHeight, marginTop: 8, marginBottom: 12 },
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
