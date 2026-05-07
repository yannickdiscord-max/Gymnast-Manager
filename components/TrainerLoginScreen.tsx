import React, { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import Colors from "@/constants/colors";
import { useAuth } from "@/components/AuthProvider";
import { TRAINER_ACCOUNTS } from "@/lib/auth";

export default function TrainerLoginScreen() {
  const { login } = useAuth();
  const [selectedTrainer, setSelectedTrainer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async () => {
    if (!selectedTrainer) {
      setError("Kies een trainer account.");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await login(selectedTrainer);
    } catch {
      setError("Inloggen mislukt. Kies een bestaand account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>Trainer login</Text>
        <Text style={styles.subtitle}>
          Kies een bestaand trainer account. Dit apparaat onthoudt daarna welke trainer je bent.
        </Text>
        <View style={styles.accountList}>
          {TRAINER_ACCOUNTS.map((account) => {
            const isSelected = selectedTrainer === account.name;
            return (
              <Pressable
                key={account.id}
                style={({ pressed }) => [
                  styles.accountButton,
                  isSelected && styles.accountButtonSelected,
                  pressed && styles.accountButtonPressed,
                ]}
                onPress={() => {
                  setSelectedTrainer(account.name);
                  setError("");
                }}
                disabled={loading}
                testID={`trainer-login-account-${account.id}`}
              >
                <Text
                  style={[
                    styles.accountButtonText,
                    isSelected && styles.accountButtonTextSelected,
                  ]}
                >
                  {account.name}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {!!error && <Text style={styles.error}>{error}</Text>}
        <Pressable
          style={({ pressed }) => [styles.button, pressed && styles.buttonPressed, loading && styles.buttonDisabled]}
          onPress={() => void handleLogin()}
          disabled={loading}
          testID="trainer-login-submit"
        >
          {loading ? (
            <ActivityIndicator color={Colors.white} />
          ) : (
            <Text style={styles.buttonText}>Inloggen</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  card: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: Colors.surface,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    gap: 12,
  },
  title: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: Colors.text,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  accountList: {
    gap: 8,
  },
  accountButton: {
    backgroundColor: Colors.surfaceSecondary,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  accountButtonSelected: {
    backgroundColor: Colors.primaryDark,
    borderColor: Colors.primary,
  },
  accountButtonPressed: {
    opacity: 0.9,
  },
  accountButtonText: {
    color: Colors.text,
    fontFamily: "Inter_500Medium",
    fontSize: 16,
  },
  accountButtonTextSelected: {
    color: Colors.white,
    fontFamily: "Inter_600SemiBold",
  },
  error: {
    color: Colors.error,
    fontFamily: "Inter_400Regular",
    fontSize: 13,
  },
  button: {
    marginTop: 4,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13,
  },
  buttonPressed: {
    opacity: 0.9,
  },
  buttonDisabled: {
    opacity: 0.65,
  },
  buttonText: {
    color: Colors.white,
    fontFamily: "Inter_600SemiBold",
    fontSize: 16,
  },
});
