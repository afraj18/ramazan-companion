import { useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import {
  getActiveMonthlyPlan,
  getPlanDailyAnalytics,
  type DailyAnalyticsRecord,
  type MonthlyPlanRecord,
} from "../../src/database";

import { colors } from "../../src/theme/colors";

interface AnalyticsData {
  plan: MonthlyPlanRecord;
  records: DailyAnalyticsRecord[];
  weekRecords: DailyAnalyticsRecord[];
}

function getLocalDate(): string {
  const date = new Date();

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function addDays(dateString: string, amount: number): string {
  const [year, month, day] = dateString.split("-").map(Number);

  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + amount);

  const newYear = date.getFullYear();
  const newMonth = String(date.getMonth() + 1).padStart(2, "0");
  const newDay = String(date.getDate()).padStart(2, "0");

  return `${newYear}-${newMonth}-${newDay}`;
}

function formatDate(dateString: string): string {
  const [year, month, day] = dateString.split("-").map(Number);

  return new Date(year, month - 1, day).toLocaleDateString("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function getDayLabel(dateString: string): string {
  const [year, month, day] = dateString.split("-").map(Number);

  return new Date(year, month - 1, day).toLocaleDateString("en", {
    weekday: "short",
  });
}

function ProgressBar({ percentage }: { percentage: number }) {
  const value = Math.max(0, Math.min(100, percentage));

  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${value}%` }]} />
    </View>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function AnalyticsScreen() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let mounted = true;

      async function loadAnalytics() {
        try {
          setLoading(true);
          setError(false);

          const today = getLocalDate();
          const activePlan = await getActiveMonthlyPlan();

          if (!activePlan) {
            if (mounted) {
              setData(null);
            }
            return;
          }

          const records = await getPlanDailyAnalytics(
            activePlan.id,
            activePlan.start_date,
            today,
          );

          const recordMap = new Map(
            records.map((record) => [record.date, record]),
          );

          const weekRecords: DailyAnalyticsRecord[] = Array.from(
            { length: 7 },
            (_, index) => {
              const date = addDays(today, index - 6);

              return (
                recordMap.get(date) ?? {
                  date,
                  total: 0,
                  completed: 0,
                  pending: 0,
                  skipped: 0,
                  percentage: 0,
                }
              );
            },
          );

          if (!mounted) return;

          setData({
            plan: activePlan,
            records,
            weekRecords,
          });
        } catch (cause) {
          console.error("Failed to load analytics:", cause);

          if (mounted) {
            setError(true);
          }
        } finally {
          if (mounted) {
            setLoading(false);
          }
        }
      }

      void loadAnalytics();

      return () => {
        mounted = false;
      };
    }, []),
  );

  const totals = data?.records.reduce(
    (result, record) => ({
      total: result.total + record.total,
      completed: result.completed + record.completed,
      pending: result.pending + record.pending,
      skipped: result.skipped + record.skipped,
    }),
    {
      total: 0,
      completed: 0,
      pending: 0,
      skipped: 0,
    },
  );

  const eligibleTasks = totals ? totals.total - totals.skipped : 0;

  const overallPercentage =
    totals && eligibleTasks > 0
      ? Math.round((totals.completed / eligibleTasks) * 100)
      : 0;

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={styles.eyebrow}>YOUR JOURNEY</Text>
        <Text style={styles.title}>Progress Analytics</Text>
        <Text style={styles.subtitle}>
          Understand your consistency and track your progress.
        </Text>
      </View>

      {loading ? (
        <View style={styles.stateCard}>
          <ActivityIndicator color={colors.primary} />
          <Text style={styles.stateText}>Loading analytics...</Text>
        </View>
      ) : error ? (
        <View style={styles.stateCard}>
          <Text style={styles.errorTitle}>Unable to load analytics</Text>
          <Text style={styles.stateText}>
            Please reopen this screen and try again.
          </Text>
        </View>
      ) : !data ? (
        <View style={styles.stateCard}>
          <Text style={styles.emptyTitle}>No active plan</Text>
          <Text style={styles.stateText}>
            Create a plan to start tracking your progress.
          </Text>
        </View>
      ) : (
        <>
          {/* PLAN OVERVIEW */}
          <View style={styles.planCard}>
            <Text style={styles.planLabel}>
              {data.plan.plan_type === "ramadan"
                ? "RAMADAN PLAN"
                : "GENERAL MONTHLY PLAN"}
            </Text>

            <Text style={styles.planDates}>
              {formatDate(data.plan.start_date)} –{" "}
              {formatDate(data.plan.end_date)}
            </Text>

            <View style={styles.overviewProgress}>
              <Text style={styles.overviewPercentage}>
                {overallPercentage}%
              </Text>
              <Text style={styles.overviewCaption}>Overall completion</Text>
            </View>

            <ProgressBar percentage={overallPercentage} />

            <Text style={styles.planFootnote}>
              Based on scheduled tasks from the plan start date through today.
            </Text>
          </View>

          {/* TASK SUMMARY */}
          <Text style={styles.sectionTitle}>Task Summary</Text>

          <View style={styles.statsGrid}>
            <StatCard label="Completed" value={totals?.completed ?? 0} />
            <StatCard label="Pending" value={totals?.pending ?? 0} />
            <StatCard label="Skipped" value={totals?.skipped ?? 0} />
            <StatCard label="Total" value={totals?.total ?? 0} />
          </View>

          {/* WEEKLY PROGRESS */}
          <Text style={styles.sectionTitle}>Last 7 Days</Text>

          <View style={styles.card}>
            <Text style={styles.cardSubtitle}>
              Daily task completion percentage
            </Text>

            <View style={styles.chart}>
              {data.weekRecords.map((record) => (
                <View key={record.date} style={styles.chartColumn}>
                  <Text style={styles.chartPercentage}>
                    {record.total > 0 ? `${record.percentage}%` : "–"}
                  </Text>

                  <View style={styles.chartBarTrack}>
                    <View
                      style={[
                        styles.chartBar,
                        {
                          height: `${
                            record.total > 0
                              ? Math.max(record.percentage, 3)
                              : 0
                          }%`,
                        },
                      ]}
                    />
                  </View>

                  <Text style={styles.chartDay}>
                    {getDayLabel(record.date)}
                  </Text>
                </View>
              ))}
            </View>

            <View style={styles.chartLegend}>
              <View style={styles.legendDot} />
              <Text style={styles.legendText}>Completion rate</Text>
            </View>
          </View>

          {/* DAILY BREAKDOWN */}
          <Text style={styles.sectionTitle}>Daily Breakdown</Text>

          <View style={styles.card}>
            {data.records.length > 0 ? (
              [...data.records].reverse().map((record, index) => (
                <View
                  key={record.date}
                  style={[
                    styles.dailyRow,
                    index !== 0 && styles.dailyRowBorder,
                  ]}
                >
                  <View style={styles.dailyInfo}>
                    <Text style={styles.dailyDate}>
                      {formatDate(record.date)}
                    </Text>

                    <Text style={styles.dailyStats}>
                      {record.completed} completed · {record.pending} pending ·{" "}
                      {record.skipped} skipped
                    </Text>
                  </View>

                  <Text style={styles.dailyPercentage}>
                    {record.percentage}%
                  </Text>
                </View>
              ))
            ) : (
              <Text style={styles.emptyText}>
                No scheduled tasks have been recorded yet.
              </Text>
            )}
          </View>
        </>
      )}

      <Text style={styles.footer}>Ramazan Companion</Text>
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
    fontSize: 27,
    fontWeight: "800",
    marginTop: 7,
  },

  subtitle: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 7,
    lineHeight: 19,
  },

  planCard: {
    backgroundColor: colors.primaryDark,
    borderRadius: 20,
    padding: 20,
    marginBottom: 27,
  },

  planLabel: {
    color: colors.gold,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.5,
  },

  planDates: {
    color: "#D9E7DF",
    fontSize: 11,
    marginTop: 7,
  },

  overviewProgress: {
    marginTop: 25,
    marginBottom: 17,
  },

  overviewPercentage: {
    color: "#FFFFFF",
    fontSize: 35,
    fontWeight: "800",
  },

  overviewCaption: {
    color: "#D9E7DF",
    fontSize: 11,
    marginTop: 3,
  },

  progressTrack: {
    height: 9,
    borderRadius: 10,
    backgroundColor: "#FFFFFF30",
    overflow: "hidden",
  },

  progressFill: {
    height: "100%",
    backgroundColor: colors.gold,
    borderRadius: 10,
  },

  planFootnote: {
    color: "#D9E7DF",
    fontSize: 10,
    lineHeight: 16,
    marginTop: 12,
  },

  sectionTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "700",
    marginBottom: 13,
    marginTop: 5,
  },

  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 25,
  },

  statCard: {
    width: "48%",
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 17,
  },

  statValue: {
    color: colors.primary,
    fontSize: 25,
    fontWeight: "800",
  },

  statLabel: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 5,
  },

  card: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 17,
    marginBottom: 25,
  },

  cardSubtitle: {
    color: colors.muted,
    fontSize: 11,
    marginBottom: 20,
  },

  chart: {
    height: 155,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
  },

  chartColumn: {
    flex: 1,
    alignItems: "center",
    height: "100%",
    justifyContent: "flex-end",
  },

  chartPercentage: {
    color: colors.text,
    fontSize: 9,
    fontWeight: "700",
    marginBottom: 7,
  },

  chartBarTrack: {
    height: 105,
    width: 19,
    backgroundColor: colors.background,
    borderRadius: 7,
    overflow: "hidden",
    justifyContent: "flex-end",
  },

  chartBar: {
    width: "100%",
    backgroundColor: colors.primary,
    borderRadius: 7,
  },

  chartDay: {
    color: colors.muted,
    fontSize: 9,
    marginTop: 9,
  },

  chartLegend: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
  },

  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    marginRight: 7,
  },

  legendText: {
    color: colors.muted,
    fontSize: 10,
  },

  dailyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 13,
  },

  dailyRowBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },

  dailyInfo: {
    flex: 1,
    marginRight: 10,
  },

  dailyDate: {
    color: colors.text,
    fontSize: 12,
    fontWeight: "700",
  },

  dailyStats: {
    color: colors.muted,
    fontSize: 9,
    marginTop: 5,
  },

  dailyPercentage: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: "800",
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
    textAlign: "center",
  },

  errorTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
  },

  emptyTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
  },

  emptyText: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 19,
  },

  footer: {
    color: colors.muted,
    fontSize: 10,
    textAlign: "center",
    marginTop: 10,
  },
});
