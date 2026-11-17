import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  getActiveMonthlyPlan,
  getAppSettings,
  getDailyPlanProgress,
  getDatabase,
  getSelectedGoals,
  updateAppLanguage,
  type AppLanguage,
  type AppSettings,
  type DailyPlanProgress,
  type MonthlyPlanRecord,
  type OnboardingGoal,
} from "../../src/database";

import { exportDatabase } from "../../src/database/exportDatabase";
import i18n from "../../src/i18n";
import { colors } from "../../src/theme/colors";

const GOAL_LABELS: Record<OnboardingGoal, string> = {
  daily_prayers: "Daily Prayers",
  quran_reading: "Quran Reading",
  daily_dua: "Daily Dua",
  good_character: "Good Character",
  charity: "Charity & Sadaqah",
  daily_reflection: "Daily Reflection",
};

const LANGUAGE_LABELS: Record<AppLanguage, string> = {
  en: "English",
  ta: "தமிழ் (Tamil)",
  si: "සිංහල (Sinhala)",
};

const EXPERIENCE_LABELS: Record<string, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

function getLocalDate(): string {
  const date = new Date();

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDate(date: string): string {
  const [year, month, day] = date.split("-");

  return new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
  ).toLocaleDateString("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function SectionHeading({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <View style={styles.sectionHeading}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
    </View>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

function ProgressBar({ percentage }: { percentage: number }) {
  const value = Math.max(0, Math.min(100, percentage));

  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${value}%` }]} />
    </View>
  );
}

export default function ProfileScreen() {
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [goals, setGoals] = useState<OnboardingGoal[]>([]);
  const [plan, setPlan] = useState<MonthlyPlanRecord | null>(null);
  const [progress, setProgress] = useState<DailyPlanProgress | null>(null);

  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState(false);

  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [savingLanguage, setSavingLanguage] = useState(false);
  const [languageError, setLanguageError] = useState("");

  useFocusEffect(
    useCallback(() => {
      let mounted = true;

      async function loadProfile() {
        try {
          setLoading(true);
          setError(false);

          const [appSettings, selectedGoals, activePlan] = await Promise.all([
            getAppSettings(),
            getSelectedGoals(),
            getActiveMonthlyPlan(),
          ]);

          const dailyProgress = activePlan
            ? await getDailyPlanProgress(getLocalDate(), activePlan.id)
            : null;

          if (!mounted) return;

          setSettings(appSettings);
          setGoals(selectedGoals);
          setPlan(activePlan);
          setProgress(dailyProgress);
        } catch (cause) {
          console.error("Failed to load profile:", cause);

          if (mounted) {
            setError(true);
          }
        } finally {
          if (mounted) {
            setLoading(false);
          }
        }
      }

      void loadProfile();

      return () => {
        mounted = false;
      };
    }, []),
  );

  async function handleExport() {
    try {
      setExporting(true);

      const database = await getDatabase();
      await exportDatabase(database);
    } catch (cause) {
      console.error("Database export failed:", cause);

      Alert.alert(
        "Export failed",
        "Unable to export the database. Please try again.",
      );
    } finally {
      setExporting(false);
    }
  }

  async function handleLanguageChange(language: AppLanguage) {
    if (settings?.language === language) {
      setShowLanguageModal(false);
      return;
    }

    try {
      setSavingLanguage(true);
      setLanguageError("");

      // Persist the preference first.
      await updateAppLanguage(language);

      // Apply the language across the app.
      await i18n.changeLanguage(language);

      // Update the Profile screen immediately.
      setSettings((previous) =>
        previous
          ? {
              ...previous,
              language,
            }
          : previous,
      );

      setShowLanguageModal(false);
    } catch (cause) {
      console.error("Failed to update app language:", cause);

      setLanguageError(
        cause instanceof Error
          ? cause.message
          : "Unable to update language. Please try again.",
      );
    } finally {
      setSavingLanguage(false);
    }
  }

  const experienceLevel = settings
    ? (EXPERIENCE_LABELS[settings.experience_level] ??
      settings.experience_level)
    : "Not available";

  const language = settings
    ? (LANGUAGE_LABELS[settings.language] ?? settings.language)
    : "Not available";

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* HEADER */}
      <View style={styles.header}>
        <Text style={styles.eyebrow}>YOUR PERSONAL SPACE</Text>
        <Text style={styles.title}>Profile</Text>
        <Text style={styles.subtitle}>
          Your goals, progress and spiritual journey.
        </Text>
      </View>

      {loading ? (
        <View style={styles.stateCard}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.stateText}>Loading your profile...</Text>
        </View>
      ) : error ? (
        <View style={styles.stateCard}>
          <Text style={styles.errorTitle}>Unable to load profile</Text>
          <Text style={styles.stateText}>
            Please reopen this screen and try again.
          </Text>
        </View>
      ) : (
        <>
          {/* PROFILE SUMMARY */}
          <View style={styles.profileCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>A</Text>
            </View>

            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>My Journey</Text>
              <Text style={styles.profileDescription}>
                Building consistency, one day at a time.
              </Text>
            </View>

            <View style={styles.levelBadge}>
              <Text style={styles.levelBadgeText}>
                {experienceLevel.toUpperCase()}
              </Text>
            </View>
          </View>

          {/* TODAY'S PROGRESS */}
          <SectionHeading
            title="Today's Progress"
            subtitle="Your daily task completion"
          />

          <View style={styles.card}>
            {progress && progress.total > 0 ? (
              <>
                <View style={styles.progressHeader}>
                  <View>
                    <Text style={styles.progressValue}>
                      {progress.percentage}%
                    </Text>
                    <Text style={styles.mutedText}>Daily completion</Text>
                  </View>

                  <View style={styles.completionBadge}>
                    <Text style={styles.completionBadgeText}>
                      {progress.completed}/{progress.total}
                    </Text>
                  </View>
                </View>

                <ProgressBar percentage={progress.percentage} />

                <View style={styles.statsRow}>
                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{progress.completed}</Text>
                    <Text style={styles.statLabel}>Completed</Text>
                  </View>

                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{progress.pending}</Text>
                    <Text style={styles.statLabel}>Remaining</Text>
                  </View>

                  <View style={styles.statItem}>
                    <Text style={styles.statValue}>{progress.skipped}</Text>
                    <Text style={styles.statLabel}>Skipped</Text>
                  </View>
                </View>
              </>
            ) : (
              <Text style={styles.emptyText}>
                No tasks are scheduled for today yet.
              </Text>
            )}
          </View>

          {/* CURRENT PLAN */}
          <SectionHeading
            title="Current Plan"
            subtitle="Your active spiritual routine"
          />

          <View style={styles.card}>
            {plan ? (
              <>
                <View style={styles.planHeader}>
                  <View style={styles.planIcon}>
                    <Text style={styles.planIconText}>☾</Text>
                  </View>

                  <View style={styles.planInfo}>
                    <Text style={styles.planType}>
                      {plan.plan_type === "ramadan"
                        ? "Ramadan Plan"
                        : "General Monthly Plan"}
                    </Text>

                    <Text style={styles.mutedText}>
                      {formatDate(plan.start_date)} –{" "}
                      {formatDate(plan.end_date)}
                    </Text>
                  </View>
                </View>
              </>
            ) : (
              <Text style={styles.emptyText}>
                You don't have an active plan today.
              </Text>
            )}
          </View>

          {/* GOALS */}
          <SectionHeading
            title="My Goals"
            subtitle="What you're working towards"
          />

          <View style={styles.card}>
            {goals.length > 0 ? (
              <View style={styles.goalList}>
                {goals.map((goal) => (
                  <View key={goal} style={styles.goalItem}>
                    <View style={styles.goalCheck}>
                      <Text style={styles.goalCheckText}>✓</Text>
                    </View>

                    <Text style={styles.goalText}>{GOAL_LABELS[goal]}</Text>
                  </View>
                ))}
                <Pressable
                  style={styles.manageGoalsButton}
                  onPress={() => router.push("/goals")}
                  accessibilityRole="button"
                >
                  <Text style={styles.manageGoalsText}>Manage Goals</Text>
                  <Text style={styles.manageGoalsArrow}>→</Text>
                </Pressable>
              </View>
            ) : (
              <Text style={styles.emptyText}>
                No goals have been selected yet.
              </Text>
            )}
          </View>

          {/* PREFERENCES */}
          <SectionHeading
            title="Preferences"
            subtitle="Your current app configuration"
          />

          <View style={styles.card}>
            <InfoRow label="Experience level" value={experienceLevel} />

            <View style={styles.infoDivider} />

            <View style={styles.languageRow}>
              <View>
                <Text style={styles.infoLabel}>App language</Text>
                <Text style={styles.languageValue}>{language}</Text>
              </View>

              <Pressable
                style={styles.changeLanguageButton}
                onPress={() => {
                  setLanguageError("");
                  setShowLanguageModal(true);
                }}
                accessibilityRole="button"
              >
                <Text style={styles.changeLanguageText}>Change</Text>
              </Pressable>
            </View>
          </View>
          {/* DATA & BACKUP */}
          <SectionHeading
            title="Data & Backup"
            subtitle="Keep a copy of your app data"
          />

          <Pressable
            style={({ pressed }) => [
              styles.exportButton,
              pressed && styles.buttonPressed,
              exporting && styles.buttonDisabled,
            ]}
            onPress={handleExport}
            disabled={exporting}
            accessibilityRole="button"
          >
            {exporting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Text style={styles.exportIcon}>↓</Text>
                <View style={styles.exportInfo}>
                  <Text style={styles.exportTitle}>Export Database</Text>
                  <Text style={styles.exportDescription}>
                    Create a backup of your local app data.
                  </Text>
                </View>
                <Text style={styles.exportArrow}>→</Text>
              </>
            )}
          </Pressable>
        </>
      )}

      <Text style={styles.footer}>Ramazan Companion</Text>
      <Modal
        visible={showLanguageModal}
        transparent
        animationType="fade"
        onRequestClose={() => {
          if (!savingLanguage) {
            setShowLanguageModal(false);
          }
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.languageModal}>
            <Text style={styles.modalTitle}>App Language</Text>

            <Text style={styles.modalDescription}>
              Select the language you want to use throughout the app.
            </Text>

            {(
              [
                { code: "en", label: "English", native: "English" },
                { code: "ta", label: "Tamil", native: "தமிழ்" },
                { code: "si", label: "Sinhala", native: "සිංහල" },
              ] as const
            ).map((item) => {
              const selected = settings?.language === item.code;

              return (
                <Pressable
                  key={item.code}
                  style={[
                    styles.languageOption,
                    selected && styles.languageOptionSelected,
                  ]}
                  onPress={() => handleLanguageChange(item.code)}
                  disabled={savingLanguage}
                  accessibilityRole="button"
                >
                  <View>
                    <Text style={styles.languageOptionTitle}>
                      {item.native}
                    </Text>
                    <Text style={styles.languageOptionSubtitle}>
                      {item.label}
                    </Text>
                  </View>

                  {selected && <Text style={styles.selectedCheck}>✓</Text>}
                </Pressable>
              );
            })}

            {languageError ? (
              <Text style={styles.languageError}>{languageError}</Text>
            ) : null}

            {savingLanguage && (
              <ActivityIndicator
                color={colors.primary}
                style={styles.languageLoader}
              />
            )}

            <Pressable
              style={styles.cancelButton}
              onPress={() => setShowLanguageModal(false)}
              disabled={savingLanguage}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </ScrollView>
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
    paddingBottom: 40,
  },

  header: {
    marginBottom: 25,
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
    marginTop: 7,
  },

  subtitle: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 7,
    lineHeight: 19,
  },

  profileCard: {
    backgroundColor: colors.primaryDark,
    borderRadius: 20,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 29,
  },

  avatar: {
    width: 49,
    height: 49,
    borderRadius: 17,
    backgroundColor: colors.gold,
    alignItems: "center",
    justifyContent: "center",
  },

  avatarText: {
    color: colors.primaryDark,
    fontSize: 22,
    fontWeight: "800",
  },

  profileInfo: {
    flex: 1,
    marginLeft: 13,
    marginRight: 8,
  },

  profileName: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },

  profileDescription: {
    color: "#D9E7DF",
    fontSize: 10,
    marginTop: 5,
    lineHeight: 15,
  },

  levelBadge: {
    backgroundColor: "#FFFFFF20",
    paddingHorizontal: 9,
    paddingVertical: 7,
    borderRadius: 9,
  },

  levelBadgeText: {
    color: colors.gold,
    fontSize: 8,
    fontWeight: "800",
    letterSpacing: 0.5,
  },

  sectionHeading: {
    marginBottom: 12,
    marginTop: 8,
  },

  sectionTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "700",
  },

  sectionSubtitle: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 4,
  },

  card: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    marginBottom: 23,
  },

  progressHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },

  progressValue: {
    color: colors.primary,
    fontSize: 27,
    fontWeight: "800",
  },

  mutedText: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 4,
  },

  completionBadge: {
    backgroundColor: colors.background,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },

  completionBadgeText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "700",
  },

  progressTrack: {
    height: 9,
    borderRadius: 10,
    backgroundColor: colors.border,
    overflow: "hidden",
  },

  progressFill: {
    height: "100%",
    backgroundColor: colors.primary,
    borderRadius: 10,
  },

  statsRow: {
    flexDirection: "row",
    marginTop: 20,
  },

  statItem: {
    flex: 1,
    alignItems: "center",
  },

  statValue: {
    color: colors.text,
    fontSize: 19,
    fontWeight: "800",
  },

  statLabel: {
    color: colors.muted,
    fontSize: 10,
    marginTop: 4,
  },

  planHeader: {
    flexDirection: "row",
    alignItems: "center",
  },

  planIcon: {
    width: 43,
    height: 43,
    borderRadius: 13,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },

  planIconText: {
    color: colors.gold,
    fontSize: 25,
  },

  planInfo: {
    flex: 1,
    marginLeft: 13,
  },

  planType: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "700",
  },

  goalList: {
    gap: 15,
  },

  goalItem: {
    flexDirection: "row",
    alignItems: "center",
  },

  goalCheck: {
    width: 23,
    height: 23,
    borderRadius: 8,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },

  goalCheckText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "800",
  },

  goalText: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 11,
  },

  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 5,
  },

  infoLabel: {
    color: colors.muted,
    fontSize: 12,
  },

  infoValue: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "700",
  },

  infoDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 13,
  },

  emptyText: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 19,
  },

  stateCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
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

  exportButton: {
    backgroundColor: colors.primary,
    borderRadius: 16,
    padding: 17,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 25,
  },

  exportIcon: {
    color: "#FFFFFF",
    fontSize: 25,
    fontWeight: "700",
    marginRight: 13,
  },

  exportInfo: {
    flex: 1,
  },

  exportTitle: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },

  exportDescription: {
    color: "#D9E7DF",
    fontSize: 10,
    marginTop: 4,
  },

  exportArrow: {
    color: "#FFFFFF",
    fontSize: 20,
  },

  buttonPressed: {
    opacity: 0.8,
  },

  buttonDisabled: {
    opacity: 0.6,
  },

  footer: {
    color: colors.muted,
    fontSize: 10,
    textAlign: "center",
    marginTop: 12,
  },
  manageGoalsButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: 17,
    paddingTop: 15,
  },

  manageGoalsText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "700",
  },

  manageGoalsArrow: {
    color: colors.primary,
    fontSize: 18,
  },
  languageRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  languageValue: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "700",
    marginTop: 6,
  },

  changeLanguageButton: {
    backgroundColor: colors.background,
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 9,
  },

  changeLanguageText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: "700",
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 22,
  },

  languageModal: {
    width: "100%",
    maxWidth: 400,
    backgroundColor: colors.surface,
    borderRadius: 22,
    padding: 22,
  },

  modalTitle: {
    color: colors.text,
    fontSize: 19,
    fontWeight: "800",
  },

  modalDescription: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 19,
    marginTop: 7,
    marginBottom: 20,
  },

  languageOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 13,
    marginBottom: 10,
  },

  languageOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.background,
  },

  languageOptionTitle: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "700",
  },

  languageOptionSubtitle: {
    color: colors.muted,
    fontSize: 10,
    marginTop: 4,
  },

  selectedCheck: {
    color: colors.primary,
    fontSize: 19,
    fontWeight: "800",
  },

  languageError: {
    color: "#D94848",
    fontSize: 11,
    marginTop: 8,
  },

  languageLoader: {
    marginVertical: 12,
  },

  cancelButton: {
    alignItems: "center",
    paddingVertical: 12,
    marginTop: 5,
  },

  cancelButtonText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
  },
});
