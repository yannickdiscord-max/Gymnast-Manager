import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Platform,
  ScrollView,
} from "react-native";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import { getSporter, getSporterAttendanceSummary, type Sporter } from "@/lib/storage";

export default function OverigeZakenScreen() {
  const { sporterId } = useLocalSearchParams<{ sporterId: string }>();
  const insets = useSafeAreaInsets();
  const [sporter, setSporter] = useState<Sporter | null>(null);
  const [loading, setLoading] = useState(true);
  const [attendance, setAttendance] = useState<Awaited<
    ReturnType<typeof getSporterAttendanceSummary>
  > | null>(null);

  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const webBottomInset = Platform.OS === "web" ? 34 : 0;

  const loadAll = useCallback(async () => {
    if (!sporterId) return;
    setLoading(true);
    const [data, att] = await Promise.all([
      getSporter(sporterId),
      getSporterAttendanceSummary(sporterId),
    ]);
    setSporter(data || null);
    setAttendance(att);
    setLoading(false);
  }, [sporterId]);

  useFocusEffect(
    useCallback(() => {
      loadAll();
    }, [loadAll])
  );

  const goBackToSporter = () => {
    if (!sporterId) {
      router.push("/");
      return;
    }
    router.push({ pathname: "/sporter/[id]", params: { id: sporterId } });
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
        <Pressable onPress={goBackToSporter} hitSlop={12} testID="back-btn">
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Overige zaken</Text>
          {!!sporter && <Text style={styles.headerSub}>{sporter.naam}</Text>}
        </View>
        <View style={styles.headerRightPlaceholder} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + webBottomInset + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.attendanceCard}>
          <View style={styles.attendanceTitleRow}>
            <Text style={styles.attendanceTitle}>Aanwezigheid</Text>
            <Text style={styles.attendancePercentage}>
              {attendance?.percentage == null ? "—" : `${attendance.percentage}%`}
            </Text>
          </View>
          <Text style={styles.attendanceMeta}>
            {!attendance || attendance.totalSessions === 0
              ? "Nog geen trainingen geregistreerd"
              : `${attendance.attendedSessions} van ${attendance.totalSessions} trainingen`}
          </Text>
          {!!attendance && attendance.recentMarks.length > 0 && (
            <View style={styles.marksRow}>
              {attendance.recentMarks.map((m, i) => (
                <View
                  key={i}
                  style={[
                    styles.sessionMark,
                    m.attended ? styles.sessionMarkPresent : styles.sessionMarkAbsent,
                  ]}
                  accessibilityLabel={m.attended ? "Aanwezig" : "Afwezig"}
                />
              ))}
            </View>
          )}
          <Text style={styles.marksLegend}>
            Oranje = aanwezig · Grijs = afwezig (recente trainingen)
          </Text>
        </View>

        <Pressable
          style={({ pressed }) => [styles.actionButton, pressed && styles.actionButtonPressed]}
          onPress={() =>
            router.push({
              pathname: "/pop-gesprekken/[sporterId]",
              params: { sporterId: sporterId! },
            })
          }
          testID="pop-gesprekken-btn"
        >
          <Ionicons name="chatbubbles-outline" size={20} color={Colors.text} />
          <Text style={styles.actionButtonText}>Gesprekken</Text>
          <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
        </Pressable>

        <Pressable
          style={({ pressed }) => [styles.actionButton, pressed && styles.actionButtonPressed]}
          onPress={() =>
            router.push({
              pathname: "/blessures/[sporterId]",
              params: { sporterId: sporterId! },
            })
          }
          testID="blessures-btn"
        >
          <Ionicons name="medkit-outline" size={20} color={Colors.text} />
          <Text style={styles.actionButtonText}>Blessures beheren</Text>
          <Ionicons name="chevron-forward" size={18} color={Colors.textTertiary} />
        </Pressable>
      </ScrollView>
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
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 10,
  },
  attendanceCard: {
    backgroundColor: Colors.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    paddingHorizontal: 16,
    paddingVertical: 16,
    marginBottom: 4,
  },
  attendanceTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  attendanceTitle: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  attendancePercentage: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: Colors.primary,
  },
  attendanceMeta: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    marginBottom: 12,
  },
  marksRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 8,
  },
  sessionMark: {
    width: 12,
    height: 12,
    borderRadius: 3,
  },
  sessionMarkPresent: {
    backgroundColor: Colors.primary,
  },
  sessionMarkAbsent: {
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  marksLegend: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderRadius: 14,
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 12,
  },
  actionButtonPressed: {
    backgroundColor: Colors.surfaceSecondary,
    transform: [{ scale: 0.98 }],
  },
  actionButtonText: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
});
