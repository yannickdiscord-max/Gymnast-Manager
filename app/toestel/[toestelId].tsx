import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
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
  updateSporterOnderdelen,
  getSortedOnderdelen,
  getOnderdelenForNiveau,
  getCustomOnderdelen,
  addCustomOnderdeel,
  deleteCustomOnderdeel,
  TURN_ONDERDEEL_NIVEAUS,
  type Sporter,
  type Toestel,
  type TurnOnderdeelNiveau,
  type TurnOnderdeel,
} from "@/lib/storage";

export default function ToestelScreen() {
  const { toestelId, sporterId } = useLocalSearchParams<{
    toestelId: string;
    sporterId: string;
  }>();
  const insets = useSafeAreaInsets();
  const [sporter, setSporter] = useState<Sporter | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<TurnOnderdeelNiveau | null>(null);
  const [customOnderdelen, setCustomOnderdelen] = useState<TurnOnderdeel[]>([]);

  const [addModalVisible, setAddModalVisible] = useState(false);
  const [newNaam, setNewNaam] = useState("");
  const [newNiveau, setNewNiveau] = useState<TurnOnderdeelNiveau>("A");
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const webBottomInset = Platform.OS === "web" ? 34 : 0;

  const toestel = toestelId as Toestel;

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [sporterId, toestelId])
  );

  const loadData = async () => {
    if (!sporterId) return;
    setLoading(true);
    const [data, custom] = await Promise.all([
      getSporter(sporterId),
      getCustomOnderdelen(toestel),
    ]);
    setSporter(data || null);
    setCustomOnderdelen(custom);
    setLoading(false);
  };

  const handleToggleOnderdeel = async (onderdeelNaam: string) => {
    if (!sporter) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const current = sporter.onderdelen[toestel] || [];
    const updated = current.includes(onderdeelNaam)
      ? current.filter((o) => o !== onderdeelNaam)
      : [...current, onderdeelNaam];

    await updateSporterOnderdelen(sporter.id, toestel, updated);
    setSporter({
      ...sporter,
      onderdelen: { ...sporter.onderdelen, [toestel]: updated },
    });
  };

  const handleFilterPress = (niveau: TurnOnderdeelNiveau) => {
    Haptics.selectionAsync();
    setActiveFilter((prev) => (prev === niveau ? null : niveau));
  };

  const handleOpenAddModal = () => {
    setNewNaam("");
    setNewNiveau("A");
    setErrorMsg("");
    setAddModalVisible(true);
  };

  const handleSaveCustom = async () => {
    const trimmed = newNaam.trim();
    if (!trimmed) {
      setErrorMsg("Vul een naam in");
      return;
    }

    const allOnderdelen = [
      ...getSortedOnderdelen(toestel),
      ...customOnderdelen,
    ];
    const duplicate = allOnderdelen.some(
      (o) => o.naam.toLowerCase() === trimmed.toLowerCase()
    );
    if (duplicate) {
      setErrorMsg("Dit onderdeel bestaat al");
      return;
    }

    setSaving(true);
    const onderdeel: TurnOnderdeel = { naam: trimmed, niveau: newNiveau };
    await addCustomOnderdeel(toestel, onderdeel);
    const updated = await getCustomOnderdelen(toestel);
    setCustomOnderdelen(updated);
    setSaving(false);
    setAddModalVisible(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleDeleteCustom = async (naam: string) => {
    await deleteCustomOnderdeel(toestel, naam);
    const updated = await getCustomOnderdelen(toestel);
    setCustomOnderdelen(updated);

    if (sporter) {
      const current = sporter.onderdelen[toestel] || [];
      if (current.includes(naam)) {
        const filtered = current.filter((o) => o !== naam);
        await updateSporterOnderdelen(sporter.id, toestel, filtered);
        setSporter({
          ...sporter,
          onderdelen: { ...sporter.onderdelen, [toestel]: filtered },
        });
      }
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const standardOnderdelen = activeFilter
    ? getOnderdelenForNiveau(toestel, activeFilter)
    : getSortedOnderdelen(toestel);

  const filteredCustom = activeFilter
    ? customOnderdelen.filter((o) => o.niveau === activeFilter)
    : customOnderdelen;

  const displayOnderdelen: TurnOnderdeel[] = [
    ...standardOnderdelen,
    ...filteredCustom,
  ];

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

  const renderOnderdeel = ({ item }: { item: TurnOnderdeel }) => {
    const isSelected = selected.includes(item.naam);
    const isCustom = customOnderdelen.some((o) => o.naam === item.naam);
    return (
      <Pressable
        style={[
          styles.onderdeelItem,
          isSelected && styles.onderdeelItemSelected,
        ]}
        onPress={() => handleToggleOnderdeel(item.naam)}
        testID={`onderdeel-${item.naam}`}
      >
        <Ionicons
          name={isSelected ? "checkmark-circle" : "ellipse-outline"}
          size={22}
          color={isSelected ? Colors.primary : Colors.textTertiary}
        />
        <View style={styles.onderdeelInfo}>
          <Text
            style={[
              styles.onderdeelText,
              isSelected && styles.onderdeelTextSelected,
            ]}
          >
            {item.naam}
          </Text>
        </View>
        <View style={[styles.niveauTag, getNiveauTagStyle(item.niveau)]}>
          <Text style={[styles.niveauTagText, getNiveauTagTextStyle(item.niveau)]}>
            {item.niveau}
          </Text>
        </View>
        {isCustom && (
          <Pressable
            onPress={() => handleDeleteCustom(item.naam)}
            hitSlop={8}
            testID={`delete-custom-${item.naam}`}
          >
            <Ionicons name="trash-outline" size={18} color={Colors.textTertiary} />
          </Pressable>
        )}
      </Pressable>
    );
  };

  const ListFooter = () => (
    <Pressable
      style={styles.addButton}
      onPress={handleOpenAddModal}
      testID="add-onderdeel-btn"
    >
      <Ionicons name="add-circle-outline" size={20} color={Colors.primary} />
      <Text style={styles.addButtonText}>Onderdeel toevoegen</Text>
    </Pressable>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTopInset }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} testID="back-btn">
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>{toestel}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
        style={styles.filterScroll}
      >
        {TURN_ONDERDEEL_NIVEAUS.map((niveau) => {
          const isActive = activeFilter === niveau;
          return (
            <Pressable
              key={niveau}
              style={[
                styles.filterChip,
                isActive && styles.filterChipActive,
              ]}
              onPress={() => handleFilterPress(niveau)}
              testID={`filter-${niveau}`}
            >
              <Text
                style={[
                  styles.filterChipText,
                  isActive && styles.filterChipTextActive,
                ]}
              >
                {niveau}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

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
        ListEmptyComponent={
          activeFilter ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="fitness-outline" size={40} color={Colors.textTertiary} />
              <Text style={styles.emptyText}>
                Geen onderdelen voor niveau {activeFilter}
              </Text>
            </View>
          ) : null
        }
        ListFooterComponent={<ListFooter />}
      />

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
          <Pressable
            style={styles.modalBackdrop}
            onPress={() => setAddModalVisible(false)}
          />
          <View
            style={[
              styles.modalSheet,
              { paddingBottom: insets.bottom + webBottomInset + 16 },
            ]}
          >
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>Onderdeel toevoegen</Text>

            <Text style={styles.fieldLabel}>Naam</Text>
            <TextInput
              style={styles.textInput}
              value={newNaam}
              onChangeText={(t) => {
                setNewNaam(t);
                setErrorMsg("");
              }}
              placeholder="bijv. Salto gestrekt"
              placeholderTextColor={Colors.textTertiary}
              autoFocus
              testID="custom-naam-input"
            />
            {!!errorMsg && (
              <Text style={styles.errorText}>{errorMsg}</Text>
            )}

            <Text style={[styles.fieldLabel, { marginTop: 16 }]}>Niveau</Text>
            <View style={styles.niveauRow}>
              {TURN_ONDERDEEL_NIVEAUS.map((n) => (
                <Pressable
                  key={n}
                  style={[
                    styles.niveauOption,
                    newNiveau === n && styles.niveauOptionActive,
                  ]}
                  onPress={() => setNewNiveau(n)}
                  testID={`select-niveau-${n}`}
                >
                  <Text
                    style={[
                      styles.niveauOptionText,
                      newNiveau === n && styles.niveauOptionTextActive,
                    ]}
                  >
                    {n}
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
                onPress={handleSaveCustom}
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
    tA: { backgroundColor: "#F0F9FF", borderColor: "#BAE6FD" },
    A: { backgroundColor: "#F0FDF4", borderColor: "#BBF7D0" },
    B: { backgroundColor: "#FEFCE8", borderColor: "#FEF08A" },
    C: { backgroundColor: "#FFF7ED", borderColor: "#FED7AA" },
    D: { backgroundColor: "#FEF2F2", borderColor: "#FECACA" },
    E: { backgroundColor: "#FAF5FF", borderColor: "#E9D5FF" },
  };
  return map[niveau] || {};
}

function getNiveauTagTextStyle(niveau: TurnOnderdeelNiveau) {
  const map: Record<TurnOnderdeelNiveau, object> = {
    tA: { color: "#0369A1" },
    A: { color: "#15803D" },
    B: { color: "#A16207" },
    C: { color: "#C2410C" },
    D: { color: "#DC2626" },
    E: { color: "#7C3AED" },
  };
  return map[niveau] || {};
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  center: {
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  filterScroll: {
    flexGrow: 0,
    marginBottom: 12,
  },
  filterRow: {
    paddingHorizontal: 20,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterChipText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
  },
  filterChipTextActive: {
    color: Colors.white,
  },
  listContent: {
    paddingHorizontal: 20,
    gap: 8,
    paddingTop: 4,
  },
  onderdeelItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: Colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  onderdeelItemSelected: {
    backgroundColor: "#F0FDFA",
    borderColor: "#CCFBF1",
  },
  onderdeelInfo: {
    flex: 1,
  },
  onderdeelText: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  onderdeelTextSelected: {
    fontFamily: "Inter_500Medium",
    color: Colors.primaryDark,
  },
  niveauTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  niveauTagText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  emptyContainer: {
    alignItems: "center",
    paddingTop: 60,
    gap: 8,
  },
  emptyText: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
    textAlign: "center",
  },
  errorTitle: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
  },
  backLink: {
    fontSize: 16,
    fontFamily: "Inter_500Medium",
    color: Colors.primary,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 16,
    marginTop: 4,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderStyle: "dashed",
  },
  addButtonText: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
    color: Colors.primary,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
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
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
    marginBottom: 20,
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
  errorText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "#DC2626",
    marginTop: 6,
  },
  niveauRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  niveauOption: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  niveauOptionActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  niveauOptionText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
  },
  niveauOptionTextActive: {
    color: Colors.white,
  },
  modalActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 24,
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
