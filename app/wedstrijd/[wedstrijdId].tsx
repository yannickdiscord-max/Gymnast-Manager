import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Platform,
} from "react-native";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import {
  getWedstrijd,
  saveWedstrijdScores,
  TOESTELLEN,
  type Wedstrijd,
  type ToestelScore,
} from "@/lib/storage";

export default function WedstrijdScreen() {
  const { wedstrijdId } = useLocalSearchParams<{ wedstrijdId: string }>();
  const insets = useSafeAreaInsets();

  const [wedstrijd, setWedstrijd] = useState<Wedstrijd | null>(null);
  const [scores, setScores] = useState<Record<string, { dScore: string; eScore: string; penalty: string }>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const webBottomInset = Platform.OS === "web" ? 34 : 0;

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [wedstrijdId])
  );

  const loadData = async () => {
    if (!wedstrijdId) return;
    setLoading(true);
    const data = await getWedstrijd(wedstrijdId);
    if (data) {
      setWedstrijd(data);
      const initial: Record<string, { dScore: string; eScore: string; penalty: string }> = {};
      for (const t of TOESTELLEN) {
        const s = data.scores[t];
        initial[t] = {
          dScore: s ? String(s.dScore) : "",
          eScore: s ? String(s.eScore) : "",
          penalty: s ? String(s.penalty) : "",
        };
      }
      setScores(initial);
    }
    setLoading(false);
  };

  const handleChange = (toestel: string, field: "dScore" | "eScore" | "penalty", value: string) => {
    setSaved(false);
    if (field === "eScore") {
      const parsed = parseFloat(value.replace(",", "."));
      if (!isNaN(parsed) && parsed > 10) value = "10";
    }
    setScores((prev) => ({
      ...prev,
      [toestel]: { ...prev[toestel], [field]: value },
    }));
  };

  const parseScore = (val: string): number => {
    const n = parseFloat(val.replace(",", "."));
    return isNaN(n) ? 0 : n;
  };

  const calcTotal = (toestel: string): number | null => {
    const s = scores[toestel];
    if (!s) return null;
    if (s.dScore === "" && s.eScore === "" && s.penalty === "") return null;
    return Math.max(0, parseScore(s.dScore) + parseScore(s.eScore) - parseScore(s.penalty));
  };

  const handleSave = async () => {
    if (!wedstrijdId) return;
    setSaving(true);
    const toSave: Record<string, ToestelScore> = {};
    for (const t of TOESTELLEN) {
      const s = scores[t];
      if (s && (s.dScore !== "" || s.eScore !== "" || s.penalty !== "")) {
        toSave[t] = {
          dScore: parseScore(s.dScore),
          eScore: Math.min(10, parseScore(s.eScore)),
          penalty: parseScore(s.penalty),
        };
      }
    }
    await saveWedstrijdScores(wedstrijdId, toSave);
    setSaving(false);
    setSaved(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const grandTotal = (): number => {
    return TOESTELLEN.reduce((sum, t) => {
      const total = calcTotal(t);
      return total !== null ? sum + total : sum;
    }, 0);
  };

  const anyScore = TOESTELLEN.some((t) => {
    const s = scores[t];
    return s && (s.dScore !== "" || s.eScore !== "" || s.penalty !== "");
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
        <Pressable onPress={() => router.back()}>
          <Text style={styles.backLink}>Terug</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTopInset }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} testID="back-btn">
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>{wedstrijd.naam}</Text>
          <Text style={styles.headerSub}>{wedstrijd.datum} · {wedstrijd.locatie}</Text>
        </View>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + webBottomInset + 100 },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {anyScore && (
          <View style={styles.grandTotalCard}>
            <Text style={styles.grandTotalLabel}>Totaalscore</Text>
            <Text style={styles.grandTotalValue}>{grandTotal().toFixed(3)}</Text>
          </View>
        )}

        {TOESTELLEN.map((toestel) => {
          const s = scores[toestel] ?? { dScore: "", eScore: "", penalty: "" };
          const total = calcTotal(toestel);
          return (
            <View key={toestel} style={styles.toestelCard}>
              <View style={styles.toestelHeader}>
                <Text style={styles.toestelNaam}>{toestel}</Text>
                <View style={styles.toestelHeaderRight}>
                  {total !== null && (
                    <View style={styles.totalBadge}>
                      <Text style={styles.totalBadgeText}>{total.toFixed(3)}</Text>
                    </View>
                  )}
                  <Pressable
                    style={({ pressed }) => [styles.analyseBtn, pressed && { opacity: 0.6 }]}
                    onPress={() => {
                      Haptics.selectionAsync();
                      router.push({
                        pathname: "/analyse/[wedstrijdId]",
                        params: { wedstrijdId: wedstrijdId!, toestel },
                      });
                    }}
                    hitSlop={8}
                    testID={`analyse-${toestel}`}
                  >
                    <Ionicons name="chevron-forward" size={18} color={Colors.textSecondary} />
                  </Pressable>
                </View>
              </View>

              <View style={styles.scoreRow}>
                <View style={styles.scoreField}>
                  <Text style={styles.scoreLabel}>D-Score</Text>
                  <TextInput
                    style={styles.scoreInput}
                    value={s.dScore}
                    onChangeText={(v) => handleChange(toestel, "dScore", v)}
                    placeholder="0.0"
                    placeholderTextColor={Colors.textTertiary}
                    keyboardType="decimal-pad"
                    testID={`d-score-${toestel}`}
                  />
                </View>

                <View style={styles.scoreField}>
                  <Text style={styles.scoreLabel}>E-Score</Text>
                  <TextInput
                    style={styles.scoreInput}
                    value={s.eScore}
                    onChangeText={(v) => handleChange(toestel, "eScore", v)}
                    placeholder="0.0"
                    placeholderTextColor={Colors.textTertiary}
                    keyboardType="decimal-pad"
                    testID={`e-score-${toestel}`}
                  />
                </View>

                <View style={styles.scoreField}>
                  <Text style={styles.scoreLabel}>Penalty</Text>
                  <TextInput
                    style={styles.scoreInput}
                    value={s.penalty}
                    onChangeText={(v) => handleChange(toestel, "penalty", v)}
                    placeholder="0.0"
                    placeholderTextColor={Colors.textTertiary}
                    keyboardType="decimal-pad"
                    testID={`penalty-${toestel}`}
                  />
                </View>
              </View>
            </View>
          );
        })}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: insets.bottom + webBottomInset + 16 }]}>
        <Pressable
          style={[styles.saveButton, saving && { opacity: 0.6 }]}
          onPress={handleSave}
          disabled={saving}
          testID="save-btn"
        >
          {saving ? (
            <ActivityIndicator size="small" color={Colors.white} />
          ) : saved ? (
            <>
              <Ionicons name="checkmark" size={20} color={Colors.white} />
              <Text style={styles.saveButtonText}>Opgeslagen</Text>
            </>
          ) : (
            <Text style={styles.saveButtonText}>Opslaan</Text>
          )}
        </Pressable>
      </View>
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
  headerCenter: { flex: 1, alignItems: "center", paddingHorizontal: 8 },
  headerTitle: { fontSize: 17, fontFamily: "Inter_600SemiBold", color: Colors.text },
  headerSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.textTertiary, marginTop: 2 },
  content: { paddingHorizontal: 20, paddingTop: 4, gap: 12 },
  grandTotalCard: {
    backgroundColor: Colors.primary,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  grandTotalLabel: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: Colors.white },
  grandTotalValue: { fontSize: 22, fontFamily: "Inter_700Bold", color: Colors.white },
  toestelCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  toestelHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  toestelNaam: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: Colors.text },
  toestelHeaderRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  totalBadge: {
    backgroundColor: Colors.surfaceSecondary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  totalBadgeText: { fontSize: 14, fontFamily: "Inter_700Bold", color: Colors.primary },
  analyseBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: Colors.surfaceSecondary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  scoreRow: { flexDirection: "row", gap: 10 },
  scoreField: { flex: 1 },
  scoreLabel: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    color: Colors.textTertiary,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  scoreInput: {
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.borderLight,
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
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 14,
  },
  saveButtonText: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: Colors.white },
  errorTitle: { fontSize: 18, fontFamily: "Inter_600SemiBold", color: Colors.textSecondary },
  backLink: { fontSize: 16, fontFamily: "Inter_500Medium", color: Colors.primary },
});
