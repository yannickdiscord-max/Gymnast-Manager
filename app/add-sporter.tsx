import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  Platform,
  ScrollView,
  Modal,
  FlatList,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { addSporter, NIVEAUS } from "@/lib/storage";

export default function AddSporterScreen() {
  const insets = useSafeAreaInsets();
  const [naam, setNaam] = useState("");
  const [niveau, setNiveau] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const webTopInset = Platform.OS === "web" ? 67 : 0;
  const webBottomInset = Platform.OS === "web" ? 34 : 0;

  const canSubmit = naam.trim().length > 0 && niveau.length > 0;

  const handleSubmit = async () => {
    if (!canSubmit || submitting) return;

    setSubmitting(true);
    setErrorMessage("");

    try {
      if (naam.trim().length < 2) {
        throw new Error("Naam moet minstens 2 tekens bevatten");
      }

      await addSporter(naam.trim(), niveau);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      Alert.alert("Gelukt!", `${naam.trim()} is toegevoegd aan je team.`, [
        { text: "OK", onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const msg = err?.message || "Er is iets misgegaan. Probeer opnieuw.";
      setErrorMessage(msg);
      setTimeout(() => setErrorMessage(""), 5000);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + webTopInset }]}>
      <View style={styles.header}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          testID="back-btn"
        >
          <Ionicons name="arrow-back" size={24} color={Colors.text} />
        </Pressable>
        <Text style={styles.headerTitle}>Sporter toevoegen</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.formContainer,
          { paddingBottom: insets.bottom + webBottomInset + 40 },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Naam</Text>
          <TextInput
            style={styles.input}
            placeholder="Volledige naam"
            placeholderTextColor={Colors.textTertiary}
            value={naam}
            onChangeText={setNaam}
            autoCapitalize="words"
            returnKeyType="done"
            testID="naam-input"
          />
        </View>

        <View style={styles.fieldGroup}>
          <Text style={styles.label}>Niveau</Text>
          <Pressable
            style={[
              styles.dropdownTrigger,
              showDropdown && styles.dropdownTriggerActive,
            ]}
            onPress={() => setShowDropdown(true)}
            testID="niveau-dropdown"
          >
            <Text
              style={[
                styles.dropdownText,
                !niveau && styles.dropdownPlaceholder,
              ]}
            >
              {niveau || "Selecteer niveau"}
            </Text>
            <Ionicons
              name="chevron-down"
              size={20}
              color={Colors.textSecondary}
            />
          </Pressable>
        </View>

        {!!errorMessage && (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={18} color={Colors.error} />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        )}

        <Pressable
          style={({ pressed }) => [
            styles.submitButton,
            !canSubmit && styles.submitButtonDisabled,
            pressed && canSubmit && styles.submitButtonPressed,
          ]}
          onPress={handleSubmit}
          disabled={!canSubmit || submitting}
          testID="toevoegen-btn"
        >
          <Text
            style={[
              styles.submitButtonText,
              !canSubmit && styles.submitButtonTextDisabled,
            ]}
          >
            {submitting ? "Bezig..." : "Toevoegen"}
          </Text>
        </Pressable>
      </ScrollView>

      <Modal
        visible={showDropdown}
        transparent
        animationType="fade"
        onRequestClose={() => setShowDropdown(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowDropdown(false)}
        >
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Selecteer niveau</Text>
              <Pressable
                onPress={() => setShowDropdown(false)}
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
                    item === niveau && styles.niveauOptionSelected,
                    pressed && styles.niveauOptionPressed,
                  ]}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setNiveau(item);
                    setShowDropdown(false);
                  }}
                >
                  <Text
                    style={[
                      styles.niveauOptionText,
                      item === niveau && styles.niveauOptionTextSelected,
                    ]}
                  >
                    {item}
                  </Text>
                  {item === niveau && (
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
  formContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  fieldGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.textSecondary,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dropdownTrigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.surface,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dropdownTriggerActive: {
    borderColor: Colors.primary,
  },
  dropdownText: {
    fontSize: 16,
    fontFamily: "Inter_400Regular",
    color: Colors.text,
  },
  dropdownPlaceholder: {
    color: Colors.textTertiary,
  },
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#3D1515",
    borderRadius: 12,
    padding: 14,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#6B2525",
  },
  errorText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    color: Colors.error,
    flex: 1,
  },
  submitButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: "center",
    marginTop: 8,
  },
  submitButtonDisabled: {
    backgroundColor: Colors.surfaceSecondary,
  },
  submitButtonPressed: {
    backgroundColor: Colors.primaryDark,
    transform: [{ scale: 0.98 }],
  },
  submitButtonText: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    color: Colors.white,
  },
  submitButtonTextDisabled: {
    color: Colors.textTertiary,
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
    backgroundColor: "#4A3820",
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
});
