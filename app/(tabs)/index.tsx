import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  getActiveMonthlyPlan,
  getDailyPlanProgress,
  type DailyPlanProgress,
  type MonthlyPlanRecord,
} from "../../src/database";

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

function getLocalDate(): string {
  const date = new Date();

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatDate(date: string): string {
  const [year, month, day] = date.split("-");

  return `${Number(day)} ${MONTHS[Number(month) - 1]} ${year}`;
}

function ProgressBar({ value }: { value: number }) {
  const percentage = Math.max(0, Math.min(100, value));

  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${percentage}%` }]} />
    </View>
  );
}

function StatItem({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.statItem}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function MonthlyPlanCard({ plan }: { plan: MonthlyPlanRecord }) {
  const { t } = useTranslation();

  const isRamadan = plan.plan_type === "ramadan";

  return (
    <View style={styles.planCard}>
      <View style={styles.planTopRow}>
        <View style={styles.planIcon}>
          <Text style={styles.planIconText}>☾</Text>
        </View>

        <View style={styles.planBadge}>
          <View style={styles.activeDot} />
          <Text style={styles.planBadgeText}>ACTIVE PLAN</Text>
        </View>
      </View>

      <Text style={styles.planEyebrow}>
        {isRamadan ? t("home.plan.ramadan") : t("home.plan.standard")}
      </Text>
      {/* 
      <Text style={styles.planTitle}>
        {isRamadan
          ? `Ramadan ${plan.hijri_year}`
          : `Hijri ${plan.hijri_month}/${plan.hijri_year}`}
      </Text> */}

      <Text style={styles.planDates}>
        {formatDate(plan.start_date)} — {formatDate(plan.end_date)}
      </Text>

      <View style={styles.planDivider} />

      <Text style={styles.planDescription}>
        {t("home.plan.activeDescription")}
      </Text>
    </View>
  );
}

export default function HomeScreen() {
  const { t } = useTranslation();

  const [plan, setPlan] = useState<MonthlyPlanRecord | null>(null);
  const [progress, setProgress] = useState<DailyPlanProgress | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;

      async function loadDashboard() {
        try {
          setLoading(true);
          setError(false);

          const activePlan = await getActiveMonthlyPlan();

          const dailyProgress = activePlan
            ? await getDailyPlanProgress(getLocalDate(), activePlan.id)
            : null;

          if (!mounted) return;

          setPlan(activePlan ?? null);
          setProgress(dailyProgress);
        } catch (err) {
          console.error("Failed to load Home dashboard:", err);

          if (mounted) {
            setError(true);
          }
        } finally {
          if (mounted) {
            setLoading(false);
          }
        }
      }

      void loadDashboard();

      return () => {
        mounted = false;
      };
    }, []),
  );

  function handleCreatePlan() {
    router.push("/create-plan");
  }

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* HEADER */}
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>{t("home.greeting.eyebrow")}</Text>

          <Text style={styles.greeting}>{t("home.greeting.title")}</Text>
        </View>

        <View style={styles.avatar}>
          <Text style={styles.avatarText}>R</Text>
        </View>
      </View>

      {/* HERO */}
      <View style={styles.hero}>
        <View style={styles.heroContent}>
          <Text style={styles.heroEyebrow}>{t("home.hero.eyebrow")}</Text>

          <Text style={styles.heroTitle}>{t("home.hero.title")}</Text>

          <Text style={styles.heroBody}>{t("home.hero.description")}</Text>
        </View>

        <View style={styles.heroFooter}>
          <Text style={styles.heroFooterText}>{t("home.hero.footer")}</Text>

          <Text style={styles.moon}>☾</Text>
        </View>
      </View>

      {/* MONTHLY PLAN - PRIMARY SECTION */}
      <View style={styles.sectionHeading}>
        <View>
          <Text style={styles.sectionTitle}>{t("home.plan.sectionTitle")}</Text>

          <Text style={styles.sectionHint}>
            Your spiritual journey, one month at a time.
          </Text>
        </View>

        {plan && (
          <Pressable
            onPress={handleCreatePlan}
            style={styles.newPlanButton}
            accessibilityRole="button"
          >
            <Text style={styles.newPlanText}>+ New</Text>
          </Pressable>
        )}
      </View>

      {loading ? (
        <View style={styles.stateCard}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.stateText}>{t("home.dashboard.loading")}</Text>
        </View>
      ) : error ? (
        <View style={styles.stateCard}>
          <Text style={styles.emptyTitle}>
            {t("home.dashboard.errorTitle")}
          </Text>

          <Text style={styles.emptyBody}>
            {t("home.dashboard.errorDescription")}
          </Text>
        </View>
      ) : plan ? (
        <MonthlyPlanCard plan={plan} />
      ) : (
        <View style={styles.emptyPlanCard}>
          <View style={styles.emptyPlanIcon}>
            <Text style={styles.emptyPlanMoon}>☾</Text>
          </View>

          <Text style={styles.emptyTitle}>{t("home.plan.noPlanTitle")}</Text>

          <Text style={styles.emptyBody}>
            {t("home.plan.noPlanDescription")}
          </Text>

          <Pressable
            style={styles.createPlanButton}
            onPress={handleCreatePlan}
            accessibilityRole="button"
          >
            <Text style={styles.createPlanButtonText}>Create Monthly Plan</Text>

            <Text style={styles.createPlanArrow}>→</Text>
          </Pressable>

          <Text style={styles.createPlanHint}>
            Build a routine that matches your goals and experience.
          </Text>
        </View>
      )}

      {/* TODAY'S PROGRESS */}
      {!loading && !error && plan && (
        <>
          <View style={styles.sectionHeading}>
            <View>
              <Text style={styles.sectionTitle}>
                {t("home.overview.title")}
              </Text>

              <Text style={styles.sectionHint}>{t("home.overview.hint")}</Text>
            </View>
          </View>

          {!progress || progress.total === 0 ? (
            <View style={styles.emptyProgressCard}>
              <Text style={styles.emptyTitle}>
                {t("home.overview.noTasksTitle")}
              </Text>

              <Text style={styles.emptyBody}>
                {t("home.overview.noTasksDescription")}
              </Text>
            </View>
          ) : (
            <View style={styles.overviewCard}>
              <View style={styles.progressHeader}>
                <View>
                  <Text style={styles.progressHeading}>Today's completion</Text>

                  <Text style={styles.progressSubtitle}>
                    {progress.completed} of {progress.total} tasks completed
                  </Text>
                </View>

                <Text style={styles.progressPercentage}>
                  {progress.percentage}%
                </Text>
              </View>

              <ProgressBar value={progress.percentage} />

              <View style={styles.statsRow}>
                <StatItem value={progress.completed} label="Completed" />

                <View style={styles.statDivider} />

                <StatItem value={progress.pending} label="Remaining" />

                <View style={styles.statDivider} />

                <StatItem value={progress.skipped} label="Skipped" />
              </View>
            </View>
          )}
        </>
      )}

      {/* FOOTER */}
      <Text style={styles.footerNote}>{t("home.footer")}</Text>
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
    paddingTop: 58,
    paddingBottom: 40,
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 25,
  },

  eyebrow: {
    color: colors.muted,
    fontSize: 10,
    letterSpacing: 2,
    fontWeight: "700",
  },

  greeting: {
    color: colors.text,
    fontSize: 25,
    fontWeight: "700",
    marginTop: 5,
  },

  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },

  avatarText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },

  hero: {
    backgroundColor: colors.primaryDark,
    borderRadius: 23,
    padding: 22,
    overflow: "hidden",
  },

  heroContent: {
    maxWidth: 280,
  },

  heroEyebrow: {
    color: colors.gold,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2,
  },

  heroTitle: {
    color: "#FFFFFF",
    fontSize: 26,
    lineHeight: 34,
    fontWeight: "700",
    marginTop: 15,
  },

  heroBody: {
    color: "#D9E7DF",
    fontSize: 13,
    lineHeight: 21,
    marginTop: 9,
  },

  heroFooter: {
    marginTop: 23,
    borderTopWidth: 1,
    borderTopColor: "#FFFFFF30",
    paddingTop: 13,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  heroFooterText: {
    color: "#E7D5A7",
    fontSize: 11,
    fontWeight: "600",
  },

  moon: {
    color: colors.gold,
    fontSize: 27,
  },

  sectionHeading: {
    marginTop: 30,
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },

  sectionTitle: {
    color: colors.text,
    fontSize: 19,
    fontWeight: "700",
  },

  sectionHint: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 5,
    lineHeight: 17,
  },

  newPlanButton: {
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },

  newPlanText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "700",
  },

  planCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
  },

  planTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 19,
  },

  planIcon: {
    width: 43,
    height: 43,
    borderRadius: 14,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },

  planIconText: {
    color: colors.gold,
    fontSize: 25,
  },

  planBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.background,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 20,
  },

  activeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },

  planBadgeText: {
    color: colors.primary,
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.8,
  },

  planEyebrow: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },

  planTitle: {
    color: colors.text,
    fontSize: 23,
    fontWeight: "800",
    marginTop: 8,
  },

  planDates: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 7,
  },

  planDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 17,
  },

  planDescription: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 19,
  },

  emptyPlanCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 23,
    alignItems: "center",
  },

  emptyPlanIcon: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 13,
  },

  emptyPlanMoon: {
    color: colors.gold,
    fontSize: 34,
  },

  emptyTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },

  emptyBody: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 19,
    textAlign: "center",
    marginTop: 7,
  },

  createPlanButton: {
    width: "100%",
    minHeight: 52,
    backgroundColor: colors.primary,
    borderRadius: 13,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    marginTop: 21,
    paddingHorizontal: 18,
  },

  createPlanButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },

  createPlanArrow: {
    color: "#FFFFFF",
    fontSize: 19,
    marginLeft: 10,
  },

  createPlanHint: {
    color: colors.muted,
    fontSize: 10,
    textAlign: "center",
    marginTop: 12,
    lineHeight: 16,
  },

  overviewCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 19,
  },

  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 17,
  },

  progressHeading: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "700",
  },

  progressSubtitle: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 5,
  },

  progressPercentage: {
    color: colors.primary,
    fontSize: 25,
    fontWeight: "800",
  },

  progressTrack: {
    height: 9,
    backgroundColor: colors.border,
    borderRadius: 10,
    overflow: "hidden",
  },

  progressFill: {
    height: "100%",
    backgroundColor: colors.primary,
    borderRadius: 10,
  },

  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 22,
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
    marginTop: 5,
  },

  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.border,
  },

  emptyProgressCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 22,
    alignItems: "center",
  },

  stateCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },

  stateText: {
    color: colors.muted,
    fontSize: 12,
  },

  footerNote: {
    color: colors.muted,
    fontSize: 10,
    lineHeight: 16,
    textAlign: "center",
    marginTop: 32,
  },
});
