import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";

import {
    getAppSettings,
    getGeneralPlanByPeriod,
    getSelectedGoals,
    type OnboardingGoal,
} from "../../src/database";

import { createGeneralPlan } from "../../src/features/plans/plan-service";
import { colors } from "../../src/theme/colors";

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

type ExperienceLevel = "beginner" | "intermediate" | "advanced";

function getLocalDate(): string {
  const date = new Date();

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");

  return `${year}-${month}`;
}

function createPlanId(year: number, month: number): string {
  return `general-${year}-${month}-${Date.now()}`;
}

export default function CreateGeneralPlanScreen() {
  const today = getLocalDate();

  const [year, setYear] = useState(Number(today.slice(0, 4)));
  const [selectedMonth, setSelectedMonth] = useState(Number(today.slice(5, 7)));

  const [experienceLevel, setExperienceLevel] =
    useState<ExperienceLevel | null>(null);

  const [selectedGoals, setSelectedGoals] = useState<OnboardingGoal[]>([]);

  const [generalPlanExists, setGeneralPlanExists] = useState(false);

  const [loading, setLoading] = useState(true);
  const [checkingPlan, setCheckingPlan] = useState(false);
  const [generating, setGenerating] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadScreen() {
      try {
        const [settings, goals] = await Promise.all([
          getAppSettings(),
          getSelectedGoals(),
        ]);

        if (!mounted) return;

        if (!settings || settings.onboarding_completed !== 1) {
          router.replace("/onboarding");
          return;
        }

        setExperienceLevel(settings.experience_level);
        setSelectedGoals(goals);
      } catch (cause) {
        if (mounted) {
          setError(
            cause instanceof Error
              ? cause.message
              : "Could not load your saved preferences.",
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void loadScreen();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    async function checkGeneralPlan() {
      setCheckingPlan(true);
      setGeneralPlanExists(false);

      try {
        const existing = await getGeneralPlanByPeriod(year, selectedMonth);

        if (mounted) {
          setGeneralPlanExists(Boolean(existing));
        }
      } catch (cause) {
        if (mounted) {
          setError(
            cause instanceof Error
              ? cause.message
              : "Could not check the monthly plan.",
          );
        }
      } finally {
        if (mounted) {
          setCheckingPlan(false);
        }
      }
    }

    void checkGeneralPlan();

    return () => {
      mounted = false;
    };
  }, [year, selectedMonth]);

  function clearMessages() {
    setError("");
    setSuccess("");
  }

  async function handleGeneratePlan() {
    clearMessages();

    if (!experienceLevel || selectedGoals.length === 0) {
      setError("Your onboarding preferences are incomplete.");
      return;
    }

    setGenerating(true);

    try {
      const result = await createGeneralPlan({
        planId: createPlanId(year, selectedMonth),
        year,
        month: selectedMonth,
        experienceLevel,
        selectedGoals,
      });

      setGeneralPlanExists(true);

      setSuccess(
        result.created
          ? `${MONTHS[selectedMonth - 1]} ${year} plan created with its scheduled tasks.`
          : "A plan already exists for this month.",
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not generate the monthly plan.",
      );
    } finally {
      setGenerating(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} size="large" />
        <Text style={styles.helper}>Loading your preferences...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled"
    >
      <Pressable onPress={() => router.back()}>
        <Text style={styles.back}>← Back</Text>
      </Pressable>

      <Text style={styles.eyebrow}>MONTHLY PLANNING</Text>
      <Text style={styles.title}>General monthly plan</Text>
      <Text style={styles.description}>
        Choose a Gregorian month to generate your regular daily and weekly
        activities based on your saved preferences.
      </Text>

      <View style={styles.preferences}>
        <Text style={styles.label}>Your saved preferences</Text>
        <Text style={styles.preferenceText}>
          Experience level: {experienceLevel ?? "Not set"}
        </Text>
        <Text style={styles.preferenceText}>
          Selected goals: {selectedGoals.length}
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Select a month</Text>

        <View style={styles.yearSelector}>
          <Pressable
            style={styles.yearButton}
            onPress={() => {
              setYear((value) => value - 1);
              clearMessages();
            }}
          >
            <Text style={styles.yearButtonText}>‹</Text>
          </Pressable>

          <Text style={styles.yearText}>{year}</Text>

          <Pressable
            style={styles.yearButton}
            onPress={() => {
              setYear((value) => value + 1);
              clearMessages();
            }}
          >
            <Text style={styles.yearButtonText}>›</Text>
          </Pressable>
        </View>

        <View style={styles.monthGrid}>
          {MONTHS.map((month, index) => {
            const monthNumber = index + 1;
            const selected = selectedMonth === monthNumber;

            return (
              <Pressable
                key={month}
                onPress={() => {
                  setSelectedMonth(monthNumber);
                  clearMessages();
                }}
                style={[
                  styles.monthOption,
                  selected && styles.selectedMonthOption,
                ]}
              >
                <Text
                  style={[
                    styles.monthText,
                    selected && styles.selectedMonthText,
                  ]}
                >
                  {month}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {checkingPlan ? (
          <View style={styles.checking}>
            <ActivityIndicator color={colors.primary} size="small" />
            <Text style={styles.helper}>Checking existing plans...</Text>
          </View>
        ) : generalPlanExists ? (
          <Text style={styles.existsText}>
            A plan already exists for {MONTHS[selectedMonth - 1]} {year}.
          </Text>
        ) : (
          <Pressable
            style={[styles.primaryButton, generating && styles.disabledButton]}
            disabled={generating}
            onPress={() => void handleGeneratePlan()}
          >
            {generating ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>
                Generate monthly plan
              </Text>
            )}
          </Pressable>
        )}
      </View>

      {!!error && <Text style={styles.error}>{error}</Text>}
      {!!success && <Text style={styles.success}>{success}</Text>}

      {!!success && (
        <Pressable
          style={styles.dashboardButton}
          onPress={() => router.replace("/(tabs)")}
        >
          <Text style={styles.primaryButtonText}>Go to dashboard</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 22,
    paddingTop: 58,
    paddingBottom: 44,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },
  back: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 28,
  },
  eyebrow: {
    color: colors.gold,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2,
  },
  title: {
    color: colors.text,
    fontSize: 27,
    fontWeight: "800",
    marginTop: 10,
  },
  description: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 21,
    marginTop: 10,
    marginBottom: 22,
  },
  preferences: {
    padding: 16,
    borderRadius: 14,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 20,
  },
  preferenceText: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 6,
  },
  section: {
    padding: 17,
    borderRadius: 15,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
  },
  yearSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 28,
    marginVertical: 20,
  },
  yearButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  yearButtonText: {
    color: colors.primary,
    fontSize: 25,
    fontWeight: "600",
  },
  yearText: {
    color: colors.text,
    fontSize: 21,
    fontWeight: "800",
  },
  monthGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 9,
  },
  monthOption: {
    width: "31%",
    minHeight: 48,
    paddingHorizontal: 5,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  selectedMonthOption: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  monthText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "600",
  },
  selectedMonthText: {
    color: "#FFFFFF",
  },
  checking: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 9,
    marginTop: 18,
  },
  primaryButton: {
    minHeight: 50,
    backgroundColor: colors.primary,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  existsText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 20,
  },
  disabledButton: {
    opacity: 0.5,
  },
  helper: {
    color: colors.muted,
    fontSize: 11,
    lineHeight: 18,
  },
  error: {
    color: "#B42318",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 16,
  },
  success: {
    color: colors.primary,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: "600",
    marginTop: 16,
  },
  dashboardButton: {
    minHeight: 50,
    backgroundColor: colors.primary,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 18,
  },
  label: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 10,
  },
});
