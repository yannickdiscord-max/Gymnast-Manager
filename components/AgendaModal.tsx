import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  Dimensions,
  Alert,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import {
  getUpcomingAgendaItems,
  getSporters,
  addWedstrijd,
  addCustomAgendaEvent,
  addOuderGesprek,
  DUPLICATE_WEDSTRIJD_ERROR,
  MISSING_AGENDA_TITEL,
  INVALID_AGENDA_DATUM,
  INVALID_OUDER_GESPREK_DATUM,
  type AgendaItem,
  type AgendaItemKalender,
  type AgendaKalenderCategorie,
  type OuderGesprekType,
  type Sporter,
} from "@/lib/storage";

const WINDOW_H = Dimensions.get("window").height;
const LIST_MAX_H = WINDOW_H * 0.68;
/** Enough vertical space to show two event cards without scrolling when possible. */
const LIST_MIN_TWO_ROWS = Math.min(WINDOW_H * 0.44, 380);

type AddEventType = "wedstrijd" | "ouder_gesprek" | AgendaKalenderCategorie;

const ADD_TYPE_OPTIONS: { value: AddEventType; label: string }[] = [
  { value: "wedstrijd", label: "Wedstrijd" },
  { value: "ouder_gesprek", label: "Gesprek" },
  { value: "vrij", label: "Vrij / vakantie" },
  { value: "feestdag", label: "Feestdag" },
  { value: "overig", label: "Anders" },
];

type Props = {
  visible: boolean;
  onClose: () => void;
  onlyFavorieten: boolean;
  webBottomInset?: number;
};

export default function AgendaModal({
  visible,
  onClose,
  onlyFavorieten,
  webBottomInset = 0,
}: Props) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [items, setItems] = useState<AgendaItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [sporters, setSporters] = useState<Sporter[]>([]);
  const [phase, setPhase] = useState<"list" | "add">("list");
  const [addType, setAddType] = useState<AddEventType>("vrij");
  const [addTitel, setAddTitel] = useState("");
  const [addDatum, setAddDatum] = useState("");
  const [addLocatie, setAddLocatie] = useState("");
  const [addNotitie, setAddNotitie] = useState("");
  const [addSporterId, setAddSporterId] = useState("");
  const [addError, setAddError] = useState("");
  const [savingAdd, setSavingAdd] = useState(false);
  const [agendaGesprekKind, setAgendaGesprekKind] = useState<OuderGesprekType>("normaal");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [data, sportList] = await Promise.all([
        getUpcomingAgendaItems({ onlyFavorieten }),
        getSporters(),
      ]);
      setItems(data);
      setSporters(sportList);
    } finally {
      setLoading(false);
    }
  }, [onlyFavorieten]);

  useEffect(() => {
    if (visible) {
      void load();
    }
  }, [visible, load]);

  useEffect(() => {
    if (!visible) {
      setPhase("list");
      setAddError("");
    }
  }, [visible]);

  const sporterChoices = onlyFavorieten
    ? sporters.filter((s) => s.favoriet)
    : sporters;

  const openAdd = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setAddType("vrij");
    setAddTitel("");
    setAddDatum("");
    setAddLocatie("");
    setAddNotitie("");
    setAddSporterId("");
    setAddError("");
    setAgendaGesprekKind("normaal");
    setPhase("add");
  };

  const closeAdd = () => {
    Haptics.selectionAsync();
    setPhase("list");
    setAddError("");
  };

  const handleSaveAdd = async () => {
    setAddError("");
    if (addType === "ouder_gesprek") {
      if (!addSporterId) {
        setAddError(
          sporterChoices.length === 0 && onlyFavorieten
            ? "Voeg eerst favoriete sporters toe."
            : "Kies een sporter."
        );
        return;
      }
      if (!addDatum.trim()) {
        setAddError("Vul een datum in.");
        return;
      }
      setSavingAdd(true);
      try {
        const notParts: string[] = [];
        if (addLocatie.trim()) notParts.push(`Locatie: ${addLocatie.trim()}`);
        if (addNotitie.trim()) notParts.push(addNotitie.trim());
        await addOuderGesprek(
          addSporterId,
          addDatum.trim(),
          agendaGesprekKind,
          notParts.join("\n\n")
        );
        await load();
        setPhase("list");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (e) {
        if (e instanceof Error && e.message === INVALID_OUDER_GESPREK_DATUM) {
          setAddError("Ongeldige datum. Gebruik DD-MM-JJJJ.");
        } else {
          setAddError("Opslaan mislukt.");
        }
      } finally {
        setSavingAdd(false);
      }
      return;
    }

    if (addType === "wedstrijd") {
      if (!addSporterId) {
        setAddError(
          sporterChoices.length === 0 && onlyFavorieten
            ? "Voeg eerst favoriete sporters toe."
            : "Kies een sporter."
        );
        return;
      }
      if (!addTitel.trim()) {
        setAddError("Vul een titel in (wedstrijdnaam).");
        return;
      }
      setSavingAdd(true);
      try {
        await addWedstrijd(
          addSporterId,
          addTitel.trim(),
          addDatum,
          addLocatie.trim()
        );
        await load();
        setPhase("list");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (e) {
        if (e instanceof Error && e.message === DUPLICATE_WEDSTRIJD_ERROR) {
          Alert.alert(
            "Bestaat al",
            "Er is al een wedstrijd met dezelfde gegevens voor deze sporter."
          );
        } else {
          setAddError("Opslaan mislukt. Controleer de datum (DD-MM-JJJJ).");
        }
      } finally {
        setSavingAdd(false);
      }
      return;
    }

    setSavingAdd(true);
    try {
      await addCustomAgendaEvent(
        addTitel,
        addDatum,
        addLocatie,
        addType as AgendaKalenderCategorie,
        addNotitie
      );
      await load();
      setPhase("list");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      if (e instanceof Error) {
        if (e.message === MISSING_AGENDA_TITEL) {
          setAddError("Vul een titel in.");
        } else if (e.message === INVALID_AGENDA_DATUM) {
          setAddError("Ongeldige datum. Gebruik DD-MM-JJJJ.");
        } else {
          setAddError("Opslaan mislukt.");
        }
      }
    } finally {
      setSavingAdd(false);
    }
  };

  const handleWedstrijdPress = (item: AgendaItem & { source: "wedstrijd" }) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
    router.push({
      pathname: "/wedstrijd/[wedstrijdId]",
      params: { wedstrijdId: item.id },
    });
  };

  const handleOuderGesprekPress = (item: AgendaItem & { source: "ouder_gesprek" }) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
    router.push({
      pathname: "/pop-gesprekken/[sporterId]",
      params: { sporterId: item.sporterId },
    });
  };

  const showKalenderDetail = (item: AgendaItemKalender) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const lines: string[] = [item.categorieLabel, `Datum: ${item.datum}`];
    if (item.locatie.trim()) lines.push(`Locatie: ${item.locatie}`);
    if (item.notitie.trim()) lines.push(item.notitie);
    Alert.alert(item.titel, lines.join("\n\n"));
  };

  const renderItem = ({ item }: { item: AgendaItem }) => {
    if (item.source === "ouder_gesprek") {
      return (
        <Pressable
          style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
          onPress={() => handleOuderGesprekPress(item)}
        >
          <View
            style={[
              styles.typeTag,
              item.gesprekType === "pop" ? styles.typeTagOuderPop : styles.typeTagOuderGesprek,
            ]}
          >
            <Text style={styles.typeTagText}>
              {item.gesprekType === "pop" ? "POP" : "Gesprek"}
            </Text>
          </View>
          <Text style={styles.rowTitle} numberOfLines={2}>
            {item.titel}
          </Text>
          <View style={styles.metaRow}>
            <Ionicons name="calendar-outline" size={14} color={Colors.textTertiary} />
            <Text style={styles.metaText}>{item.datum}</Text>
          </View>
          {item.notitie.trim() !== "" && (
            <Text style={styles.notitiePreview} numberOfLines={2}>
              {item.notitie}
            </Text>
          )}
        </Pressable>
      );
    }

    if (item.source === "wedstrijd") {
      return (
        <Pressable
          style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
          onPress={() => handleWedstrijdPress(item)}
        >
          <View style={styles.typeTag}>
            <Text style={styles.typeTagText}>Wedstrijd</Text>
          </View>
          <Text style={styles.rowTitle} numberOfLines={2}>
            {item.naam}
          </Text>
          <View style={styles.metaRow}>
            <Ionicons name="calendar-outline" size={14} color={Colors.textTertiary} />
            <Text style={styles.metaText}>{item.datum}</Text>
          </View>
          {item.locatie.trim() !== "" && (
            <View style={styles.metaRow}>
              <Ionicons name="location-outline" size={14} color={Colors.textTertiary} />
              <Text style={styles.metaText} numberOfLines={2}>
                {item.locatie}
              </Text>
            </View>
          )}
          <View style={styles.metaRow}>
            <Ionicons name="person-outline" size={14} color={Colors.textTertiary} />
            <Text style={styles.metaText}>{item.sporterNaam}</Text>
          </View>
        </Pressable>
      );
    }

    return (
      <Pressable
        style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
        onPress={() => showKalenderDetail(item)}
      >
        <View style={[styles.typeTag, styles.typeTagKalender]}>
          <Text style={styles.typeTagText}>{item.categorieLabel}</Text>
        </View>
        <Text style={styles.rowTitle} numberOfLines={2}>
          {item.titel}
        </Text>
        <View style={styles.metaRow}>
          <Ionicons name="calendar-outline" size={14} color={Colors.textTertiary} />
          <Text style={styles.metaText}>{item.datum}</Text>
        </View>
        {item.locatie.trim() !== "" && (
          <View style={styles.metaRow}>
            <Ionicons name="location-outline" size={14} color={Colors.textTertiary} />
            <Text style={styles.metaText} numberOfLines={2}>
              {item.locatie}
            </Text>
          </View>
        )}
        {item.notitie.trim() !== "" && (
          <Text style={styles.notitiePreview} numberOfLines={2}>
            {item.notitie}
          </Text>
        )}
      </Pressable>
    );
  };

  const listMinHeight = items.length >= 2 ? LIST_MIN_TWO_ROWS : undefined;

  const sheetContent =
    phase === "list" ? (
      <>
        <View style={styles.sheetHeader}>
          <Text style={styles.modalTitle}>Agenda</Text>
          <View style={styles.headerActions}>
            <Pressable
              onPress={openAdd}
              hitSlop={10}
              testID="agenda-add-btn"
              accessibilityRole="button"
              accessibilityLabel="Gebeurtenis toevoegen"
              style={({ pressed }) => pressed && { opacity: 0.75 }}
            >
              <Ionicons name="add-circle-outline" size={28} color={Colors.primary} />
            </Pressable>
            <Pressable onPress={onClose} hitSlop={12} testID="agenda-close">
              <Ionicons name="close" size={26} color={Colors.textSecondary} />
            </Pressable>
          </View>
        </View>
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
        ) : items.length === 0 ? (
          <View style={styles.emptyBox}>
            <Ionicons name="calendar-outline" size={44} color={Colors.textTertiary} />
            <Text style={styles.emptyTitle}>Geen aankomende gebeurtenissen</Text>
            <Text style={styles.emptySub}>
              Voeg wedstrijden toe via een sporter, of gebruik het plus-icoon voor
              vrije dagen en feestdagen.
            </Text>
            <Pressable style={styles.emptyAddBtn} onPress={openAdd}>
              <Ionicons name="add" size={20} color={Colors.white} />
              <Text style={styles.emptyAddBtnText}>Gebeurtenis toevoegen</Text>
            </Pressable>
          </View>
        ) : (
          <FlatList
            data={items}
            keyExtractor={(i) => i.id}
            renderItem={renderItem}
            style={[styles.list, listMinHeight !== undefined && { minHeight: listMinHeight }]}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          />
        )}
      </>
    ) : (
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.addKeyboard}
      >
        <View style={styles.sheetHeader}>
          <Pressable onPress={closeAdd} hitSlop={12} testID="agenda-add-back">
            <Ionicons name="chevron-back" size={26} color={Colors.primary} />
          </Pressable>
          <Text style={[styles.modalTitle, styles.addTitleCenter]}>
            Gebeurtenis toevoegen
          </Text>
          <View style={{ width: 26 }} />
        </View>
        <ScrollView
          style={styles.addScroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.fieldLabel}>Soort</Text>
          <View style={styles.typeChips}>
            {ADD_TYPE_OPTIONS.map((opt) => (
              <Pressable
                key={opt.value}
                style={[
                  styles.typeChip,
                  addType === opt.value && styles.typeChipActive,
                ]}
                onPress={() => {
                  Haptics.selectionAsync();
                  setAddType(opt.value);
                  setAddError("");
                  if (opt.value === "ouder_gesprek") {
                    setAgendaGesprekKind("normaal");
                  }
                }}
              >
                <Text
                  style={[
                    styles.typeChipText,
                    addType === opt.value && styles.typeChipTextActive,
                  ]}
                >
                  {opt.label}
                </Text>
              </Pressable>
            ))}
          </View>

          {(addType === "wedstrijd" || addType === "ouder_gesprek") && (
            <>
              <Text style={styles.fieldLabel}>Sporter</Text>
              <View style={styles.sporterBox}>
                {sporterChoices.length === 0 ? (
                  <Text style={styles.hintMuted}>
                    {onlyFavorieten
                      ? "Geen favorieten. Voeg sporters toe of wissel naar Alle Sporters."
                      : "Geen sporters. Voeg eerst een sporter toe."}
                  </Text>
                ) : (
                  sporterChoices.map((s) => (
                    <Pressable
                      key={s.id}
                      style={[
                        styles.sporterChip,
                        addSporterId === s.id && styles.sporterChipActive,
                      ]}
                      onPress={() => {
                        Haptics.selectionAsync();
                        setAddSporterId(s.id);
                        setAddError("");
                      }}
                    >
                      <Text
                        style={[
                          styles.sporterChipText,
                          addSporterId === s.id && styles.sporterChipTextActive,
                        ]}
                        numberOfLines={1}
                      >
                        {s.naam}
                      </Text>
                    </Pressable>
                  ))
                )}
              </View>
            </>
          )}

          {addType === "ouder_gesprek" && (
            <>
              <Text style={[styles.fieldLabel, styles.fieldLabelSpaced]}>Type gesprek</Text>
              <View style={styles.gesprekTypeRow}>
                <Pressable
                  style={[
                    styles.gesprekTypeBtn,
                    agendaGesprekKind === "normaal" && styles.gesprekTypeBtnActive,
                  ]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setAgendaGesprekKind("normaal");
                    setAddError("");
                  }}
                  testID="agenda-gesprek-type-normaal"
                >
                  <Text
                    style={[
                      styles.gesprekTypeBtnText,
                      agendaGesprekKind === "normaal" && styles.gesprekTypeBtnTextActive,
                    ]}
                  >
                    Gesprek
                  </Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.gesprekTypeBtn,
                    agendaGesprekKind === "pop" && styles.gesprekTypeBtnActive,
                  ]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setAgendaGesprekKind("pop");
                    setAddError("");
                  }}
                  testID="agenda-gesprek-type-pop"
                >
                  <Text
                    style={[
                      styles.gesprekTypeBtnText,
                      agendaGesprekKind === "pop" && styles.gesprekTypeBtnTextActive,
                    ]}
                  >
                    POP-gesprek
                  </Text>
                </Pressable>
              </View>
            </>
          )}

          {addType !== "ouder_gesprek" && (
            <>
              <Text style={[styles.fieldLabel, addType === "wedstrijd" ? undefined : styles.fieldLabelSpaced]}>
                Titel
              </Text>
              {addType === "wedstrijd" ? (
                <TextInput
                  style={styles.textInput}
                  value={addTitel}
                  onChangeText={(t) => {
                    setAddTitel(t);
                    setAddError("");
                  }}
                  placeholder="Wedstrijdnaam"
                  placeholderTextColor={Colors.textTertiary}
                  testID="agenda-add-titel"
                />
              ) : (
                <TextInput
                  style={styles.textInput}
                  value={addTitel}
                  onChangeText={(t) => {
                    setAddTitel(t);
                    setAddError("");
                  }}
                  placeholder="bijv. Meivakantie"
                  placeholderTextColor={Colors.textTertiary}
                  testID="agenda-add-titel"
                />
              )}
            </>
          )}

          <Text style={[styles.fieldLabel, styles.fieldLabelSpaced]}>Datum (DD-MM-JJJJ)</Text>
          <TextInput
            style={styles.textInput}
            value={addDatum}
            onChangeText={(t) => {
              setAddDatum(t);
              setAddError("");
            }}
            placeholder="bijv. 27-04-2026"
            placeholderTextColor={Colors.textTertiary}
            keyboardType="numbers-and-punctuation"
            maxLength={10}
            testID="agenda-add-datum"
          />

          <Text style={[styles.fieldLabel, styles.fieldLabelSpaced]}>Locatie (optioneel)</Text>
          <TextInput
            style={styles.textInput}
            value={addLocatie}
            onChangeText={setAddLocatie}
            placeholder={
              addType === "vrij" || addType === "feestdag" || addType === "overig"
                ? "Laat leeg bij feestdagen zonder locatie"
                : "Optioneel"
            }
            placeholderTextColor={Colors.textTertiary}
            testID="agenda-add-locatie"
          />

          <Text style={[styles.fieldLabel, styles.fieldLabelSpaced]}>Notitie (optioneel)</Text>
          <TextInput
            style={[styles.textInput, styles.textInputMultiline]}
            value={addNotitie}
            onChangeText={setAddNotitie}
            placeholder="Extra info, bv. geen training"
            placeholderTextColor={Colors.textTertiary}
            multiline
            testID="agenda-add-notitie"
          />

          {!!addError && <Text style={styles.errorText}>{addError}</Text>}

          <View style={styles.addActions}>
            <Pressable style={styles.cancelBtn} onPress={closeAdd} testID="agenda-add-cancel">
              <Text style={styles.cancelBtnText}>Annuleren</Text>
            </Pressable>
            <Pressable
              style={[styles.saveBtn, savingAdd && { opacity: 0.6 }]}
              onPress={() => void handleSaveAdd()}
              disabled={savingAdd}
              testID="agenda-add-save"
            >
              {savingAdd ? (
                <ActivityIndicator size="small" color={Colors.white} />
              ) : (
                <Text style={styles.saveBtnText}>Opslaan</Text>
              )}
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={phase === "add" ? closeAdd : onClose}
    >
      <View style={styles.modalOverlay}>
        <Pressable
          style={styles.modalBackdrop}
          onPress={phase === "add" ? closeAdd : onClose}
        />
        <View
          style={[
            styles.modalSheet,
            {
              paddingBottom: insets.bottom + webBottomInset + 16,
              maxHeight: WINDOW_H * 0.92,
            },
          ]}
        >
          <View style={styles.modalHandle} />
          {sheetContent}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: { flex: 1, justifyContent: "flex-end" },
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
  sheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    gap: 8,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  modalTitle: {
    flex: 1,
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  addTitleCenter: { textAlign: "center" },
  loadingBox: {
    minHeight: 120,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 24,
  },
  emptyBox: {
    alignItems: "center",
    paddingVertical: 28,
    paddingHorizontal: 12,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
    marginTop: 8,
    textAlign: "center",
  },
  emptySub: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
    textAlign: "center",
  },
  emptyAddBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 16,
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  emptyAddBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.white,
  },
  list: {
    flexGrow: 0,
    maxHeight: LIST_MAX_H,
  },
  listContent: { paddingBottom: 8 },
  row: {
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    marginBottom: 10,
  },
  rowPressed: { opacity: 0.92 },
  typeTag: {
    alignSelf: "flex-start",
    backgroundColor: Colors.primaryDark,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 8,
  },
  typeTagKalender: {
    backgroundColor: "#4A5568",
  },
  typeTagOuderPop: {
    backgroundColor: Colors.primaryDark,
  },
  typeTagOuderGesprek: {
    backgroundColor: "#5A5A5A",
  },
  typeTagText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: Colors.white,
    textTransform: "uppercase",
  },
  rowTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
    marginBottom: 10,
  },
  notitiePreview: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
    marginTop: 6,
    fontStyle: "italic",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  metaText: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  addKeyboard: { maxHeight: WINDOW_H * 0.78 },
  addScroll: { maxHeight: WINDOW_H * 0.62 },
  fieldLabel: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  fieldLabelSpaced: { marginTop: 14 },
  typeChips: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 4 },
  typeChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  typeChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  typeChipText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  typeChipTextActive: {
    color: Colors.white,
  },
  sporterBox: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 8 },
  sporterChip: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    maxWidth: "100%",
  },
  sporterChipActive: {
    backgroundColor: Colors.primaryDark,
    borderColor: Colors.primary,
  },
  sporterChipText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.text,
  },
  sporterChipTextActive: {
    color: Colors.white,
    fontFamily: "Inter_600SemiBold",
  },
  hintMuted: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
    marginBottom: 8,
  },
  gesprekTypeRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 4,
  },
  gesprekTypeBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    alignItems: "center",
  },
  gesprekTypeBtnActive: {
    borderColor: Colors.primary,
    backgroundColor: "#4A3820",
  },
  gesprekTypeBtnText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
    textAlign: "center",
  },
  gesprekTypeBtnTextActive: {
    color: Colors.primary,
    fontFamily: "Inter_600SemiBold",
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
  textInputMultiline: {
    minHeight: 72,
    textAlignVertical: "top",
  },
  errorText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.error,
    marginTop: 12,
  },
  addActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 24,
    marginBottom: 8,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  cancelBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
  },
  saveBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    backgroundColor: Colors.primary,
  },
  saveBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.white,
  },
});
