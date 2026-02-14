import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
} from "react-native";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import {
  getSporter,
  updateSporterOnderdelen,
  ONDERDELEN_PER_TOESTEL,
  getMinimumForNiveau,
  type Sporter,
  type Toestel,
} from "@/lib/storage";

export default function ToestelScreen() {
  const { toestelId, sporterId } = useLocalSearchParams<{
    toestelId: string;
    sporterId: string;
  }>();
  const insets = useSafeAreaInsets();
  const [sporter, setSporter] = useState<Sporter | null>(null);
  const [loading, setLoading] = useState(true);

  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const webBottomInset = Platform.OS === "web" ? 34 : 0;

  const toestel = toestelId as Toestel;
  const onderdelen = ONDERDELEN_PER_TOESTEL[toestel] || [];

  useFocusEffect(
    useCallback(() => {
      loadSporter();
    }, [sporterId])
  );

  const loadSporter = async () => {
    if (!sporterId) return;
    setLoading(true);
    const data = await getSporter(sporterId);
    setSporter(data || null);
    setLoading(false);
  };

  const handleToggleOnderdeel = async (onderdeel: string) => {
    if (!sporter) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const current = sporter.onderdelen[toestel] || [];
    const updated = current.includes(onderdeel)
      ? current.filter((o) => o !== onderdeel)
      : [...current, onderdeel];

    await updateSporterOnderdelen(sporter.id, toestel, updated);
    setSporter({
      ...sporter,
      onderdelen: { ...sporter.onderdelen, [toestel]: updated },
    });
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
          <Text style={styles.backLink}>Terug</Text>
        </Pressable>
      </View>
    );
  }

  const selected = sporter.onderdelen[toestel] || [];
  const minimum = getMinimumForNiveau(sporter.niveau, toestel);
  const progress = Math.min(selected.length / minimum, 1);
  const isComplete = selected.length >= minimum;

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTopInset }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} testID="back-btn">
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>{toestel}</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.sporterBanner}>
        <Text style={styles.bannerNaam}>{sporter.naam}</Text>
        <View style={styles.bannerDivider} />
        <Text style={styles.bannerNiveau}>{sporter.niveau}</Text>
      </View>

      <View style={styles.progressContainer}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressLabel}>Voortgang</Text>
          <Text style={[styles.progressCount, isComplete && styles.progressCountComplete]}>
            {selected.length}/{minimum}
          </Text>
        </View>
        <View style={styles.progressBarTrack}>
          <View
            style={[
              styles.progressBarFill,
              {
                width: `${progress * 100}%`,
                backgroundColor: isComplete ? Colors.success : Colors.primary,
              },
            ]}
          />
        </View>
        {isComplete && (
          <Text style={styles.completeText}>Minimum behaald</Text>
        )}
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + webBottomInset + 40 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {onderdelen.map((onderdeel) => {
          const isSelected = selected.includes(onderdeel);
          return (
            <Pressable
              key={onderdeel}
              style={[
                styles.onderdeelItem,
                isSelected && styles.onderdeelItemSelected,
              ]}
              onPress={() => handleToggleOnderdeel(onderdeel)}
              testID={`onderdeel-${onderdeel}`}
            >
              <Ionicons
                name={isSelected ? "checkmark-circle" : "ellipse-outline"}
                size={22}
                color={isSelected ? Colors.primary : Colors.textTertiary}
              />
              <Text
                style={[
                  styles.onderdeelText,
                  isSelected && styles.onderdeelTextSelected,
                ]}
              >
                {onderdeel}
              </Text>
            </Pressable>
          );
        })}
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
  headerTitle: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  sporterBanner: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  bannerNaam: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  bannerDivider: {
    width: 1,
    height: 16,
    backgroundColor: Colors.border,
    marginHorizontal: 10,
  },
  bannerNiveau: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  progressContainer: {
    marginHorizontal: 20,
    marginTop: 16,
    marginBottom: 20,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  progressLabel: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  progressCount: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  progressCountComplete: {
    color: Colors.success,
  },
  progressBarTrack: {
    height: 10,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 5,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 5,
  },
  completeText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.success,
    marginTop: 6,
  },
  content: {
    paddingHorizontal: 20,
    gap: 8,
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
  onderdeelText: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  onderdeelTextSelected: {
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
