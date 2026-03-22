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
  Alert,
  Modal,
} from "react-native";
import { router, useLocalSearchParams, useFocusEffect } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import {
  getSporter,
  deleteSporter,
  updateSporterNiveau,
  getOnderdelen,
  calculateDWaarde,
  TOESTELLEN,
  NIVEAUS,
  getMinimumForNiveau,
  type Sporter,
  type Toestel,
  type TurnOnderdeel,
} from "@/lib/storage";

export default function SporterScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const [sporter, setSporter] = useState<Sporter | null>(null);
  const [onderdelenMap, setOnderdelenMap] = useState<Record<string, TurnOnderdeel[]>>({});
  const [loading, setLoading] = useState(true);
  const [showNiveauPicker, setShowNiveauPicker] = useState(false);

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
    const [data, ...onderdelenResults] = await Promise.all([
      getSporter(id),
      ...TOESTELLEN.map((t) => getOnderdelen(t as Toestel)),
    ]);
    setSporter((data as Sporter) || null);
    const map: Record<string, TurnOnderdeel[]> = {};
    TOESTELLEN.forEach((t, i) => {
      map[t] = onderdelenResults[i] as TurnOnderdeel[];
    });
    setOnderdelenMap(map);
    setLoading(false);
  };

  const handleDelete = async () => {
    if (!sporter) return;

    if (Platform.OS === "web") {
      const confirmed = window.confirm(
        `Weet je zeker dat je ${sporter.naam} permanent wilt verwijderen? Dit kan niet ongedaan worden gemaakt.`
      );
      if (confirmed) {
        await deleteSporter(sporter.id);
        router.back();
      }
    } else {
      Alert.alert(
        "Sporter verwijderen",
        `Weet je zeker dat je ${sporter.naam} permanent wilt verwijderen? Dit kan niet ongedaan worden gemaakt.`,
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
    }
  };

  const handleNiveauChange = async (niveau: string) => {
    if (!sporter) return;
    Haptics.selectionAsync();
    const updated = await updateSporterNiveau(sporter.id, niveau);
    if (updated) {
      setSporter(updated);
    }
    setShowNiveauPicker(false);
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

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTopInset }]}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()} hitSlop={12} testID="back-btn">
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </Pressable>

        <View style={styles.headerRight}>
          <View style={styles.headerInfo}>
            <Text style={styles.headerNaam} numberOfLines={1}>
              {sporter.naam}
            </Text>
            <View style={styles.headerDivider} />
            <Pressable
              onPress={() => setShowNiveauPicker(true)}
              testID="niveau-edit-btn"
              hitSlop={8}
            >
              <View style={styles.niveauTouchable}>
                <Text style={styles.headerNiveau}>{sporter.niveau}</Text>
                <Ionicons name="chevron-down" size={14} color={Colors.textSecondary} />
              </View>
            </Pressable>
          </View>
          <Pressable onPress={handleDelete} hitSlop={12} testID="delete-btn">
            <Ionicons name="trash" size={20} color={Colors.error} />
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
        {TOESTELLEN.map((toestel) => {
          const selectedNamen = sporter.onderdelen[toestel] || [];
          const selected = selectedNamen.length;
          const minimum = getMinimumForNiveau(sporter.niveau, toestel as Toestel);
          const progress = Math.min(selected / minimum, 1);
          const isComplete = selected >= minimum;
          const allOnderdelen = onderdelenMap[toestel] || [];
          const dWaarde = calculateDWaarde(selectedNamen, allOnderdelen);

          return (
            <Pressable
              key={toestel}
              style={({ pressed }) => [
                styles.toestelItem,
                pressed && styles.toestelItemPressed,
              ]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push({
                  pathname: "/toestel/[toestelId]",
                  params: { toestelId: toestel, sporterId: sporter.id },
                });
              }}
              testID={`toestel-${toestel}`}
            >
              <View style={styles.toestelLeft}>
                <Text style={styles.toestelNaam}>{toestel}</Text>
                <Text style={styles.dWaardeText}>
                  D: {dWaarde.toFixed(1)}
                </Text>
              </View>

              <View style={styles.progressSection}>
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
                <Text style={styles.progressText}>
                  {selected}/{minimum}
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={18}
                  color={Colors.textTertiary}
                />
              </View>
            </Pressable>
          );
        })}
      </ScrollView>

      <Modal
        visible={showNiveauPicker}
        transparent
        animationType="fade"
        onRequestClose={() => setShowNiveauPicker(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowNiveauPicker(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Niveau wijzigen</Text>
              <Pressable
                onPress={() => setShowNiveauPicker(false)}
                hitSlop={12}
              >
                <Ionicons name="close" size={24} color={Colors.text} />
              </Pressable>
            </View>
            <FlatList
              data={NIVEAUS}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <Pressable
                  style={({ pressed }) => [
                    styles.niveauOption,
                    item === sporter.niveau && styles.niveauOptionSelected,
                    pressed && styles.niveauOptionPressed,
                  ]}
                  onPress={() => handleNiveauChange(item)}
                  testID={`niveau-option-${item}`}
                >
                  <Text
                    style={[
                      styles.niveauOptionText,
                      item === sporter.niveau && styles.niveauOptionTextSelected,
                    ]}
                  >
                    {item}
                  </Text>
                  {item === sporter.niveau && (
                    <Ionicons
                      name="checkmark"
                      size={20}
                      color={Colors.primary}
                    />
                  )}
                </Pressable>
              )}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </Pressable>
      </Modal>
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
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    flexShrink: 1,
  },
  headerInfo: {
    flexDirection: "row",
    alignItems: "center",
    flexShrink: 1,
  },
  headerNaam: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
    flexShrink: 1,
  },
  headerDivider: {
    width: 1,
    height: 16,
    backgroundColor: Colors.border,
    marginHorizontal: 10,
  },
  niveauTouchable: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  headerNiveau: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.primary,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 10,
  },
  toestelItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.surface,
    paddingHorizontal: 16,
    paddingVertical: 18,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  toestelItemPressed: {
    backgroundColor: Colors.surfaceSecondary,
    transform: [{ scale: 0.98 }],
  },
  toestelLeft: {
    width: 80,
    gap: 2,
  },
  toestelNaam: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  dWaardeText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    color: Colors.primary,
  },
  progressSection: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginLeft: 8,
  },
  progressBarTrack: {
    flex: 1,
    height: 8,
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 4,
  },
  progressText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
    minWidth: 32,
    textAlign: "right",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "60%",
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    color: Colors.text,
  },
  niveauOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  niveauOptionSelected: {
    backgroundColor: "#F0FDFA",
  },
  niveauOptionPressed: {
    backgroundColor: Colors.surfaceSecondary,
  },
  niveauOptionText: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    color: Colors.text,
  },
  niveauOptionTextSelected: {
    fontFamily: "Inter_600SemiBold",
    color: Colors.primary,
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
