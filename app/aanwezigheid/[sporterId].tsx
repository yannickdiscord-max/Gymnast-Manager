import React, { useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  SectionList,
  ActivityIndicator,
  Platform,
  Alert,
} from "react-native";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { Swipeable } from "react-native-gesture-handler";
import Colors from "@/constants/colors";
import {
  archiveAttendanceSeason,
  deleteTrainingSession,
  getSporter,
  getSporterAttendanceArchives,
  getTrainingSessions,
  deleteAttendanceArchiveBatch,
  NO_TRAINING_SESSIONS_TO_ARCHIVE,
  setSporterAttendanceForSession,
  TRAINING_SESSION_NOT_FOUND,
  type Sporter,
  type SporterAttendanceArchive,
} from "@/lib/storage";
import { defaultTurnSeasonLabel } from "@shared/turnteam-dates";

type AttendanceRow = {
  sessionId: string;
  datum: string;
  attended: boolean;
};

type MonthSection = {
  monthKey: string;
  title: string;
  data: AttendanceRow[];
};

function parseEuropeanDatum(datum: string): Date | null {
  const parts = datum.trim().split("-");
  if (parts.length !== 3) return null;
  const [dd, mm, yyyy] = parts.map(Number);
  if (!dd || !mm || !yyyy) return null;
  const d = new Date(yyyy, mm - 1, dd);
  if (d.getFullYear() !== yyyy || d.getMonth() !== mm - 1 || d.getDate() !== dd) {
    return null;
  }
  return d;
}

function trainingDatumToTime(datum: string): number {
  return parseEuropeanDatum(datum)?.getTime() ?? 0;
}

function formatWeekday(datum: string): string {
  const d = parseEuropeanDatum(datum);
  if (!d) return "";
  return d.toLocaleDateString("nl-NL", { weekday: "long" });
}

function monthKeyFromDatum(datum: string): string {
  const parts = datum.trim().split("-");
  if (parts.length !== 3) return "";
  const [, mm, yyyy] = parts;
  return `${yyyy}-${mm}`;
}

function formatMonthSectionTitle(monthKey: string): string {
  const [yyyy, mm] = monthKey.split("-").map(Number);
  if (!yyyy || !mm) return monthKey;
  const label = new Date(yyyy, mm - 1, 1).toLocaleDateString("nl-NL", {
    month: "long",
    year: "numeric",
  });
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function groupRowsByMonth(rows: AttendanceRow[]): MonthSection[] {
  const byMonth = new Map<string, AttendanceRow[]>();
  for (const row of rows) {
    const key = monthKeyFromDatum(row.datum);
    if (!key) continue;
    const bucket = byMonth.get(key);
    if (bucket) bucket.push(row);
    else byMonth.set(key, [row]);
  }
  return Array.from(byMonth.entries())
    .sort(([a], [b]) => b.localeCompare(a))
    .map(([monthKey, data]) => ({
      monthKey,
      title: formatMonthSectionTitle(monthKey),
      data: data.sort(
        (a, b) => trainingDatumToTime(b.datum) - trainingDatumToTime(a.datum),
      ),
    }));
}

export default function AanwezigheidScreen() {
  const { sporterId } = useLocalSearchParams<{ sporterId: string }>();
  const insets = useSafeAreaInsets();
  const [sporter, setSporter] = useState<Sporter | null>(null);
  const [rows, setRows] = useState<AttendanceRow[]>([]);
  const [archives, setArchives] = useState<SporterAttendanceArchive[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [archiving, setArchiving] = useState(false);
  const [deletingArchiveBatchId, setDeletingArchiveBatchId] = useState<
    string | null
  >(null);
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);

  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const webBottomInset = Platform.OS === "web" ? 34 : 0;

  const loadData = useCallback(async () => {
    if (!sporterId) return;
    setLoading(true);
    const [sporterData, sessions, archiveList] = await Promise.all([
      getSporter(sporterId),
      getTrainingSessions(),
      getSporterAttendanceArchives(sporterId),
    ]);
    setSporter(sporterData ?? null);
    setArchives(archiveList);
    const list: AttendanceRow[] = sessions
      .map((s) => ({
        sessionId: s.id,
        datum: s.datum,
        attended: s.attendeeSporterIds.includes(sporterId),
      }))
      .sort((a, b) => trainingDatumToTime(b.datum) - trainingDatumToTime(a.datum));
    setRows(list);
    setLoading(false);
  }, [sporterId]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const sections = useMemo(() => groupRowsByMonth(rows), [rows]);

  const summary = useMemo(() => {
    if (rows.length === 0) return null;
    const attended = rows.filter((r) => r.attended).length;
    return {
      attended,
      total: rows.length,
      percentage: Math.round((attended / rows.length) * 100),
    };
  }, [rows]);

  const toggleRow = async (row: AttendanceRow) => {
    if (!sporterId || togglingId) return;
    const next = !row.attended;
    setTogglingId(row.sessionId);
    setRows((prev) =>
      prev.map((r) =>
        r.sessionId === row.sessionId ? { ...r, attended: next } : r,
      ),
    );
    try {
      await setSporterAttendanceForSession(row.sessionId, sporterId, next);
      Haptics.selectionAsync();
    } catch (e) {
      setRows((prev) =>
        prev.map((r) =>
          r.sessionId === row.sessionId ? { ...r, attended: row.attended } : r,
        ),
      );
      if (e instanceof Error && e.message === TRAINING_SESSION_NOT_FOUND) {
        Alert.alert(
          "Training niet gevonden",
          "Deze training bestaat niet meer. Vernieuw het overzicht.",
        );
        await loadData();
      } else {
        Alert.alert(
          "Opslaan mislukt",
          "De aanwezigheid kon niet worden bijgewerkt.",
        );
      }
    } finally {
      setTogglingId(null);
    }
  };

  const handleArchiveSeason = () => {
    if (archiving || rows.length === 0) return;
    const seasonLabel = defaultTurnSeasonLabel();

    const summaryLine = `${summary?.attended ?? 0} van ${summary?.total ?? 0} trainingen (${summary?.percentage ?? 0}%)`;

    const doArchive = async () => {
      setArchiving(true);
      try {
        const result = await archiveAttendanceSeason(seasonLabel);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await loadData();
        Alert.alert(
          "Seizoen gearchiveerd",
          `Seizoen ${result.seasonLabel} is opgeslagen voor ${result.sporterCount} sporters (${result.trainingSessionCount} trainingen). Je kunt nu opnieuw trainingen registreren.`,
        );
      } catch (e) {
        if (e instanceof Error && e.message === NO_TRAINING_SESSIONS_TO_ARCHIVE) {
          Alert.alert("Geen trainingen", "Er zijn geen trainingen om te archiveren.");
        } else {
          Alert.alert(
            "Archiveren mislukt",
            "Het seizoen kon niet worden afgesloten. Controleer of de server draait en herstart deze indien nodig.",
          );
        }
      } finally {
        setArchiving(false);
      }
    };

    // Extra check: twee keer bevestigen (om misclicks te voorkomen).
    Alert.alert(
      "Turnseizoen afsluiten?",
      `Je gaat seizoen ${seasonLabel} archiveren.\n\nDit verwijdert daarna alle geregistreerde trainingen.\n\nVoor ${sporter?.naam ?? "deze sporter"}: ${summaryLine}`,
      [
        { text: "Annuleren", style: "cancel" },
        {
          text: "Doorgaan",
          style: "destructive",
          onPress: () => {
            Alert.alert(
              "Laatste bevestiging",
              `Weet je het zeker? Dit kan niet ongedaan worden gemaakt.\n\nSeizoen: ${seasonLabel}`,
              [
                { text: "Annuleren", style: "cancel" },
                {
                  text: "Ja, archiveren",
                  style: "destructive",
                  onPress: () => {
                    void doArchive();
                  },
                },
              ],
            );
          },
        },
      ],
    );
  };

  const handleDeleteArchiveBatch = (
    seasonBatchId: string,
    seasonLabel: string,
  ) => {
    if (archiving || deletingArchiveBatchId) return;

    Alert.alert(
      "Gearchiveerd seizoen verwijderen?",
      `Seizoen ${seasonLabel} verwijderen.\n\nDit verwijdert de opgeslagen samenvatting (en maakt trainingen niet terug).`,
      [
        { text: "Annuleren", style: "cancel" },
        {
          text: "Verwijderen",
          style: "destructive",
          onPress: async () => {
            setDeletingArchiveBatchId(seasonBatchId);
            try {
              await deleteAttendanceArchiveBatch(seasonBatchId);
              Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success,
              );
              await loadData();
            } catch {
              Alert.alert(
                "Verwijderen mislukt",
                "Het gearchiveerde seizoen kon niet verwijderd worden.",
              );
            } finally {
              setDeletingArchiveBatchId(null);
            }
          },
        },
      ],
    );
  };

  const handleDeleteTrainingSession = (sessionId: string, datum: string) => {
    if (archiving || deletingArchiveBatchId || deletingSessionId) return;
    Alert.alert(
      "Training verwijderen?",
      `Training op ${datum} verwijderen.\n\nDit verwijdert de training voor alle sporters en kan niet ongedaan worden gemaakt.`,
      [
        { text: "Annuleren", style: "cancel" },
        {
          text: "Verwijderen",
          style: "destructive",
          onPress: async () => {
            setDeletingSessionId(sessionId);
            try {
              await deleteTrainingSession(sessionId);
              Haptics.notificationAsync(
                Haptics.NotificationFeedbackType.Success,
              );
              await loadData();
            } catch (e) {
              Alert.alert(
                "Verwijderen mislukt",
                e instanceof Error
                  ? e.message || "De training kon niet verwijderd worden."
                  : "De training kon niet verwijderd worden.",
              );
            } finally {
              setDeletingSessionId(null);
            }
          },
        },
      ],
    );
  };

  const goBack = () => {
    if (!sporterId) {
      router.back();
      return;
    }
    router.push({
      pathname: "/overige-zaken/[sporterId]",
      params: { sporterId },
    });
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
        <Pressable onPress={goBack} hitSlop={12} testID="back-btn">
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Aanwezigheid</Text>
          {!!sporter && <Text style={styles.headerSub}>{sporter.naam}</Text>}
        </View>
        <View style={styles.headerRightPlaceholder} />
      </View>

      <View style={styles.summaryBar}>
        <Text style={styles.summarySeasonLabel}>Huidig seizoen</Text>
        {summary ? (
          <Text style={styles.summaryText}>
            {summary.attended} van {summary.total} trainingen ({summary.percentage}%)
          </Text>
        ) : (
          <Text style={styles.summaryText}>Nog geen trainingen in dit seizoen</Text>
        )}
      </View>

      <SectionList
        sections={sections}
        keyExtractor={(item) => item.sessionId}
        stickySectionHeadersEnabled={false}
        contentContainerStyle={[
          styles.listContent,
          sections.length === 0 && styles.listContentEmpty,
          { paddingBottom: insets.bottom + webBottomInset + 100 },
        ]}
        ListFooterComponent={
          <View style={{ gap: 12 }}>
            <Pressable
              style={({ pressed }) => [
                styles.archiveSeasonButton,
                pressed && styles.archiveSeasonButtonPressed,
                (archiving || rows.length === 0) && styles.archiveSeasonButtonDisabled,
              ]}
              onPress={handleArchiveSeason}
              disabled={archiving || rows.length === 0}
              testID="archive-season-btn"
            >
              {archiving ? (
                <ActivityIndicator size="small" color={Colors.text} />
              ) : (
                <>
                  <Ionicons name="archive-outline" size={20} color={Colors.text} />
                  <Text style={styles.archiveSeasonButtonText}>Turnseizoen afsluiten</Text>
                </>
              )}
            </Pressable>

            {archives.length > 0 && (
              <View style={styles.archivesBlock}>
                <Text style={styles.archivesTitle}>Vorige seizoenen</Text>
                {archives.map((a) => (
                  <Swipeable
                    key={a.id}
                    enabled={!archiving && deletingArchiveBatchId == null}
                    friction={2}
                    rightThreshold={28}
                    renderRightActions={() => (
                      <Pressable
                        style={({ pressed }) => [
                          styles.archiveSwipeAction,
                          pressed && styles.archiveSwipeActionPressed,
                          deletingArchiveBatchId === a.seasonBatchId &&
                            styles.archiveSwipeActionDisabled,
                        ]}
                        onPress={() =>
                          handleDeleteArchiveBatch(a.seasonBatchId, a.seasonLabel)
                        }
                        disabled={deletingArchiveBatchId === a.seasonBatchId}
                        testID={`delete-archive-${a.seasonBatchId}`}
                      >
                        {deletingArchiveBatchId === a.seasonBatchId ? (
                          <ActivityIndicator size="small" color={Colors.text} />
                        ) : (
                          <Text style={styles.archiveSwipeActionText}>Verwijderen</Text>
                        )}
                      </Pressable>
                    )}
                  >
                    <View style={styles.archiveCard}>
                      <Text style={styles.archiveSeason}>Seizoen {a.seasonLabel}</Text>
                      <Text style={styles.archiveStats}>
                        {a.attendedSessions} van {a.totalSessions} trainingen ({a.percentage}%)
                      </Text>
                    </View>
                  </Swipeable>
                ))}
              </View>
            )}
          </View>
        }
        renderSectionHeader={({ section }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <Text style={styles.sectionCount}>
              {section.data.filter((r) => r.attended).length}/{section.data.length} aanwezig
            </Text>
          </View>
        )}
        renderItem={({ item }) => {
          const busy = togglingId === item.sessionId;
          const weekday = formatWeekday(item.datum);
          const deleting = deletingSessionId === item.sessionId;
          return (
            <Swipeable
              enabled={!busy && !deleting && !archiving && deletingArchiveBatchId == null}
              friction={2}
              rightThreshold={28}
              renderRightActions={() => (
                <Pressable
                  style={({ pressed }) => [
                    styles.trainingSwipeAction,
                    pressed && styles.trainingSwipeActionPressed,
                    deleting && styles.trainingSwipeActionDisabled,
                  ]}
                  onPress={() => handleDeleteTrainingSession(item.sessionId, item.datum)}
                  disabled={deleting}
                  testID={`delete-training-${item.sessionId}`}
                >
                  {deleting ? (
                    <ActivityIndicator size="small" color={Colors.white} />
                  ) : (
                    <Text style={styles.trainingSwipeActionText}>Verwijderen</Text>
                  )}
                </Pressable>
              )}
            >
              <Pressable
                style={({ pressed }) => [
                  styles.row,
                  item.attended && styles.rowPresent,
                  pressed && styles.rowPressed,
                ]}
                onPress={() => toggleRow(item)}
                disabled={busy || deleting}
                testID={`attendance-session-${item.sessionId}`}
              >
                <View style={styles.rowLeft}>
                  <View
                    style={[
                      styles.statusDot,
                      item.attended ? styles.statusDotPresent : styles.statusDotAbsent,
                    ]}
                  />
                  <View style={styles.rowDatumWrap}>
                    <Text style={styles.rowDatum}>{item.datum}</Text>
                    {!!weekday && (
                      <Text style={styles.rowWeekday}>{weekday}</Text>
                    )}
                  </View>
                </View>
                <View style={styles.rowRight}>
                  {busy ? (
                    <ActivityIndicator size="small" color={Colors.primary} />
                  ) : (
                    <>
                      <Text
                        style={[
                          styles.rowStatus,
                          item.attended ? styles.rowStatusPresent : styles.rowStatusAbsent,
                        ]}
                      >
                        {item.attended ? "Aanwezig" : "Afwezig"}
                      </Text>
                      <Ionicons
                        name={item.attended ? "checkmark-circle" : "ellipse-outline"}
                        size={22}
                        color={item.attended ? Colors.primary : Colors.textTertiary}
                      />
                    </>
                  )}
                </View>
              </Pressable>
            </Swipeable>
          );
        }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Ionicons name="calendar-outline" size={40} color={Colors.textTertiary} />
            <Text style={styles.emptyTitle}>Geen trainingen</Text>
            <Text style={styles.emptyText}>
              Registreer eerst trainingen via het startscherm om aanwezigheid te kunnen
              beheren.
            </Text>
          </View>
        }
      />
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
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  headerSub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
    marginTop: 2,
  },
  headerRightPlaceholder: {
    width: 24,
  },
  summaryBar: {
    marginHorizontal: 20,
    marginBottom: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    gap: 4,
  },
  summarySeasonLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.textTertiary,
    textAlign: "center",
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  summaryText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
    textAlign: "center",
  },
  archivesBlock: {
    marginHorizontal: 20,
    marginBottom: 12,
    gap: 8,
  },
  archivesTitle: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  archiveCard: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 4,
  },
  archiveSwipeAction: {
    width: 120,
    borderRadius: 12,
    marginLeft: 10,
    alignSelf: "stretch",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#DC2626",
    backgroundColor: "#DC2626",
  },
  archiveSwipeActionPressed: {
    transform: [{ scale: 0.98 }],
  },
  archiveSwipeActionDisabled: {
    opacity: 0.45,
  },
  archiveSwipeActionText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.white,
  },
  trainingSwipeAction: {
    width: 120,
    borderRadius: 12,
    marginLeft: 10,
    marginBottom: 8,
    alignSelf: "stretch",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#DC2626",
    backgroundColor: "#DC2626",
  },
  trainingSwipeActionPressed: {
    transform: [{ scale: 0.98 }],
  },
  trainingSwipeActionDisabled: {
    opacity: 0.45,
  },
  trainingSwipeActionText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.white,
  },
  archiveSeason: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  archiveStats: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  archiveSeasonButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginTop: 8,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  archiveSeasonButtonPressed: {
    backgroundColor: Colors.surfaceSecondary,
    transform: [{ scale: 0.99 }],
  },
  archiveSeasonButtonDisabled: {
    opacity: 0.45,
  },
  archiveSeasonButtonText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  hint: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  listContent: {
    paddingHorizontal: 20,
  },
  listContentEmpty: {
    flexGrow: 1,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    paddingTop: 16,
    paddingBottom: 8,
    gap: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
    flex: 1,
  },
  sectionCount: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    paddingVertical: 14,
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  rowPresent: {
    borderColor: Colors.primary,
  },
  rowPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.99 }],
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 3,
  },
  statusDotPresent: {
    backgroundColor: Colors.primary,
  },
  statusDotAbsent: {
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  rowDatumWrap: {
    gap: 2,
  },
  rowDatum: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  rowWeekday: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
    textTransform: "capitalize",
  },
  rowRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minWidth: 110,
    justifyContent: "flex-end",
  },
  rowStatus: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  rowStatusPresent: {
    color: Colors.primary,
  },
  rowStatusAbsent: {
    color: Colors.textTertiary,
  },
  empty: {
    paddingTop: 48,
    paddingHorizontal: 24,
    alignItems: "center",
    gap: 8,
  },
  emptyTitle: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
    marginTop: 8,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
    textAlign: "center",
    lineHeight: 20,
  },
});
