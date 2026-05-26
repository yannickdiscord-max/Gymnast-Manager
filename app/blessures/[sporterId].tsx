import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  Platform,
  ScrollView,
  TextInput,
  ActivityIndicator,
  PanResponder,
  type LayoutRectangle,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Colors from "@/constants/colors";
import {
  addCurrentBlessure,
  getBlessuresForSporter,
  getSporter,
  moveCurrentBlessureToPrevious,
  removeCurrentBlessure,
  removePreviousBlessure,
  type Sporter,
  type SporterBlessures,
} from "@/lib/storage";

export default function BlessuresScreen() {
  const { sporterId } = useLocalSearchParams<{ sporterId: string }>();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sporter, setSporter] = useState<Sporter | null>(null);
  const [blessures, setBlessures] = useState<SporterBlessures>({ current: [], previous: [] });
  const [inputValue, setInputValue] = useState("");
  const [draggingBlessure, setDraggingBlessure] = useState<string | null>(null);
  const [dragSource, setDragSource] = useState<"current" | "previous" | null>(null);
  const [isOverCurrentZone, setIsOverCurrentZone] = useState(false);
  const [isOverPreviousZone, setIsOverPreviousZone] = useState(false);
  const [currentZone, setCurrentZone] = useState<LayoutRectangle | null>(null);
  const [previousZone, setPreviousZone] = useState<LayoutRectangle | null>(null);
  const currentZoneAnchorRef = useRef<View | null>(null);
  const previousZoneAnchorRef = useRef<View | null>(null);
  const webTopInset = Platform.OS === "web" ? 67 : 0;

  const loadData = useCallback(async () => {
    if (!sporterId) return;
    setLoading(true);
    const [sporterData, blessureData] = await Promise.all([
      getSporter(sporterId),
      getBlessuresForSporter(sporterId),
    ]);
    setSporter(sporterData ?? null);
    setBlessures(blessureData);
    setLoading(false);
  }, [sporterId]);

  React.useEffect(() => {
    void loadData();
  }, [loadData]);

  const refreshDropZones = useCallback(() => {
    const currentNode = currentZoneAnchorRef.current;
    if (currentNode) {
      currentNode.measureInWindow((x, y, width, height) => {
        setCurrentZone({ x, y, width, height });
      });
    }
    const previousNode = previousZoneAnchorRef.current;
    if (previousNode) {
      previousNode.measureInWindow((x, y, width, height) => {
        setPreviousZone({ x, y, width, height });
      });
    }
  }, []);

  const updateDraggingPosition = useCallback(
    (pageY: number) => {
      if (!draggingBlessure) return;
      if (currentZone) {
        const overCurrent = pageY >= currentZone.y && pageY <= currentZone.y + currentZone.height;
        if (overCurrent !== isOverCurrentZone) {
          setIsOverCurrentZone(overCurrent);
        }
      }
      if (previousZone) {
        const overPrevious = pageY >= previousZone.y && pageY <= previousZone.y + previousZone.height;
        if (overPrevious !== isOverPreviousZone) {
          setIsOverPreviousZone(overPrevious);
        }
      }
    },
    [currentZone, draggingBlessure, isOverCurrentZone, isOverPreviousZone, previousZone]
  );

  const finishDrag = useCallback(
    async (
      blessureNaam: string,
      source: "current" | "previous",
      droppedInCurrent: boolean,
      droppedInPrevious: boolean
    ) => {
      setDraggingBlessure(null);
      setDragSource(null);
      setIsOverCurrentZone(false);
      setIsOverPreviousZone(false);
      if (!sporterId) return;
      setSaving(true);
      try {
        let updated = blessures;
        if (source === "current" && droppedInPrevious) {
          updated = await moveCurrentBlessureToPrevious(sporterId, blessureNaam);
        } else if (source === "previous" && droppedInCurrent) {
          updated = await addCurrentBlessure(sporterId, blessureNaam);
        }
        setBlessures(updated);
      } finally {
        setSaving(false);
      }
    },
    [blessures, sporterId]
  );

  const makePanResponder = useCallback(
    (blessureNaam: string, source: "current" | "previous") =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => false,
        onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 6,
        onPanResponderGrant: () => {
          setDraggingBlessure(blessureNaam);
          setDragSource(source);
          refreshDropZones();
        },
        onPanResponderMove: (evt) => {
          updateDraggingPosition(evt.nativeEvent.pageY);
        },
        onPanResponderRelease: () => {
          void finishDrag(blessureNaam, source, isOverCurrentZone, isOverPreviousZone);
        },
        onPanResponderTerminate: () => {
          void finishDrag(blessureNaam, source, false, false);
        },
      }),
    [finishDrag, isOverCurrentZone, isOverPreviousZone, refreshDropZones, updateDraggingPosition]
  );

  const currentPanRespondersByName = useMemo(() => {
    const entries: Array<[string, ReturnType<typeof makePanResponder>]> = [];
    for (const blessureNaam of blessures.current) {
      entries.push([blessureNaam, makePanResponder(blessureNaam, "current")]);
    }
    return new Map(entries);
  }, [blessures.current, makePanResponder]);

  const previousPanRespondersByName = useMemo(() => {
    const entries: Array<[string, ReturnType<typeof makePanResponder>]> = [];
    for (const blessureNaam of blessures.previous) {
      entries.push([blessureNaam, makePanResponder(blessureNaam, "previous")]);
    }
    return new Map(entries);
  }, [blessures.previous, makePanResponder]);

  const onAddCurrent = useCallback(async () => {
    if (!sporterId) return;
    setSaving(true);
    try {
      const updated = await addCurrentBlessure(sporterId, inputValue);
      setBlessures(updated);
      setInputValue("");
    } finally {
      setSaving(false);
    }
  }, [inputValue, sporterId]);

  const onRemoveCurrent = useCallback(
    async (name: string) => {
      if (!sporterId) return;
      setSaving(true);
      try {
        const updated = await removeCurrentBlessure(sporterId, name);
        setBlessures(updated);
      } finally {
        setSaving(false);
      }
    },
    [sporterId]
  );

  const onRemovePrevious = useCallback(
    async (name: string) => {
      if (!sporterId) return;
      setSaving(true);
      try {
        const updated = await removePreviousBlessure(sporterId, name);
        setBlessures(updated);
      } finally {
        setSaving(false);
      }
    },
    [sporterId]
  );

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
        <Pressable
          onPress={() =>
            router.push({ pathname: "/overige-zaken/[sporterId]", params: { sporterId: sporterId! } })
          }
          hitSlop={12}
          testID="back-btn"
        >
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Blessures</Text>
          {!!sporter && <Text style={styles.headerSub}>{sporter.naam}</Text>}
        </View>
        <View style={styles.headerRightPlaceholder} />
      </View>

      <ScrollView
        contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: insets.bottom + 24, gap: 12 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.addRow}>
          <TextInput
            value={inputValue}
            onChangeText={setInputValue}
            placeholder="Nieuwe blessure toevoegen"
            placeholderTextColor={Colors.textTertiary}
            style={styles.input}
            onSubmitEditing={() => void onAddCurrent()}
            returnKeyType="done"
          />
          <Pressable
            style={({ pressed }) => [
              styles.addButton,
              pressed && styles.addButtonPressed,
              saving && styles.disabledButton,
            ]}
            disabled={saving}
            onPress={() => void onAddCurrent()}
          >
            <Ionicons name="add" size={22} color={Colors.white} />
          </Pressable>
        </View>

        <View style={styles.card} ref={currentZoneAnchorRef} onLayout={refreshDropZones}>
          <View
            style={[
              styles.dropZoneBorder,
              isOverCurrentZone && dragSource === "previous" && styles.dropZoneBorderActive,
            ]}
          >
            <Text style={styles.cardTitle}>Huidige blessures</Text>
            <Text style={styles.helperText}>
              Sleep een blessure naar &quot;Vorige blessures&quot; om deze te archiveren.
            </Text>
            {blessures.current.length === 0 ? (
              <Text style={styles.emptyText}>Geen huidige blessures.</Text>
            ) : (
              blessures.current.map((name) => {
                const pan = currentPanRespondersByName.get(name);
                return (
                  <View
                    key={name}
                    style={[
                      styles.blessureItem,
                      draggingBlessure === name &&
                        dragSource === "current" &&
                        styles.draggingItem,
                    ]}
                    {...(pan?.panHandlers ?? {})}
                  >
                    <Ionicons name="reorder-three-outline" size={20} color={Colors.textTertiary} />
                    <Text style={styles.blessureText}>{name}</Text>
                    <Pressable
                      hitSlop={8}
                      onPress={() => void onRemoveCurrent(name)}
                      disabled={saving}
                    >
                      <Ionicons name="close-circle-outline" size={20} color={Colors.textTertiary} />
                    </Pressable>
                  </View>
                );
              })
            )}
          </View>
        </View>

        <View
          style={[
            styles.card,
            styles.previousCard,
            isOverPreviousZone && styles.previousCardActive,
          ]}
          ref={previousZoneAnchorRef}
          onLayout={refreshDropZones}
        >
          <View
            style={[
              styles.dropZoneBorder,
              isOverPreviousZone && dragSource === "current" && styles.dropZoneBorderActive,
            ]}
          >
            <Text style={styles.cardTitle}>Vorige blessures</Text>
            <Text style={styles.helperText}>
              Sleep terug naar &quot;Huidige blessures&quot; als een blessure terugkomt.
            </Text>
            {blessures.previous.length === 0 ? (
              <Text style={styles.emptyText}>Nog geen vorige blessures.</Text>
            ) : (
              blessures.previous.map((name) => {
                const pan = previousPanRespondersByName.get(name);
                return (
                  <View
                    key={name}
                    style={[
                      styles.previousItem,
                      draggingBlessure === name &&
                        dragSource === "previous" &&
                        styles.draggingItem,
                    ]}
                    {...(pan?.panHandlers ?? {})}
                  >
                    <Ionicons
                      name="reorder-three-outline"
                      size={20}
                      color={Colors.textTertiary}
                    />
                    <Text style={styles.previousText}>{name}</Text>
                    <Pressable
                      hitSlop={8}
                      onPress={() => void onRemovePrevious(name)}
                      disabled={saving}
                    >
                      <Ionicons name="close-circle-outline" size={18} color={Colors.textTertiary} />
                    </Pressable>
                  </View>
                );
              })
            )}
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
  headerCenter: {
    alignItems: "center",
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
  addRow: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  input: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
    color: Colors.text,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  addButton: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  addButtonPressed: {
    transform: [{ scale: 0.96 }],
  },
  disabledButton: {
    opacity: 0.65,
  },
  card: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    backgroundColor: Colors.surface,
    padding: 14,
    gap: 8,
  },
  dropZoneBorder: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "transparent",
    padding: 2,
    gap: 8,
  },
  dropZoneBorderActive: {
    borderColor: Colors.primary,
  },
  cardTitle: {
    color: Colors.text,
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  helperText: {
    color: Colors.textTertiary,
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
  emptyText: {
    color: Colors.textSecondary,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginTop: 4,
  },
  blessureItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 10,
    paddingHorizontal: 10,
    backgroundColor: Colors.surfaceSecondary,
  },
  blessureText: {
    flex: 1,
    color: Colors.text,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  draggingItem: {
    borderColor: Colors.primary,
  },
  previousCard: {
    marginBottom: 20,
  },
  previousCardActive: {
    borderColor: Colors.primary,
    backgroundColor: "#5a4a37",
  },
  previousItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.border,
    paddingVertical: 10,
    paddingHorizontal: 10,
    backgroundColor: Colors.surfaceSecondary,
  },
  previousText: {
    flex: 1,
    color: Colors.textSecondary,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
});
