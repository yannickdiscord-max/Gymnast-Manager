import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  FlatList,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  ActivityIndicator,
  Alert,
} from "react-native";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import {
  getSporter,
  getOuderGesprekkenForSporter,
  getLastPopGesprekLabel,
  addOuderGesprek,
  updateOuderGesprek,
  deleteOuderGesprek,
  INVALID_OUDER_GESPREK_DATUM,
  type Sporter,
  type OuderGesprek,
  type OuderGesprekType,
} from "@/lib/storage";

function formatTodayEuropean(): string {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

/** Kalenderdag vóór vandaag = afgelopen; vandaag of later = nog te gebeuren. */
function europeanDatumToLocalMidnightMs(datum: string): number | null {
  const parts = datum.trim().split("-");
  if (parts.length !== 3) return null;
  const [dd, mm, yyyy] = parts.map(Number);
  if (!dd || !mm || !yyyy) return null;
  const d = new Date(yyyy, mm - 1, dd);
  if (d.getFullYear() !== yyyy || d.getMonth() !== mm - 1 || d.getDate() !== dd) {
    return null;
  }
  return d.getTime();
}

function isGesprekDatumInPast(datum: string): boolean {
  const d = europeanDatumToLocalMidnightMs(datum);
  if (d === null) return false;
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return d < todayStart;
}

export default function PopGesprekkenScreen() {
  const { sporterId } = useLocalSearchParams<{ sporterId: string }>();
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const webBottomInset = Platform.OS === "web" ? 34 : 0;

  const [sporter, setSporter] = useState<Sporter | null>(null);
  const [gesprekken, setGesprekken] = useState<OuderGesprek[]>([]);
  const [lastPopLabel, setLastPopLabel] = useState("");
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [datum, setDatum] = useState(formatTodayEuropean);
  const [gesprekType, setGesprekType] = useState<OuderGesprekType>("normaal");
  const [notities, setNotities] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [saving, setSaving] = useState(false);

  const loadData = useCallback(async () => {
    if (!sporterId) return;
    setLoading(true);
    const [sp, list, popLabel] = await Promise.all([
      getSporter(sporterId),
      getOuderGesprekkenForSporter(sporterId),
      getLastPopGesprekLabel(sporterId),
    ]);
    setSporter(sp || null);
    setGesprekken(list);
    setLastPopLabel(popLabel);
    setLoading(false);
  }, [sporterId]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const openNew = () => {
    setEditingId(null);
    setDatum(formatTodayEuropean());
    setGesprekType("normaal");
    setNotities("");
    setErrorMsg("");
    setModalOpen(true);
  };

  const openEdit = (g: OuderGesprek) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditingId(g.id);
    setDatum(g.datum);
    setGesprekType(g.type);
    setNotities(g.notities);
    setErrorMsg("");
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingId(null);
    setErrorMsg("");
  };

  const confirmDelete = () => {
    if (!editingId) return;
    const id = editingId;
    Alert.alert(
      "Gesprek verwijderen",
      "Weet je zeker dat je dit gesprek definitief wilt verwijderen?",
      [
        { text: "Annuleren", style: "cancel" },
        {
          text: "Verwijderen",
          style: "destructive",
          onPress: async () => {
            await deleteOuderGesprek(id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            closeModal();
            await loadData();
          },
        },
      ]
    );
  };

  const handleSave = async () => {
    if (!sporterId) return;
    setSaving(true);
    setErrorMsg("");
    try {
      if (editingId) {
        await updateOuderGesprek(editingId, {
          datum,
          type: gesprekType,
          notities,
        });
      } else {
        await addOuderGesprek(sporterId, datum, gesprekType, notities);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      closeModal();
      await loadData();
    } catch (e) {
      if (e instanceof Error && e.message === INVALID_OUDER_GESPREK_DATUM) {
        setErrorMsg("Datum moet DD-MM-JJJJ zijn (bijv. 24-04-2026)");
      } else {
        Alert.alert("Opslaan mislukt", "Er ging iets mis bij het opslaan.");
      }
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: insets.top + webTopInset }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTopInset }]}>
      <View style={styles.header}>
        <Pressable
          onPress={() =>
            router.push({ pathname: "/overige-zaken/[sporterId]", params: { sporterId: sporterId! } })
          }
          hitSlop={12}
          testID="back-btn"
        >
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Gesprekken</Text>
          {!!sporter && <Text style={styles.headerSub}>{sporter.naam}</Text>}
        </View>
        <View style={styles.headerRightPlaceholder} />
      </View>

      <View style={styles.popBanner}>
        <Ionicons name="ribbon-outline" size={22} color={Colors.primary} />
        <Text style={styles.popBannerText}>{lastPopLabel}</Text>
      </View>

      <FlatList
        data={gesprekken}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + webBottomInset + 100 },
        ]}
        renderItem={({ item }) => {
          const past = isGesprekDatumInPast(item.datum);
          return (
            <Pressable
              style={({ pressed }) => [
                styles.card,
                past ? styles.cardPast : styles.cardUpcoming,
                pressed && styles.cardPressed,
              ]}
              onPress={() => openEdit(item)}
              testID={`gesprek-${item.id}`}
              accessibilityLabel={`Gesprek ${item.datum}`}
            >
              <View style={styles.cardTop}>
                <View style={styles.cardMeta}>
                  <Ionicons
                    name="calendar-outline"
                    size={14}
                    color={past ? Colors.textTertiary : Colors.primary}
                  />
                  <Text style={[styles.cardDatum, past && styles.cardDatumPast]}>{item.datum}</Text>
                </View>
                <View
                  style={[
                    styles.typePill,
                    item.type === "pop" ? styles.typePillPop : styles.typePillGesprek,
                  ]}
                >
                  <Text
                    style={[
                      styles.typePillText,
                      item.type === "pop" ? styles.typePillTextPop : styles.typePillTextGesprek,
                    ]}
                  >
                    {item.type === "pop" ? "POP-gesprek" : "Gesprek"}
                  </Text>
                </View>
              </View>
              <Text style={[styles.cardNotes, past && styles.cardNotesPast]} numberOfLines={4}>
                {item.notities.trim() ? item.notities : "Geen notities"}
              </Text>
              <Text style={styles.cardHint}>Tik om te bekijken of te bewerken</Text>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="chatbubbles-outline" size={44} color={Colors.textTertiary} />
            <Text style={styles.emptyTitle}>Nog geen gesprekken</Text>
            <Text style={styles.emptyText}>Registreer het eerste gesprek met de knop hieronder.</Text>
          </View>
        }
      />

      <View style={[styles.footer, { paddingBottom: insets.bottom + webBottomInset + 16 }]}>
        <Pressable
          style={({ pressed }) => [styles.addBtn, pressed && styles.addBtnPressed]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            openNew();
          }}
          testID="add-gesprek-btn"
        >
          <Ionicons name="add" size={22} color={Colors.white} />
          <Text style={styles.addBtnText}>Gesprek registreren</Text>
        </Pressable>
      </View>

      <Modal
        visible={modalOpen}
        transparent
        animationType="slide"
        onRequestClose={closeModal}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <Pressable style={styles.modalBackdrop} onPress={closeModal} />
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + webBottomInset + 16 }]}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>
              {editingId ? "Gesprek bewerken" : "Gesprek registreren"}
            </Text>

            <Text style={styles.fieldLabel}>Datum (DD-MM-JJJJ)</Text>
            <TextInput
              style={styles.textInput}
              value={datum}
              onChangeText={(t) => {
                setDatum(t);
                setErrorMsg("");
              }}
              placeholder="24-04-2026"
              placeholderTextColor={Colors.textTertiary}
              keyboardType="numbers-and-punctuation"
              maxLength={10}
              testID="gesprek-datum-input"
            />

            <Text style={[styles.fieldLabel, { marginTop: 14 }]}>Soort gesprek</Text>
            <View style={styles.typeRow}>
              <Pressable
                style={[
                  styles.typeOption,
                  gesprekType === "pop" && styles.typeOptionActive,
                ]}
                onPress={() => {
                  Haptics.selectionAsync();
                  setGesprekType("pop");
                }}
                testID="type-pop"
              >
                <Text
                  style={[
                    styles.typeOptionText,
                    gesprekType === "pop" && styles.typeOptionTextActive,
                  ]}
                >
                  POP-gesprek
                </Text>
              </Pressable>
              <Pressable
                style={[
                  styles.typeOption,
                  gesprekType === "normaal" && styles.typeOptionActive,
                ]}
                onPress={() => {
                  Haptics.selectionAsync();
                  setGesprekType("normaal");
                }}
                testID="type-gesprek"
              >
                <Text
                  style={[
                    styles.typeOptionText,
                    gesprekType === "normaal" && styles.typeOptionTextActive,
                  ]}
                >
                  Gesprek
                </Text>
              </Pressable>
            </View>

            <Text style={[styles.fieldLabel, { marginTop: 14 }]}>Notities</Text>
            <TextInput
              style={[styles.textInput, styles.notesInput]}
              value={notities}
              onChangeText={(t) => {
                setNotities(t);
                setErrorMsg("");
              }}
              placeholder="Wat is besproken?"
              placeholderTextColor={Colors.textTertiary}
              multiline
              textAlignVertical="top"
              testID="gesprek-notities-input"
            />

            {!!errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}

            {!!editingId && (
              <Pressable
                style={({ pressed }) => [styles.deleteRow, pressed && { opacity: 0.85 }]}
                onPress={confirmDelete}
                testID="gesprek-delete"
              >
                <Ionicons name="trash-outline" size={20} color={Colors.error} />
                <Text style={styles.deleteRowText}>Gesprek verwijderen</Text>
              </Pressable>
            )}

            <View style={styles.modalActions}>
              <Pressable style={styles.cancelBtn} onPress={closeModal} testID="gesprek-cancel">
                <Text style={styles.cancelBtnText}>Annuleren</Text>
              </Pressable>
              <Pressable
                style={[styles.saveBtn, saving && { opacity: 0.6 }]}
                onPress={handleSave}
                disabled={saving}
                testID="gesprek-save"
              >
                {saving ? (
                  <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                  <Text style={styles.saveBtnText}>Opslaan</Text>
                )}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  center: {
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
    marginHorizontal: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
    textAlign: "center",
  },
  headerSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
    marginTop: 2,
  },
  headerRightPlaceholder: {
    width: 24,
  },
  popBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 20,
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  popBannerText: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  listContent: {
    paddingHorizontal: 20,
    gap: 10,
    paddingTop: 4,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    overflow: "hidden",
  },
  cardUpcoming: {
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderTopColor: Colors.borderLight,
    borderRightColor: Colors.borderLight,
    borderBottomColor: Colors.borderLight,
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
  },
  cardPast: {
    backgroundColor: "#424242",
    borderTopWidth: 1,
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderTopColor: Colors.border,
    borderRightColor: Colors.border,
    borderBottomColor: Colors.border,
    borderLeftWidth: 4,
    borderLeftColor: Colors.textTertiary,
    opacity: 0.95,
  },
  cardPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  cardTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  cardMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  cardDatum: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  cardDatumPast: {
    color: Colors.textSecondary,
  },
  typePill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  typePillPop: {
    backgroundColor: "#4A3820",
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  typePillGesprek: {
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  typePillText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  typePillTextPop: {
    color: Colors.primary,
  },
  typePillTextGesprek: {
    color: Colors.textSecondary,
  },
  deleteRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 16,
    paddingVertical: 10,
  },
  deleteRowText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.error,
  },
  cardNotes: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.text,
    lineHeight: 22,
  },
  cardNotesPast: {
    color: Colors.textSecondary,
  },
  cardHint: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
    marginTop: 8,
  },
  empty: {
    alignItems: "center",
    paddingTop: 48,
    paddingHorizontal: 24,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
    marginTop: 8,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
    textAlign: "center",
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: Colors.background,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 14,
  },
  addBtnPressed: {
    backgroundColor: Colors.primaryDark,
    transform: [{ scale: 0.98 }],
  },
  addBtnText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.white,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalSheet: {
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
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
    marginBottom: 8,
  },
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
  notesInput: {
    minHeight: 120,
    paddingTop: 14,
  },
  typeRow: {
    flexDirection: "row",
    gap: 10,
  },
  typeOption: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    alignItems: "center",
  },
  typeOptionActive: {
    borderColor: Colors.primary,
    backgroundColor: "#4A3820",
  },
  typeOptionText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
    textAlign: "center",
  },
  typeOptionTextActive: {
    color: Colors.primary,
    fontFamily: "Inter_600SemiBold",
  },
  errorText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.error,
    marginTop: 8,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: "center",
  },
  cancelBtnText: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  saveBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: "center",
  },
  saveBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.white,
  },
});
