import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
  Alert,
} from "react-native";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import {
  getSporter,
  updateSporterOnderdelen,
  toggleFavoriet,
  deleteSporter,
  ONDERDELEN_OPTIONS,
  type Sporter,
} from "@/lib/storage";

export default function SporterScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [sporter, setSporter] = useState<Sporter | null>(null);
  const [loading, setLoading] = useState(true);

  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const webBottomInset = Platform.OS === "web" ? 34 : 0;

  useFocusEffect(
    useCallback(() => {
      loadSporter();
    }, [id])
  );

  const loadSporter = async () => {
    if (!id) return;
    setLoading(true);
    const data = await getSporter(id);
    setSporter(data || null);
    setLoading(false);
  };

  const handleToggleOnderdeel = async (onderdeel: string) => {
    if (!sporter) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const current = sporter.onderdelen || [];
    const updated = current.includes(onderdeel)
      ? current.filter((o) => o !== onderdeel)
      : [...current, onderdeel];

    await updateSporterOnderdelen(sporter.id, updated);
    setSporter({ ...sporter, onderdelen: updated });
  };

  const handleToggleFavoriet = async () => {
    if (!sporter) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    await toggleFavoriet(sporter.id);
    setSporter({ ...sporter, favoriet: !sporter.favoriet });
  };

  const handleDelete = () => {
    if (!sporter) return;
    Alert.alert(
      "Sporter verwijderen",
      `Weet je zeker dat je ${sporter.naam} wilt verwijderen?`,
      [
        { text: "Annuleren", style: "cancel" },
        {
          text: "Verwijderen",
          style: "destructive",
          onPress: async () => {
            await deleteSporter(sporter.id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            router.back();
          },
        },
      ]
    );
  };

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
          <Text style={styles.backLink}>Terug naar overzicht</Text>
        </Pressable>
      </View>
    );
  }

  const learnedCount = sporter.onderdelen.length;

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTopInset }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} testID="back-btn">
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </Pressable>
        <View style={styles.headerActions}>
          <Pressable onPress={handleToggleFavoriet} hitSlop={12}>
            <Ionicons
              name={sporter.favoriet ? "star" : "star-outline"}
              size={24}
              color={sporter.favoriet ? Colors.star : Colors.textSecondary}
            />
          </Pressable>
          <Pressable onPress={handleDelete} hitSlop={12} testID="delete-btn">
            <Ionicons name="trash-outline" size={22} color={Colors.error} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + webBottomInset + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.profileSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {sporter.naam
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()
                .slice(0, 2)}
            </Text>
          </View>
          <Text style={styles.naam}>{sporter.naam}</Text>
          <View style={styles.niveauBadge}>
            <Text style={styles.niveauBadgeText}>{sporter.niveau}</Text>
          </View>
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{learnedCount}</Text>
            <Text style={styles.statLabel}>Geleerd</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>
              {ONDERDELEN_OPTIONS.length - learnedCount}
            </Text>
            <Text style={styles.statLabel}>Te leren</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Onderdelen</Text>
          <Text style={styles.sectionSubtitle}>
            Tik op een onderdeel om aan te vinken
          </Text>

          <View style={styles.onderdelenGrid}>
            {ONDERDELEN_OPTIONS.map((onderdeel) => {
              const isLearned = sporter.onderdelen.includes(onderdeel);
              return (
                <Pressable
                  key={onderdeel}
                  style={[
                    styles.onderdeelChip,
                    isLearned && styles.onderdeelChipLearned,
                  ]}
                  onPress={() => handleToggleOnderdeel(onderdeel)}
                >
                  <Ionicons
                    name={isLearned ? "checkmark-circle" : "ellipse-outline"}
                    size={18}
                    color={isLearned ? Colors.primary : Colors.textTertiary}
                  />
                  <Text
                    style={[
                      styles.onderdeelText,
                      isLearned && styles.onderdeelTextLearned,
                    ]}
                  >
                    {onderdeel}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
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
    gap: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  content: {
    paddingHorizontal: 20,
  },
  profileSection: {
    alignItems: "center",
    paddingTop: 8,
    paddingBottom: 24,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: Colors.white,
  },
  naam: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    marginBottom: 8,
    textAlign: "center",
  },
  niveauBadge: {
    backgroundColor: "#F0FDFA",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#CCFBF1",
  },
  niveauBadgeText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.primaryDark,
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 28,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.surface,
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  statValue: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  statLabel: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    marginTop: 2,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
    marginBottom: 16,
  },
  onderdelenGrid: {
    gap: 8,
  },
  onderdeelChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: Colors.surface,
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  onderdeelChipLearned: {
    backgroundColor: "#F0FDFA",
    borderColor: "#CCFBF1",
  },
  onderdeelText: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  onderdeelTextLearned: {
    fontFamily: "Inter_500Medium",
    color: Colors.primaryDark,
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
});
