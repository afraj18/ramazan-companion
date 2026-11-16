import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
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
    getDailyPlanProgress,
    getDailyPlanTasks,
    restorePlanTask,
    skipPlanTask,
    updatePlanTaskProgress,
    type DailyPlanProgress,
    type PlanTaskRecord,
} from "../../src/database";

import { colors } from "../../src/theme/colors";

function getLocalDate(): string {
  const date = new Date();

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function changeDate(dateString: string, amount: number): string {
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  date.setDate(date.getDate() + amount);

  const nextYear = date.getFullYear();
  const nextMonth = String(date.getMonth() + 1).padStart(2, "0");
  const nextDay = String(date.getDate()).padStart(2, "0");

  return `${nextYear}-${nextMonth}-${nextDay}`;
}

function formatDate(dateString: string): string {
  const [year, month, day] = dateString.split("-").map(Number);

  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);

  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

function ProgressBar({
  percentage,
  completed = false,
}: {
  percentage: number;
  completed?: boolean;
}) {
  return (
    <View style={styles.progressTrack}>
      <View
        style={[
          styles.progressFill,
          { width: `${Math.min(100, Math.max(0, percentage))}%` },
          completed && styles.completedFill,
        ]}
      />
    </View>
  );
}

function TaskCard({
  task,
  updating,
  onProgressChange,
  onSkip,
  onRestore,
}: {
  task: PlanTaskRecord;
  updating: boolean;
  onProgressChange: (task: PlanTaskRecord, value: number) => void;
  onSkip: (task: PlanTaskRecord) => void;
  onRestore: (task: PlanTaskRecord) => void;
}) {
  const { t } = useTranslation();

  const isCompleted = task.status === "completed";
  const isSkipped = task.status === "skipped";

  const progressPercentage =
    task.target_count > 0
      ? Math.min(
          100,
          Math.round((task.completed_count / task.target_count) * 100),
        )
      : 0;

  const statusLabel = isCompleted
    ? t("tasks.status.completed", { defaultValue: "Completed" })
    : isSkipped
      ? t("tasks.status.skipped", { defaultValue: "Skipped" })
      : t("tasks.status.pending", { defaultValue: "In progress" });

  const categoryLabel = t(`tasks.categories.${task.category}`, {
    defaultValue: task.category.replace(/_/g, " "),
  });

  return (
    <View style={[styles.taskCard, isCompleted && styles.completedTaskCard]}>
      <View style={styles.taskHeader}>
        <View style={styles.taskTitleContainer}>
          <Text style={styles.category}>{categoryLabel.toUpperCase()}</Text>

          <Text style={styles.taskTitle}>{t(task.title_key)}</Text>

          <Text style={styles.taskDescription}>
            {t(task.description_key, {
              count: task.target_count,
            })}
          </Text>
        </View>

        <View
          style={[
            styles.statusBadge,
            isCompleted && styles.completedBadge,
            isSkipped && styles.skippedBadge,
          ]}
        >
          <Text style={styles.statusText}>{statusLabel}</Text>
        </View>
      </View>

      {!isSkipped && (
        <View style={styles.taskProgress}>
          <View style={styles.progressInfo}>
            <Text style={styles.progressValue}>
              {task.completed_count} / {task.target_count} {task.unit}
            </Text>

            <Text
              style={[
                styles.progressPercentage,
                isCompleted && styles.completedText,
              ]}
            >
              {progressPercentage}%
            </Text>
          </View>

          <ProgressBar
            percentage={progressPercentage}
            completed={isCompleted}
          />
        </View>
      )}

      {isSkipped ? (
        <Pressable
          disabled={updating}
          style={[styles.restoreButton, updating && styles.disabledAction]}
          onPress={() => onRestore(task)}
        >
          <Text style={styles.restoreButtonText}>
            {t("tasks.actions.restore", { defaultValue: "Restore activity" })}
          </Text>
        </Pressable>
      ) : (
        <View style={styles.taskActions}>
          <View style={styles.counterActions}>
            <Pressable
              accessibilityLabel="Decrease progress"
              disabled={updating || task.completed_count <= 0}
              style={[
                styles.counterButton,
                (updating || task.completed_count <= 0) &&
                  styles.disabledAction,
              ]}
              onPress={() => onProgressChange(task, task.completed_count - 1)}
            >
              <Text style={styles.counterText}>−</Text>
            </Pressable>

            <Pressable
              accessibilityLabel="Increase progress"
              disabled={updating || task.completed_count >= task.target_count}
              style={[
                styles.incrementButton,
                (updating || task.completed_count >= task.target_count) &&
                  styles.disabledAction,
              ]}
              onPress={() => onProgressChange(task, task.completed_count + 1)}
            >
              <Text style={styles.incrementButtonText}>+</Text>
            </Pressable>
          </View>

          {!isCompleted && (
            <Pressable
              disabled={updating}
              style={[styles.skipButton, updating && styles.disabledAction]}
              onPress={() => onSkip(task)}
            >
              <Text style={styles.skipButtonText}>
                {t("tasks.actions.skip", { defaultValue: "Skip" })}
              </Text>
            </Pressable>
          )}

          {isCompleted && (
            <Text style={styles.completedMessage}>
              {t("tasks.messages.completed", {
                defaultValue: "Well done!",
              })}
            </Text>
          )}
        </View>
      )}
    </View>
  );
}

export default function TasksScreen() {
  const { t } = useTranslation();

  const [selectedDate, setSelectedDate] = useState(getLocalDate);
  const [dateInput, setDateInput] = useState(getLocalDate);

  const [showDateInput, setShowDateInput] = useState(false);

  const [tasks, setTasks] = useState<PlanTaskRecord[]>([]);
  const [progress, setProgress] = useState<DailyPlanProgress | null>(null);

  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isToday = selectedDate === getLocalDate();

  const loadTasks = useCallback(
    async (showLoader = true) => {
      try {
        if (showLoader) {
          setLoading(true);
        }

        setError(null);

        const [dailyTasks, dailyProgress] = await Promise.all([
          getDailyPlanTasks(selectedDate),
          getDailyPlanProgress(selectedDate),
        ]);

        setTasks(dailyTasks);
        setProgress(dailyProgress);
      } catch (cause) {
        setError(
          cause instanceof Error
            ? cause.message
            : "Unable to load daily activities.",
        );
      } finally {
        if (showLoader) {
          setLoading(false);
        }
      }
    },
    [selectedDate],
  );

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  function selectDate(value: string) {
    setSelectedDate(value);
    setDateInput(value);
    setError(null);
  }

  function handleDateApply() {
    const value = dateInput.trim();

    if (!isValidDate(value)) {
      setError(
        t("tasks.errors.invalidDate", {
          defaultValue: "Please enter a valid date in YYYY-MM-DD format.",
        }),
      );
      return;
    }

    setError(null);
    selectDate(value);
    setShowDateInput(false);
  }

  async function handleProgressChange(task: PlanTaskRecord, value: number) {
    try {
      setUpdating(true);
      setError(null);

      await updatePlanTaskProgress(task.id, value);
      await loadTasks(false);
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to update activity progress.",
      );
    } finally {
      setUpdating(false);
    }
  }

  async function handleSkip(task: PlanTaskRecord) {
    try {
      setUpdating(true);
      setError(null);

      await skipPlanTask(task.id);
      await loadTasks(false);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to skip activity.",
      );
    } finally {
      setUpdating(false);
    }
  }

  async function handleRestore(task: PlanTaskRecord) {
    try {
      setUpdating(true);
      setError(null);

      await restorePlanTask(task.id);
      await loadTasks(false);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to restore activity.",
      );
    } finally {
      setUpdating(false);
    }
  }

  const completed = progress?.completed ?? 0;
  const pending = progress?.pending ?? 0;
  const skipped = progress?.skipped ?? 0;
  const total = progress?.total ?? 0;
  const percentage = progress?.percentage ?? 0;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>
            {t("tasks.header.eyebrow", {
              defaultValue: "YOUR DAILY JOURNEY",
            })}
          </Text>

          <Text style={styles.heading}>
            {t("tasks.header.title", {
              defaultValue: "Daily activities",
            })}
          </Text>
        </View>

        {updating && <ActivityIndicator color={colors.primary} size="small" />}
      </View>

      <Text style={styles.subtitle}>
        {t("tasks.header.subtitle", {
          defaultValue:
            "Small consistent actions make a meaningful difference.",
        })}
      </Text>

      {/* Date navigation */}
      <View style={styles.dateSection}>
        <View style={styles.dateNavigation}>
          <Pressable
            style={styles.dateArrow}
            onPress={() => selectDate(changeDate(selectedDate, -1))}
          >
            <Text style={styles.dateArrowText}>‹</Text>
          </Pressable>

          <Pressable
            style={styles.dateDisplay}
            onPress={() => {
              setDateInput(selectedDate);
              setShowDateInput((current) => !current);
            }}
          >
            <Text style={styles.dateLabel}>
              {isToday
                ? t("tasks.date.today", { defaultValue: "TODAY" })
                : t("tasks.date.selected", { defaultValue: "SELECTED DAY" })}
            </Text>

            <Text style={styles.dateValue}>{formatDate(selectedDate)}</Text>

            <Text style={styles.changeDateText}>
              {t("tasks.date.change", {
                defaultValue: "Change date",
              })}
            </Text>
          </Pressable>

          <Pressable
            style={[styles.dateArrow, isToday && styles.disabledArrow]}
            disabled={isToday}
            onPress={() => selectDate(changeDate(selectedDate, 1))}
          >
            <Text style={styles.dateArrowText}>›</Text>
          </Pressable>
        </View>

        {!isToday && (
          <Pressable
            style={styles.todayButton}
            onPress={() => selectDate(getLocalDate())}
          >
            <Text style={styles.todayButtonText}>
              {t("tasks.date.backToToday", {
                defaultValue: "Back to today",
              })}
            </Text>
          </Pressable>
        )}

        {showDateInput && (
          <View style={styles.dateInputCard}>
            <Text style={styles.dateInputLabel}>
              {t("tasks.date.enterDate", {
                defaultValue: "Enter a date (YYYY-MM-DD)",
              })}
            </Text>

            <View style={styles.dateInputRow}>
              <TextInput
                value={dateInput}
                onChangeText={setDateInput}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.muted}
                style={styles.dateInput}
                autoCapitalize="none"
                autoCorrect={false}
              />

              <Pressable
                style={styles.dateApplyButton}
                onPress={handleDateApply}
              >
                <Text style={styles.dateApplyText}>
                  {t("common.apply", { defaultValue: "Apply" })}
                </Text>
              </Pressable>
            </View>
          </View>
        )}
      </View>

      {/* Error */}
      {error && (
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {loading ? (
        <ActivityIndicator
          size="large"
          color={colors.primary}
          style={styles.loader}
        />
      ) : (
        <>
          {/* Daily progress */}
          {progress && total > 0 && (
            <View style={styles.overviewCard}>
              <View style={styles.overviewHeader}>
                <View>
                  <Text style={styles.overviewEyebrow}>
                    {t("tasks.overview.eyebrow", {
                      defaultValue: "DAILY OVERVIEW",
                    })}
                  </Text>

                  <Text style={styles.overviewTitle}>
                    {percentage === 100
                      ? t("tasks.overview.complete", {
                          defaultValue: "All activities completed",
                        })
                      : t("tasks.overview.title", {
                          defaultValue: "Your progress today",
                        })}
                  </Text>
                </View>

                <View style={styles.percentageContainer}>
                  <Text style={styles.percentage}>{percentage}%</Text>
                </View>
              </View>

              <ProgressBar
                percentage={percentage}
                completed={percentage === 100}
              />

              <View style={styles.summaryStats}>
                <View style={styles.statItem}>
                  <View style={[styles.statDot, styles.completedDot]} />
                  <Text style={styles.statNumber}>{completed}</Text>
                  <Text style={styles.statLabel}>
                    {t("tasks.stats.completed", {
                      defaultValue: "Completed",
                    })}
                  </Text>
                </View>

                <View style={styles.statItem}>
                  <View style={[styles.statDot, styles.pendingDot]} />
                  <Text style={styles.statNumber}>{pending}</Text>
                  <Text style={styles.statLabel}>
                    {t("tasks.stats.pending", {
                      defaultValue: "Pending",
                    })}
                  </Text>
                </View>

                <View style={styles.statItem}>
                  <View style={[styles.statDot, styles.skippedDot]} />
                  <Text style={styles.statNumber}>{skipped}</Text>
                  <Text style={styles.statLabel}>
                    {t("tasks.stats.skipped", {
                      defaultValue: "Skipped",
                    })}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Activities */}
          <View style={styles.activitySection}>
            <View style={styles.activityHeader}>
              <View>
                <Text style={styles.sectionTitle}>
                  {t("tasks.activities.title", {
                    defaultValue: "Your activities",
                  })}
                </Text>

                <Text style={styles.sectionSubtitle}>
                  {t("tasks.activities.subtitle", {
                    count: tasks.length,
                    defaultValue: `${tasks.length} activities scheduled`,
                  })}
                </Text>
              </View>

              {tasks.length > 0 && (
                <View style={styles.taskCountBadge}>
                  <Text style={styles.taskCountText}>{tasks.length}</Text>
                </View>
              )}
            </View>

            {tasks.length === 0 ? (
              <View style={styles.emptyCard}>
                <View style={styles.emptyIcon}>
                  <Text style={styles.emptyIconText}>✦</Text>
                </View>

                <Text style={styles.emptyTitle}>
                  {t("tasks.empty.title", {
                    defaultValue: "A fresh day awaits",
                  })}
                </Text>

                <Text style={styles.emptyDescription}>
                  {t("tasks.empty.description", {
                    defaultValue:
                      "There are no activities scheduled for this date. Your saved monthly plan will provide your daily activities.",
                  })}
                </Text>

                {!isToday && (
                  <Pressable
                    style={styles.emptyTodayButton}
                    onPress={() => selectDate(getLocalDate())}
                  >
                    <Text style={styles.emptyTodayButtonText}>
                      {t("tasks.date.backToToday", {
                        defaultValue: "Back to today",
                      })}
                    </Text>
                  </Pressable>
                )}
              </View>
            ) : (
              tasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  updating={updating}
                  onProgressChange={handleProgressChange}
                  onSkip={handleSkip}
                  onRestore={handleRestore}
                />
              ))
            )}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 64,
    paddingBottom: 40,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  eyebrow: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.8,
  },
  heading: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "800",
    marginTop: 7,
  },
  subtitle: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
  },

  // Date navigation
  dateSection: {
    marginTop: 25,
  },
  dateNavigation: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dateArrow: {
    width: 40,
    height: 44,
    borderRadius: 12,
    backgroundColor: colors.background,
    justifyContent: "center",
    alignItems: "center",
  },
  disabledArrow: {
    opacity: 0.3,
  },
  dateArrowText: {
    fontSize: 28,
    color: colors.primary,
    lineHeight: 32,
  },
  dateDisplay: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 8,
  },
  dateLabel: {
    color: colors.primary,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.4,
  },
  dateValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "700",
    marginTop: 5,
    textAlign: "center",
  },
  changeDateText: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 4,
  },
  todayButton: {
    alignSelf: "center",
    paddingVertical: 10,
  },
  todayButtonText: {
    color: colors.primary,
    fontWeight: "700",
    fontSize: 12,
  },
  dateInputCard: {
    marginTop: 10,
    backgroundColor: colors.surface,
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dateInputLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "600",
  },
  dateInputRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },
  dateInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    color: colors.text,
    backgroundColor: colors.background,
  },
  dateApplyButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 18,
    borderRadius: 10,
    justifyContent: "center",
  },
  dateApplyText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },

  // Error
  errorCard: {
    backgroundColor: "#FEF2F2",
    padding: 13,
    borderRadius: 12,
    marginTop: 16,
  },
  errorText: {
    color: "#DC2626",
    fontSize: 13,
    lineHeight: 19,
  },

  // Overview
  overviewCard: {
    backgroundColor: colors.surface,
    borderRadius: 20,
    padding: 19,
    marginTop: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  overviewHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 17,
  },
  overviewEyebrow: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1.3,
  },
  overviewTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
    marginTop: 6,
  },
  percentageContainer: {
    backgroundColor: colors.background,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  percentage: {
    color: colors.primary,
    fontSize: 21,
    fontWeight: "800",
  },
  progressTrack: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: 10,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.primary,
    borderRadius: 10,
  },
  completedFill: {
    backgroundColor: "#16A34A",
  },
  summaryStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 19,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statDot: {
    width: 7,
    height: 7,
    borderRadius: 5,
    marginBottom: 7,
  },
  completedDot: {
    backgroundColor: "#16A34A",
  },
  pendingDot: {
    backgroundColor: colors.gold,
  },
  skippedDot: {
    backgroundColor: colors.muted,
  },
  statNumber: {
    color: colors.text,
    fontSize: 19,
    fontWeight: "800",
  },
  statLabel: {
    color: colors.muted,
    fontSize: 10,
    marginTop: 4,
  },

  // Activities
  activitySection: {
    marginTop: 29,
  },
  activityHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "800",
  },
  sectionSubtitle: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 4,
  },
  taskCountBadge: {
    minWidth: 30,
    height: 30,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: "center",
    alignItems: "center",
  },
  taskCountText: {
    color: colors.primary,
    fontWeight: "800",
    fontSize: 12,
  },

  // Task card
  taskCard: {
    backgroundColor: colors.surface,
    borderRadius: 17,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: colors.border,
  },
  completedTaskCard: {
    borderColor: "#BBE5C8",
  },
  taskHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
  },
  taskTitleContainer: {
    flex: 1,
  },
  category: {
    color: colors.primary,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 1.2,
  },
  taskTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
    marginTop: 7,
  },
  taskDescription: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 5,
  },
  statusBadge: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 20,
  },
  completedBadge: {
    backgroundColor: "#DCFCE7",
  },
  skippedBadge: {
    backgroundColor: "#E5E7EB",
  },
  statusText: {
    color: colors.text,
    fontSize: 9,
    fontWeight: "800",
  },
  taskProgress: {
    marginTop: 20,
  },
  progressInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 9,
  },
  progressValue: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "600",
  },
  progressPercentage: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: "800",
  },
  completedText: {
    color: "#16A34A",
  },

  // Task actions
  taskActions: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 17,
  },
  counterActions: {
    flexDirection: "row",
    gap: 8,
  },
  counterButton: {
    width: 40,
    height: 38,
    borderRadius: 10,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  counterText: {
    color: colors.text,
    fontSize: 21,
    fontWeight: "600",
  },
  incrementButton: {
    width: 40,
    height: 38,
    borderRadius: 10,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  incrementButtonText: {
    color: "#FFFFFF",
    fontSize: 21,
    fontWeight: "600",
  },
  disabledAction: {
    opacity: 0.35,
  },
  skipButton: {
    marginLeft: "auto",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  skipButtonText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: "700",
  },
  completedMessage: {
    marginLeft: "auto",
    color: "#16A34A",
    fontSize: 12,
    fontWeight: "700",
  },
  restoreButton: {
    marginTop: 16,
    backgroundColor: colors.background,
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  restoreButtonText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "700",
  },

  // Empty state
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 23,
    alignItems: "center",
  },
  emptyIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: colors.background,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyIconText: {
    color: colors.gold,
    fontSize: 25,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: "800",
    marginTop: 15,
    textAlign: "center",
  },
  emptyDescription: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 21,
    textAlign: "center",
    marginTop: 8,
  },
  emptyTodayButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 18,
    paddingVertical: 11,
    borderRadius: 10,
    marginTop: 18,
  },
  emptyTodayButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 12,
  },

  loader: {
    marginTop: 50,
  },
});
