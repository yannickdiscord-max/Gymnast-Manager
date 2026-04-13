import React, { useState, useCallback, useRef, useEffect, useMemo } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Platform,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  PanResponder,
} from "react-native";
import { ScrollView } from "react-native";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import {
  getSporter,
  updateSporterOnderdelen,
  updateSporterOefening,
  getOnderdelen,
  addOnderdeel,
  deleteOnderdeel,
  TURN_ONDERDEEL_NIVEAUS,
  ELEMENTGROEPEN,
  ELEMENTGROEP_ROMAN,
  calculateDWaarde,
  type Sporter,
  type Toestel,
  type TurnOnderdeelNiveau,
  type TurnOnderdeel,
  type Elementgroep,
} from "@/lib/storage";

const CELL_H = 64;
const OEFENING_BG = "#1C3035";
const OEFENING_BORDER = "#285060";
const OEFENING_COLOR = "#3DD8BA";
const OEFENING_BADGE_BG = "#1A4048";

export default function ToestelScreen() {
  const { toestelId, sporterId } = useLocalSearchParams<{
    toestelId: string;
    sporterId: string;
  }>();
  const insets = useSafeAreaInsets();
  const [sporter, setSporter] = useState<Sporter | null>(null);
  const [onderdelen, setOnderdelen] = useState<TurnOnderdeel[]>([]);
  const [oefening, setOefening] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<TurnOnderdeelNiveau | null>(null);

  const [actionItem, setActionItem] = useState<TurnOnderdeel | null>(null);

  const [activeElementgroepFilter, setActiveElementgroepFilter] = useState<Elementgroep | null>(null);

  const [addModalVisible, setAddModalVisible] = useState(false);
  const [newNaam, setNewNaam] = useState("");
  const [newNiveau, setNewNiveau] = useState<TurnOnderdeelNiveau>("A");
  const [newElementgroep, setNewElementgroep] = useState<Elementgroep>(1);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const webBottomInset = Platform.OS === "web" ? 34 : 0;
  const toestel = toestelId as Toestel;

  const oefeningRef = useRef<string[]>([]);
  const dragRef = useRef<{ naam: string; toIdx: number } | null>(null);
  const containerAbsY = useRef(0);
  const panHandlersCache = useRef<Map<string, any>>(new Map());
  const containerRef = useRef<View>(null);
  const [draggingNaam, setDraggingNaam] = useState<string | null>(null);
  const [draggingToIdx, setDraggingToIdx] = useState<number | null>(null);

  useEffect(() => {
    oefeningRef.current = oefening;
  }, [oefening]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [sporterId, toestelId])
  );

  const loadData = async () => {
    if (!sporterId) return;
    setLoading(true);
    const [sporterData, onderdelenData] = await Promise.all([
      getSporter(sporterId),
      getOnderdelen(toestel),
    ]);
    setSporter(sporterData || null);
    setOnderdelen(onderdelenData);
    const oefeningData = sporterData?.oefening?.[toestel] || [];
    setOefening(oefeningData);
    oefeningRef.current = oefeningData;
    setLoading(false);
  };

  const getPanHandlers = (naam: string) => {
    if (panHandlersCache.current.has(naam)) {
      return panHandlersCache.current.get(naam);
    }
    const handlers = PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        const idx = oefeningRef.current.indexOf(naam);
        containerRef.current?.measure((_x, _y, _w, _h, _px, pageY) => {
          containerAbsY.current = pageY;
          if (dragRef.current) dragRef.current = { naam, toIdx: idx };
        });
        dragRef.current = { naam, toIdx: idx };
        setDraggingNaam(naam);
        setDraggingToIdx(idx);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      },
      onPanResponderMove: (_, { moveY }) => {
        if (!dragRef.current) return;
        const relY = moveY - containerAbsY.current;
        const target = Math.max(
          0,
          Math.min(oefeningRef.current.length - 1, Math.floor(relY / CELL_H))
        );
        if (target !== dragRef.current.toIdx) {
          dragRef.current.toIdx = target;
          setDraggingToIdx(target);
          Haptics.selectionAsync();
        }
      },
      onPanResponderRelease: () => {
        if (dragRef.current) {
          const { naam: n, toIdx } = dragRef.current;
          const newOrder = oefeningRef.current.filter((x) => x !== n);
          newOrder.splice(toIdx, 0, n);
          oefeningRef.current = newOrder;
          setOefening(newOrder);
          handleOefeningReorder(newOrder);
        }
        dragRef.current = null;
        setDraggingNaam(null);
        setDraggingToIdx(null);
      },
      onPanResponderTerminate: () => {
        dragRef.current = null;
        setDraggingNaam(null);
        setDraggingToIdx(null);
      },
    }).panHandlers;
    panHandlersCache.current.set(naam, handlers);
    return handlers;
  };

  const displayedOefening = useMemo(() => {
    if (!draggingNaam || draggingToIdx === null) return oefening;
    const without = oefening.filter((n) => n !== draggingNaam);
    without.splice(draggingToIdx, 0, draggingNaam);
    return without;
  }, [oefening, draggingNaam, draggingToIdx]);

  const handleOnderdeelPress = (item: TurnOnderdeel) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActionItem(item);
  };

  const handleSetGeleerd = async (naam: string) => {
    if (!sporter) return;
    setActionItem(null);
    const current = sporter.onderdelen[toestel] || [];
    const isGeleerd = current.includes(naam);
    if (isGeleerd) {
      const updatedOnderdelen = current.filter((o) => o !== naam);
      const updatedOefening = oefening.filter((o) => o !== naam);
      await updateSporterOnderdelen(sporter.id, toestel, updatedOnderdelen);
      await updateSporterOefening(sporter.id, toestel, updatedOefening);
      setOefening(updatedOefening);
      oefeningRef.current = updatedOefening;
      setSporter({
        ...sporter,
        onderdelen: { ...sporter.onderdelen, [toestel]: updatedOnderdelen },
        oefening: { ...sporter.oefening, [toestel]: updatedOefening },
      });
    } else {
      const updatedOnderdelen = [...current, naam];
      await updateSporterOnderdelen(sporter.id, toestel, updatedOnderdelen);
      setSporter({
        ...sporter,
        onderdelen: { ...sporter.onderdelen, [toestel]: updatedOnderdelen },
      });
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleAddToOefening = async (naam: string) => {
    if (!sporter) return;
    setActionItem(null);
    const current = sporter.onderdelen[toestel] || [];
    const updatedOnderdelen = current.includes(naam) ? current : [...current, naam];
    const updatedOefening = oefening.includes(naam) ? oefening : [...oefening, naam];
    await updateSporterOnderdelen(sporter.id, toestel, updatedOnderdelen);
    await updateSporterOefening(sporter.id, toestel, updatedOefening);
    setOefening(updatedOefening);
    oefeningRef.current = updatedOefening;
    setSporter({
      ...sporter,
      onderdelen: { ...sporter.onderdelen, [toestel]: updatedOnderdelen },
      oefening: { ...sporter.oefening, [toestel]: updatedOefening },
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleRemoveFromOefening = async (naam: string) => {
    if (!sporter) return;
    setActionItem(null);
    const updatedOefening = oefening.filter((o) => o !== naam);
    await updateSporterOefening(sporter.id, toestel, updatedOefening);
    setOefening(updatedOefening);
    oefeningRef.current = updatedOefening;
    setSporter({
      ...sporter,
      oefening: { ...sporter.oefening, [toestel]: updatedOefening },
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleOefeningReorder = async (newOrder: string[]) => {
    if (!sporter) return;
    await updateSporterOefening(sporter.id, toestel, newOrder);
    setSporter({
      ...sporter,
      oefening: { ...sporter.oefening, [toestel]: newOrder },
    });
  };

  const handleFilterPress = (niveau: TurnOnderdeelNiveau) => {
    Haptics.selectionAsync();
    setActiveFilter((prev) => (prev === niveau ? null : niveau));
  };

  const handleOpenAddModal = () => {
    setNewNaam("");
    setNewNiveau("A");
    setNewElementgroep(1);
    setErrorMsg("");
    setAddModalVisible(true);
  };

  const handleSave = async () => {
    const trimmed = newNaam.trim();
    if (!trimmed) {
      setErrorMsg("Vul een naam in");
      return;
    }
    const duplicate = onderdelen.some(
      (o) => o.naam.toLowerCase() === trimmed.toLowerCase()
    );
    if (duplicate) {
      setErrorMsg("Dit onderdeel bestaat al");
      return;
    }
    setSaving(true);
    await addOnderdeel(toestel, { naam: trimmed, niveau: newNiveau, elementgroep: newElementgroep });
    const updated = await getOnderdelen(toestel);
    setOnderdelen(updated);
    setSaving(false);
    setAddModalVisible(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleDelete = async (naam: string) => {
    await deleteOnderdeel(toestel, naam);
    const updated = await getOnderdelen(toestel);
    setOnderdelen(updated);
    if (sporter) {
      const current = sporter.onderdelen[toestel] || [];
      const updatedOnderdelen = current.filter((o) => o !== naam);
      const updatedOefening = oefening.filter((o) => o !== naam);
      await updateSporterOnderdelen(sporter.id, toestel, updatedOnderdelen);
      if (updatedOefening.length !== oefening.length) {
        await updateSporterOefening(sporter.id, toestel, updatedOefening);
        setOefening(updatedOefening);
        oefeningRef.current = updatedOefening;
      }
      setSporter({
        ...sporter,
        onderdelen: { ...sporter.onderdelen, [toestel]: updatedOnderdelen },
        oefening: { ...sporter.oefening, [toestel]: updatedOefening },
      });
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: insets.top + webTopInset }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!sporter) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: insets.top + webTopInset }]}>
        <Ionicons name="alert-circle-outline" size={48} color={Colors.textTertiary} />
        <Text style={styles.errorTitle}>Sporter niet gevonden</Text>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.backLink}>Terug</Text>
        </Pressable>
      </View>
    );
  }

  const selected = sporter.onderdelen[toestel] || [];

  const displayOnderdelen = onderdelen.filter((o) => {
    if (oefening.includes(o.naam)) return false;
    if (activeFilter && o.niveau !== activeFilter) return false;
    if (activeElementgroepFilter && o.elementgroep !== activeElementgroepFilter) return false;
    return true;
  });

  const isInOefening = actionItem ? oefening.includes(actionItem.naam) : false;
  const isGeleerd = actionItem ? selected.includes(actionItem.naam) : false;

  const renderOnderdeel = ({ item }: { item: TurnOnderdeel }) => {
    const isSelected = selected.includes(item.naam);
    return (
      <Pressable
        style={({ pressed }) => [
          styles.onderdeelItem,
          isSelected && styles.onderdeelItemSelected,
          pressed && styles.itemPressed,
        ]}
        onPress={() => handleOnderdeelPress(item)}
        testID={`onderdeel-${item.naam}`}
      >
        <Ionicons
          name={isSelected ? "checkmark-circle" : "ellipse-outline"}
          size={22}
          color={isSelected ? Colors.primary : Colors.textTertiary}
        />
        <View style={styles.onderdeelInfo}>
          <Text style={[styles.onderdeelText, isSelected && styles.onderdeelTextSelected]}>
            {item.naam}
          </Text>
        </View>
        <View style={[styles.niveauTag, getNiveauTagStyle(item.niveau)]}>
          <Text style={[styles.niveauTagText, getNiveauTagTextStyle(item.niveau)]}>
            {item.niveau}
          </Text>
        </View>
        <View style={styles.elementgroepTag}>
          <Text style={styles.elementgroepTagText}>
            {ELEMENTGROEP_ROMAN[item.elementgroep ?? 1]}
          </Text>
        </View>
        <Pressable
          onPress={() => handleDelete(item.naam)}
          hitSlop={8}
          testID={`delete-${item.naam}`}
        >
          <Ionicons name="trash-outline" size={18} color={Colors.textTertiary} />
        </Pressable>
      </Pressable>
    );
  };

  const oefeningDWaarde = calculateDWaarde(oefening, onderdelen);

  const OefeningSection = oefening.length > 0 ? (
    <View style={styles.oefeningSection}>
      <View style={styles.oefeningSectionHeader}>
        <Text style={styles.oefeningSectionTitle}>Oefening</Text>
        <Text style={styles.oefeningDWaarde}>D: {oefeningDWaarde.toFixed(1)}</Text>
      </View>
      <View
        ref={containerRef}
        onLayout={() => {
          containerRef.current?.measure((_x, _y, _w, _h, _px, pageY) => {
            containerAbsY.current = pageY;
          });
        }}
      >
        {displayedOefening.map((naam, idx) => {
          const item = onderdelen.find((o) => o.naam === naam);
          if (!item) return null;
          const isDragging = draggingNaam === naam;
          return (
            <View
              key={naam}
              style={[styles.oefeningItem, isDragging && styles.oefeningItemDragging]}
            >
              <Pressable
                style={styles.oefeningItemBody}
                onPress={() => handleOnderdeelPress(item)}
                testID={`oefening-${naam}`}
              >
                <View style={styles.orderBadge}>
                  <Text style={styles.orderText}>{idx + 1}</Text>
                </View>
                <View style={styles.oefeningInfo}>
                  <Text style={styles.oefeningText}>{item.naam}</Text>
                </View>
                <View style={[styles.niveauTag, getNiveauTagStyle(item.niveau)]}>
                  <Text style={[styles.niveauTagText, getNiveauTagTextStyle(item.niveau)]}>
                    {item.niveau}
                  </Text>
                </View>
                <View style={styles.elementgroepTag}>
                  <Text style={styles.elementgroepTagText}>
                    {ELEMENTGROEP_ROMAN[item.elementgroep ?? 1]}
                  </Text>
                </View>
              </Pressable>
              <View {...getPanHandlers(naam)} style={styles.gripHandle}>
                <Ionicons name="reorder-three-outline" size={24} color={OEFENING_COLOR} />
              </View>
            </View>
          );
        })}
      </View>
    </View>
  ) : null;

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTopInset }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.push({ pathname: "/sporter/[id]", params: { id: sporterId! } })} hitSlop={12} testID="back-btn">
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>{toestel}</Text>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={displayOnderdelen}
        keyExtractor={(item) => item.naam}
        renderItem={renderOnderdeel}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + webBottomInset + 20 },
        ]}
        showsVerticalScrollIndicator={false}
        scrollEnabled={true}
        ListHeaderComponent={
          <>
            {OefeningSection}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.filterRow}
              style={styles.filterScroll}
              scrollEnabled={true}
            >
              {TURN_ONDERDEEL_NIVEAUS.map((niveau) => {
                const isActive = activeFilter === niveau;
                return (
                  <Pressable
                    key={niveau}
                    style={[styles.filterChip, isActive && styles.filterChipActive]}
                    onPress={() => handleFilterPress(niveau)}
                    testID={`filter-${niveau}`}
                  >
                    <Text style={[styles.filterChipText, isActive && styles.filterChipTextActive]}>
                      {niveau}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
            <View style={styles.filterRowCentered}>
              {ELEMENTGROEPEN.map((eg) => {
                const isActive = activeElementgroepFilter === eg;
                return (
                  <Pressable
                    key={eg}
                    style={[styles.filterChip, styles.filterChipEg, isActive && styles.filterChipEgActive]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      setActiveElementgroepFilter((prev) => (prev === eg ? null : eg));
                    }}
                    testID={`filter-eg-${eg}`}
                  >
                    <Text style={[styles.filterChipText, isActive && styles.filterChipEgTextActive]}>
                      {ELEMENTGROEP_ROMAN[eg]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </>
        }
        ListEmptyComponent={
          activeFilter || activeElementgroepFilter ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="fitness-outline" size={40} color={Colors.textTertiary} />
              <Text style={styles.emptyText}>
                Geen onderdelen{activeFilter ? ` voor niveau ${activeFilter}` : ""}
                {activeElementgroepFilter ? ` in groep ${ELEMENTGROEP_ROMAN[activeElementgroepFilter]}` : ""}
              </Text>
            </View>
          ) : null
        }
        ListFooterComponent={
          <Pressable
            style={styles.addButton}
            onPress={handleOpenAddModal}
            testID="add-onderdeel-btn"
          >
            <Ionicons name="add" size={22} color={Colors.white} />
            <Text style={styles.addButtonText}>Onderdeel toevoegen</Text>
          </Pressable>
        }
      />

      {/* Action modal */}
      <Modal
        visible={actionItem !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setActionItem(null)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setActionItem(null)} />
        <View style={[styles.actionSheet, { paddingBottom: insets.bottom + webBottomInset + 16 }]}>
          <View style={styles.modalHandle} />
          {actionItem && (
            <>
              <View style={styles.actionHeader}>
                <Text style={styles.actionTitle} numberOfLines={1}>{actionItem.naam}</Text>
                <View style={[styles.niveauTag, getNiveauTagStyle(actionItem.niveau)]}>
                  <Text style={[styles.niveauTagText, getNiveauTagTextStyle(actionItem.niveau)]}>
                    {actionItem.niveau}
                  </Text>
                </View>
              </View>

              <View style={styles.statusRow}>
                <View style={[
                  styles.statusBadge,
                  isInOefening && styles.statusBadgeOefening,
                  isGeleerd && !isInOefening && styles.statusBadgeGeleerd,
                ]}>
                  <Ionicons
                    name={isInOefening ? "star" : isGeleerd ? "checkmark-circle" : "ellipse-outline"}
                    size={14}
                    color={isInOefening ? OEFENING_COLOR : isGeleerd ? Colors.primary : Colors.textTertiary}
                  />
                  <Text style={[
                    styles.statusText,
                    isInOefening && styles.statusTextOefening,
                    isGeleerd && !isInOefening && styles.statusTextGeleerd,
                  ]}>
                    {isInOefening ? "In oefening" : isGeleerd ? "Geleerd" : "Niet geselecteerd"}
                  </Text>
                </View>
              </View>

              <View style={styles.actionButtons}>
                {!isInOefening && (
                  <Pressable
                    style={({ pressed }) => [styles.actionBtn, styles.actionBtnOefening, pressed && styles.actionBtnPressed]}
                    onPress={() => handleAddToOefening(actionItem.naam)}
                    testID="add-to-oefening-btn"
                  >
                    <Ionicons name="star-outline" size={20} color={OEFENING_COLOR} />
                    <Text style={[styles.actionBtnText, styles.actionBtnTextOefening]}>
                      Aan oefening toevoegen
                    </Text>
                  </Pressable>
                )}

                {isInOefening && (
                  <Pressable
                    style={({ pressed }) => [styles.actionBtn, styles.actionBtnNeutral, pressed && styles.actionBtnPressed]}
                    onPress={() => handleRemoveFromOefening(actionItem.naam)}
                    testID="remove-from-oefening-btn"
                  >
                    <Ionicons name="arrow-down-outline" size={20} color={Colors.textSecondary} />
                    <Text style={[styles.actionBtnText, styles.actionBtnTextNeutral]}>
                      Alleen geleerd
                    </Text>
                  </Pressable>
                )}

                {!isGeleerd && (
                  <Pressable
                    style={({ pressed }) => [styles.actionBtn, styles.actionBtnGeleerd, pressed && styles.actionBtnPressed]}
                    onPress={() => handleSetGeleerd(actionItem.naam)}
                    testID="set-geleerd-btn"
                  >
                    <Ionicons name="checkmark-circle-outline" size={20} color={Colors.primary} />
                    <Text style={[styles.actionBtnText, styles.actionBtnTextGeleerd]}>Geleerd</Text>
                  </Pressable>
                )}

                {isGeleerd && (
                  <Pressable
                    style={({ pressed }) => [styles.actionBtn, styles.actionBtnRemove, pressed && styles.actionBtnPressed]}
                    onPress={() => handleSetGeleerd(actionItem.naam)}
                    testID="remove-geleerd-btn"
                  >
                    <Ionicons name="close-circle-outline" size={20} color={Colors.error} />
                    <Text style={[styles.actionBtnText, styles.actionBtnTextRemove]}>
                      Verwijderen uit geleerd
                    </Text>
                  </Pressable>
                )}
              </View>
            </>
          )}
        </View>
      </Modal>

      {/* Add onderdeel modal */}
      <Modal
        visible={addModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAddModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <Pressable style={styles.modalBackdrop} onPress={() => setAddModalVisible(false)} />
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + webBottomInset + 16 }]}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Onderdeel toevoegen</Text>

            <Text style={styles.fieldLabel}>Naam</Text>
            <TextInput
              style={styles.textInput}
              value={newNaam}
              onChangeText={(t) => { setNewNaam(t); setErrorMsg(""); }}
              placeholder="bijv. Salto gestrekt"
              placeholderTextColor={Colors.textTertiary}
              autoFocus
              testID="custom-naam-input"
            />
            {!!errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}

            <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Niveau</Text>
            <View style={styles.niveauRow}>
              {TURN_ONDERDEEL_NIVEAUS.map((n) => (
                <Pressable
                  key={n}
                  style={[styles.niveauOption, newNiveau === n && styles.niveauOptionActive]}
                  onPress={() => setNewNiveau(n)}
                  testID={`select-niveau-${n}`}
                >
                  <Text style={[styles.niveauOptionText, newNiveau === n && styles.niveauOptionTextActive]}>
                    {n}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Elementgroep</Text>
            <View style={styles.niveauRow}>
              {ELEMENTGROEPEN.map((eg) => (
                <Pressable
                  key={eg}
                  style={[styles.niveauOption, newElementgroep === eg && styles.niveauOptionEgActive]}
                  onPress={() => setNewElementgroep(eg)}
                  testID={`select-eg-${eg}`}
                >
                  <Text style={[styles.niveauOptionText, newElementgroep === eg && styles.niveauOptionEgTextActive]}>
                    {eg}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.modalActions}>
              <Pressable
                style={styles.cancelBtn}
                onPress={() => setAddModalVisible(false)}
                testID="cancel-add-btn"
              >
                <Text style={styles.cancelBtnText}>Annuleren</Text>
              </Pressable>
              <Pressable
                style={[styles.saveBtn, saving && { opacity: 0.6 }]}
                onPress={handleSave}
                disabled={saving}
                testID="save-add-btn"
              >
                {saving ? (
                  <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                  <Text style={styles.saveBtnText}>Toevoegen</Text>
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function getNiveauTagStyle(niveau: TurnOnderdeelNiveau) {
  const map: Record<TurnOnderdeelNiveau, object> = {
    tA: { backgroundColor: "#1A2535", borderColor: "#2A4060" },
    A: { backgroundColor: "#1A2E1A", borderColor: "#2A4A2A" },
    B: { backgroundColor: "#2E2A14", borderColor: "#4A4020" },
    C: { backgroundColor: "#2E1E10", borderColor: "#4A3020" },
    D: { backgroundColor: "#2E1515", borderColor: "#4A2020" },
    E: { backgroundColor: "#25103A", borderColor: "#3A1A55" },
  };
  return map[niveau] || {};
}

function getNiveauTagTextStyle(niveau: TurnOnderdeelNiveau) {
  const map: Record<TurnOnderdeelNiveau, object> = {
    tA: { color: "#60A8D8" },
    A: { color: "#5CC85C" },
    B: { color: "#C8A840" },
    C: { color: "#D87840" },
    D: { color: "#D86060" },
    E: { color: "#A870D0" },
  };
  return map[niveau] || {};
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  center: { justifyContent: "center", alignItems: "center", gap: 12 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", color: Colors.text },
  filterScroll: { flexGrow: 0, marginBottom: 12 },
  filterRow: { paddingHorizontal: 20, gap: 8 },
  filterRowCentered: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  filterChip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  filterChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterChipText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary },
  filterChipTextActive: { color: Colors.white },
  listContent: { paddingHorizontal: 20, gap: 8, paddingTop: 4 },
  onderdeelItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: Colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  onderdeelItemSelected: { backgroundColor: "#4A3820", borderColor: "#7A5C20" },
  itemPressed: { opacity: 0.8 },
  onderdeelInfo: { flex: 1 },
  onderdeelText: { fontSize: 15, fontFamily: "Inter_400Regular", color: Colors.textSecondary },
  onderdeelTextSelected: { fontFamily: "Inter_500Medium", color: Colors.primaryDark },
  niveauTag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  niveauTagText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  elementgroepTag: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    backgroundColor: "#252035",
    borderColor: "#3A2A55",
  },
  elementgroepTagText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#B090E0" },
  filterChipEg: { backgroundColor: "#252035", borderColor: "#3A2A55" },
  filterChipEgActive: { backgroundColor: "#6030A0", borderColor: "#6030A0" },
  filterChipEgTextActive: { color: Colors.white },
  niveauOptionEgActive: { backgroundColor: "#6030A0", borderColor: "#6030A0" },
  niveauOptionEgTextActive: { color: Colors.white },
  emptyContainer: { alignItems: "center", paddingTop: 60, gap: 8 },
  emptyText: {
    fontSize: 15, fontFamily: "Inter_400Regular",
    color: Colors.textTertiary, textAlign: "center",
  },
  errorTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary },
  backLink: { fontSize: 16, fontFamily: "Inter_500Medium", color: Colors.primary },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    marginTop: 4,
    borderRadius: 14,
    backgroundColor: Colors.primary,
  },
  addButtonText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: Colors.white },

  oefeningSection: { paddingHorizontal: 20, marginBottom: 16 },
  oefeningSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  oefeningSectionTitle: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    color: OEFENING_COLOR,
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  oefeningDWaarde: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    color: OEFENING_COLOR,
  },
  oefeningItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: OEFENING_BG,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: OEFENING_BORDER,
    marginBottom: 8,
    height: CELL_H - 8,
    overflow: "hidden",
  },
  oefeningItemDragging: {
    opacity: 0.75,
    borderStyle: "dashed",
  },
  oefeningItemBody: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  orderBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: OEFENING_BADGE_BG,
    justifyContent: "center",
    alignItems: "center",
  },
  orderText: { fontSize: 12, fontFamily: "Inter_700Bold", color: OEFENING_COLOR },
  oefeningInfo: { flex: 1 },
  oefeningText: { fontSize: 15, fontFamily: "Inter_500Medium", color: OEFENING_COLOR },
  gripHandle: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    justifyContent: "center",
    alignItems: "center",
  },

  modalOverlay: { flex: 1, justifyContent: "flex-end" },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.4)" },
  modalSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  actionSheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  modalHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.borderLight,
    alignSelf: "center",
    marginBottom: 20,
  },
  modalTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", color: Colors.text, marginBottom: 20 },
  fieldLabel: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.textSecondary, marginBottom: 8 },
  textInput: {
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  errorText: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.error, marginTop: 6 },
  niveauRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  niveauOption: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  niveauOptionActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  niveauOptionText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary },
  niveauOptionTextActive: { color: Colors.white },
  modalActions: { flexDirection: "row", gap: 12, marginTop: 24 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: "center",
  },
  cancelBtnText: { fontSize: 15, fontFamily: "Inter_500Medium", color: Colors.textSecondary },
  saveBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 12,
    backgroundColor: Colors.primary, alignItems: "center",
  },
  saveBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.white },

  actionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  actionTitle: {
    flex: 1, fontSize: 18, fontFamily: "Inter_600SemiBold", color: Colors.text,
  },
  statusRow: { marginBottom: 20 },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  statusBadgeGeleerd: { backgroundColor: "#3A2E14", borderColor: "#6A5020" },
  statusBadgeOefening: { backgroundColor: OEFENING_BADGE_BG, borderColor: OEFENING_BORDER },
  statusText: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.textTertiary },
  statusTextGeleerd: { color: Colors.primary },
  statusTextOefening: { color: OEFENING_COLOR },
  actionButtons: { gap: 10, marginBottom: 8 },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 18,
    borderRadius: 14,
    borderWidth: 1,
  },
  actionBtnPressed: { opacity: 0.75 },
  actionBtnOefening: { backgroundColor: OEFENING_BADGE_BG, borderColor: OEFENING_BORDER },
  actionBtnGeleerd: { backgroundColor: "#3A2E14", borderColor: "#6A5020" },
  actionBtnNeutral: { backgroundColor: Colors.surfaceSecondary, borderColor: Colors.borderLight },
  actionBtnRemove: { backgroundColor: "rgba(248,113,113,0.08)", borderColor: "rgba(248,113,113,0.3)" },
  actionBtnText: { fontSize: 15, fontFamily: "Inter_500Medium", flex: 1 },
  actionBtnTextOefening: { color: OEFENING_COLOR },
  actionBtnTextGeleerd: { color: Colors.primary },
  actionBtnTextNeutral: { color: Colors.textSecondary },
  actionBtnTextRemove: { color: Colors.error },
});
