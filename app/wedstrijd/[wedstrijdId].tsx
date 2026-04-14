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
  Alert,
} from "react-native";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
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
  const [exporting, setExporting] = useState(false);

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
    if (field === "dScore") {
      const normalized = value.replace(",", ".");
      const oneDecimal = normalized.match(/^\d*(?:\.\d?)?/)?.[0] ?? "";
      value = oneDecimal;
    }
    if (field === "eScore") {
      const normalized = value.replace(",", ".");
      const oneDecimal = normalized.match(/^\d*(?:\.\d?)?/)?.[0] ?? "";
      value = oneDecimal;
      const parsed = parseFloat(normalized);
      const hasDecimalSeparator = value.includes(".");
      const onlyDigits = /^\d+$/.test(value);

      // If a user types an integer above 10 (e.g. 26), treat it as one decimal (2.6).
      if (!hasDecimalSeparator && onlyDigits && !isNaN(parsed) && parsed > 10) {
        value = String(parsed / 10);
      }

      const capped = parseFloat(value);
      if (!isNaN(capped) && capped > 10) {
        value = "10";
      }
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

  const formatScore = (value: string): string => {
    if (value.trim() === "") return "0.000";
    return parseScore(value).toFixed(3);
  };

  const escapeHtml = (value: string): string => {
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  };

  const buildPdfHtml = (): string => {
    const rows = TOESTELLEN.map((toestel) => {
      const current = scores[toestel] ?? { dScore: "", eScore: "", penalty: "" };
      const total = calcTotal(toestel);
      const expected = wedstrijd?.expectedDWaarde?.[toestel] ?? null;
      const dValue = parseScore(current.dScore);
      const dDiff = expected !== null ? dValue - expected : null;
      const wedstrijdScore = wedstrijd?.scores[toestel];

      const noteItems = [
        wedstrijdScore?.dScoreNote ? `D-score: ${escapeHtml(wedstrijdScore.dScoreNote)}` : "",
        wedstrijdScore?.eScoreNote ? `E-score: ${escapeHtml(wedstrijdScore.eScoreNote)}` : "",
        wedstrijdScore?.penaltyNote ? `Penalty: ${escapeHtml(wedstrijdScore.penaltyNote)}` : "",
      ].filter(Boolean);

      const notesSection = noteItems.length
        ? `<div class="notes"><strong>Notities:</strong><br/>${noteItems.join("<br/>")}</div>`
        : "";

      const dComparison = expected !== null
        ? `${dValue.toFixed(3)} vs ${expected.toFixed(1)} (${dDiff! >= 0 ? "+" : ""}${dDiff!.toFixed(3)})`
        : `${dValue.toFixed(3)} vs ???`;

      return `
        <tr>
          <td>${escapeHtml(toestel)}</td>
          <td>${formatScore(current.dScore)}</td>
          <td>${formatScore(current.eScore)}</td>
          <td>${formatScore(current.penalty)}</td>
          <td>${total !== null ? total.toFixed(3) : "—"}</td>
          <td>${dComparison}</td>
        </tr>
        ${noteItems.length ? `<tr><td colspan="6">${notesSection}</td></tr>` : ""}
      `;
    }).join("");

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <style>
            body {
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
              color: #111827;
              background: #f8fafc;
              padding: 20px;
            }
            .headerCard {
              background: #1f6ad9;
              border-radius: 14px;
              padding: 16px 18px;
              color: #ffffff;
              margin-bottom: 14px;
            }
            h1 {
              font-size: 22px;
              margin: 0 0 6px;
              color: #ffffff;
            }
            .sub {
              color: rgba(255, 255, 255, 0.88);
              margin-bottom: 2px;
              font-size: 13px;
            }
            .total {
              margin-top: 10px;
              font-size: 16px;
              font-weight: 700;
              color: #ffffff;
            }
            .tableCard {
              background: #ffffff;
              border: 1px solid #dbe4f0;
              border-radius: 14px;
              overflow: hidden;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 12px;
            }
            th, td {
              border-bottom: 1px solid #e9eff7;
              padding: 10px 8px;
              text-align: left;
              vertical-align: top;
            }
            th {
              background: #ecf3ff;
              color: #1f6ad9;
              font-weight: 700;
              font-size: 11px;
              letter-spacing: 0.3px;
              text-transform: uppercase;
            }
            tbody tr:nth-child(odd) td {
              background: #fbfdff;
            }
            .notes {
              margin-top: 2px;
              white-space: pre-wrap;
              color: #334155;
              font-size: 11px;
              background: #f1f6ff;
              border: 1px solid #dbe8ff;
              border-radius: 10px;
              padding: 8px 10px;
            }
          </style>
        </head>
        <body>
          <div class="headerCard">
            <h1>${escapeHtml(wedstrijd?.naam ?? "Wedstrijd")}</h1>
            <div class="sub">${escapeHtml(wedstrijd?.datum ?? "")} · ${escapeHtml(wedstrijd?.locatie ?? "")}</div>
            <div class="total">Totaalscore: ${grandTotal().toFixed(3)}</div>
          </div>
          <div class="tableCard">
            <table>
              <thead>
                <tr>
                  <th>Toestel</th>
                  <th>D-Score</th>
                  <th>E-Score</th>
                  <th>Penalty</th>
                  <th>Totaal</th>
                  <th>D-Score vergelijking</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </div>
        </body>
      </html>
    `;
  };

  const handleExportPdf = async () => {
    if (!wedstrijd) return;
    if (Platform.OS === "web") {
      Alert.alert("Niet beschikbaar", "PDF exporteren en delen is alleen beschikbaar op iOS en Android.");
      return;
    }
    try {
      setExporting(true);
      const html = buildPdfHtml();
      const { uri } = await Print.printToFileAsync({ html });
      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        Alert.alert("Delen niet beschikbaar", "Delen wordt niet ondersteund op dit apparaat.");
        return;
      }
      await Sharing.shareAsync(uri, {
        mimeType: "application/pdf",
        dialogTitle: `Wedstrijdscores - ${wedstrijd.naam}`,
        UTI: ".pdf",
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert("Export mislukt", "Er ging iets mis bij het exporteren van de PDF.");
    } finally {
      setExporting(false);
    }
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
        <Pressable
          onPress={() =>
            router.push({
              pathname: "/scores/[sporterId]",
              params: { sporterId: wedstrijd.sporterId },
            })
          }
          hitSlop={12}
          testID="back-btn"
        >
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle} numberOfLines={1}>{wedstrijd.naam}</Text>
          <Text style={styles.headerSub}>{wedstrijd.datum} · {wedstrijd.locatie}</Text>
        </View>
        <Pressable
          style={({ pressed }) => [styles.exportBtn, pressed && { opacity: 0.6 }]}
          onPress={handleExportPdf}
          disabled={exporting}
          hitSlop={10}
          testID="export-pdf-btn"
        >
          {exporting ? (
            <ActivityIndicator size="small" color={Colors.textSecondary} />
          ) : (
            <Ionicons name="share-outline" size={20} color={Colors.textSecondary} />
          )}
        </Pressable>
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
  exportBtn: {
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
