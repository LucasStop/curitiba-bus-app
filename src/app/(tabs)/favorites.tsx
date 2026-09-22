import { BusBadge } from '@/components/ui/BusBadge';
import { CURITIBA_LINES, CURITIBA_STOPS, TRANSIT_ALERTS } from '@/data/curitibaDataset';
import { transitService } from '@/services/transitProvider';
import { useFavoritesStore } from '@/stores/useFavoritesStore';
import { useTransitStore } from '@/stores/useTransitStore';
import { formatMinutes } from '@/utils/geo';
import { useRouter } from 'expo-router';
import { AlertTriangle, Bell, Bookmark, ChevronRight, Clock, Info, MapPin, Trash2 } from 'lucide-react-native';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function FavoritesScreen() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'favorites' | 'alerts'>('favorites');

  const { favoriteLines, favoriteStops, toggleFavoriteLine, toggleFavoriteStop } =
    useFavoritesStore();
  const setSelectedLine = useTransitStore((s) => s.setSelectedLine);
  const setSelectedStop = useTransitStore((s) => s.setSelectedStop);

  const lines = CURITIBA_LINES.filter((l) => favoriteLines.includes(l.codigo));
  const stops = CURITIBA_STOPS.filter((s) => favoriteStops.includes(s.id));

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      {/* Header com Abas */}
      <View style={styles.header}>
        <Text style={styles.title}>Meus Favoritos & Alertas</Text>
        <Text style={styles.subtitle}>Acesso rápido e comunicados da URBS</Text>

        <View style={styles.tabToggle}>
          <TouchableOpacity
            onPress={() => setActiveTab('favorites')}
            style={[styles.tabButton, activeTab === 'favorites' && styles.tabButtonActive]}>
            <Bookmark
              size={16}
              color={activeTab === 'favorites' ? '#0F172A' : '#64748B'}
              fill={activeTab === 'favorites' ? '#0F172A' : 'none'}
            />
            <Text style={[styles.tabButtonText, activeTab === 'favorites' && styles.tabButtonTextActive]}>
              Favoritos ({favoriteLines.length + favoriteStops.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => setActiveTab('alerts')}
            style={[styles.tabButton, activeTab === 'alerts' && styles.tabButtonActive]}>
            <Bell size={16} color={activeTab === 'alerts' ? '#0F172A' : '#64748B'} />
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
                  activeOpacity={0.8}>
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
                    style={styles.deleteButton}>
                    <Trash2 size={18} color="#94A3B8" />
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
                    activeOpacity={0.8}>
                    <View style={styles.stopIconWrapper}>
                      <MapPin size={20} color="#0284C7" />
                    </View>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={styles.favLineName}>{stop.nome}</Text>
                      <Text style={styles.favLineTerminals}>Bairro {stop.bairro}</Text>

                      {nextBus && (
                        <View style={styles.nextBusRow}>
                          <Clock size={12} color="#16A34A" />
                          <Text style={styles.nextBusText}>
                            Próximo: {nextBus.codLinha} em {formatMinutes(nextBus.minutosAteChegada)}
                          </Text>
                        </View>
                      )}
                    </View>

                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation();
                        toggleFavoriteStop(stop.id);
                      }}
                      style={styles.deleteButton}>
                      <Trash2 size={18} color="#94A3B8" />
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
                      <AlertTriangle size={18} color="#EA580C" />
                    ) : (
                      <Info size={18} color="#0284C7" />
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
    backgroundColor: '#F8FAFC',
  },
  header: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
    marginBottom: 12,
  },
  tabToggle: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    padding: 4,
  },
  tabButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  tabButtonActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 2,
  },
  tabButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  tabButtonTextActive: {
    color: '#0F172A',
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
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  favoriteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
  },
  favLineName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  favLineTerminals: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  deleteButton: {
    padding: 8,
  },
  stopIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#E0F2FE',
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
    fontSize: 11,
    fontWeight: '700',
    color: '#16A34A',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  emptyText: {
    color: '#94A3B8',
    fontSize: 13,
  },
  alertCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 2,
    gap: 8,
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  alertIconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  alertTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  alertDate: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  alertDesc: {
    fontSize: 13,
    color: '#334155',
    lineHeight: 18,
  },
  alertFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  alertLinhasLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
  },
});
