import { BusBadge } from '@/components/ui/BusBadge';
import { CategoryPills } from '@/components/ui/CategoryPills';
import { SHEET_SNAP_RATIOS, SheetSnapIndex } from '@/constants/sheet';
import { BottomTabInset, FontWeight, Radius, Shadows, Spacing, Typography } from '@/constants/theme';
import { CURITIBA_LINES, CURITIBA_STOPS } from '@/data/curitibaDataset';
import { useTheme } from '@/hooks/use-theme';
import { transitService } from '@/services/transitProvider';
import { useFavoritesStore } from '@/stores/useFavoritesStore';
import { useTransitStore } from '@/stores/useTransitStore';
import { BusStop } from '@/types/transit';
import { formatArrivalSource, formatDataAge, formatEtaPhrase } from '@/utils/geo';
import { Accessibility, ArrowLeftRight, Bookmark, ChevronRight, MapPin, Search, X } from 'lucide-react-native';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  LayoutAnimation,
  PanResponder,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from 'react-native';

export const TransitBottomSheet: React.FC = () => {
  const [localSearch, setLocalSearch] = useState('');
  // Date.now() não pode rodar direto na render (regra de pureza) e "há X min" precisa
  // envelhecer sozinho na tela — um relógio local de baixa frequência resolve os dois.
  const [nowTs, setNowTs] = useState(() => Date.now());

  const theme = useTheme();
  const { height: windowHeight } = useWindowDimensions();

  useEffect(() => {
    const id = setInterval(() => setNowTs(Date.now()), 30000);
    return () => clearInterval(id);
  }, []);

  const selectedLine = useTransitStore((s) => s.selectedLine);
  const selectedStop = useTransitStore((s) => s.selectedStop);
  const setSelectedLine = useTransitStore((s) => s.setSelectedLine);
  const setSelectedStop = useTransitStore((s) => s.setSelectedStop);
  const clearSelection = useTransitStore((s) => s.clearSelection);
  const activeDirection = useTransitStore((s) => s.activeDirection);
  const toggleActiveDirection = useTransitStore((s) => s.toggleActiveDirection);
  const sheetSnapIndex = useTransitStore((s) => s.sheetSnapIndex);
  const setSheetSnapIndex = useTransitStore((s) => s.setSheetSnapIndex);
  const cycleSheetSnap = useTransitStore((s) => s.cycleSheetSnap);

  const favoriteLines = useFavoritesStore((s) => s.favoriteLines);
  const favoriteStops = useFavoritesStore((s) => s.favoriteStops);
  const toggleFavoriteLine = useFavoritesStore((s) => s.toggleFavoriteLine);
  const toggleFavoriteStop = useFavoritesStore((s) => s.toggleFavoriteStop);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        sheetContainer: {
          backgroundColor: theme.surface,
          borderTopLeftRadius: Radius.lg,
          borderTopRightRadius: Radius.lg,
          paddingHorizontal: 16,
          paddingTop: 8,
          overflow: 'hidden',
          ...Shadows.sheet,
        },
        sheetHeader: {
          alignItems: 'center',
          marginBottom: 8,
          width: '100%',
          alignSelf: 'stretch',
        },
        categoryPillsContainer: {
          width: '100%',
          alignSelf: 'stretch',
        },
        dragHandle: {
          width: 36,
          height: 4,
          borderRadius: Radius.pill,
          backgroundColor: theme.borderStrong,
          marginBottom: 10,
        },
        headerRow: {
          flexDirection: 'row',
          alignItems: 'center',
          width: '100%',
        },
        sheetTitle: {
          fontSize: Typography.itemTitle.fontSize,
          lineHeight: Typography.itemTitle.lineHeight,
          fontWeight: FontWeight.heavy,
          color: theme.text,
        },
        sheetSubtitle: {
          fontSize: Typography.label.fontSize,
          lineHeight: Typography.label.lineHeight,
          color: theme.textMuted,
          marginTop: 2,
        },
        typeBadge: {
          alignSelf: 'flex-start',
          backgroundColor: theme.primaryMuted,
          paddingHorizontal: 6,
          paddingVertical: 2,
          borderRadius: Radius.sm,
          marginBottom: 4,
        },
        typeBadgeText: {
          fontSize: Typography.label.fontSize,
          fontWeight: FontWeight.heavy,
          color: theme.primary,
        },
        iconButton: {
          padding: 8,
          marginLeft: 6,
        },
        directionToggle: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
          alignSelf: 'stretch',
          backgroundColor: theme.surfaceMuted,
          paddingVertical: 8,
          paddingHorizontal: 12,
          borderRadius: Radius.sm,
          marginTop: 10,
        },
        directionToggleText: {
          fontSize: Typography.label.fontSize,
          fontWeight: FontWeight.bold,
          color: theme.text,
        },
        searchBar: {
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: theme.surfaceMuted,
          borderRadius: Radius.md,
          paddingHorizontal: 12,
          paddingVertical: 8,
          width: '100%',
          gap: 8,
        },
        searchInput: {
          flex: 1,
          fontSize: Typography.body.fontSize,
          color: theme.text,
          padding: 0,
        },
        sectionHeader: {
          fontSize: Typography.label.fontSize,
          fontWeight: FontWeight.bold,
          color: theme.textMuted,
          textTransform: 'uppercase',
          letterSpacing: 0.5,
          marginVertical: 10,
        },
        listScroll: {
          flex: 1,
          marginBottom: 10,
        },
        arrivalCard: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: 10,
          borderBottomWidth: 1,
          borderBottomColor: theme.border,
        },
        arrivalLineName: {
          fontSize: Typography.body.fontSize,
          lineHeight: Typography.body.lineHeight,
          fontWeight: FontWeight.semibold,
          color: theme.text,
        },
        arrivalInfo: {
          flex: 1,
          marginLeft: Spacing.three,
          gap: Spacing.half,
        },
        arrivalSourceRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: Spacing.one,
        },
        liveDot: {
          width: 6,
          height: 6,
          borderRadius: Radius.pill,
          backgroundColor: theme.success,
        },
        arrivalSourceText: {
          fontSize: Typography.label.fontSize,
          lineHeight: Typography.label.lineHeight,
          fontWeight: FontWeight.semibold,
        },
        arrivalVehicleRow: {
          flexDirection: 'row',
          alignItems: 'center',
          gap: Spacing.one,
        },
        arrivalVehicleText: {
          fontSize: Typography.label.fontSize,
          lineHeight: Typography.label.lineHeight,
          color: theme.textSubtle,
        },
        etaHero: {
          alignItems: 'flex-end',
          marginLeft: Spacing.two,
        },
        etaNumber: {
          fontSize: Typography.heroEta.fontSize,
          lineHeight: Typography.heroEta.lineHeight,
          fontVariant: Typography.heroEta.fontVariant,
          fontWeight: FontWeight.heavy,
          color: theme.text,
        },
        etaUnit: {
          fontSize: Typography.label.fontSize,
          lineHeight: Typography.label.lineHeight,
          color: theme.textMuted,
        },
        etaArrivingText: {
          fontSize: Typography.itemTitle.fontSize,
          lineHeight: Typography.itemTitle.lineHeight,
          fontWeight: FontWeight.bold,
          color: theme.success,
        },
        timelineItem: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: 8,
        },
        timelinePoint: {
          width: 24,
          alignItems: 'center',
        },
        timelineDot: {
          width: 10,
          height: 10,
          borderRadius: Radius.pill,
        },
        timelineLine: {
          position: 'absolute',
          top: 10,
          bottom: -16,
          width: 2,
          backgroundColor: theme.border,
        },
        timelineContent: {
          flex: 1,
          marginLeft: 8,
        },
        timelineStopName: {
          fontSize: Typography.body.fontSize,
          fontWeight: FontWeight.semibold,
          color: theme.text,
        },
        timelineStopBairro: {
          fontSize: Typography.label.fontSize,
          color: theme.textMuted,
        },
        lineSearchCard: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: 10,
          borderBottomWidth: 1,
          borderBottomColor: theme.border,
        },
        lineCardTitle: {
          fontSize: Typography.body.fontSize,
          fontWeight: FontWeight.bold,
          color: theme.text,
        },
        lineCardMeta: {
          fontSize: Typography.label.fontSize,
          color: theme.textMuted,
          marginTop: 2,
        },
        stopCard: {
          flexDirection: 'row',
          alignItems: 'center',
          paddingVertical: 10,
          borderBottomWidth: 1,
          borderBottomColor: theme.border,
        },
        stopCardName: {
          fontSize: Typography.body.fontSize,
          fontWeight: FontWeight.semibold,
          color: theme.text,
        },
        stopCardMeta: {
          fontSize: Typography.label.fontSize,
          color: theme.textMuted,
          marginTop: 2,
        },
        emptyState: {
          paddingVertical: 20,
          alignItems: 'center',
        },
        emptyText: {
          color: theme.textMuted,
          fontSize: Typography.body.fontSize,
        },
      }),
    [theme],
  );

  // Frações de SHEET_SNAP_RATIOS incidem sobre a área acima da tab bar (DESIGN.md §Componentes),
  // não sobre a altura cheia da tela.
  const usableHeight = windowHeight - BottomTabInset;
  const snapHeights = useMemo<[number, number, number]>(
    () => [
      usableHeight * SHEET_SNAP_RATIOS[0],
      usableHeight * SHEET_SNAP_RATIOS[1],
      usableHeight * SHEET_SNAP_RATIOS[2],
    ],
    [usableHeight],
  );

  const [animatedHeight] = useState(() => new Animated.Value(snapHeights[sheetSnapIndex]));
  const currentHeightRef = useRef(snapHeights[sheetSnapIndex]);
  const dragStartHeightRef = useRef(snapHeights[sheetSnapIndex]);
  const dragStartIndexRef = useRef<SheetSnapIndex>(sheetSnapIndex);

  const snapHeightsRef = useRef(snapHeights);
  useEffect(() => {
    snapHeightsRef.current = snapHeights;
  }, [snapHeights]);

  const sheetSnapIndexRef = useRef(sheetSnapIndex);
  useEffect(() => {
    sheetSnapIndexRef.current = sheetSnapIndex;
  }, [sheetSnapIndex]);

  useEffect(() => {
    const id = animatedHeight.addListener(({ value }) => {
      currentHeightRef.current = value;
    });
    return () => {
      animatedHeight.removeListener(id);
    };
  }, [animatedHeight]);

  const lastTargetSnapRef = useRef<SheetSnapIndex>(sheetSnapIndex);

  const animateToSnap = useCallback(
    (index: SheetSnapIndex) => {
      lastTargetSnapRef.current = index;
      setSheetSnapIndex(index);
      Animated.spring(animatedHeight, {
        toValue: snapHeightsRef.current[index],
        useNativeDriver: false,
        bounciness: 4,
        speed: 12,
      }).start();
    },
    [animatedHeight, setSheetSnapIndex],
  );

  const lastTapTsRef = useRef(0);
  const handleCycleSheetSnap = useCallback(() => {
    const now = Date.now();
    if (now - lastTapTsRef.current < 200) return;
    lastTapTsRef.current = now;
    LayoutAnimation.easeInEaseOut();
    cycleSheetSnap();
  }, [cycleSheetSnap]);

  const isMountedRef = useRef(false);
  useEffect(() => {
    if (!isMountedRef.current) {
      isMountedRef.current = true;
      return;
    }
    if (lastTargetSnapRef.current !== sheetSnapIndex) {
      lastTargetSnapRef.current = sheetSnapIndex;
      Animated.spring(animatedHeight, {
        toValue: snapHeights[sheetSnapIndex],
        useNativeDriver: false,
        bounciness: 4,
        speed: 12,
      }).start();
    }
  }, [sheetSnapIndex, snapHeights, animatedHeight]);

  const lastUsableHeightRef = useRef(usableHeight);
  useEffect(() => {
    if (lastUsableHeightRef.current !== usableHeight) {
      lastUsableHeightRef.current = usableHeight;
      Animated.spring(animatedHeight, {
        toValue: snapHeights[sheetSnapIndex],
        useNativeDriver: false,
        bounciness: 4,
        speed: 12,
      }).start();
    }
  }, [usableHeight, sheetSnapIndex, snapHeights, animatedHeight]);

  const handleSheetAccessibilityAction = (actionName: string) => {
    LayoutAnimation.easeInEaseOut();
    if (actionName === 'increment') {
      setSheetSnapIndex(Math.min(sheetSnapIndex + 1, 2) as SheetSnapIndex);
    } else if (actionName === 'decrement') {
      setSheetSnapIndex(Math.max(sheetSnapIndex - 1, 0) as SheetSnapIndex);
    }
  };

  const handleSearchFocus = useCallback(() => {
    animateToSnap(1);
  }, [animateToSnap]);

  const handleCycleSheetSnapRef = useRef(handleCycleSheetSnap);
  useEffect(() => {
    handleCycleSheetSnapRef.current = handleCycleSheetSnap;
  }, [handleCycleSheetSnap]);

  const animateToSnapRef = useRef(animateToSnap);
  useEffect(() => {
    animateToSnapRef.current = animateToSnap;
  }, [animateToSnap]);

  const panResponder = useMemo(
    () =>
      // eslint-disable-next-line react-hooks/refs -- handlers do PanResponder só rodam em gesto real (nunca durante o render); padrão oficial da doc do React Native.
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: () => {
          dragStartHeightRef.current = currentHeightRef.current;
          dragStartIndexRef.current = sheetSnapIndexRef.current;
        },
        onPanResponderMove: (_event, gestureState) => {
          const targetHeight = dragStartHeightRef.current - gestureState.dy;
          const [minH, , maxH] = snapHeightsRef.current;
          const clampedHeight = Math.max(minH, Math.min(maxH, targetHeight));
          animatedHeight.setValue(clampedHeight);
        },
        onPanResponderRelease: (_event, gestureState) => {
          const dx = gestureState.dx;
          const dy = gestureState.dy;
          if (Math.abs(dx) < 5 && Math.abs(dy) < 5) {
            handleCycleSheetSnapRef.current();
            return;
          }

          const currentHeight = currentHeightRef.current;
          const vy = gestureState.vy;
          const startIndex = dragStartIndexRef.current;
          const snapHeights = snapHeightsRef.current;

          let targetIndex: SheetSnapIndex;

          if (vy < -0.5) {
            // Moving UP (expanding)
            if (startIndex === 0 && currentHeight < snapHeights[1]) {
              targetIndex = 1;
            } else {
              targetIndex = 2;
            }
          } else if (vy > 0.5) {
            // Moving DOWN (collapsing)
            if (startIndex === 2 && currentHeight > snapHeights[1]) {
              targetIndex = 1;
            } else {
              targetIndex = 0;
            }
          } else {
            // Snap to closest point
            const dist0 = Math.abs(currentHeight - snapHeights[0]);
            const dist1 = Math.abs(currentHeight - snapHeights[1]);
            const dist2 = Math.abs(currentHeight - snapHeights[2]);

            if (dist0 <= dist1 && dist0 <= dist2) {
              targetIndex = 0;
            } else if (dist1 <= dist0 && dist1 <= dist2) {
              targetIndex = 1;
            } else {
              targetIndex = 2;
            }
          }

          animateToSnapRef.current(targetIndex);
        },
        onPanResponderTerminate: () => {
          animateToSnapRef.current(dragStartIndexRef.current);
        },
      }),
    [animatedHeight],
  );

  // Filtragem de linhas e paradas pela busca
  const filteredLines = CURITIBA_LINES.filter(
    (l) =>
      l.codigo.toLowerCase().includes(localSearch.toLowerCase()) ||
      l.nome.toLowerCase().includes(localSearch.toLowerCase())
  );

  const filteredStops = CURITIBA_STOPS.filter(
    (s) =>
      s.nome.toLowerCase().includes(localSearch.toLowerCase()) ||
      s.bairro.toLowerCase().includes(localSearch.toLowerCase())
  );

  // 1. Visão de Detalhes da Parada Selecionada
  if (selectedStop) {
    const arrivals = transitService.getArrivalsForStop(selectedStop.id);
    const isFav = favoriteStops.includes(selectedStop.id);

    return (
      <Animated.View style={[styles.sheetContainer, { height: animatedHeight }]}>
        <View style={styles.sheetHeader}>
          <View
            style={styles.dragHandle}
            hitSlop={{ top: Spacing.three, bottom: Spacing.three, left: Spacing.four, right: Spacing.four }}
            testID="sheet-drag-handle"
            accessible
            accessibilityRole="adjustable"
            accessibilityLabel="Painel de informações. Toque para alternar altura ou arraste para cima e para baixo."
            accessibilityActions={[
              { name: 'increment', label: 'Expandir' },
              { name: 'decrement', label: 'Recolher' },
            ]}
            onAccessibilityAction={(event) => handleSheetAccessibilityAction(event.nativeEvent.actionName)}
            {...panResponder.panHandlers}
          />
          <View style={styles.headerRow}>
            <View style={{ flex: 1 }}>
              <View style={styles.typeBadge}>
                <Text style={styles.typeBadgeText}>
                  {selectedStop.tipo === 'terminal' ? 'TERMINAL DE INTEGRAÇÃO' : 'ESTAÇÃO-TUBO'}
                </Text>
              </View>
              <Text style={styles.sheetTitle}>{selectedStop.nome}</Text>
              <Text style={styles.sheetSubtitle}>Bairro {selectedStop.bairro}</Text>
            </View>

            <TouchableOpacity
              onPress={() => toggleFavoriteStop(selectedStop.id)}
              style={styles.iconButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              activeOpacity={0.7}
              testID="sheet-stop-favorite-button"
              accessibilityRole="button"
              accessibilityState={{ selected: isFav }}
              accessibilityLabel={`${isFav ? 'Remover' : 'Adicionar'} ${selectedStop.nome} dos favoritos`}>
              <Bookmark size={22} color={isFav ? theme.danger : theme.textMuted} fill={isFav ? theme.danger : 'none'} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={clearSelection}
              style={styles.iconButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              activeOpacity={0.7}
              testID="sheet-stop-close-button"
              accessibilityRole="button"
              accessibilityLabel="Fechar detalhes da parada">
              <X size={18} color={theme.textMuted} />
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.sectionHeader}>Próximas Chegadas em Tempo Real</Text>

        <ScrollView style={styles.listScroll} showsVerticalScrollIndicator={false}>
          {arrivals.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>Buscando previsões de veículos próximos...</Text>
            </View>
          ) : (
            arrivals.map((arr, idx) => {
              const etaPhrase = formatEtaPhrase(arr.minutosAteChegada);
              const isArriving = etaPhrase === 'chegando agora';
              const dataAge = formatDataAge(arr.geradoEmTs, nowTs);

              return (
                <TouchableOpacity
                  key={`${arr.veiculoPrefixo}-${idx}`}
                  onPress={() => {
                    const line = CURITIBA_LINES.find((l) => l.codigo === arr.codLinha);
                    if (line) setSelectedLine(line);
                  }}
                  style={styles.arrivalCard}
                  testID={`sheet-arrival-card-${arr.codLinha}-${idx}`}
                  accessibilityRole="button"
                  accessibilityLabel={`Linha ${arr.codLinha}, ${arr.nomeLinha}, ${etaPhrase}${arr.acessivelPCD ? ', acessível' : ''}`}>
                  <BusBadge codigo={arr.codLinha} corHex={arr.corHex} size="medium" />
                  <View style={styles.arrivalInfo}>
                    <Text style={styles.arrivalLineName} numberOfLines={1}>
                      {arr.nomeLinha}
                    </Text>
                    <View style={styles.arrivalSourceRow}>
                      {arr.isRealtime && <View style={styles.liveDot} />}
                      <Text
                        style={[styles.arrivalSourceText, { color: arr.isRealtime ? theme.success : theme.textMuted }]}
                        numberOfLines={1}>
                        {formatArrivalSource(arr.isRealtime, arr.previstoParaTs)}
                        {dataAge ? ` · ${dataAge}` : ''}
                      </Text>
                    </View>
                    <View style={styles.arrivalVehicleRow}>
                      <Text style={styles.arrivalVehicleText} numberOfLines={1}>
                        Veículo {arr.veiculoPrefixo}
                      </Text>
                      {arr.acessivelPCD && <Accessibility size={12} color={theme.textSubtle} />}
                    </View>
                  </View>
                  <View style={styles.etaHero}>
                    {isArriving ? (
                      <Text style={styles.etaArrivingText}>Chegando</Text>
                    ) : (
                      <>
                        <Text style={styles.etaNumber}>{Math.round(arr.minutosAteChegada)}</Text>
                        <Text style={styles.etaUnit}>min</Text>
                      </>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      </Animated.View>
    );
  }

  // 2. Visão de Detalhes da Linha Selecionada
  if (selectedLine) {
    const isFav = favoriteLines.includes(selectedLine.codigo);
    const stopIds = activeDirection === 'ida' ? selectedLine.paradasIda : selectedLine.paradasVolta;
    const lineStops = stopIds
      .map((id) => CURITIBA_STOPS.find((s) => s.id === id))
      .filter((s): s is BusStop => !!s);

    return (
      <Animated.View style={[styles.sheetContainer, { height: animatedHeight }]}>
        <View style={styles.sheetHeader}>
          <View
            style={styles.dragHandle}
            hitSlop={{ top: Spacing.three, bottom: Spacing.three, left: Spacing.four, right: Spacing.four }}
            testID="sheet-drag-handle"
            accessible
            accessibilityRole="adjustable"
            accessibilityLabel="Painel de informações. Toque para alternar altura ou arraste para cima e para baixo."
            accessibilityActions={[
              { name: 'increment', label: 'Expandir' },
              { name: 'decrement', label: 'Recolher' },
            ]}
            onAccessibilityAction={(event) => handleSheetAccessibilityAction(event.nativeEvent.actionName)}
            {...panResponder.panHandlers}
          />
          <View style={styles.headerRow}>
            <BusBadge codigo={selectedLine.codigo} corHex={selectedLine.corHex} size="large" />
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.sheetTitle} numberOfLines={1}>
                {selectedLine.nome}
              </Text>
              <Text style={styles.sheetSubtitle}>
                {activeDirection === 'ida' ? selectedLine.terminalDestino : selectedLine.terminalOrigem}
              </Text>
            </View>

            <TouchableOpacity
              onPress={() => toggleFavoriteLine(selectedLine.codigo)}
              style={styles.iconButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              testID="sheet-line-favorite-button"
              accessibilityRole="button"
              accessibilityState={{ selected: isFav }}
              accessibilityLabel={`${isFav ? 'Remover' : 'Adicionar'} linha ${selectedLine.codigo} dos favoritos`}>
              <Bookmark size={22} color={isFav ? theme.danger : theme.textMuted} fill={isFav ? theme.danger : 'none'} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={clearSelection}
              style={styles.iconButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              testID="sheet-line-close-button"
              accessibilityRole="button"
              accessibilityLabel="Fechar detalhes da linha">
              <X size={18} color={theme.textMuted} />
            </TouchableOpacity>
          </View>

          {/* Alternador de Sentido */}
          <TouchableOpacity
            onPress={toggleActiveDirection}
            style={styles.directionToggle}
            activeOpacity={0.8}
            testID="sheet-direction-toggle-button"
            accessibilityRole="button"
            accessibilityLabel={`Sentido atual: ${activeDirection === 'ida' ? 'ida' : 'volta'}. Toque para inverter`}>
            <ArrowLeftRight size={16} color={theme.text} />
            <Text style={styles.directionToggleText}>
              Sentido: {activeDirection === 'ida' ? 'Ida' : 'Volta'} (Inverter)
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionHeader}>Itinerário ({lineStops.length} Paradas)</Text>

        <ScrollView style={styles.listScroll} showsVerticalScrollIndicator={false}>
          {lineStops.map((stop, idx) => (
            <TouchableOpacity
              key={`line-stop-${stop.id}-${idx}`}
              onPress={() => setSelectedStop(stop)}
              style={styles.timelineItem}
              testID={`sheet-timeline-stop-${stop.id}`}
              accessibilityRole="button"
              accessibilityLabel={`Parada ${stop.nome}, bairro ${stop.bairro}`}>
              <View style={styles.timelinePoint}>
                <View
                  style={[
                    styles.timelineDot,
                    { backgroundColor: idx === 0 || idx === lineStops.length - 1 ? selectedLine.corHex : theme.textMuted },
                  ]}
                />
                {idx < lineStops.length - 1 && <View style={styles.timelineLine} />}
              </View>
              <View style={styles.timelineContent}>
                <Text style={styles.timelineStopName}>{stop.nome}</Text>
                <Text style={styles.timelineStopBairro}>Bairro {stop.bairro}</Text>
              </View>
              <ChevronRight size={16} color={theme.borderStrong} />
            </TouchableOpacity>
          ))}
        </ScrollView>
      </Animated.View>
    );
  }

  // 3. Visão Padrão: Busca, Categorias e Paradas Próximas
  return (
    <Animated.View style={[styles.sheetContainer, { height: animatedHeight }]}>
      <View style={styles.sheetHeader}>
        <View
          style={styles.dragHandle}
          hitSlop={{ top: Spacing.three, bottom: Spacing.three, left: Spacing.four, right: Spacing.four }}
          testID="sheet-drag-handle"
          accessible
          accessibilityRole="adjustable"
          accessibilityLabel="Painel de informações. Toque para alternar altura ou arraste para cima e para baixo."
          accessibilityActions={[
            { name: 'increment', label: 'Expandir' },
            { name: 'decrement', label: 'Recolher' },
          ]}
          onAccessibilityAction={(event) => handleSheetAccessibilityAction(event.nativeEvent.actionName)}
          {...panResponder.panHandlers}
        />

        {/* Barra de Pesquisa Flutuante */}
        <View style={styles.searchBar}>
          <Search size={18} color={theme.textMuted} />
          <TextInput
            placeholder="Buscar linha, terminal ou estação-tubo..."
            placeholderTextColor={theme.textMuted}
            style={styles.searchInput}
            value={localSearch}
            onChangeText={setLocalSearch}
            onFocus={handleSearchFocus}
            testID="sheet-search-input"
            accessibilityLabel="Buscar linha, terminal ou estação-tubo"
          />
          {localSearch.length > 0 && (
            <TouchableOpacity
              onPress={() => setLocalSearch('')}
              hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
              testID="sheet-search-clear-button"
              accessibilityRole="button"
              accessibilityLabel="Limpar busca">
              <X size={14} color={theme.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        {/* Pílulas de Categorias RIT */}
        <View style={styles.categoryPillsContainer}>
          <CategoryPills />
        </View>
      </View>

      <ScrollView style={styles.listScroll} showsVerticalScrollIndicator={false}>
        {localSearch.length > 0 ? (
          <>
            <Text style={styles.sectionHeader}>Linhas encontradas</Text>
            {filteredLines.map((line) => (
              <TouchableOpacity
                key={line.id}
                onPress={() => setSelectedLine(line)}
                style={styles.lineSearchCard}
                testID={`sheet-line-result-${line.codigo}`}
                accessibilityRole="button"
                accessibilityLabel={`Linha ${line.codigo}, ${line.nome}, de ${line.terminalOrigem} até ${line.terminalDestino}`}>
                <BusBadge codigo={line.codigo} corHex={line.corHex} size="medium" />
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.lineCardTitle}>{line.nome}</Text>
                  <Text style={styles.lineCardMeta}>
                    {line.terminalOrigem} ➔ {line.terminalDestino}
                  </Text>
                </View>
                <ChevronRight size={16} color={theme.textMuted} />
              </TouchableOpacity>
            ))}

            <Text style={[styles.sectionHeader, { marginTop: 16 }]}>Paradas e Tubos</Text>
            {filteredStops.map((stop) => (
              <TouchableOpacity
                key={stop.id}
                onPress={() => setSelectedStop(stop)}
                style={styles.stopCard}
                testID={`sheet-stop-result-${stop.id}`}
                accessibilityRole="button"
                accessibilityLabel={`Parada ${stop.nome}, bairro ${stop.bairro}`}>
                <MapPin size={18} color={theme.primary} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.stopCardName}>{stop.nome}</Text>
                  <Text style={styles.stopCardMeta}>Bairro {stop.bairro}</Text>
                </View>
                <ChevronRight size={16} color={theme.borderStrong} />
              </TouchableOpacity>
            ))}
          </>
        ) : (
          <>
            <Text style={styles.sectionHeader}>Estações-Tubo e Terminais em Destaque</Text>
            {CURITIBA_STOPS.slice(0, 5).map((stop) => (
              <TouchableOpacity
                key={stop.id}
                onPress={() => setSelectedStop(stop)}
                style={styles.stopCard}
                testID={`sheet-stop-featured-${stop.id}`}
                accessibilityRole="button"
                accessibilityLabel={`${stop.tipo === 'terminal' ? 'Terminal' : 'Estação-tubo'} ${stop.nome}, linhas ${stop.linhas.join(', ')}`}>
                <MapPin size={18} color={stop.tipo === 'terminal' ? theme.warning : theme.primary} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.stopCardName}>{stop.nome}</Text>
                  <Text style={styles.stopCardMeta}>
                    {stop.tipo === 'terminal' ? 'Terminal' : 'Estação-Tubo'} • Linhas:{' '}
                    {stop.linhas.join(', ')}
                  </Text>
                </View>
                <ChevronRight size={16} color={theme.borderStrong} />
              </TouchableOpacity>
            ))}
          </>
        )}
      </ScrollView>
    </Animated.View>
  );
};
