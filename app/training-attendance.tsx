import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  FlatList,
  TextInput,
  ActivityIndicator,
  Platform,
  Alert,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import {
  getSporters,
  addTrainingSession,
  DUPLICATE_TRAINING_SESSION_ERROR,
  INVALID_TRAINING_SESSION_DATUM,
  NIVEAUS,
  type Sporter,
} from "@/lib/storage";

function formatTodayEuropean(): string {
  const d = new Date();
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yyyy = d.getFullYear();
  return `${dd}-${mm}-${yyyy}`;
}

export default function TrainingAttendanceScreen() {
  const insets = useSafeAreaInsets();
  const [sporters, setSporters] = useState<Sporter[]>([]);
  const [loading, setLoading] = useState(true);
  const [datum, setDatum] = useState(formatTodayEuropean);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const webBottomInset = Platform.OS === "web" ? 34 : 0;

  useFocusEffect(
    useCallback(() => {
      loadSporters();
    }, [])
  );

  const loadSporters = async () => {
    setLoading(true);
    const data = await getSporters();
    setSporters(data);
    setLoading(false);
  };

  const sortSporters = (list: Sporter[]) =>
    [...list].sort((a, b) => {
      const niveauDiff = NIVEAUS.indexOf(a.niveau) - NIVEAUS.indexOf(b.niveau);
      if (niveauDiff !== 0) return niveauDiff;
      return a.naam.localeCompare(b.naam);
    });

  const toggleSporter = (id: string) => {
    Haptics.selectionAsync();
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await addTrainingSession(datum, Array.from(selected));
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (e) {
      if (e instanceof Error && e.message === DUPLICATE_TRAINING_SESSION_ERROR) {
        Alert.alert(
          "Training bestaat al",
          "Er is al een training opgeslagen voor deze datum. Kies een andere datum of bewerk de bestaande registratie later als die functie beschikbaar is."
        );
      } else if (e instanceof Error && e.message === INVALID_TRAINING_SESSION_DATUM) {
        Alert.alert(
          "Ongeldige datum",
          "Gebruik het formaat DD-MM-JJJJ (bijv. 24-04-2026)."
        );
      } else {
        Alert.alert("Opslaan mislukt", "Er ging iets mis bij het opslaan van de training.");
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

  const sorted = sortSporters(sporters);

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTopInset }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} testID="back-btn">
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Training — aanwezigheid</Text>
          <Text style={styles.headerSub}>Selecteer de aanwezige sporters</Text>
        </View>
        <View style={styles.headerRightPlaceholder} />
      </View>

      <View style={styles.dateBlock}>
        <Text style={styles.fieldLabel}>Datum training (DD-MM-JJJJ)</Text>
        <TextInput
          style={styles.textInput}
          value={datum}
          onChangeText={setDatum}
          placeholder="24-04-2026"
          placeholderTextColor={Colors.textTertiary}
          keyboardType="numbers-and-punctuation"
          maxLength={10}
          testID="training-datum-input"
        />
      </View>

      <FlatList
        data={sorted}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + webBottomInset + 100 },
        ]}
        renderItem={({ item }) => {
          const on = selected.has(item.id);
          return (
            <Pressable
              style={({ pressed }) => [
                styles.row,
                on && styles.rowSelected,
                pressed && styles.rowPressed,
              ]}
              onPress={() => toggleSporter(item.id)}
              testID={`attendance-sporter-${item.id}`}
            >
              <View style={styles.rowLeft}>
                <View style={[styles.checkbox, on && styles.checkboxOn]}>
                  {on && <Ionicons name="checkmark" size={16} color={Colors.white} />}
                </View>
                <View style={styles.rowText}>
                  <Text style={styles.rowNaam} numberOfLines={1}>
                    {item.naam}
                  </Text>
                  <Text style={styles.rowNiveau}>{item.niveau}</Text>
                </View>
              </View>
            </Pressable>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Geen sporters om te markeren.</Text>
          </View>
        }
      />

      <View style={[styles.footer, { paddingBottom: insets.bottom + webBottomInset + 16 }]}>
        <Pressable
          style={({ pressed }) => [
            styles.saveButton,
            pressed && styles.saveButtonPressed,
            saving && { opacity: 0.6 },
          ]}
          onPress={handleSave}
          disabled={saving || sorted.length === 0}
          testID="save-training-attendance-btn"
        >
          {saving ? (
            <ActivityIndicator size="small" color={Colors.white} />
          ) : (
            <>
              <Ionicons name="save-outline" size={20} color={Colors.white} />
              <Text style={styles.saveButtonText}>Training opslaan</Text>
            </>
          )}
        </Pressable>
      </View>
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
    textAlign: "center",
  },
  headerRightPlaceholder: {
    width: 24,
  },
  dateBlock: {
    paddingHorizontal: 20,
    paddingBottom: 12,
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
  listContent: {
    paddingHorizontal: 20,
    paddingTop: 4,
    gap: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    paddingVertical: 14,
    paddingHorizontal: 14,
  },
  rowSelected: {
    borderColor: Colors.primary,
    backgroundColor: "#4A3820",
  },
  rowPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Colors.textTertiary,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  checkboxOn: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  rowText: {
    flex: 1,
  },
  rowNaam: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  rowNiveau: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    marginTop: 2,
  },
  empty: {
    paddingTop: 48,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
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
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 14,
  },
  saveButtonPressed: {
    backgroundColor: Colors.primaryDark,
    transform: [{ scale: 0.98 }],
  },
  saveButtonText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.white,
  },
});
