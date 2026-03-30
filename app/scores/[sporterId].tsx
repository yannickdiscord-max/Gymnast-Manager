import React, { useState, useCallback } from "react";
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
} from "react-native";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import {
  getSporter,
  getWedstrijden,
  addWedstrijd,
  deleteWedstrijd,
  TOESTELLEN,
  type Sporter,
  type Wedstrijd,
} from "@/lib/storage";

export default function ScoresScreen() {
  const { sporterId } = useLocalSearchParams<{ sporterId: string }>();
  const insets = useSafeAreaInsets();

  const [sporter, setSporter] = useState<Sporter | null>(null);
  const [wedstrijden, setWedstrijden] = useState<Wedstrijd[]>([]);
  const [loading, setLoading] = useState(true);

  const [modalVisible, setModalVisible] = useState(false);
  const [naam, setNaam] = useState("");
  const [datum, setDatum] = useState("");
  const [locatie, setLocatie] = useState("");
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const webBottomInset = Platform.OS === "web" ? 34 : 0;

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [sporterId])
  );

  const loadData = async () => {
    if (!sporterId) return;
    setLoading(true);
    const [sporterData, wedstrijdenData] = await Promise.all([
      getSporter(sporterId),
      getWedstrijden(sporterId),
    ]);
    setSporter(sporterData || null);
    setWedstrijden(wedstrijdenData);
    setLoading(false);
  };

  const handleOpenModal = () => {
    setNaam("");
    setDatum("");
    setLocatie("");
    setErrorMsg("");
    setModalVisible(true);
  };

  const isValidEuropeanDate = (val: string): boolean => {
    const match = val.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
    if (!match) return false;
    const day = parseInt(match[1]);
    const month = parseInt(match[2]);
    const year = parseInt(match[3]);
    if (month < 1 || month > 12) return false;
    if (day < 1) return false;
    const date = new Date(year, month - 1, day);
    return (
      date.getFullYear() === year &&
      date.getMonth() === month - 1 &&
      date.getDate() === day
    );
  };

  const handleSave = async () => {
    if (!naam.trim()) { setErrorMsg("Vul een wedstrijdnaam in"); return; }
    if (!datum.trim()) { setErrorMsg("Vul een datum in"); return; }
    if (!isValidEuropeanDate(datum.trim())) {
      setErrorMsg("Datum moet DD-MM-JJJJ zijn (bijv. 14-03-2025)");
      return;
    }
    if (!locatie.trim()) { setErrorMsg("Vul een locatie in"); return; }

    setSaving(true);
    const wedstrijd = await addWedstrijd(sporterId!, naam.trim(), datum.trim(), locatie.trim());
    setWedstrijden((prev) =>
      [...prev, wedstrijd].sort((a, b) => {
        const parse = (d: string) => {
          const [dd, mm, yyyy] = d.split("-").map(Number);
          return new Date(yyyy, mm - 1, dd).getTime();
        };
        return parse(b.datum) - parse(a.datum);
      })
    );
    setSaving(false);
    setModalVisible(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    router.push({ pathname: "/wedstrijd/[wedstrijdId]", params: { wedstrijdId: wedstrijd.id } });
  };

  const handleDelete = (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setConfirmDeleteId(id);
  };

  const doConfirmedDelete = async () => {
    if (!confirmDeleteId) return;
    const id = confirmDeleteId;
    setConfirmDeleteId(null);
    await deleteWedstrijd(id);
    setWedstrijden((prev) => prev.filter((w) => w.id !== id));
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  };

  const getTotaalScore = (wedstrijd: Wedstrijd) => {
    return TOESTELLEN.reduce((sum, t) => {
      const s = wedstrijd.scores[t];
      if (!s) return sum;
      return sum + s.dScore + s.eScore - s.penalty;
    }, 0);
  };

  const getIngevuldCount = (wedstrijd: Wedstrijd) =>
    TOESTELLEN.filter((t) => wedstrijd.scores[t] !== undefined).length;

  if (loading) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: insets.top + webTopInset }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const renderWedstrijd = ({ item }: { item: Wedstrijd }) => {
    const ingevuld = getIngevuldCount(item);
    const totaal = getTotaalScore(item);
    return (
      <Pressable
        style={({ pressed }) => [styles.wedstrijdItem, pressed && styles.itemPressed]}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          router.push({ pathname: "/wedstrijd/[wedstrijdId]", params: { wedstrijdId: item.id } });
        }}
        testID={`wedstrijd-${item.id}`}
      >
        <View style={styles.wedstrijdLeft}>
          <Text style={styles.wedstrijdNaam} numberOfLines={1}>{item.naam}</Text>
          <View style={styles.wedstrijdMeta}>
            <Ionicons name="calendar-outline" size={13} color={Colors.textTertiary} />
            <Text style={styles.wedstrijdMetaText}>{item.datum}</Text>
            <View style={styles.metaDivider} />
            <Ionicons name="location-outline" size={13} color={Colors.textTertiary} />
            <Text style={styles.wedstrijdMetaText}>{item.locatie}</Text>
          </View>
        </View>
        <View style={styles.wedstrijdRight}>
          {ingevuld === TOESTELLEN.length ? (
            <View style={styles.totaalBadge}>
              <Text style={styles.totaalText}>{totaal.toFixed(2)}</Text>
            </View>
          ) : (
            <Text style={styles.ingevuldText}>{ingevuld}/{TOESTELLEN.length}</Text>
          )}
          <Pressable onPress={() => handleDelete(item.id)} hitSlop={8} testID={`delete-wedstrijd-${item.id}`}>
            <Ionicons name="trash-outline" size={18} color={Colors.error} />
          </Pressable>
          <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
        </View>
      </Pressable>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTopInset }]}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.push({ pathname: "/sporter/[id]", params: { id: sporterId! } })}
          hitSlop={12}
          testID="back-btn"
        >
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Wedstrijdscores</Text>
          {sporter && <Text style={styles.headerSub}>{sporter.naam}</Text>}
        </View>
        <View style={{ width: 24 }} />
      </View>

      <FlatList
        data={wedstrijden}
        keyExtractor={(item) => item.id}
        renderItem={renderWedstrijd}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + webBottomInset + 100 },
        ]}
        showsVerticalScrollIndicator={false}
        scrollEnabled={true}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="trophy-outline" size={48} color={Colors.textTertiary} />
            <Text style={styles.emptyTitle}>Geen wedstrijden</Text>
            <Text style={styles.emptyText}>Voeg de eerste wedstrijd toe</Text>
          </View>
        }
      />

      <View style={[styles.footer, { paddingBottom: insets.bottom + webBottomInset + 16 }]}>
        <Pressable
          style={({ pressed }) => [styles.addButton, pressed && styles.addButtonPressed]}
          onPress={handleOpenModal}
          testID="add-wedstrijd-btn"
        >
          <Ionicons name="add" size={22} color={Colors.white} />
          <Text style={styles.addButtonText}>Wedstrijd toevoegen</Text>
        </Pressable>
      </View>

      <Modal
        visible={confirmDeleteId !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setConfirmDeleteId(null)}
      >
        <Pressable style={styles.confirmBackdrop} onPress={() => setConfirmDeleteId(null)}>
          <Pressable style={styles.confirmDialog} onPress={() => {}}>
            <View style={styles.confirmIconWrap}>
              <Ionicons name="trash-outline" size={28} color={Colors.error} />
            </View>
            <Text style={styles.confirmTitle}>Wedstrijd verwijderen</Text>
            <Text style={styles.confirmBody}>
              Weet je zeker dat je deze wedstrijd definitief wilt verwijderen? Dit kan niet ongedaan worden gemaakt.
            </Text>
            <View style={styles.confirmActions}>
              <Pressable
                style={styles.confirmCancelBtn}
                onPress={() => setConfirmDeleteId(null)}
                testID="confirm-cancel-btn"
              >
                <Text style={styles.confirmCancelText}>Annuleren</Text>
              </Pressable>
              <Pressable
                style={styles.confirmDeleteBtn}
                onPress={doConfirmedDelete}
                testID="confirm-delete-btn"
              >
                <Text style={styles.confirmDeleteText}>Verwijderen</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <Pressable style={styles.modalBackdrop} onPress={() => setModalVisible(false)} />
          <View style={[styles.modalSheet, { paddingBottom: insets.bottom + webBottomInset + 16 }]}>
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Wedstrijd toevoegen</Text>

            <Text style={styles.fieldLabel}>Wedstrijdnaam</Text>
            <TextInput
              style={styles.textInput}
              value={naam}
              onChangeText={(t) => { setNaam(t); setErrorMsg(""); }}
              placeholder="bijv. Regiokampioenschap"
              placeholderTextColor={Colors.textTertiary}
              autoFocus
              testID="naam-input"
            />

            <Text style={[styles.fieldLabel, { marginTop: 14 }]}>Datum (DD-MM-JJJJ)</Text>
            <TextInput
              style={styles.textInput}
              value={datum}
              onChangeText={(t) => { setDatum(t); setErrorMsg(""); }}
              placeholder="bijv. 14-03-2025"
              placeholderTextColor={Colors.textTertiary}
              keyboardType="numbers-and-punctuation"
              maxLength={10}
              testID="datum-input"
            />

            <Text style={[styles.fieldLabel, { marginTop: 14 }]}>Locatie</Text>
            <TextInput
              style={styles.textInput}
              value={locatie}
              onChangeText={(t) => { setLocatie(t); setErrorMsg(""); }}
              placeholder="bijv. Sporthal De Kolk"
              placeholderTextColor={Colors.textTertiary}
              testID="locatie-input"
            />

            {!!errorMsg && <Text style={styles.errorText}>{errorMsg}</Text>}

            <View style={styles.modalActions}>
              <Pressable style={styles.cancelBtn} onPress={() => setModalVisible(false)} testID="cancel-btn">
                <Text style={styles.cancelBtnText}>Annuleren</Text>
              </Pressable>
              <Pressable
                style={[styles.saveBtn, saving && { opacity: 0.6 }]}
                onPress={handleSave}
                disabled={saving}
                testID="save-btn"
              >
                {saving
                  ? <ActivityIndicator size="small" color={Colors.white} />
                  : <Text style={styles.saveBtnText}>Toevoegen</Text>}
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
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
  headerCenter: { alignItems: "center" },
  headerTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", color: Colors.text },
  headerSub: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textTertiary, marginTop: 2 },
  listContent: { paddingHorizontal: 20, paddingTop: 4, gap: 10 },
  wedstrijdItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  itemPressed: { backgroundColor: Colors.surfaceSecondary, transform: [{ scale: 0.98 }] },
  wedstrijdLeft: { flex: 1, marginRight: 12 },
  wedstrijdNaam: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: Colors.text },
  wedstrijdMeta: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  wedstrijdMetaText: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.textTertiary },
  metaDivider: { width: 1, height: 12, backgroundColor: Colors.border, marginHorizontal: 4 },
  wedstrijdRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  totaalBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  totaalText: { fontSize: 14, fontFamily: "Inter_700Bold", color: Colors.white },
  ingevuldText: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.textTertiary },
  emptyContainer: { alignItems: "center", paddingTop: 80, gap: 8 },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary, marginTop: 8 },
  emptyText: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.textTertiary },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: Colors.background,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 14,
  },
  addButtonPressed: { backgroundColor: Colors.primaryDark, transform: [{ scale: 0.98 }] },
  addButtonText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: Colors.white },
  modalOverlay: { flex: 1, justifyContent: "flex-end" },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.5)" },
  modalSheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  modalHandle: {
    width: 40, height: 4, borderRadius: 2,
    backgroundColor: Colors.borderLight, alignSelf: "center", marginBottom: 20,
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
  errorText: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.error, marginTop: 8 },
  confirmBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  confirmDialog: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 24,
    width: "100%",
    alignItems: "center",
  },
  confirmIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(248,113,113,0.15)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  confirmTitle: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
    marginBottom: 10,
    textAlign: "center",
  },
  confirmBody: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 24,
  },
  confirmActions: { flexDirection: "row", gap: 12, width: "100%" },
  confirmCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: "center",
  },
  confirmCancelText: { fontSize: 15, fontFamily: "Inter_500Medium", color: Colors.textSecondary },
  confirmDeleteBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.error,
    alignItems: "center",
  },
  confirmDeleteText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.white },
  modalActions: { flexDirection: "row", gap: 12, marginTop: 24 },
  cancelBtn: {
    flex: 1, paddingVertical: 14, borderRadius: 12,
    backgroundColor: Colors.surfaceSecondary, alignItems: "center",
  },
  cancelBtnText: { fontSize: 15, fontFamily: "Inter_500Medium", color: Colors.textSecondary },
  saveBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: Colors.primary, alignItems: "center" },
  saveBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.white },
});
