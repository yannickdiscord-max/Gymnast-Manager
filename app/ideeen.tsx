import React, { useCallback, useState } from "react";
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
  Alert,
  ScrollView,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import {
  getIdeeen,
  addIdee,
  deleteIdee,
  IDEE_CATEGORIEEN,
  IDEE_CATEGORIE_LABELS,
  MISSING_IDEE_NAAM,
  MISSING_IDEE_UITLEG,
  type Idee,
  type IdeeCategorie,
} from "@/lib/storage";

export default function IdeeenScreen() {
  const insets = useSafeAreaInsets();
  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const webBottomInset = Platform.OS === "web" ? 34 : 0;

  const [categorie, setCategorie] = useState<IdeeCategorie>("spel");
  const [items, setItems] = useState<Idee[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailItem, setDetailItem] = useState<Idee | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addNaam, setAddNaam] = useState("");
  const [addUitleg, setAddUitleg] = useState("");
  const [addError, setAddError] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async (cat: IdeeCategorie) => {
    setLoading(true);
    try {
      setItems(await getIdeeen(cat));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load(categorie);
    }, [categorie, load]),
  );

  const selectCategorie = (cat: IdeeCategorie) => {
    if (cat === categorie) return;
    Haptics.selectionAsync();
    setCategorie(cat);
  };

  const openDetail = (item: Idee) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setDetailItem(item);
  };

  const closeDetail = () => {
    Haptics.selectionAsync();
    setDetailItem(null);
  };

  const handleGenerate = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (items.length === 0) {
      Alert.alert(
        "Geen ideeën",
        `Voeg eerst een ${IDEE_CATEGORIE_LABELS[categorie].toLowerCase()} toe.`,
      );
      return;
    }
    const pick = items[Math.floor(Math.random() * items.length)];
    setDetailItem(pick);
  };

  const openAdd = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setAddNaam("");
    setAddUitleg("");
    setAddError("");
    setAddOpen(true);
  };

  const closeAdd = () => {
    Haptics.selectionAsync();
    setAddOpen(false);
    setAddError("");
  };

  const handleSaveAdd = async () => {
    setAddError("");
    if (!addNaam.trim()) {
      setAddError("Vul een naam in.");
      return;
    }
    if (!addUitleg.trim()) {
      setAddError("Vul een uitleg in.");
      return;
    }
    setSaving(true);
    try {
      await addIdee(addNaam.trim(), addUitleg.trim(), categorie);
      setAddOpen(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await load(categorie);
    } catch (e) {
      if (e instanceof Error && e.message === MISSING_IDEE_NAAM) {
        setAddError("Vul een naam in.");
      } else if (e instanceof Error && e.message === MISSING_IDEE_UITLEG) {
        setAddError("Vul een uitleg in.");
      } else {
        setAddError("Opslaan mislukt.");
      }
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (item: Idee) => {
    Alert.alert(
      "Idee verwijderen?",
      `Weet je zeker dat je "${item.naam}" wilt verwijderen?`,
      [
        { text: "Annuleren", style: "cancel" },
        {
          text: "Verwijderen",
          style: "destructive",
          onPress: () => void handleDelete(item),
        },
      ],
    );
  };

  const handleDelete = async (item: Idee) => {
    try {
      await deleteIdee(item.id);
      if (detailItem?.id === item.id) setDetailItem(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await load(categorie);
    } catch {
      Alert.alert("Fout", "Verwijderen mislukt.");
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTopInset }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} testID="back-btn">
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Random idee</Text>
        </View>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.categoryRow}>
        {IDEE_CATEGORIEEN.map((cat) => {
          const active = categorie === cat;
          return (
            <Pressable
              key={cat}
              style={[styles.categoryChip, active && styles.categoryChipActive]}
              onPress={() => selectCategorie(cat)}
              testID={`idee-categorie-${cat}`}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  active && styles.categoryChipTextActive,
                ]}
              >
                {IDEE_CATEGORIE_LABELS[cat]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable
        style={({ pressed }) => [
          styles.generateBtn,
          pressed && styles.generateBtnPressed,
        ]}
        onPress={handleGenerate}
        testID="idee-generate-btn"
      >
        <Ionicons name="shuffle-outline" size={22} color={Colors.white} />
        <Text style={styles.generateBtnText}>Genereer idee</Text>
      </Pressable>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: insets.bottom + webBottomInset + 100 },
          ]}
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [
                styles.row,
                pressed && styles.rowPressed,
              ]}
              onPress={() => openDetail(item)}
              onLongPress={() => confirmDelete(item)}
              testID={`idee-row-${item.id}`}
            >
              <Text style={styles.rowNaam} numberOfLines={2}>
                {item.naam}
              </Text>
              <Pressable
                onPress={() => confirmDelete(item)}
                hitSlop={10}
                testID={`idee-delete-${item.id}`}
                accessibilityRole="button"
                accessibilityLabel="Verwijderen"
              >
                <Ionicons name="trash-outline" size={20} color={Colors.error} />
              </Pressable>
            </Pressable>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons name="bulb-outline" size={44} color={Colors.textTertiary} />
              <Text style={styles.emptyTitle}>Nog geen ideeën</Text>
              <Text style={styles.emptyText}>
                Voeg een {IDEE_CATEGORIE_LABELS[categorie].toLowerCase()} toe met
                de knop hieronder.
              </Text>
            </View>
          }
        />
      )}

      <View style={[styles.footer, { paddingBottom: insets.bottom + webBottomInset + 16 }]}>
        <Pressable
          style={({ pressed }) => [styles.addBtn, pressed && styles.addBtnPressed]}
          onPress={openAdd}
          testID="idee-add-btn"
        >
          <Ionicons name="add" size={22} color={Colors.white} />
          <Text style={styles.addBtnText}>Idee toevoegen</Text>
        </Pressable>
      </View>

      <Modal
        visible={detailItem !== null}
        transparent
        animationType="fade"
        onRequestClose={closeDetail}
      >
        <View style={styles.popupOverlay}>
          <Pressable style={styles.popupBackdrop} onPress={closeDetail} />
          <View style={styles.popupCard}>
            <View style={styles.popupHeader}>
              <Text style={styles.popupCategory}>
                {detailItem
                  ? IDEE_CATEGORIE_LABELS[detailItem.categorie]
                  : ""}
              </Text>
              <Pressable onPress={closeDetail} hitSlop={12} testID="idee-detail-close">
                <Ionicons name="close" size={24} color={Colors.textSecondary} />
              </Pressable>
            </View>
            <ScrollView
              style={styles.popupScroll}
              showsVerticalScrollIndicator={false}
            >
              <Text style={styles.popupTitle}>{detailItem?.naam}</Text>
              <Text style={styles.popupBody}>
                {detailItem?.uitleg.trim()
                  ? detailItem.uitleg
                  : "Geen uitleg toegevoegd."}
              </Text>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={addOpen}
        transparent
        animationType="slide"
        onRequestClose={closeAdd}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <Pressable style={styles.modalBackdrop} onPress={closeAdd} />
          <View
            style={[
              styles.modalSheet,
              { paddingBottom: insets.bottom + webBottomInset + 16 },
            ]}
          >
            <View style={styles.modalHandle} />
            <Text style={styles.modalTitle}>
              {IDEE_CATEGORIE_LABELS[categorie]} toevoegen
            </Text>

            <Text style={styles.fieldLabel}>Naam</Text>
            <TextInput
              style={styles.textInput}
              value={addNaam}
              onChangeText={(t) => {
                setAddNaam(t);
                setAddError("");
              }}
              placeholder="bijv. Estafette of armcirkels"
              placeholderTextColor={Colors.textTertiary}
              autoFocus
              testID="idee-add-naam"
            />

            <Text style={[styles.fieldLabel, styles.fieldLabelSpaced]}>
              Uitleg
            </Text>
            <TextInput
              style={[styles.textInput, styles.textInputMultiline]}
              value={addUitleg}
              onChangeText={setAddUitleg}
              placeholder="Korte beschrijving van het idee"
              placeholderTextColor={Colors.textTertiary}
              multiline
              testID="idee-add-uitleg"
            />

            {!!addError && <Text style={styles.errorText}>{addError}</Text>}

            <View style={styles.addActions}>
              <Pressable
                style={styles.cancelBtn}
                onPress={closeAdd}
                testID="idee-add-cancel"
              >
                <Text style={styles.cancelBtnText}>Annuleren</Text>
              </Pressable>
              <Pressable
                style={[styles.saveBtn, saving && { opacity: 0.6 }]}
                onPress={() => void handleSaveAdd()}
                disabled={saving}
                testID="idee-add-save"
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
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  categoryRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  categoryChip: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  categoryChipActive: {
    backgroundColor: "#4A3820",
    borderColor: Colors.primary,
  },
  categoryChipText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
  },
  categoryChipTextActive: {
    color: Colors.primary,
  },
  generateBtn: {
    marginHorizontal: 20,
    marginBottom: 16,
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  generateBtnPressed: {
    backgroundColor: Colors.primaryDark,
    transform: [{ scale: 0.98 }],
  },
  generateBtnText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: Colors.white,
  },
  loadingBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: {
    paddingHorizontal: 20,
    gap: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 12,
  },
  rowPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  rowNaam: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  empty: {
    paddingTop: 48,
    alignItems: "center",
    paddingHorizontal: 24,
  },
  emptyTitle: {
    marginTop: 12,
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  emptyText: {
    marginTop: 6,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
    textAlign: "center",
  },
  footer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
  },
  addBtn: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  addBtnPressed: {
    backgroundColor: Colors.primaryDark,
    transform: [{ scale: 0.98 }],
  },
  addBtnText: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    color: Colors.white,
  },
  popupOverlay: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  popupBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.55)",
  },
  popupCard: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    padding: 20,
    maxHeight: "70%",
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  popupHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  popupCategory: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.primary,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  popupScroll: {
    maxHeight: 320,
  },
  popupTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    marginBottom: 12,
  },
  popupBody: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    lineHeight: 24,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
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
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    marginBottom: 16,
  },
  fieldLabel: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  fieldLabelSpaced: {
    marginTop: 16,
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
    minHeight: 110,
    textAlignVertical: "top",
  },
  errorText: {
    marginTop: 10,
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.error,
  },
  addActions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
  },
  cancelBtn: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
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
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.primary,
  },
  saveBtnText: {
    fontSize: 15,
    fontFamily: "Inter_700Bold",
    color: Colors.white,
  },
});
