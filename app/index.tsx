import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { getSporters, toggleFavoriet, NIVEAUS, type Sporter } from "@/lib/storage";

type FilterMode = "favorieten" | "alle";

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [sporters, setSporters] = useState<Sporter[]>([]);
  const [filter, setFilter] = useState<FilterMode>("favorieten");
  const [loading, setLoading] = useState(true);

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

  const handleToggleFavoriet = async (id: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const updated = await toggleFavoriet(id);
    setSporters(updated);
  };

  const sortSporters = (list: Sporter[]) =>
    [...list].sort((a, b) => {
      const niveauDiff = NIVEAUS.indexOf(a.niveau) - NIVEAUS.indexOf(b.niveau);
      if (niveauDiff !== 0) return niveauDiff;
      return a.naam.localeCompare(b.naam);
    });

  const filtered = sortSporters(
    filter === "favorieten" ? sporters.filter((s) => s.favoriet) : sporters
  );

  const renderSporter = ({ item }: { item: Sporter }) => (
    <Pressable
      style={({ pressed }) => [
        styles.sporterItem,
        pressed && styles.sporterItemPressed,
      ]}
      onPress={() =>
        router.push({ pathname: "/sporter/[id]", params: { id: item.id } })
      }
      testID={`sporter-${item.id}`}
    >
      <View style={styles.sporterInfo}>
        <Text style={styles.sporterNaam} numberOfLines={1}>
          {item.naam}
        </Text>
        <View style={styles.divider} />
        <Text style={styles.sporterNiveau}>{item.niveau}</Text>
      </View>
      <Pressable
        onPress={() => handleToggleFavoriet(item.id)}
        hitSlop={12}
        testID={`star-${item.id}`}
      >
        <Ionicons
          name={item.favoriet ? "star" : "star-outline"}
          size={22}
          color={item.favoriet ? Colors.star : Colors.starInactive}
        />
      </Pressable>
    </Pressable>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Ionicons
        name="people-outline"
        size={48}
        color={Colors.textTertiary}
      />
      <Text style={styles.emptyTitle}>
        {filter === "favorieten"
          ? "Geen favorieten"
          : "Geen sporters"}
      </Text>
      <Text style={styles.emptyText}>
        {filter === "favorieten"
          ? "Markeer sporters als favoriet met de ster"
          : "Voeg je eerste sporter toe"}
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTopInset }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Turnteam</Text>
      </View>

      <View style={styles.filterRow}>
        <Pressable
          style={[
            styles.filterButton,
            filter === "favorieten" && styles.filterButtonActive,
          ]}
          onPress={() => {
            Haptics.selectionAsync();
            setFilter("favorieten");
          }}
        >
          <Ionicons
            name="star"
            size={16}
            color={
              filter === "favorieten" ? Colors.white : Colors.textSecondary
            }
          />
          <Text
            style={[
              styles.filterText,
              filter === "favorieten" && styles.filterTextActive,
            ]}
          >
            Favorieten
          </Text>
        </Pressable>

        <Pressable
          style={[
            styles.filterButton,
            filter === "alle" && styles.filterButtonActive,
          ]}
          onPress={() => {
            Haptics.selectionAsync();
            setFilter("alle");
          }}
        >
          <Ionicons
            name="people"
            size={16}
            color={filter === "alle" ? Colors.white : Colors.textSecondary}
          />
          <Text
            style={[
              styles.filterText,
              filter === "alle" && styles.filterTextActive,
            ]}
          >
            Alle Sporters
          </Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderSporter}
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: 100 + insets.bottom + webBottomInset },
          ]}
          scrollEnabled={!!filtered.length}
          showsVerticalScrollIndicator={false}
        />
      )}

      <View
        style={[
          styles.addButtonContainer,
          { paddingBottom: insets.bottom + webBottomInset + 16 },
        ]}
      >
        <Pressable
          style={({ pressed }) => [
            styles.addButton,
            pressed && styles.addButtonPressed,
          ]}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            router.push("/add-sporter");
          }}
          testID="add-sporter-btn"
        >
          <Ionicons name="add" size={22} color={Colors.white} />
          <Text style={styles.addButtonText}>Sporter toevoegen</Text>
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
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerTitle: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  filterRow: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 10,
    paddingBottom: 16,
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    backgroundColor: Colors.surfaceSecondary,
  },
  filterButtonActive: {
    backgroundColor: Colors.primary,
  },
  filterText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
  },
  filterTextActive: {
    color: Colors.white,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    paddingHorizontal: 20,
    flexGrow: 1,
  },
  sporterItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  sporterItemPressed: {
    backgroundColor: Colors.surfaceSecondary,
    transform: [{ scale: 0.98 }],
  },
  sporterInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 12,
  },
  sporterNaam: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
    flexShrink: 1,
  },
  divider: {
    width: 1,
    height: 20,
    backgroundColor: Colors.border,
    marginHorizontal: 12,
  },
  sporterNiveau: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 80,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    color: Colors.textSecondary,
    marginTop: 8,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textTertiary,
    textAlign: "center",
  },
  addButtonContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 12,
    backgroundColor: Colors.background,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 14,
  },
  addButtonPressed: {
    backgroundColor: Colors.primaryDark,
    transform: [{ scale: 0.98 }],
  },
  addButtonText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.white,
  },
});
