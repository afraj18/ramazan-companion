import { useCallback, useEffect, useState } from "react";
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

import { useTranslation } from "react-i18next";
import { colors } from "../../src/theme/colors";

function getLocalDate(): string {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function TaskCard({
  task,
  onProgressChange,
  onSkip,
  onRestore,
}: {
  task: PlanTaskRecord;
  onProgressChange: (task: PlanTaskRecord, value: number) => void;
  onSkip: (task: PlanTaskRecord) => void;
  onRestore: (task: PlanTaskRecord) => void;
}) {
  const isCompleted = task.status === "completed";
  const isSkipped = task.status === "skipped";
  const { t } = useTranslation();

  const progressPercentage =
    task.target_count > 0
      ? Math.min(
          100,
          Math.round((task.completed_count / task.target_count) * 100),
        )
      : 0;

  return (
    <View style={styles.taskCard}>
      <View style={styles.taskHeader}>
        <View style={styles.taskTitleContainer}>
          <Text style={styles.category}>{task.category.toUpperCase()}</Text>

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
          <Text style={styles.statusText}>
            {isCompleted ? "Completed" : isSkipped ? "Skipped" : "Pending"}
          </Text>
        </View>
      </View>

      <View style={styles.progressInfo}>
        <Text style={styles.progressText}>
          {task.completed_count} / {task.target_count} {task.unit}
        </Text>

        <Text style={styles.progressText}>{progressPercentage}%</Text>
      </View>

      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            { width: `${progressPercentage}%` },
            isCompleted && styles.completedFill,
          ]}
        />
      </View>

      {isSkipped ? (
        <Pressable
          style={styles.secondaryButton}
          onPress={() => onRestore(task)}
        >
          <Text style={styles.secondaryButtonText}>Restore task</Text>
        </Pressable>
      ) : (
        <View style={styles.actions}>
          <Pressable
            style={styles.counterButton}
            disabled={task.completed_count === 0}
            onPress={() => onProgressChange(task, task.completed_count - 1)}
          >
            <Text style={styles.counterText}>−</Text>
          </Pressable>

          <Pressable
            style={[
              styles.counterButton,
              task.completed_count >= task.target_count &&
                styles.disabledButton,
            ]}
            disabled={task.completed_count >= task.target_count}
            onPress={() => onProgressChange(task, task.completed_count + 1)}
          >
            <Text style={styles.counterText}>+</Text>
          </Pressable>

          {!isCompleted && (
            <Pressable style={styles.skipButton} onPress={() => onSkip(task)}>
              <Text style={styles.skipButtonText}>Skip</Text>
            </Pressable>
          )}
        </View>
      )}
    </View>
  );
}

export default function TasksScreen() {
  const [selectedDate, setSelectedDate] = useState(getLocalDate);
  const [dateInput, setDateInput] = useState(getLocalDate);

  const [tasks, setTasks] = useState<PlanTaskRecord[]>([]);
  const [progress, setProgress] = useState<DailyPlanProgress | null>(null);

  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTasks = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [dailyTasks, dailyProgress] = await Promise.all([
        getDailyPlanTasks(selectedDate),
        getDailyPlanProgress(selectedDate),
      ]);

      setTasks(dailyTasks);
      setProgress(dailyProgress);
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to load daily tasks.",
      );
    } finally {
      setLoading(false);
    }
  }, [selectedDate]);

  useEffect(() => {
    void loadTasks();
  }, [loadTasks]);

  async function handleProgressChange(task: PlanTaskRecord, value: number) {
    try {
      setUpdating(true);
      setError(null);

      await updatePlanTaskProgress(task.id, value);
      await loadTasks();
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Unable to update task progress.",
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
      await loadTasks();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to skip task.");
    } finally {
      setUpdating(false);
    }
  }

  async function handleRestore(task: PlanTaskRecord) {
    try {
      setUpdating(true);
      setError(null);

      await restorePlanTask(task.id);
      await loadTasks();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Unable to restore task.",
      );
    } finally {
      setUpdating(false);
    }
  }

  function applyDate() {
    const value = dateInput.trim();

    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      setError("Enter a valid date in YYYY-MM-DD format.");
      return;
    }

    const parsed = new Date(`${value}T00:00:00.000Z`);

    if (
      Number.isNaN(parsed.getTime()) ||
      parsed.toISOString().slice(0, 10) !== value
    ) {
      setError("The date you entered is invalid.");
      return;
    }

    setError(null);
    setSelectedDate(value);
  }

  const completed = progress?.completed ?? 0;
  const total = progress?.total ?? 0;
  const percentage = progress?.percentage ?? 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.heading}>Daily tasks</Text>

      <Text style={styles.subtitle}>
        Build consistency through your daily activities.
      </Text>

      <View style={styles.dateCard}>
        <Text style={styles.sectionLabel}>SELECT DATE</Text>

        <View style={styles.dateRow}>
          <TextInput
            value={dateInput}
            onChangeText={setDateInput}
            placeholder="YYYY-MM-DD"
            placeholderTextColor={colors.muted}
            style={styles.dateInput}
            autoCapitalize="none"
          />

          <Pressable style={styles.dateButton} onPress={applyDate}>
            <Text style={styles.dateButtonText}>Go</Text>
          </Pressable>
        </View>

        <Text style={styles.dateHint}>
          Use 2027-02-08 to view your saved test plan.
        </Text>
      </View>

      {progress && (
        <View style={styles.summaryCard}>
          <Text style={styles.sectionLabel}>DAILY OVERVIEW</Text>

          <Text style={styles.percentage}>{percentage}%</Text>

          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${percentage}%` }]} />
          </View>

          <View style={styles.summaryStats}>
            <View>
              <Text style={styles.statNumber}>{completed}</Text>
              <Text style={styles.statLabel}>Completed</Text>
            </View>

            <View>
              <Text style={styles.statNumber}>{progress.pending}</Text>
              <Text style={styles.statLabel}>Pending</Text>
            </View>

            <View>
              <Text style={styles.statNumber}>{progress.skipped}</Text>
              <Text style={styles.statLabel}>Skipped</Text>
            </View>

            <View>
              <Text style={styles.statNumber}>{total}</Text>
              <Text style={styles.statLabel}>Total</Text>
            </View>
          </View>
        </View>
      )}

      <View style={styles.taskSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Your activities</Text>

          {updating && <ActivityIndicator color={colors.primary} />}
        </View>

        {loading ? (
          <ActivityIndicator
            size="large"
            color={colors.primary}
            style={styles.loader}
          />
        ) : error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : tasks.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>No tasks scheduled</Text>

            <Text style={styles.emptyDescription}>
              There are no saved tasks for this date. Try 2027-02-08 to view
              your test plan.
            </Text>
          </View>
        ) : (
          tasks.map((task) => (
            <TaskCard
              key={task.id}
              task={task}
              onProgressChange={handleProgressChange}
              onSkip={handleSkip}
              onRestore={handleRestore}
            />
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 24,
    paddingTop: 70,
    paddingBottom: 40,
  },
  heading: {
    color: colors.text,
    fontSize: 28,
    fontWeight: "700",
  },
  subtitle: {
    color: colors.muted,
    marginTop: 8,
    lineHeight: 21,
  },
  dateCard: {
    marginTop: 24,
    padding: 16,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
  },
  sectionLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
  },
  dateRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  dateInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: colors.text,
  },
  dateButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 22,
    justifyContent: "center",
    borderRadius: 10,
  },
  dateButtonText: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  dateHint: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 10,
  },
  summaryCard: {
    backgroundColor: "#FFFFFF",
    padding: 18,
    borderRadius: 16,
    marginTop: 16,
  },
  percentage: {
    color: colors.primary,
    fontSize: 34,
    fontWeight: "800",
    marginTop: 12,
  },
  progressTrack: {
    height: 8,
    backgroundColor: "#E5E7EB",
    borderRadius: 10,
    overflow: "hidden",
    marginTop: 10,
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
    marginTop: 20,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.text,
  },
  statLabel: {
    fontSize: 11,
    color: colors.muted,
    marginTop: 4,
  },
  taskSection: {
    marginTop: 28,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 20,
    fontWeight: "700",
  },
  taskCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
  },
  taskHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  taskTitleContainer: {
    flex: 1,
  },
  category: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.primary,
    letterSpacing: 1,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    marginTop: 7,
  },
  taskDescription: {
    fontSize: 13,
    lineHeight: 19,
    color: colors.muted,
    marginTop: 5,
  },
  statusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 20,
    backgroundColor: "#FEF3C7",
  },
  completedBadge: {
    backgroundColor: "#DCFCE7",
  },
  skippedBadge: {
    backgroundColor: "#E5E7EB",
  },
  statusText: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.text,
  },
  progressInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 18,
  },
  progressText: {
    fontSize: 12,
    color: colors.muted,
    fontWeight: "600",
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
    alignItems: "center",
  },
  counterButton: {
    width: 42,
    height: 38,
    borderRadius: 9,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  counterText: {
    fontSize: 22,
    fontWeight: "600",
    color: colors.text,
  },
  disabledButton: {
    opacity: 0.4,
  },
  skipButton: {
    marginLeft: "auto",
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  skipButtonText: {
    color: colors.muted,
    fontWeight: "600",
  },
  secondaryButton: {
    marginTop: 16,
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
  },
  secondaryButtonText: {
    color: colors.text,
    fontWeight: "700",
  },
  emptyCard: {
    padding: 20,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
  },
  emptyDescription: {
    color: colors.muted,
    lineHeight: 21,
    marginTop: 8,
  },
  loader: {
    marginTop: 30,
  },
  errorText: {
    color: "#DC2626",
    marginTop: 12,
  },
});
