import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  FlatList,
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
  getSortedOnderdelen,
  getOnderdelenForNiveau,
  TURN_ONDERDEEL_NIVEAUS,
  type Sporter,
  type Toestel,
  type TurnOnderdeelNiveau,
  type TurnOnderdeel,
} from "@/lib/storage";

export default function ToestelScreen() {
  const { toestelId, sporterId } = useLocalSearchParams<{
    toestelId: string;
    sporterId: string;
  }>();
  const insets = useSafeAreaInsets();
  const [sporter, setSporter] = useState<Sporter | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<TurnOnderdeelNiveau | null>(null);

  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const webBottomInset = Platform.OS === "web" ? 34 : 0;

  const toestel = toestelId as Toestel;

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

  const handleToggleOnderdeel = async (onderdeelNaam: string) => {
    if (!sporter) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const current = sporter.onderdelen[toestel] || [];
    const updated = current.includes(onderdeelNaam)
      ? current.filter((o) => o !== onderdeelNaam)
      : [...current, onderdeelNaam];

    await updateSporterOnderdelen(sporter.id, toestel, updated);
    setSporter({
      ...sporter,
      onderdelen: { ...sporter.onderdelen, [toestel]: updated },
    });
  };

  const handleFilterPress = (niveau: TurnOnderdeelNiveau) => {
    Haptics.selectionAsync();
    setActiveFilter((prev) => (prev === niveau ? null : niveau));
  };

  const displayOnderdelen: TurnOnderdeel[] = activeFilter
    ? getOnderdelenForNiveau(toestel, activeFilter)
    : getSortedOnderdelen(toestel);

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

  const renderOnderdeel = ({ item }: { item: TurnOnderdeel }) => {
    const isSelected = selected.includes(item.naam);
    return (
      <Pressable
        style={[
          styles.onderdeelItem,
          isSelected && styles.onderdeelItemSelected,
        ]}
        onPress={() => handleToggleOnderdeel(item.naam)}
        testID={`onderdeel-${item.naam}`}
      >
        <Ionicons
          name={isSelected ? "checkmark-circle" : "ellipse-outline"}
          size={22}
          color={isSelected ? Colors.primary : Colors.textTertiary}
        />
        <View style={styles.onderdeelInfo}>
          <Text
            style={[
              styles.onderdeelText,
              isSelected && styles.onderdeelTextSelected,
            ]}
          >
            {item.naam}
          </Text>
        </View>
        <View style={[styles.niveauTag, getNiveauTagStyle(item.niveau)]}>
          <Text style={[styles.niveauTagText, getNiveauTagTextStyle(item.niveau)]}>
            {item.niveau}
          </Text>
        </View>
      </Pressable>
    );
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTopInset }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} testID="back-btn">
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>{toestel}</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
        style={styles.filterScroll}
      >
        {TURN_ONDERDEEL_NIVEAUS.map((niveau) => {
          const isActive = activeFilter === niveau;
          return (
            <Pressable
              key={niveau}
              style={[
                styles.filterChip,
                isActive && styles.filterChipActive,
              ]}
              onPress={() => handleFilterPress(niveau)}
              testID={`filter-${niveau}`}
            >
              <Text
                style={[
                  styles.filterChipText,
                  isActive && styles.filterChipTextActive,
                ]}
              >
                {niveau}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <FlatList
        data={displayOnderdelen}
        keyExtractor={(item) => item.naam}
        renderItem={renderOnderdeel}
        contentContainerStyle={[
          styles.listContent,
          { paddingBottom: insets.bottom + webBottomInset + 20 },
        ]}
        showsVerticalScrollIndicator={false}
        scrollEnabled={!!displayOnderdelen.length}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="fitness-outline" size={40} color={Colors.textTertiary} />
            <Text style={styles.emptyText}>
              Geen onderdelen voor niveau {activeFilter}
            </Text>
          </View>
        }
      />
    </View>
  );
}

function getNiveauTagStyle(niveau: TurnOnderdeelNiveau) {
  const map: Record<TurnOnderdeelNiveau, object> = {
    tA: { backgroundColor: "#F0F9FF", borderColor: "#BAE6FD" },
    A: { backgroundColor: "#F0FDF4", borderColor: "#BBF7D0" },
    B: { backgroundColor: "#FEFCE8", borderColor: "#FEF08A" },
    C: { backgroundColor: "#FFF7ED", borderColor: "#FED7AA" },
    D: { backgroundColor: "#FEF2F2", borderColor: "#FECACA" },
    E: { backgroundColor: "#FAF5FF", borderColor: "#E9D5FF" },
  };
  return map[niveau] || {};
}

function getNiveauTagTextStyle(niveau: TurnOnderdeelNiveau) {
  const map: Record<TurnOnderdeelNiveau, object> = {
    tA: { color: "#0369A1" },
    A: { color: "#15803D" },
    B: { color: "#A16207" },
    C: { color: "#C2410C" },
    D: { color: "#DC2626" },
    E: { color: "#7C3AED" },
  };
  return map[niveau] || {};
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
  filterScroll: {
    flexGrow: 0,
    marginBottom: 12,
  },
  filterRow: {
    paddingHorizontal: 20,
    gap: 8,
  },
  filterChip: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: Colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  filterChipActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterChipText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
  },
  filterChipTextActive: {
    color: Colors.white,
  },
  listContent: {
    paddingHorizontal: 20,
    gap: 8,
    paddingTop: 4,
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
  onderdeelInfo: {
    flex: 1,
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
  niveauTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  niveauTagText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  emptyContainer: {
    alignItems: "center",
    paddingTop: 60,
    gap: 8,
  },
  emptyText: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
    textAlign: "center",
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
