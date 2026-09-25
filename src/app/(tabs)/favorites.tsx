import { BusBadge } from '@/components/ui/BusBadge';
import { Radius, Shadows, Typography } from '@/constants/theme';
import { CURITIBA_LINES, CURITIBA_STOPS, TRANSIT_ALERTS } from '@/data/curitibaDataset';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/providers/AuthProvider';
import { transitService } from '@/services/transitProvider';
import { useFavoritesStore } from '@/stores/useFavoritesStore';
import { useTransitStore } from '@/stores/useTransitStore';
import { formatArrivalSource } from '@/utils/geo';
import { useRouter } from 'expo-router';
import {
  AlertTriangle,
  Bell,
  Bookmark,
  Bus,
  Info,
  LogIn,
  LogOut,
  MapPin,
  Trash2,
  User as UserIcon,
} from 'lucide-react-native';
import React, { useMemo, useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function FavoritesScreen() {
  const router = useRouter();
  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [activeTab, setActiveTab] = useState<'favorites' | 'alerts'>('favorites');

  const favoriteLines = useFavoritesStore((s) => s.favoriteLines);
  const favoriteStops = useFavoritesStore((s) => s.favoriteStops);
  const toggleFavoriteLine = useFavoritesStore((s) => s.toggleFavoriteLine);
  const toggleFavoriteStop = useFavoritesStore((s) => s.toggleFavoriteStop);
  const setSelectedLine = useTransitStore((s) => s.setSelectedLine);
  const setSelectedStop = useTransitStore((s) => s.setSelectedStop);

  const { user, signOut, deleteAccount } = useAuth();
  const [deleting, setDeleting] = useState(false);

  const lines = CURITIBA_LINES.filter((l) => favoriteLines.includes(l.codigo));
  const stops = CURITIBA_STOPS.filter((s) => favoriteStops.includes(s.id));

  async function handleSignOut() {
    await signOut();
  }

  // Confirmação em duas etapas (SECURITY.md, ação destrutiva): só na segunda o usuário confirma de fato.
  function handleDeleteAccount() {
    Alert.alert('Excluir conta', 'Isso apaga seu e-mail e o cadastro. Os favoritos ficam salvos neste aparelho.', [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Excluir',
        style: 'destructive',
        onPress: () => {
          Alert.alert('Tem certeza?', 'Essa ação não pode ser desfeita.', [
            { text: 'Cancelar', style: 'cancel' },
            {
              text: 'Excluir conta',
              style: 'destructive',
              onPress: async () => {
                setDeleting(true);
                const result = await deleteAccount();
                setDeleting(false);
                if (result.error) Alert.alert('Não foi possível excluir', result.error);
              },
            },
          ]);
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header com Abas */}
      <View style={styles.header}>
        <Text style={styles.title}>Meus Favoritos & Alertas</Text>
        <Text style={styles.subtitle}>Acesso rápido e comunicados da URBS</Text>

        {/* Seção Conta (RF-17 a RF-21): visitante entra/cria conta, logado sai ou exclui a conta. */}
        <View style={styles.accountSection} testID="account-section">
          {user ? (
            <>
              <View style={styles.accountRow}>
                <View style={styles.accountIconWrapper}>
                  <UserIcon size={16} color={theme.primary} />
                </View>
                <Text style={styles.accountEmail} numberOfLines={1} testID="account-email">
                  {user.email}
                </Text>
              </View>
              <View style={styles.accountActions}>
                <TouchableOpacity
                  onPress={handleSignOut}
                  style={styles.accountButton}
                  testID="account-sign-out"
                  accessibilityRole="button"
                  accessibilityLabel="Sair da conta">
                  <LogOut size={15} color={theme.text} />
                  <Text style={styles.accountButtonText}>Sair</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleDeleteAccount}
                  style={styles.accountButton}
                  disabled={deleting}
                  testID="account-delete"
                  accessibilityRole="button"
                  accessibilityLabel="Excluir conta"
                  accessibilityState={{ disabled: deleting, busy: deleting }}>
                  <Trash2 size={15} color={theme.danger} />
                  <Text style={[styles.accountButtonText, styles.accountButtonDangerText]}>
                    {deleting ? 'Excluindo…' : 'Excluir conta'}
                  </Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.accountGuestText}>Entre para sincronizar seus favoritos entre aparelhos.</Text>
              <View style={styles.accountActions}>
                <TouchableOpacity
                  onPress={() => router.push('/(auth)/sign-in')}
                  style={styles.accountButton}
                  testID="account-go-sign-in"
                  accessibilityRole="button"
                  accessibilityLabel="Entrar">
                  <LogIn size={15} color={theme.primary} />
                  <Text style={styles.accountButtonText}>Entrar</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => router.push('/(auth)/sign-up')}
                  style={[styles.accountButton, styles.accountButtonPrimary]}
                  testID="account-go-sign-up"
                  accessibilityRole="button"
                  accessibilityLabel="Criar conta">
                  <Text style={[styles.accountButtonText, styles.accountButtonPrimaryText]}>Criar conta</Text>
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>

        <View style={styles.tabToggle}>
          <TouchableOpacity
            onPress={() => setActiveTab('favorites')}
            style={[styles.tabButton, activeTab === 'favorites' && styles.tabButtonActive]}
            testID="favorites-tab-favorites-button"
            accessibilityRole="button"
            accessibilityState={{ selected: activeTab === 'favorites' }}
            accessibilityLabel={`Ver favoritos, ${lines.length + stops.length} salvos`}>
            <Bookmark
              size={16}
              color={activeTab === 'favorites' ? theme.text : theme.textMuted}
              fill={activeTab === 'favorites' ? theme.text : 'none'}
            />
            <Text style={[styles.tabButtonText, activeTab === 'favorites' && styles.tabButtonTextActive]}>
              Favoritos ({lines.length + stops.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab('alerts')}
            style={[styles.tabButton, activeTab === 'alerts' && styles.tabButtonActive]}
            testID="favorites-tab-alerts-button"
            accessibilityRole="button"
            accessibilityState={{ selected: activeTab === 'alerts' }}
            accessibilityLabel={`Ver alertas RIT, ${TRANSIT_ALERTS.length} avisos`}>
            <Bell size={16} color={activeTab === 'alerts' ? theme.text : theme.textMuted} />
            <Text style={[styles.tabButtonText, activeTab === 'alerts' && styles.tabButtonTextActive]}>
              Alertas RIT ({TRANSIT_ALERTS.length})
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.scrollContent}>
        {activeTab === 'favorites' ? (
          <>
            {/* Seção Linhas Favoritas */}
            <Text style={styles.sectionTitle}>Linhas Salvas</Text>
            {lines.length === 0 ? (
              <View style={styles.emptyCard}>
                <Bus size={28} color={theme.textSubtle} />
                <Text style={styles.emptyText}>Você ainda não favoritou nenhuma linha.</Text>
                <TouchableOpacity
                  onPress={() => router.push('/(tabs)/lines')}
                  style={styles.emptyAction}
                  testID="favorites-empty-lines-action"
                  accessibilityRole="button"
                  accessibilityLabel="Ver catálogo de linhas">
                  <Text style={styles.emptyActionText}>Ver catálogo de linhas</Text>
                </TouchableOpacity>
              </View>
            ) : (
              lines.map((line) => (
                <TouchableOpacity
                  key={line.id}
                  onPress={() => {
                    setSelectedLine(line);
                    router.push('/(tabs)');
                  }}
                  style={styles.favoriteCard}
                  activeOpacity={0.8}
                  testID={`favorites-line-card-${line.codigo}`}
                  accessibilityRole="button"
                  accessibilityLabel={`Ver linha ${line.codigo}, ${line.nome} no mapa`}
                  accessibilityActions={[{ name: 'delete', label: 'Remover dos favoritos' }]}
                  onAccessibilityAction={(e) =>
                    e.nativeEvent.actionName === 'delete' && toggleFavoriteLine(line.codigo)
                  }>
                  <View style={styles.favoriteCardRow}>
                    <BusBadge codigo={line.codigo} corHex={line.corHex} size="large" />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.favLineName}>{line.nome}</Text>
                      <Text style={styles.favLineTerminals}>
                        {line.terminalOrigem} ➔ {line.terminalDestino}
                      </Text>
                    </View>

                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation();
                        toggleFavoriteLine(line.codigo);
                      }}
                      style={styles.deleteButton}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      testID={`favorites-line-delete-button-${line.codigo}`}
                      accessibilityRole="button"
                      accessibilityLabel={`Remover linha ${line.codigo} dos favoritos`}>
                      <Trash2 size={18} color={theme.textMuted} />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              ))
            )}

            {/* Seção Paradas / Tubos Favoritos */}
            <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Paradas e Estações-Tubo Salvas</Text>
            {stops.length === 0 ? (
              <View style={styles.emptyCard}>
                <MapPin size={28} color={theme.textSubtle} />
                <Text style={styles.emptyText}>Você ainda não favoritou nenhum tubo ou parada.</Text>
                <TouchableOpacity
                  onPress={() => router.push('/(tabs)')}
                  style={styles.emptyAction}
                  testID="favorites-empty-stops-action"
                  accessibilityRole="button"
                  accessibilityLabel="Ver paradas no mapa">
                  <Text style={styles.emptyActionText}>Ver no mapa</Text>
                </TouchableOpacity>
              </View>
            ) : (
              stops.map((stop) => {
                const arrivals = transitService.getArrivalsForStop(stop.id);
                const nextBus = arrivals[0];
                const isNow = !!nextBus && nextBus.minutosAteChegada <= 1;

                return (
                  <TouchableOpacity
                    key={stop.id}
                    onPress={() => {
                      setSelectedStop(stop);
                      router.push('/(tabs)');
                    }}
                    style={styles.favoriteCard}
                    activeOpacity={0.8}
                    testID={`favorites-stop-card-${stop.id}`}
                    accessibilityRole="button"
                    accessibilityLabel={`Ver parada ${stop.nome}${stop.bairro ? `, bairro ${stop.bairro}` : ''} no mapa`}
                    accessibilityActions={[{ name: 'delete', label: 'Remover dos favoritos' }]}
                    onAccessibilityAction={(e) => e.nativeEvent.actionName === 'delete' && toggleFavoriteStop(stop.id)}>
                    <View style={styles.favoriteCardRow}>
                      <View style={styles.stopIconWrapper}>
                        <MapPin size={20} color={theme.primary} />
                      </View>
                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.favLineName}>{stop.nome}</Text>
                        {stop.bairro && <Text style={styles.favLineTerminals}>Bairro {stop.bairro}</Text>}
                      </View>

                      <TouchableOpacity
                        onPress={(e) => {
                          e.stopPropagation();
                          toggleFavoriteStop(stop.id);
                        }}
                        style={styles.deleteButton}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        testID={`favorites-stop-delete-button-${stop.id}`}
                        accessibilityRole="button"
                        accessibilityLabel={`Remover parada ${stop.nome} dos favoritos`}>
                        <Trash2 size={18} color={theme.textMuted} />
                      </TouchableOpacity>
                    </View>

                    {nextBus && (
                      <View style={styles.nextBusRow}>
                        <BusBadge codigo={nextBus.codLinha} corHex={nextBus.corHex} size="small" />
                        <Text style={styles.nextBusSource} numberOfLines={1}>
                          {formatArrivalSource(nextBus.isRealtime, nextBus.previstoParaTs)}
                        </Text>
                        <View style={styles.nextBusEta}>
                          {isNow ? (
                            <Text style={styles.nextBusEtaNumber}>Agora</Text>
                          ) : (
                            <>
                              <Text style={styles.nextBusEtaNumber}>{Math.round(nextBus.minutosAteChegada)}</Text>
                              <Text style={styles.nextBusEtaUnit}>min</Text>
                            </>
                          )}
                        </View>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })
            )}
          </>
        ) : (
          /* Seção de Alertas e Notícias URBS */
          <>
            <Text style={styles.sectionTitle}>Mural de Avisos da URBS</Text>
            {TRANSIT_ALERTS.map((alert) => {
              // Cor nunca é o único sinal: aviso e informação também trocam o glifo.
              const isWarning = alert.tipo !== 'informativo';

              return (
                <View key={alert.id} style={styles.alertCard}>
                  <View style={styles.alertHeader}>
                    <View
                      style={[
                        styles.alertIconWrapper,
                        { backgroundColor: isWarning ? theme.warningMuted : theme.primaryMuted },
                      ]}>
                      {isWarning ? (
                        // ponytail: warning icon on warningMuted bg is 1.9:1, fails the 3:1 non-text minimum.
                        <AlertTriangle size={18} color={theme.text} />
                      ) : (
                        <Info size={18} color={theme.primary} />
                      )}
                    </View>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={styles.alertTitle}>{alert.titulo}</Text>
                      <Text style={styles.alertDate}>{alert.data}</Text>
                    </View>
                  </View>

                  <Text style={styles.alertDesc}>{alert.descricao}</Text>

                  <View style={styles.alertFooter}>
                    <Text style={styles.alertLinhasLabel}>Linhas afetadas:</Text>
                    {alert.linhasAfetadas.map((cod) => (
                      <BusBadge key={cod} codigo={cod} size="small" />
                    ))}
                  </View>
                </View>
              );
            })}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function createStyles(theme: ReturnType<typeof useTheme>) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.background,
    },
    header: {
      backgroundColor: theme.surface,
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 14,
      borderBottomWidth: 1,
      borderBottomColor: theme.border,
    },
    title: {
      fontSize: Typography.screenTitle.fontSize,
      lineHeight: Typography.screenTitle.lineHeight,
      fontWeight: '900',
      color: theme.text,
    },
    subtitle: {
      fontSize: Typography.label.fontSize,
      lineHeight: Typography.label.lineHeight,
      color: theme.textMuted,
      marginTop: 2,
      marginBottom: 12,
    },
    tabToggle: {
      flexDirection: 'row',
      backgroundColor: theme.surfaceMuted,
      borderRadius: Radius.md,
      padding: 4,
    },
    tabButton: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 8,
      borderRadius: Radius.sm,
      gap: 6,
    },
    tabButtonActive: {
      backgroundColor: theme.surface,
      ...Shadows.card,
    },
    tabButtonText: {
      fontSize: Typography.label.fontSize,
      lineHeight: Typography.label.lineHeight,
      fontWeight: '600',
      // ponytail: textMuted on surfaceMuted is 4.34:1, just under AA 4.5:1 for 12pt text.
      color: theme.text,
    },
    tabButtonTextActive: {
      color: theme.text,
      fontWeight: '700',
    },
    content: {
      flex: 1,
    },
    scrollContent: {
      padding: 16,
      gap: 12,
    },
    sectionTitle: {
      fontSize: Typography.label.fontSize,
      lineHeight: Typography.label.lineHeight,
      fontWeight: '700',
      color: theme.textMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    favoriteCard: {
      backgroundColor: theme.surface,
      borderRadius: Radius.lg,
      padding: 14,
      ...Shadows.card,
    },
    favoriteCardRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    favLineName: {
      fontSize: Typography.itemTitle.fontSize,
      lineHeight: Typography.itemTitle.lineHeight,
      fontWeight: '800',
      color: theme.text,
    },
    favLineTerminals: {
      fontSize: Typography.label.fontSize,
      lineHeight: Typography.label.lineHeight,
      color: theme.textMuted,
      marginTop: 2,
    },
    deleteButton: {
      padding: 8,
    },
    stopIconWrapper: {
      width: 44,
      height: 44,
      borderRadius: Radius.pill,
      backgroundColor: theme.primaryMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    nextBusRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      marginTop: 10,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: theme.border,
    },
    nextBusSource: {
      flex: 1,
      fontSize: Typography.label.fontSize,
      lineHeight: Typography.label.lineHeight,
      color: theme.textMuted,
    },
    nextBusEta: {
      alignItems: 'flex-end',
    },
    nextBusEtaNumber: {
      fontSize: Typography.heroEta.fontSize,
      lineHeight: Typography.heroEta.lineHeight,
      fontVariant: ['tabular-nums'],
      fontWeight: '900',
      color: theme.text,
    },
    nextBusEtaUnit: {
      fontSize: Typography.label.fontSize,
      lineHeight: Typography.label.lineHeight,
      color: theme.textMuted,
    },
    emptyCard: {
      backgroundColor: theme.surface,
      padding: 16,
      borderRadius: Radius.md,
      alignItems: 'center',
      gap: 8,
    },
    emptyText: {
      color: theme.textMuted,
      fontSize: Typography.body.fontSize,
      lineHeight: Typography.body.lineHeight,
      textAlign: 'center',
    },
    emptyAction: {
      marginTop: 4,
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: Radius.sm,
      backgroundColor: theme.primaryMuted,
    },
    emptyActionText: {
      fontSize: Typography.label.fontSize,
      lineHeight: Typography.label.lineHeight,
      fontWeight: '700',
      color: theme.primary,
    },
    alertCard: {
      backgroundColor: theme.surface,
      borderRadius: Radius.lg,
      padding: 16,
      ...Shadows.card,
      gap: 8,
    },
    alertHeader: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    alertIconWrapper: {
      width: 36,
      height: 36,
      borderRadius: Radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
    },
    alertTitle: {
      fontSize: Typography.body.fontSize,
      lineHeight: Typography.body.lineHeight,
      fontWeight: '800',
      color: theme.text,
    },
    alertDate: {
      fontSize: Typography.label.fontSize,
      lineHeight: Typography.label.lineHeight,
      color: theme.textMuted,
      marginTop: 2,
    },
    alertDesc: {
      fontSize: Typography.body.fontSize,
      color: theme.text,
      lineHeight: Typography.body.lineHeight,
    },
    alertFooter: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      marginTop: 4,
    },
    alertLinhasLabel: {
      fontSize: Typography.label.fontSize,
      lineHeight: Typography.label.lineHeight,
      fontWeight: '700',
      color: theme.textMuted,
    },
    accountSection: {
      marginTop: 12,
      backgroundColor: theme.background,
      borderRadius: Radius.md,
      borderWidth: 1,
      borderColor: theme.border,
      padding: 12,
      gap: 10,
    },
    accountRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    accountIconWrapper: {
      width: 28,
      height: 28,
      borderRadius: Radius.pill,
      backgroundColor: theme.primaryMuted,
      alignItems: 'center',
      justifyContent: 'center',
    },
    accountEmail: {
      flex: 1,
      fontSize: Typography.body.fontSize,
      lineHeight: Typography.body.lineHeight,
      fontWeight: '700',
      color: theme.text,
    },
    accountGuestText: {
      fontSize: Typography.label.fontSize,
      lineHeight: Typography.label.lineHeight,
      color: theme.textMuted,
    },
    accountActions: {
      flexDirection: 'row',
      gap: 8,
    },
    accountButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: Radius.sm,
      borderWidth: 1,
      borderColor: theme.border,
      backgroundColor: theme.surface,
    },
    accountButtonPrimary: {
      backgroundColor: theme.primary,
      borderColor: theme.primary,
    },
    accountButtonText: {
      fontSize: Typography.label.fontSize,
      lineHeight: Typography.label.lineHeight,
      fontWeight: '700',
      color: theme.text,
    },
    accountButtonPrimaryText: {
      color: theme.onPrimary,
    },
    accountButtonDangerText: {
      color: theme.danger,
    },
  });
}
