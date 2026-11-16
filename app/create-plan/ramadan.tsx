import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    View,
} from "react-native";

import {
    getAppSettings,
    getRamadanPlanByStartDate,
    getSelectedGoals,
    type OnboardingGoal,
} from "../../src/database";

import { createRamadanPlan } from "../../src/features/plans/plan-service";
import { colors } from "../../src/theme/colors";

type ExperienceLevel = "beginner" | "intermediate" | "advanced";
type RamadanDuration = 29 | 30;

const RAMADAN_LEVELS = [
  {
    value: "beginner",
    title: "Beginner",
    target: "15 minutes",
    description: "Build a consistent daily Quran reading habit.",
  },
  {
    value: "intermediate",
    title: "Intermediate",
    target: "30 hour",
    description: "Develop a stronger daily reading routine.",
  },
  {
    value: "advanced",
    title: "Advanced",
    target: "1 hours",
    description: "Commit to an intensive Quran reading routine.",
  },
] as const;

function getLocalDate(): string {
  const date = new Date();

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function createPlanId(year: number, month: number): string {
  return `ramadan-${year}-${month}-${Date.now()}`;
}

function parseDate(date: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return null;
  }

  const parsed = new Date(`${date}T00:00:00.000Z`);

  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== date
  ) {
    return null;
  }

  return parsed;
}

function addDays(date: string, days: number): string {
  const parsed = parseDate(date);

  if (!parsed) {
    throw new Error("Invalid Ramadan start date.");
  }

  parsed.setUTCDate(parsed.getUTCDate() + days);

  return parsed.toISOString().slice(0, 10);
}

function formatDate(date: string): string {
  const parsed = parseDate(date);

  if (!parsed) {
    return date;
  }

  return parsed.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default function CreateRamadanPlanScreen() {
  const [ramadanStartDate, setRamadanStartDate] = useState(getLocalDate());

  const [ramadanDuration, setRamadanDuration] =
    useState<RamadanDuration | null>(null);

  const [ramadanExperienceLevel, setRamadanExperienceLevel] =
    useState<ExperienceLevel | null>(null);

  const [selectedGoals, setSelectedGoals] = useState<OnboardingGoal[]>([]);

  const [ramadanPlanExists, setRamadanPlanExists] = useState(false);

  const [loading, setLoading] = useState(true);
  const [checkingPlan, setCheckingPlan] = useState(false);
  const [generating, setGenerating] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const validRamadanStartDate = parseDate(ramadanStartDate);

  const ramadanEndDate =
    validRamadanStartDate && ramadanDuration
      ? addDays(ramadanStartDate, ramadanDuration - 1)
      : null;

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

        setRamadanExperienceLevel(settings.experience_level);
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

    async function checkRamadanPlan() {
      setRamadanPlanExists(false);

      if (!parseDate(ramadanStartDate)) {
        return;
      }

      setCheckingPlan(true);

      try {
        const existing = await getRamadanPlanByStartDate(ramadanStartDate);

        if (mounted) {
          setRamadanPlanExists(Boolean(existing));
        }
      } catch (cause) {
        if (mounted) {
          setError(
            cause instanceof Error
              ? cause.message
              : "Could not check the Ramadan plan.",
          );
        }
      } finally {
        if (mounted) {
          setCheckingPlan(false);
        }
      }
    }

    void checkRamadanPlan();

    return () => {
      mounted = false;
    };
  }, [ramadanStartDate]);

  function clearMessages() {
    setError("");
    setSuccess("");
  }

  async function handleGenerateRamadanPlan() {
    clearMessages();

    if (!validRamadanStartDate) {
      setError("Enter a valid start date in YYYY-MM-DD format.");
      return;
    }

    if (!ramadanDuration) {
      setError("Choose either a 29-day or 30-day Ramadan plan.");
      return;
    }

    if (!ramadanExperienceLevel) {
      setError("Choose your Ramadan experience level.");
      return;
    }

    if (selectedGoals.length === 0) {
      setError("Your onboarding goals are incomplete.");
      return;
    }

    setGenerating(true);

    try {
      const start = validRamadanStartDate;

      const result = await createRamadanPlan({
        planId: createPlanId(start.getUTCFullYear(), start.getUTCMonth() + 1),
        startDate: ramadanStartDate,
        daysInMonth: ramadanDuration,
        experienceLevel: ramadanExperienceLevel,
        selectedGoals,
      });

      setRamadanPlanExists(true);

      setSuccess(
        result.created
          ? `Ramadan plan created: ${ramadanDuration} days, ${formatDate(ramadanStartDate)} – ${formatDate(ramadanEndDate!)}.`
          : "A Ramadan plan already exists for this start date.",
      );
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Could not generate the Ramadan plan.",
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

      <Text style={styles.eyebrow}>SEASONAL SPECIAL PLAN</Text>
      <Text style={styles.title}>Ramadan plan</Text>
      <Text style={styles.description}>
        Create a dedicated daily worship routine for Ramadan. Choose your dates,
        duration, and Quran reading target.
      </Text>

      <View style={styles.levelSection}>
        <Text style={styles.sectionTitle}>Choose your Ramadan level</Text>
        <Text style={styles.sectionDescription}>
          Your level determines the daily Quran reading target and how the
          reading sessions are distributed throughout the day.
        </Text>

        <View style={styles.levelOptions}>
          {RAMADAN_LEVELS.map((level) => {
            const selected = ramadanExperienceLevel === level.value;

            return (
              <Pressable
                key={level.value}
                style={[
                  styles.levelOption,
                  selected && styles.selectedLevelOption,
                ]}
                onPress={() => {
                  setRamadanExperienceLevel(level.value);
                  clearMessages();
                }}
              >
                <View style={styles.levelHeader}>
                  <Text
                    style={[
                      styles.levelTitle,
                      selected && styles.selectedLevelText,
                    ]}
                  >
                    {level.title}
                  </Text>

                  {selected && <Text style={styles.selectedIndicator}>✓</Text>}
                </View>

                <Text
                  style={[
                    styles.levelTarget,
                    selected && styles.selectedLevelText,
                  ]}
                >
                  {level.target}
                </Text>

                <Text
                  style={[
                    styles.levelCaption,
                    selected && styles.selectedLevelCaption,
                  ]}
                >
                  Quran reading per day
                </Text>

                <Text
                  style={[
                    styles.levelDescription,
                    selected && styles.selectedLevelCaption,
                  ]}
                >
                  {level.description}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.ramadanCard}>
        <Text style={styles.sectionTitle}>Ramadan dates</Text>
        <Text style={styles.sectionDescription}>
          Enter the expected first day of Ramadan. The plan end date will be
          calculated from your selected duration.
        </Text>

        <Text style={styles.label}>Ramadan start date</Text>

        <TextInput
          value={ramadanStartDate}
          onChangeText={(value) => {
            setRamadanStartDate(value.trim());
            clearMessages();
          }}
          placeholder="YYYY-MM-DD"
          placeholderTextColor={colors.muted}
          keyboardType="numbers-and-punctuation"
          autoCapitalize="none"
          style={styles.dateInput}
          maxLength={10}
        />

        {ramadanStartDate.length > 0 && !validRamadanStartDate && (
          <Text style={styles.inputError}>
            Enter a valid date using YYYY-MM-DD.
          </Text>
        )}

        <Text style={[styles.label, styles.durationLabel]}>
          Choose plan duration
        </Text>

        <View style={styles.durationRow}>
          {([29, 30] as const).map((days) => {
            const selected = ramadanDuration === days;

            return (
              <Pressable
                key={days}
                style={[
                  styles.durationOption,
                  selected && styles.selectedDurationOption,
                ]}
                onPress={() => {
                  setRamadanDuration(days);
                  clearMessages();
                }}
              >
                <Text
                  style={[
                    styles.durationNumber,
                    selected && styles.selectedDurationText,
                  ]}
                >
                  {days}
                </Text>
                <Text
                  style={[
                    styles.durationCaption,
                    selected && styles.selectedDurationText,
                  ]}
                >
                  days
                </Text>
              </Pressable>
            );
          })}
        </View>

        {ramadanEndDate && (
          <View style={styles.dateSummary}>
            <Text style={styles.dateSummaryLabel}>Your Ramadan plan</Text>
            <Text style={styles.dateSummaryValue}>
              {formatDate(ramadanStartDate)} – {formatDate(ramadanEndDate)}
            </Text>
            <Text style={styles.dateSummaryHint}>
              {ramadanDuration} days in total. The end date is calculated
              automatically.
            </Text>
          </View>
        )}

        {checkingPlan && (
          <View style={styles.checking}>
            <ActivityIndicator color={colors.primary} size="small" />
            <Text style={styles.helper}>Checking existing plans...</Text>
          </View>
        )}

        {!checkingPlan && ramadanPlanExists && (
          <Text style={styles.existsText}>
            A Ramadan plan already exists for this start date.
          </Text>
        )}

        {!ramadanPlanExists && (
          <Pressable
            style={[
              styles.generateButton,
              (generating ||
                !validRamadanStartDate ||
                !ramadanDuration ||
                !ramadanExperienceLevel ||
                checkingPlan) &&
                styles.disabledButton,
            ]}
            disabled={
              generating ||
              !validRamadanStartDate ||
              !ramadanDuration ||
              !ramadanExperienceLevel ||
              checkingPlan
            }
            onPress={() => void handleGenerateRamadanPlan()}
          >
            {generating ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.primaryButtonText}>
                Generate Ramadan plan
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
  levelSection: {
    padding: 17,
    borderRadius: 15,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 16,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: "800",
  },
  sectionDescription: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 19,
    marginTop: 7,
    marginBottom: 16,
  },
  levelOptions: {
    gap: 9,
  },
  levelOption: {
    padding: 13,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
  },
  selectedLevelOption: {
    borderColor: "#806020",
    backgroundColor: "#806020",
  },
  levelHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  levelTitle: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "700",
  },
  selectedIndicator: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  levelTarget: {
    color: "#806020",
    fontSize: 20,
    fontWeight: "800",
    marginTop: 8,
  },
  levelCaption: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: "700",
    marginTop: 2,
  },
  levelDescription: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 7,
  },
  selectedLevelText: {
    color: "#FFFFFF",
  },
  selectedLevelCaption: {
    color: "#F5EBD7",
  },
  ramadanCard: {
    padding: 17,
    borderRadius: 15,
    backgroundColor: "#F8F0DF",
    borderWidth: 1,
    borderColor: colors.gold,
  },
  label: {
    color: colors.text,
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 10,
  },
  dateInput: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 11,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
    color: colors.text,
    fontSize: 15,
  },
  inputError: {
    color: "#B42318",
    fontSize: 11,
    marginTop: 7,
  },
  durationLabel: {
    marginTop: 20,
  },
  durationRow: {
    flexDirection: "row",
    gap: 12,
  },
  durationOption: {
    flex: 1,
    minHeight: 76,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  selectedDurationOption: {
    backgroundColor: "#806020",
    borderColor: "#806020",
  },
  durationNumber: {
    color: colors.text,
    fontSize: 23,
    fontWeight: "800",
  },
  durationCaption: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 2,
  },
  selectedDurationText: {
    color: "#FFFFFF",
  },
  dateSummary: {
    backgroundColor: "#FFFFFF90",
    borderRadius: 11,
    padding: 13,
    marginTop: 16,
  },
  dateSummaryLabel: {
    color: "#806020",
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  dateSummaryValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "700",
    marginTop: 6,
  },
  dateSummaryHint: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 5,
    lineHeight: 17,
  },
  checking: {
    flexDirection: "row",
    alignItems: "center",
    gap: 9,
    marginTop: 16,
  },
  existsText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 16,
  },
  generateButton: {
    minHeight: 50,
    backgroundColor: "#806020",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },
  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
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
});
