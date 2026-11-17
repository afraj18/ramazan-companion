import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
    ActivityIndicator,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";

import {
    getSelectedGoals,
    updateSelectedGoals,
    type OnboardingGoal,
} from "../src/database";

import { colors } from "../src/theme/colors";

const GOAL_OPTIONS: {
  key: OnboardingGoal;
  title: string;
  description: string;
  symbol: string;
}[] = [
  {
    key: "daily_prayers",
    title: "Daily Prayers",
    description: "Build consistency in your five daily prayers.",
    symbol: "◷",
  },
  {
    key: "quran_reading",
    title: "Quran Reading",
    description: "Make Quran recitation part of your daily routine.",
    symbol: "۞",
  },
  {
    key: "daily_dua",
    title: "Daily Dua",
    description: "Remember Allah through regular duas and supplications.",
    symbol: "☾",
  },
  {
    key: "good_character",
    title: "Good Character",
    description: "Improve your manners, patience and daily conduct.",
    symbol: "♡",
  },
  {
    key: "charity",
    title: "Charity & Sadaqah",
    description: "Make giving and helping others a regular habit.",
    symbol: "✧",
  },
  {
    key: "daily_reflection",
    title: "Daily Reflection",
    description: "Reflect on your actions and improve yourself.",
    symbol: "◉",
  },
];

export default function GoalsScreen() {
  const [selectedGoals, setSelectedGoals] = useState<OnboardingGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;

      async function loadGoals() {
        try {
          setLoading(true);
          setError(false);

          const savedGoals = await getSelectedGoals();

          if (mounted) {
            setSelectedGoals(savedGoals);
          }
        } catch (cause) {
          console.error("Failed to load goals:", cause);

          if (mounted) {
            setError(true);
          }
        } finally {
          if (mounted) {
            setLoading(false);
          }
        }
      }

      void loadGoals();

      return () => {
        mounted = false;
      };
    }, []),
  );

  function toggleGoal(goal: OnboardingGoal) {
    setSelectedGoals((current) =>
      current.includes(goal)
        ? current.filter((item) => item !== goal)
        : [...current, goal],
    );
  }

  async function persistGoals() {
    try {
      setSaving(true);
      setSaveError("");

      await updateSelectedGoals(selectedGoals);

      setShowConfirmation(false);
      setSaveSuccess(true);
    } catch (cause) {
      console.error("Failed to update goals:", cause);

      setSaveError(
        cause instanceof Error ? cause.message : "Unable to save your goals.",
      );
    } finally {
      setSaving(false);
    }
  }

  function handleSave() {
    if (selectedGoals.length === 0) {
      setSaveError("Please keep at least one goal selected.");
      return;
    }

    setSaveError("");
    setShowConfirmation(true);
  }

  return (
    <View style={styles.screen}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* HEADER */}
        <Pressable
          onPress={() => router.back()}
          style={styles.backButton}
          accessibilityRole="button"
        >
          <Text style={styles.backText}>← Back</Text>
        </Pressable>

        <Text style={styles.eyebrow}>PERSONAL DEVELOPMENT</Text>
        <Text style={styles.title}>My Goals</Text>
        <Text style={styles.subtitle}>
          Choose the areas you want to focus on in your spiritual journey. Your
          selection will be used when generating future general plans.
        </Text>

        {loading ? (
          <View style={styles.stateCard}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.stateText}>Loading your goals...</Text>
          </View>
        ) : error ? (
          <View style={styles.stateCard}>
            <Text style={styles.errorTitle}>Unable to load goals</Text>
            <Text style={styles.stateText}>Please go back and try again.</Text>
          </View>
        ) : (
          <>
            <View style={styles.selectionHeader}>
              <Text style={styles.selectionTitle}>Available Goals</Text>

              <Text style={styles.selectionCount}>
                {selectedGoals.length} selected
              </Text>
            </View>

            <View style={styles.goalList}>
              {GOAL_OPTIONS.map((goal) => {
                const selected = selectedGoals.includes(goal.key);

                return (
                  <Pressable
                    key={goal.key}
                    onPress={() => toggleGoal(goal.key)}
                    accessibilityRole="checkbox"
                    accessibilityState={{ checked: selected }}
                    style={[
                      styles.goalCard,
                      selected && styles.goalCardSelected,
                    ]}
                  >
                    <View
                      style={[
                        styles.goalIcon,
                        selected && styles.goalIconSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.goalSymbol,
                          selected && styles.goalSymbolSelected,
                        ]}
                      >
                        {goal.symbol}
                      </Text>
                    </View>

                    <View style={styles.goalContent}>
                      <Text style={styles.goalTitle}>{goal.title}</Text>

                      <Text style={styles.goalDescription}>
                        {goal.description}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.checkbox,
                        selected && styles.checkboxSelected,
                      ]}
                    >
                      {selected && <Text style={styles.checkmark}>✓</Text>}
                    </View>
                  </Pressable>
                );
              })}
            </View>

            {selectedGoals.length === 0 && (
              <Text style={styles.validationText}>
                Select at least one goal to continue.
              </Text>
            )}

            <View style={styles.noteCard}>
              <Text style={styles.noteTitle}>A quick note</Text>
              <Text style={styles.noteDescription}>
                Updating your goals will not change tasks in plans you've
                already created. Your new selection applies to future general
                plans.
              </Text>
            </View>

            <Pressable
              onPress={handleSave}
              disabled={saving || selectedGoals.length === 0}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.saveButton,
                pressed && styles.buttonPressed,
                (saving || selectedGoals.length === 0) && styles.buttonDisabled,
              ]}
            >
              {saveError !== "" && (
                <Text style={styles.saveError}>{saveError}</Text>
              )}
              {saving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.saveButtonText}>Save Changes</Text>
              )}
            </Pressable>
          </>
        )}
      </ScrollView>
      {/* CONFIRMATION MODAL */}
      <Modal
        visible={showConfirmation}
        transparent
        animationType="fade"
        onRequestClose={() => setShowConfirmation(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalIcon}>!</Text>

            <Text style={styles.modalTitle}>Update your goals?</Text>

            <Text style={styles.modalDescription}>
              Your updated goals will only apply to future general plans. Tasks
              in your existing plans will remain unchanged.
            </Text>

            <View style={styles.modalActions}>
              <Pressable
                style={styles.cancelButton}
                onPress={() => setShowConfirmation(false)}
                disabled={saving}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>

              <Pressable
                style={styles.confirmButton}
                onPress={persistGoals}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text style={styles.confirmButtonText}>Continue</Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* SUCCESS MODAL */}
      <Modal
        visible={saveSuccess}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setSaveSuccess(false);
          router.replace("/(tabs)/profile");
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.successIcon}>✓</Text>

            <Text style={styles.modalTitle}>Goals updated</Text>

            <Text style={styles.modalDescription}>
              Your goals have been saved successfully.
            </Text>

            <Pressable
              style={styles.successButton}
              onPress={() => {
                setSaveSuccess(false);
                router.replace("/(tabs)/profile");
              }}
            >
              <Text style={styles.confirmButtonText}>Back to Profile</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },

  content: {
    paddingHorizontal: 22,
    paddingTop: 65,
    paddingBottom: 45,
  },

  backButton: {
    alignSelf: "flex-start",
    paddingVertical: 8,
    paddingRight: 15,
    marginBottom: 25,
  },

  backText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "700",
  },

  eyebrow: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2,
  },

  title: {
    color: colors.text,
    fontSize: 29,
    fontWeight: "800",
    marginTop: 8,
  },

  subtitle: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 20,
    marginTop: 9,
    marginBottom: 27,
  },

  selectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 13,
  },

  selectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
  },

  selectionCount: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: "700",
  },

  goalList: {
    gap: 11,
  },

  goalCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 16,
    padding: 14,
  },

  goalCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.surface,
  },

  goalIcon: {
    width: 43,
    height: 43,
    borderRadius: 13,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },

  goalIconSelected: {
    backgroundColor: colors.primaryDark,
  },

  goalSymbol: {
    color: colors.gold,
    fontSize: 22,
  },

  goalSymbolSelected: {
    color: colors.gold,
  },

  goalContent: {
    flex: 1,
    marginHorizontal: 12,
  },

  goalTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "700",
  },

  goalDescription: {
    color: colors.muted,
    fontSize: 10,
    lineHeight: 15,
    marginTop: 4,
  },

  checkbox: {
    width: 22,
    height: 22,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
  },

  checkboxSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },

  checkmark: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },

  validationText: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 12,
  },

  noteCard: {
    backgroundColor: colors.surface,
    borderRadius: 15,
    padding: 16,
    marginTop: 23,
    borderWidth: 1,
    borderColor: colors.border,
  },

  noteTitle: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "700",
  },

  noteDescription: {
    color: colors.muted,
    fontSize: 11,
    lineHeight: 18,
    marginTop: 6,
  },

  saveButton: {
    minHeight: 53,
    backgroundColor: colors.primary,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 22,
  },

  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },

  buttonPressed: {
    opacity: 0.8,
  },

  buttonDisabled: {
    opacity: 0.45,
  },

  stateCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 25,
    alignItems: "center",
    gap: 10,
  },

  stateText: {
    color: colors.muted,
    fontSize: 12,
  },

  errorTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 25,
  },

  modalCard: {
    width: "100%",
    backgroundColor: colors.surface,
    borderRadius: 22,
    padding: 24,
    alignItems: "center",
  },

  modalIcon: {
    width: 44,
    height: 44,
    lineHeight: 44,
    textAlign: "center",
    borderRadius: 22,
    overflow: "hidden",
    backgroundColor: colors.background,
    color: colors.primary,
    fontSize: 24,
    fontWeight: "800",
  },

  successIcon: {
    width: 44,
    height: 44,
    lineHeight: 44,
    textAlign: "center",
    borderRadius: 22,
    overflow: "hidden",
    backgroundColor: colors.background,
    color: colors.primary,
    fontSize: 24,
    fontWeight: "800",
  },

  modalTitle: {
    color: colors.text,
    fontSize: 19,
    fontWeight: "800",
    marginTop: 17,
  },

  modalDescription: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 20,
    textAlign: "center",
    marginTop: 10,
  },

  modalActions: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
    marginTop: 25,
  },

  cancelButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.background,
    justifyContent: "center",
    alignItems: "center",
  },

  cancelButtonText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "700",
  },

  confirmButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
  },

  confirmButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },

  successButton: {
    width: "100%",
    height: 48,
    borderRadius: 12,
    backgroundColor: colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 25,
  },

  saveError: {
    color: "#D9534F",
    fontSize: 12,
    marginTop: 12,
    textAlign: "center",
  },
});
