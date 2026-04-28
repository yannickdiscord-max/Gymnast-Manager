import React, { useState, useCallback, useRef, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import {
  getWedstrijd,
  saveToestelNotes,
  saveExpectedDWaarde,
  type Wedstrijd,
} from "@/lib/storage";

export default function AnalyseScreen() {
  const { wedstrijdId, toestel } = useLocalSearchParams<{
    wedstrijdId: string;
    toestel: string;
  }>();
  const insets = useSafeAreaInsets();

  const [wedstrijd, setWedstrijd] = useState<Wedstrijd | null>(null);
  const [expectedDWaarde, setExpectedDWaarde] = useState<number | null>(null);
  const [editingExpected, setEditingExpected] = useState(false);
  const [expectedInput, setExpectedInput] = useState("");
  const [dScoreNote, setDScoreNote] = useState("");
  const [eScoreNote, setEScoreNote] = useState("");
  const [penaltyNote, setPenaltyNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const webBottomInset = Platform.OS === "web" ? 34 : 0;

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [wedstrijdId, toestel])
  );

  const loadData = async () => {
    if (!wedstrijdId || !toestel) return;
    setLoading(true);
    const w = await getWedstrijd(wedstrijdId);
    if (!w) { setLoading(false); return; }
    setWedstrijd(w);

    const existing = w.scores[toestel];
    setDScoreNote(existing?.dScoreNote ?? "");
    setEScoreNote(existing?.eScoreNote ?? "");
    setPenaltyNote(existing?.penaltyNote ?? "");
    const expected = w.expectedDWaarde?.[toestel] ?? null;
    setExpectedDWaarde(expected);
    setExpectedInput(expected !== null ? String(expected) : "");
    setEditingExpected(false);
    setLoading(false);
  };

  const scheduleSave = (newDNote: string, newENote: string, newPNote: string) => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      if (!wedstrijdId || !toestel) return;
      setSaving(true);
      await saveToestelNotes(wedstrijdId, toestel, newDNote, newENote, newPNote);
      setSaving(false);
    }, 600);
  };

  const handleDScoreNoteChange = (val: string) => {
    setDScoreNote(val);
    scheduleSave(val, eScoreNote, penaltyNote);
  };

  const handleEScoreNoteChange = (val: string) => {
    setEScoreNote(val);
    scheduleSave(dScoreNote, val, penaltyNote);
  };

  const handlePenaltyNoteChange = (val: string) => {
    setPenaltyNote(val);
    scheduleSave(dScoreNote, eScoreNote, val);
  };

  const commitExpectedDWaarde = async () => {
    if (!wedstrijdId || !toestel) return;
    const normalized = expectedInput.trim().replace(",", ".");
    const parsed = normalized.length ? parseFloat(normalized) : null;
    const nextValue = parsed !== null && !isNaN(parsed) ? parsed : null;
    setExpectedDWaarde(nextValue);
    setExpectedInput(nextValue !== null ? String(nextValue) : "");
    setEditingExpected(false);
    setSaving(true);
    await saveExpectedDWaarde(wedstrijdId, toestel, nextValue);
    setSaving(false);
  };

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  const goBack = () =>
    router.push({
      pathname: "/wedstrijd/[wedstrijdId]",
      params: { wedstrijdId: wedstrijdId! },
    });

  if (loading) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: insets.top + webTopInset }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!wedstrijd) {
    return (
      <View style={[styles.container, styles.center, { paddingTop: insets.top + webTopInset }]}>
        <Ionicons name="alert-circle-outline" size={48} color={Colors.textTertiary} />
        <Text style={styles.errorTitle}>Wedstrijd niet gevonden</Text>
        <Pressable onPress={goBack}>
          <Text style={styles.backLink}>Terug</Text>
        </Pressable>
      </View>
    );
  }

  const score = wedstrijd.scores[toestel!];
  const dScored = score?.dScore ?? null;
  const eScored = score?.eScore ?? null;
  const penaltyScored = score?.penalty ?? null;

  const dDiff = dScored !== null && expectedDWaarde !== null ? dScored - expectedDWaarde : null;
  const diffPositive = dDiff !== null && dDiff >= 0;

  return (
    <KeyboardAvoidingView
      style={[styles.container, { paddingTop: insets.top + webTopInset }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? insets.top + webTopInset + 20 : 0}
    >
      <View style={styles.header}>
        <Pressable onPress={goBack} hitSlop={12} testID="back-btn">
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>{toestel}</Text>
          <Text style={styles.headerSub}>
            {wedstrijd.naam} · {wedstrijd.datum}
          </Text>
        </View>
        {saving ? (
          <ActivityIndicator size="small" color={Colors.textTertiary} />
        ) : (
          <View style={{ width: 24 }} />
        )}
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + webBottomInset + 32 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
      >
        {/* D-Score vergelijking */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>D-Score vergelijking</Text>
          <View style={styles.compareCard}>
            <View style={styles.compareCol}>
              <Text style={styles.compareSubLabel}>Gescoord</Text>
              <Text style={styles.compareValue}>
                {dScored !== null ? dScored.toFixed(3) : "—"}
              </Text>
            </View>

            <View style={styles.compareDivider}>
              <Ionicons name="swap-horizontal" size={20} color={Colors.textTertiary} />
            </View>

            <View style={styles.compareCol}>
              <Text style={styles.compareSubLabel}>Oefening D-waarde</Text>
              {editingExpected ? (
                <TextInput
                  style={styles.expectedInput}
                  value={expectedInput}
                  onChangeText={setExpectedInput}
                  onBlur={commitExpectedDWaarde}
                  onSubmitEditing={commitExpectedDWaarde}
                  placeholder="???"
                  placeholderTextColor={Colors.textTertiary}
                  keyboardType="decimal-pad"
                  autoFocus
                  testID="expected-d-input"
                />
              ) : (
                <Pressable onPress={() => setEditingExpected(true)} hitSlop={8} testID="expected-d-value">
                  <Text style={styles.compareValue}>
                    {expectedDWaarde !== null ? expectedDWaarde.toFixed(1) : "???"}
                  </Text>
                </Pressable>
              )}
            </View>
          </View>

          {dDiff !== null && (
            <View style={[styles.diffRow, diffPositive ? styles.diffPositive : styles.diffNegative]}>
              <Ionicons
                name={diffPositive ? "arrow-up" : "arrow-down"}
                size={14}
                color={diffPositive ? Colors.success : Colors.error}
              />
              <Text style={[styles.diffText, { color: diffPositive ? Colors.success : Colors.error }]}>
                {diffPositive ? "+" : ""}{dDiff.toFixed(3)} ten opzichte van oefening
              </Text>
            </View>
          )}
          <Text style={styles.noteLabel}>Notities</Text>
          <TextInput
            style={styles.noteInput}
            value={dScoreNote}
            onChangeText={handleDScoreNoteChange}
            placeholder="Opmerkingen over D-waarde vergelijking"
            placeholderTextColor={Colors.textTertiary}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            testID="d-score-note"
          />
        </View>

        {/* E-Score */}
        <View style={styles.section}>
          <View style={styles.scoreHeader}>
            <Text style={styles.sectionLabel}>E-Score</Text>
            <Text style={styles.scoredValue}>
              {eScored !== null ? eScored.toFixed(3) : "—"}
            </Text>
          </View>
          <Text style={styles.noteLabel}>Notities</Text>
          <TextInput
            style={styles.noteInput}
            value={eScoreNote}
            onChangeText={handleEScoreNoteChange}
            placeholder="Wat veroorzaakte deze score?"
            placeholderTextColor={Colors.textTertiary}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            testID="e-score-note"
          />
        </View>

        {/* Penalty */}
        <View style={styles.section}>
          <View style={styles.scoreHeader}>
            <Text style={styles.sectionLabel}>Penalty</Text>
            <Text style={[styles.scoredValue, penaltyScored ? styles.penaltyValue : null]}>
              {penaltyScored !== null ? penaltyScored.toFixed(3) : "—"}
            </Text>
          </View>
          <Text style={styles.noteLabel}>Notities</Text>
          <TextInput
            style={styles.noteInput}
            value={penaltyNote}
            onChangeText={handlePenaltyNoteChange}
            placeholder="Wat veroorzaakte deze penalty?"
            placeholderTextColor={Colors.textTertiary}
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            testID="penalty-note"
          />
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
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
  headerCenter: { flex: 1, alignItems: "center", paddingHorizontal: 8 },
  headerTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", color: Colors.text },
  headerSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
    marginTop: 2,
  },
  content: { paddingHorizontal: 20, paddingTop: 8, gap: 16 },

  section: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    padding: 16,
  },
  sectionLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textTertiary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 12,
  },

  compareCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  compareCol: { flex: 1, alignItems: "center", gap: 6 },
  compareSubLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: Colors.textTertiary,
    textAlign: "center",
  },
  compareValue: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  expectedInput: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    minWidth: 72,
    textAlign: "center",
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
    paddingVertical: 4,
  },
  compareDivider: { paddingHorizontal: 8 },

  diffRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  diffPositive: { backgroundColor: "rgba(74,222,128,0.08)", borderWidth: 1, borderColor: "rgba(74,222,128,0.2)" },
  diffNegative: { backgroundColor: "rgba(248,113,113,0.08)", borderWidth: 1, borderColor: "rgba(248,113,113,0.2)" },
  diffText: { fontSize: 13, fontFamily: "Inter_500Medium" },

  scoreHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  scoredValue: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  penaltyValue: { color: Colors.error },

  noteLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  noteInput: {
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    minHeight: 100,
  },

  errorTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary },
  backLink: { fontSize: 16, fontFamily: "Inter_500Medium", color: Colors.primary },
});
