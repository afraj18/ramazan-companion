import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  getActiveMonthlyPlan,
  getDailyPlanProgress,
  getDatabaseHealth,
  type DailyPlanProgress,
  type MonthlyPlanRecord,
} from "../../src/database";
import { colors } from "../../src/theme/colors";

function getLocalDate(): string {
  const date = new Date();

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function ProgressRing({ value }: { value: number }) {
  const { t } = useTranslation();

  return (
    <View style={styles.progressRing}>
      <Text style={styles.progressValue}>{value}%</Text>
      <Text style={styles.progressLabel}>{t("home.overview.progress")}</Text>
    </View>
  );
}

function StatItem({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.statItem}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

export default function HomeScreen() {
  const { t } = useTranslation();

  const [plan, setPlan] = useState<MonthlyPlanRecord | null>(null);
  const [progress, setProgress] = useState<DailyPlanProgress | null>(null);

  const [databaseStatus, setDatabaseStatus] = useState(
    "home.database.checking",
  );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;

      async function loadDashboard() {
        try {
          setLoading(true);
          setError(false);

          const [activePlan, databaseHealth] = await Promise.all([
            getActiveMonthlyPlan(),
            getDatabaseHealth(),
          ]);

          const dailyProgress = activePlan
            ? await getDailyPlanProgress(getLocalDate(), activePlan.id)
            : null;

          if (!mounted) return;

          setPlan(activePlan ?? null);
          setProgress(dailyProgress);
          setDatabaseStatus(
            databaseHealth ? "home.database.ready" : "home.database.notFound",
          );
        } catch (err) {
          console.error("Failed to load Home dashboard:", err);

          if (mounted) {
            setError(true);
            setDatabaseStatus("home.database.failed");
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

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>{t("home.greeting.eyebrow")}</Text>

          <Text style={styles.greeting}>{t("home.greeting.title")}</Text>
        </View>

        <View style={styles.avatar}>
          <Text style={styles.avatarText}>R</Text>
        </View>
      </View>

      {/* Hero */}
      <View style={styles.hero}>
        <Text style={styles.heroEyebrow}>{t("home.hero.eyebrow")}</Text>

        <Text style={styles.heroTitle}>{t("home.hero.title")}</Text>

        <Text style={styles.heroBody}>{t("home.hero.description")}</Text>

        <View style={styles.heroFooter}>
          <Text style={styles.heroFooterText}>{t("home.hero.footer")}</Text>

          <Text style={styles.moon}>☾</Text>
        </View>
      </View>

      {/* Today's Overview */}
      <View style={styles.sectionHeading}>
        <Text style={styles.sectionTitle}>{t("home.overview.title")}</Text>

        <Text style={styles.sectionHint}>{t("home.overview.hint")}</Text>
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
      ) : !plan ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>✦</Text>
          <Text style={styles.emptyTitle}>{t("home.plan.noPlanTitle")}</Text>
          <Text style={styles.emptyBody}>
            {t("home.plan.noPlanDescription")}
          </Text>
        </View>
      ) : !progress || progress.total === 0 ? (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyIcon}>☾</Text>
          <Text style={styles.emptyTitle}>
            {t("home.overview.noTasksTitle")}
          </Text>
          <Text style={styles.emptyBody}>
            {t("home.overview.noTasksDescription")}
          </Text>
        </View>
      ) : (
        <View style={styles.overviewCard}>
          <ProgressRing value={progress.percentage} />

          <View style={styles.overviewDetails}>
            <Text style={styles.metricValue}>
              {progress.completed} / {progress.total}
            </Text>

            <Text style={styles.metricLabel}>
              {t("home.overview.tasksCompleted")}
            </Text>

            <View style={styles.divider} />

            <View style={styles.statsRow}>
              <StatItem
                value={progress.pending}
                label={t("home.overview.pending")}
              />

              <StatItem
                value={progress.skipped}
                label={t("home.overview.skipped")}
              />
            </View>
          </View>
        </View>
      )}

      {/* Monthly Plan */}
      <View style={styles.sectionHeading}>
        <Text style={styles.sectionTitle}>{t("home.plan.sectionTitle")}</Text>
      </View>

      {loading ? (
        <View style={styles.stateCard}>
          <ActivityIndicator color={colors.primary} />
        </View>
      ) : plan ? (
        <View style={styles.planCard}>
          <Text style={styles.planEyebrow}>
            {plan.plan_type === "ramadan"
              ? t("home.plan.ramadan")
              : t("home.plan.standard")}
          </Text>

          <Text style={styles.planTitle}>
            {t("home.plan.hijriMonth", {
              month: plan.hijri_month,
              year: plan.hijri_year,
            })}
          </Text>

          <Text style={styles.planDates}>
            {plan.start_date} — {plan.end_date}
          </Text>

          <Text style={styles.planDescription}>
            {t("home.plan.activeDescription")}
          </Text>
        </View>
      ) : (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>{t("home.plan.noPlanTitle")}</Text>

          <Text style={styles.emptyBody}>
            {t("home.plan.noPlanDescription")}
          </Text>
        </View>
      )}

      {/* Database Status */}
      <Text style={styles.databaseStatus}>● {t(databaseStatus)}</Text>

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
    padding: 20,
    paddingTop: 58,
    paddingBottom: 32,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 22,
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
    width: 42,
    height: 42,
    borderRadius: 21,
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
    borderRadius: 22,
    padding: 22,
    overflow: "hidden",
  },
  heroEyebrow: {
    color: colors.gold,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2,
  },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: 27,
    lineHeight: 34,
    fontWeight: "700",
    marginTop: 15,
    maxWidth: 240,
  },
  heroBody: {
    color: "#D9E7DF",
    fontSize: 13,
    lineHeight: 20,
    marginTop: 9,
    maxWidth: 260,
  },
  heroFooter: {
    marginTop: 24,
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
    marginTop: 26,
    marginBottom: 12,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "700",
  },
  sectionHint: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 4,
  },
  overviewCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
  },
  progressRing: {
    width: 112,
    height: 112,
    borderRadius: 56,
    borderWidth: 8,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  progressValue: {
    color: colors.primary,
    fontSize: 26,
    fontWeight: "800",
  },
  progressLabel: {
    color: colors.muted,
    fontSize: 9,
    marginTop: 2,
  },
  overviewDetails: {
    flex: 1,
  },
  metricValue: {
    color: colors.text,
    fontSize: 19,
    fontWeight: "700",
  },
  metricLabel: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: 12,
  },
  statsRow: {
    flexDirection: "row",
    gap: 20,
  },
  statItem: {
    flex: 1,
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 22,
    alignItems: "center",
  },
  emptyIcon: {
    color: colors.gold,
    fontSize: 28,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
    marginTop: 8,
    textAlign: "center",
  },
  emptyBody: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
    marginTop: 6,
  },
  stateCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 22,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  stateText: {
    color: colors.muted,
    fontSize: 12,
  },
  planCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 20,
  },
  planEyebrow: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  planTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "700",
    marginTop: 8,
  },
  planDates: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 6,
  },
  planDescription: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 12,
  },
  databaseStatus: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: "600",
    marginTop: 22,
  },
  footerNote: {
    color: colors.muted,
    fontSize: 10,
    marginTop: 7,
  },
});
