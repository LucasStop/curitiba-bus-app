import { BusBadge } from '@/components/ui/BusBadge';
import { Colors, Radius, Shadows, Typography } from '@/constants/theme';
import { CURITIBA_LINES, CURITIBA_STOPS, TRANSIT_ALERTS } from '@/data/curitibaDataset';
import { useAuth } from '@/providers/AuthProvider';
import { transitService } from '@/services/transitProvider';
import { useFavoritesStore } from '@/stores/useFavoritesStore';
import { useTransitStore } from '@/stores/useTransitStore';
import { formatEtaPhrase } from '@/utils/geo';
import { useRouter } from 'expo-router';
import {
  AlertTriangle,
  Bell,
  Bookmark,
  Clock,
  Info,
  LogIn,
  LogOut,
  MapPin,
  Trash2,
  User as UserIcon,
} from 'lucide-react-native';
import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function FavoritesScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'favorites' | 'alerts'>('favorites');

  const { favoriteLines, favoriteStops, toggleFavoriteLine, toggleFavoriteStop } =
    useFavoritesStore();
  const setSelectedLine = useTransitStore((s) => s.setSelectedLine);
  const setSelectedStop = useTransitStore((s) => s.setSelectedStop);

  const { user, signOut, deleteAccount } = useAuth();
  const [deleting, setDeleting] = useState(false);

  const lines = CURITIBA_LINES.filter((l) => favoriteLines.includes(l.codigo));
  const stops = CURITIBA_STOPS.filter((s) => favoriteStops.includes(s.id));

  async function onSignOut() {
    await signOut();
  }

  // Confirmação em duas etapas (SECURITY.md, ação destrutiva): só na segunda o usuário confirma de fato.
  function onDeleteAccount() {
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
                  <UserIcon size={16} color={Colors.light.primary} />
                </View>
                <Text style={styles.accountEmail} numberOfLines={1} testID="account-email">
                  {user.email}
                </Text>
              </View>
              <View style={styles.accountActions}>
                <TouchableOpacity
                  onPress={onSignOut}
                  style={styles.accountButton}
                  testID="account-sign-out"
                  accessibilityRole="button"
                  accessibilityLabel="Sair da conta">
                  <LogOut size={15} color={Colors.light.text} />
                  <Text style={styles.accountButtonText}>Sair</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={onDeleteAccount}
                  style={styles.accountButton}
                  disabled={deleting}
                  testID="account-delete"
                  accessibilityRole="button"
                  accessibilityLabel="Excluir conta"
                  accessibilityState={{ disabled: deleting, busy: deleting }}>
                  <Trash2 size={15} color={Colors.light.danger} />
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
                  <LogIn size={15} color={Colors.light.primary} />
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
            accessibilityLabel={`Ver favoritos, ${favoriteLines.length + favoriteStops.length} salvos`}>
            <Bookmark
              size={16}
              color={activeTab === 'favorites' ? Colors.light.text : Colors.light.textMuted}
              fill={activeTab === 'favorites' ? Colors.light.text : 'none'}
            />
            <Text style={[styles.tabButtonText, activeTab === 'favorites' && styles.tabButtonTextActive]}>
              Favoritos ({favoriteLines.length + favoriteStops.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab('alerts')}
            style={[styles.tabButton, activeTab === 'alerts' && styles.tabButtonActive]}
            testID="favorites-tab-alerts-button"
            accessibilityRole="button"
            accessibilityState={{ selected: activeTab === 'alerts' }}
            accessibilityLabel={`Ver alertas RIT, ${TRANSIT_ALERTS.length} avisos`}>
            <Bell size={16} color={activeTab === 'alerts' ? Colors.light.text : Colors.light.textMuted} />
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
                <Text style={styles.emptyText}>Você ainda não favoritou nenhuma linha.</Text>
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
                  accessibilityLabel={`Ver linha ${line.codigo}, ${line.nome} no mapa`}>
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
                    <Trash2 size={18} color={Colors.light.textMuted} />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))
            )}

            {/* Seção Paradas / Tubos Favoritos */}
            <Text style={[styles.sectionTitle, { marginTop: 24 }]}>Paradas e Estações-Tubo Salvas</Text>
            {stops.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>Você ainda não favoritou nenhum tubo ou parada.</Text>
              </View>
            ) : (
              stops.map((stop) => {
                const arrivals = transitService.getArrivalsForStop(stop.id);
                const nextBus = arrivals[0];

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
                    accessibilityLabel={`Ver parada ${stop.nome}, bairro ${stop.bairro} no mapa`}>
                    <View style={styles.stopIconWrapper}>
                      <MapPin size={20} color={Colors.light.primary} />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.favLineName}>{stop.nome}</Text>
                      <Text style={styles.favLineTerminals}>Bairro {stop.bairro}</Text>

                      {nextBus && (
                        <View style={styles.nextBusRow}>
                          <Clock size={12} color={Colors.light.success} />
                          <Text style={styles.nextBusText}>
                            Próximo: {nextBus.codLinha} {formatEtaPhrase(nextBus.minutosAteChegada)}
                          </Text>
                        </View>
                      )}
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
                      <Trash2 size={18} color={Colors.light.textMuted} />
                    </TouchableOpacity>
                  </TouchableOpacity>
                );
              })
            )}
          </>
        ) : (
          /* Seção de Alertas e Notícias URBS */
          <>
            <Text style={styles.sectionTitle}>Mural de Avisos da URBS</Text>
            {TRANSIT_ALERTS.map((alert) => (
              <View key={alert.id} style={styles.alertCard}>
                <View style={styles.alertHeader}>
                  <View style={styles.alertIconWrapper}>
                    {alert.tipo === 'obra' ? (
                      // ponytail: warning icon on warningMuted bg is 1.9:1, fails the 3:1 non-text minimum.
                      <AlertTriangle size={18} color={Colors.light.text} />
                    ) : (
                      <Info size={18} color={Colors.light.primary} />
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
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.light.background,
  },
  header: {
    backgroundColor: Colors.light.surface,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
  },
  title: {
    fontSize: Typography.screenTitle.fontSize,
    lineHeight: Typography.screenTitle.lineHeight,
    fontWeight: '900',
    color: Colors.light.text,
  },
  subtitle: {
    fontSize: Typography.label.fontSize,
    lineHeight: Typography.label.lineHeight,
    color: Colors.light.textMuted,
    marginTop: 2,
    marginBottom: 12,
  },
  tabToggle: {
    flexDirection: 'row',
    backgroundColor: Colors.light.surfaceMuted,
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
    backgroundColor: Colors.light.surface,
    ...Shadows.card,
  },
  tabButtonText: {
    fontSize: Typography.label.fontSize,
    lineHeight: Typography.label.lineHeight,
    fontWeight: '600',
    // ponytail: textMuted on surfaceMuted is 4.34:1, just under AA 4.5:1 for 12pt text.
    color: Colors.light.text,
  },
  tabButtonTextActive: {
    color: Colors.light.text,
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
    color: Colors.light.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  favoriteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.light.surface,
    borderRadius: Radius.lg,
    padding: 14,
    ...Shadows.card,
  },
  favLineName: {
    fontSize: Typography.itemTitle.fontSize,
    lineHeight: Typography.itemTitle.lineHeight,
    fontWeight: '800',
    color: Colors.light.text,
  },
  favLineTerminals: {
    fontSize: Typography.label.fontSize,
    lineHeight: Typography.label.lineHeight,
    color: Colors.light.textMuted,
    marginTop: 2,
  },
  deleteButton: {
    padding: 8,
  },
  stopIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: Radius.pill,
    backgroundColor: Colors.light.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextBusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  nextBusText: {
    fontSize: Typography.label.fontSize,
    lineHeight: Typography.label.lineHeight,
    fontVariant: ['tabular-nums'],
    fontWeight: '700',
    // ponytail: success on surface is ~3.3:1, fails AA 4.5:1 for 11pt text.
    color: Colors.light.text,
  },
  emptyCard: {
    backgroundColor: Colors.light.surface,
    padding: 16,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  emptyText: {
    color: Colors.light.textMuted,
    fontSize: Typography.body.fontSize,
    lineHeight: Typography.body.lineHeight,
  },
  alertCard: {
    backgroundColor: Colors.light.surface,
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
    backgroundColor: Colors.light.warningMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertTitle: {
    fontSize: Typography.body.fontSize,
    lineHeight: Typography.body.lineHeight,
    fontWeight: '800',
    color: Colors.light.text,
  },
  alertDate: {
    fontSize: Typography.label.fontSize,
    lineHeight: Typography.label.lineHeight,
    color: Colors.light.textMuted,
    marginTop: 2,
  },
  alertDesc: {
    fontSize: Typography.body.fontSize,
    color: Colors.light.text,
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
    color: Colors.light.textMuted,
  },
  accountSection: {
    marginTop: 12,
    backgroundColor: Colors.light.background,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: Colors.light.border,
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
    backgroundColor: Colors.light.primaryMuted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountEmail: {
    flex: 1,
    fontSize: Typography.body.fontSize,
    lineHeight: Typography.body.lineHeight,
    fontWeight: '700',
    color: Colors.light.text,
  },
  accountGuestText: {
    fontSize: Typography.label.fontSize,
    lineHeight: Typography.label.lineHeight,
    color: Colors.light.textMuted,
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
    borderColor: Colors.light.border,
    backgroundColor: Colors.light.surface,
  },
  accountButtonPrimary: {
    backgroundColor: Colors.light.primary,
    borderColor: Colors.light.primary,
  },
  accountButtonText: {
    fontSize: Typography.label.fontSize,
    lineHeight: Typography.label.lineHeight,
    fontWeight: '700',
    color: Colors.light.text,
  },
  accountButtonPrimaryText: {
    color: Colors.light.onPrimary,
  },
  accountButtonDangerText: {
    color: Colors.light.danger,
  },
});
