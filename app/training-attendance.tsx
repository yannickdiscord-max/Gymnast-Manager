import React, { useState, useCallback, useEffect, useRef } from "react";
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
  getTrainingSessionForDatum,
  addTrainingSession,
  updateTrainingSessionAttendees,
  deleteTrainingSession,
  DUPLICATE_TRAINING_SESSION_ERROR,
  INVALID_TRAINING_SESSION_DATUM,
  TRAINING_SESSION_NOT_FOUND,
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
  const [existingSessionId, setExistingSessionId] = useState<string | null>(null);
  const [loadingSession, setLoadingSession] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const loadSessionRequestId = useRef(0);

  const webTopInset = 0;
  const webBottomInset = 0;

  useFocusEffect(
    useCallback(() => {
      void loadSporters();
    }, [])
  );

  const loadSporters = async () => {
    setLoading(true);
    try {
      setSporters(await getSporters());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const requestId = ++loadSessionRequestId.current;
    const trimmed = datum.trim();

    const timer = setTimeout(() => {
      void (async () => {
        setLoadingSession(true);
        try {
          const session = await getTrainingSessionForDatum(trimmed);
          if (requestId !== loadSessionRequestId.current) return;
          if (session) {
            setExistingSessionId(session.id);
            setSelected(new Set(session.attendeeSporterIds));
          } else {
            setExistingSessionId(null);
            setSelected(new Set());
          }
        } catch {
          if (requestId !== loadSessionRequestId.current) return;
          setExistingSessionId(null);
          setSelected(new Set());
        } finally {
          if (requestId === loadSessionRequestId.current) {
            setLoadingSession(false);
          }
        }
      })();
    }, 250);

    return () => {
      clearTimeout(timer);
    };
  }, [datum]);

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
    if (saving || deleting) return;
    setSaving(true);
    try {
      const attendees = Array.from(selected);
      if (existingSessionId) {
        await updateTrainingSessionAttendees(existingSessionId, attendees);
      } else {
        const created = await addTrainingSession(datum, attendees);
        setExistingSessionId(created.id);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (e) {
      if (e instanceof Error && e.message === DUPLICATE_TRAINING_SESSION_ERROR) {
        Alert.alert(
          "Training bestaat al",
          "Er is al een training opgeslagen voor deze datum. Laad het scherm opnieuw of kies een andere datum."
        );
      } else if (e instanceof Error && e.message === INVALID_TRAINING_SESSION_DATUM) {
        Alert.alert(
          "Ongeldige datum",
          "Gebruik het formaat DD-MM-JJJJ (bijv. 24-04-2026)."
        );
      } else if (e instanceof Error && e.message === TRAINING_SESSION_NOT_FOUND) {
        Alert.alert(
          "Training niet gevonden",
          "Deze training bestaat niet meer. Pas de datum aan of sla opnieuw op."
        );
        setExistingSessionId(null);
      } else {
        Alert.alert("Opslaan mislukt", "Er ging iets mis bij het opslaan van de training.");
      }
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!existingSessionId || deleting || saving || loadingSession) return;

    const sessionId = existingSessionId;
    const message = `Training op ${datum.trim()} verwijderen.\n\nDit verwijdert de training voor alle sporters en kan niet ongedaan worden gemaakt.`;

    const runDelete = async () => {
      setDeleting(true);
      try {
        await deleteTrainingSession(sessionId);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setExistingSessionId(null);
        setSelected(new Set());
      } catch (e) {
        Alert.alert(
          "Verwijderen mislukt",
          e instanceof Error
            ? e.message || "De training kon niet verwijderd worden."
            : "De training kon niet verwijderd worden.",
        );
      } finally {
        setDeleting(false);
      }
    };

    if (Platform.OS === "web") {
      if (typeof window !== "undefined" && window.confirm(`Training verwijderen?\n\n${message}`)) {
        void runDelete();
      }
      return;
    }

    Alert.alert("Training verwijderen?", message, [
      { text: "Annuleren", style: "cancel" },
      {
        text: "Verwijderen",
        style: "destructive",
        onPress: () => {
          void runDelete();
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: insets.top + webTopInset }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const sorted = sortSporters(sporters);
  const isEditingExisting = existingSessionId !== null;

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTopInset }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} testID="back-btn">
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Training — aanwezigheid</Text>
          <Text style={styles.headerSub}>
            {isEditingExisting
              ? "Bestaande training — pas aanwezigheid aan"
              : "Selecteer de aanwezige sporters"}
          </Text>
        </View>
        <View style={styles.headerRightPlaceholder} />
      </View>

      <View style={styles.dateBlock}>
        <Text style={styles.fieldLabel}>Datum training (DD-MM-JJJJ)</Text>
        <View style={styles.dateRow}>
          <TextInput
            style={[styles.textInput, styles.dateInput]}
            value={datum}
            onChangeText={setDatum}
            placeholder="24-04-2026"
            placeholderTextColor={Colors.textTertiary}
            keyboardType="numbers-and-punctuation"
            maxLength={10}
            editable={!deleting}
            testID="training-datum-input"
          />
          {isEditingExisting ? (
            <Pressable
              style={({ pressed }) => [
                styles.deleteButton,
                pressed && styles.deleteButtonPressed,
                (deleting || saving || loadingSession) && styles.deleteButtonDisabled,
              ]}
              onPress={handleDelete}
              disabled={deleting || saving || loadingSession}
              hitSlop={8}
              accessibilityLabel="Training verwijderen"
              testID="delete-training-attendance-btn"
            >
              {deleting ? (
                <ActivityIndicator size="small" color={Colors.error} />
              ) : (
                <Ionicons name="trash-outline" size={22} color={Colors.error} />
              )}
            </Pressable>
          ) : null}
        </View>
        {loadingSession ? (
          <View style={styles.sessionHintRow}>
            <ActivityIndicator size="small" color={Colors.primary} />
            <Text style={styles.sessionHint}>Training laden…</Text>
          </View>
        ) : isEditingExisting ? (
          <Text style={styles.sessionHintExisting} testID="existing-training-hint">
            Training gevonden — aanwezige sporters zijn aangevinkt
          </Text>
        ) : null}
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
          disabled={saving || deleting || sorted.length === 0 || loadingSession}
          testID="save-training-attendance-btn"
        >
          {saving ? (
            <ActivityIndicator size="small" color={Colors.white} />
          ) : (
            <>
              <Ionicons name="save-outline" size={20} color={Colors.white} />
              <Text style={styles.saveButtonText}>
                {isEditingExisting ? "Wijzigingen opslaan" : "Training opslaan"}
              </Text>
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
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
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
  dateInput: {
    flex: 1,
  },
  deleteButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  deleteButtonPressed: {
    opacity: 0.85,
  },
  deleteButtonDisabled: {
    opacity: 0.55,
  },
  sessionHintRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 10,
  },
  sessionHint: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
  },
  sessionHintExisting: {
    marginTop: 10,
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.primary,
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
