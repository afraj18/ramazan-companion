import * as SQLite from "expo-sqlite";
import type { GeneratedMonthlyPlan } from "../features/plans/types";
import { INITIAL_SCHEMA } from "./schema";

const DATABASE_NAME = "ramazan-companion-v4.db";
const SETTINGS_ID = "user-settings";

export type AppLanguage = "en" | "ta" | "si";

export type ExperienceLevel = "beginner" | "intermediate" | "advanced";

export const ONBOARDING_GOALS = [
  "daily_prayers",
  "quran_reading",
  "daily_dua",
  "good_character",
  "charity",
  "daily_reflection",
] as const;

export interface DailyPlanProgress {
  total: number;
  completed: number;
  pending: number;
  skipped: number;
  percentage: number;
}

const PLAN_TASK_SELECT = `
  SELECT
    task.id,
    task.monthly_plan_id,
    task.template_key,
    task.activity_key,
    task.goal_key,
    task.category,
    task.scheduled_date,
    task.frequency,
    task.title_key,
    task.description_key,
    task.target_count,
    task.unit,
    task.linked_feature,

    COALESCE(activity.completed_count, 0) AS completed_count,

    CASE
      WHEN task.status = 'skipped' THEN 'skipped'
      WHEN COALESCE(activity.completed_count, 0) >= task.target_count
        THEN 'completed'
      ELSE 'pending'
    END AS status

  FROM plan_task_instances task

  LEFT JOIN daily_activity_records activity
    ON activity.activity_key = task.activity_key
    AND activity.activity_date = task.scheduled_date
`;

export type OnboardingGoal = (typeof ONBOARDING_GOALS)[number];

export interface AppSettings {
  language: AppLanguage;
  experience_level: ExperienceLevel;
  onboarding_completed: number;
}

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

export async function getDatabase() {
  if (!databasePromise) {
    databasePromise = SQLite.openDatabaseAsync(DATABASE_NAME);
  }

  return databasePromise;
}

export async function initializeDatabase() {
  const db = await getDatabase();

  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;
  `);

  await db.withTransactionAsync(async () => {
    await db.execAsync(INITIAL_SCHEMA);

    await db.runAsync(
      "INSERT INTO database_health (status, checked_at) VALUES (?, ?)",
      "ready",
      new Date().toISOString(),
    );
  });

  return db;
}

export async function getOnboardingStatus(): Promise<boolean> {
  const db = await getDatabase();

  const settings = await db.getFirstAsync<{
    onboarding_completed: number;
  }>("SELECT onboarding_completed FROM app_settings LIMIT 1");

  return settings?.onboarding_completed === 1;
}

export async function getAppSettings(): Promise<AppSettings | null> {
  const db = await getDatabase();

  return db.getFirstAsync<AppSettings>(
    `SELECT language, experience_level, onboarding_completed
     FROM app_settings
     WHERE id = ?
     LIMIT 1`,
    SETTINGS_ID,
  );
}

export async function saveOnboarding(data: {
  language: AppLanguage;
  experienceLevel: ExperienceLevel;
  goals: OnboardingGoal[];
}) {
  const db = await getDatabase();
  const now = new Date().toISOString();

  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `INSERT INTO app_settings (
        id,
        language,
        experience_level,
        onboarding_completed,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, 1, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        language = excluded.language,
        experience_level = excluded.experience_level,
        onboarding_completed = 1,
        updated_at = excluded.updated_at`,
      SETTINGS_ID,
      data.language,
      data.experienceLevel,
      now,
      now,
    );

    // Replace the selected goals atomically.
    await db.runAsync("DELETE FROM user_goals");

    for (const goal of data.goals) {
      await db.runAsync(
        "INSERT INTO user_goals (id, goal_key, created_at) VALUES (?, ?, ?)",
        goal,
        goal,
        now,
      );
    }
  });
}

export async function getSelectedGoals(): Promise<OnboardingGoal[]> {
  const db = await getDatabase();

  const records = await db.getAllAsync<{ goal_key: string }>(
    "SELECT goal_key FROM user_goals ORDER BY created_at ASC",
  );

  return records
    .map((record) => record.goal_key)
    .filter((key): key is OnboardingGoal =>
      ONBOARDING_GOALS.includes(key as OnboardingGoal),
    );
}

/**
 * Replace the user's selected goals without modifying other app settings.
 */
export async function updateSelectedGoals(
  goals: OnboardingGoal[],
): Promise<void> {
  const uniqueGoals = [...new Set(goals)];

  if (uniqueGoals.length === 0) {
    throw new Error("Select at least one goal.");
  }

  const invalidGoal = uniqueGoals.find(
    (goal) => !ONBOARDING_GOALS.includes(goal),
  );

  if (invalidGoal) {
    throw new Error(`Invalid goal: ${invalidGoal}`);
  }

  const db = await getDatabase();
  const now = new Date().toISOString();

  await db.withTransactionAsync(async () => {
    await db.runAsync("DELETE FROM user_goals");

    for (const goal of uniqueGoals) {
      await db.runAsync(
        `INSERT INTO user_goals (id, goal_key, created_at)
         VALUES (?, ?, ?)`,
        goal,
        goal,
        now,
      );
    }
  });
}

export async function getDatabaseHealth() {
  const db = await getDatabase();

  return db.getFirstAsync<{
    status: string;
    checked_at: string;
  }>("SELECT status, checked_at FROM database_health ORDER BY id DESC LIMIT 1");
}

export async function saveGeneratedMonthlyPlan(
  plan: GeneratedMonthlyPlan,
): Promise<void> {
  const db = await getDatabase();
  const now = new Date().toISOString();

  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(plan.startDate) ||
    !/^\d{4}-\d{2}-\d{2}$/.test(plan.endDate) ||
    plan.endDate < plan.startDate
  ) {
    throw new Error("Invalid plan date range.");
  }

  await db.withTransactionAsync(async () => {
    let existingPlan: { id: string } | null = null;

    if (plan.planType === "general") {
      if (plan.periodMonth === null) {
        throw new Error("General plans require a Gregorian month.");
      }

      existingPlan = await db.getFirstAsync<{ id: string }>(
        `SELECT id
         FROM monthly_plans
         WHERE plan_type = 'general'
           AND period_year = ?
           AND period_month = ?`,
        plan.periodYear,
        plan.periodMonth,
      );
    } else {
      // Reject any overlapping Ramadan plan, not just an identical start date.
      existingPlan = await db.getFirstAsync<{ id: string }>(
        `SELECT id
         FROM monthly_plans
         WHERE plan_type = 'ramadan'
           AND NOT (end_date < ? OR start_date > ?)
         LIMIT 1`,
        plan.startDate,
        plan.endDate,
      );
    }

    if (existingPlan) {
      throw new Error(
        `A ${plan.planType} plan already exists for this period.`,
      );
    }

    await db.runAsync(
      `INSERT INTO monthly_plans (
        id,
        plan_type,
        period_year,
        period_month,
        start_date,
        end_date,
        status,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      plan.id,
      plan.planType,
      plan.periodYear,
      plan.periodMonth,
      plan.startDate,
      plan.endDate,
      "active",
      now,
      now,
    );

    if (plan.planType === "ramadan") {
      // Remove Gregorian tasks that overlap the manually selected Ramadan dates.
      await db.runAsync(
        `DELETE FROM plan_task_instances
         WHERE scheduled_date BETWEEN ? AND ?
           AND monthly_plan_id IN (
             SELECT id
             FROM monthly_plans
             WHERE plan_type = 'general'
           )`,
        plan.startDate,
        plan.endDate,
      );
    }

    for (const task of plan.tasks) {
      if (plan.planType === "general") {
        const overlapsRamadan = await db.getFirstAsync<{ id: string }>(
          `SELECT id
           FROM monthly_plans
           WHERE plan_type = 'ramadan'
             AND start_date <= ?
             AND end_date >= ?
           LIMIT 1`,
          task.date,
          task.date,
        );

        if (overlapsRamadan) {
          continue;
        }
      }

      await db.runAsync(
        `INSERT INTO plan_task_instances (
          id,
          monthly_plan_id,
          template_key,
          activity_key,
          goal_key,
          category,
          scheduled_date,
          frequency,
          title_key,
          description_key,
          target_count,
          unit,
          linked_feature,
          status,
          created_at,
          updated_at
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        task.id,
        plan.id,
        task.templateKey,
        task.activityKey,
        task.goal,
        task.category,
        task.date,
        task.frequency,
        task.titleKey,
        task.descriptionKey,
        task.targetCount,
        task.unit,
        task.linkedFeature ?? null,
        "pending",
        now,
        now,
      );
    }
  });
}

export interface PlanTaskRecord {
  id: string;
  monthly_plan_id: string;
  template_key: string;
  activity_key: string;
  goal_key: string;
  category: string;
  scheduled_date: string;
  frequency: "daily" | "weekly";
  title_key: string;
  description_key: string;
  target_count: number;
  completed_count: number;
  unit: string;
  linked_feature: string | null;
  status: "pending" | "completed" | "skipped";
}

export interface DailyActivityRecord {
  id: string;
  activity_key: string;
  activity_date: string;
  completed_count: number;
  created_at: string;
  updated_at: string;
}

function validateActivityInput(
  activityKey: string,
  date: string,
  completedCount?: number,
): void {
  if (!activityKey.trim()) {
    throw new Error("Activity key is required.");
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error("Invalid activity date. Expected YYYY-MM-DD.");
  }

  const parsed = new Date(`${date}T00:00:00.000Z`);

  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== date
  ) {
    throw new Error("Invalid activity date.");
  }

  if (
    completedCount !== undefined &&
    (!Number.isInteger(completedCount) || completedCount < 0)
  ) {
    throw new Error("Progress must be a non-negative whole number.");
  }
}

function validateActivityDate(date: string): void {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error("Invalid date. Expected YYYY-MM-DD.");
  }

  const parsed = new Date(`${date}T00:00:00.000Z`);

  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== date
  ) {
    throw new Error("Invalid calendar date.");
  }
}

/**
 * Retrieve progress for one activity on one date.
 * Returns zero when no progress has been recorded.
 */
export async function getActivityProgress(
  activityKey: string,
  date: string,
): Promise<number> {
  validateActivityInput(activityKey, date);

  const db = await getDatabase();

  const record = await db.getFirstAsync<{
    completed_count: number;
  }>(
    `SELECT completed_count
     FROM daily_activity_records
     WHERE activity_key = ?
       AND activity_date = ?
     LIMIT 1`,
    activityKey,
    date,
  );

  return record?.completed_count ?? 0;
}

/**
 * Set actual progress for an activity on a date.
 *
 * This is an absolute update, not an increment.
 */
export async function updateActivityProgress(
  activityKey: string,
  date: string,
  completedCount: number,
): Promise<void> {
  validateActivityInput(activityKey, date, completedCount);

  const db = await getDatabase();
  const now = new Date().toISOString();
  const id = `${activityKey}-${date}`;

  await db.runAsync(
    `INSERT INTO daily_activity_records (
      id,
      activity_key,
      activity_date,
      completed_count,
      created_at,
      updated_at
    )
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(activity_key, activity_date)
    DO UPDATE SET
      completed_count = excluded.completed_count,
      updated_at = excluded.updated_at`,
    id,
    activityKey,
    date,
    completedCount,
    now,
    now,
  );
}

/**
 * Retrieve all recorded activities for a date.
 */
export async function getDailyActivityRecords(
  date: string,
): Promise<DailyActivityRecord[]> {
  validateActivityDate(date);

  const db = await getDatabase();

  return db.getAllAsync<DailyActivityRecord>(
    `SELECT *
     FROM daily_activity_records
     WHERE activity_date = ?
     ORDER BY activity_key ASC`,
    date,
  );
}

/**
 * Retrieve scheduled tasks for a plan with shared progress.
 */
export async function getPlanTasks(planId: string): Promise<PlanTaskRecord[]> {
  const db = await getDatabase();

  return db.getAllAsync<PlanTaskRecord>(
    `${PLAN_TASK_SELECT}
     WHERE task.monthly_plan_id = ?
     ORDER BY task.scheduled_date ASC, task.category ASC`,
    planId,
  );
}

export interface MonthlyPlanRecord {
  id: string;
  plan_type: "general" | "ramadan";
  period_year: number;
  period_month: number | null;
  start_date: string;
  end_date: string;
  status: "active" | "completed" | "archived";
  created_at: string;
  updated_at: string;
}

export async function getActiveMonthlyPlan() {
  const db = await getDatabase();

  const now = new Date();
  const today = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");

  return db.getFirstAsync<MonthlyPlanRecord>(
    `SELECT *
     FROM monthly_plans
     WHERE status = 'active'
       AND start_date <= ?
       AND end_date >= ?
     ORDER BY
       CASE WHEN plan_type = 'ramadan' THEN 0 ELSE 1 END,
       start_date DESC
     LIMIT 1`,
    today,
    today,
  );
}

/**
 * Update shared progress through a scheduled task.
 */
export async function updatePlanTaskProgress(
  taskId: string,
  completedCount: number,
): Promise<void> {
  if (!Number.isInteger(completedCount) || completedCount < 0) {
    throw new Error("Progress must be a non-negative whole number.");
  }

  const db = await getDatabase();
  const now = new Date().toISOString();

  await db.withTransactionAsync(async () => {
    const task = await db.getFirstAsync<{
      activity_key: string;
      scheduled_date: string;
      status: string;
    }>(
      `SELECT activity_key, scheduled_date, status
       FROM plan_task_instances
       WHERE id = ?`,
      taskId,
    );

    if (!task) {
      throw new Error("Task not found.");
    }

    if (task.status === "skipped") {
      throw new Error("Restore this skipped task before updating progress.");
    }

    const recordId = `${task.activity_key}-${task.scheduled_date}`;

    await db.runAsync(
      `INSERT INTO daily_activity_records (
        id,
        activity_key,
        activity_date,
        completed_count,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?)
      ON CONFLICT(activity_key, activity_date)
      DO UPDATE SET
        completed_count = excluded.completed_count,
        updated_at = excluded.updated_at`,
      recordId,
      task.activity_key,
      task.scheduled_date,
      completedCount,
      now,
      now,
    );
  });
}

/**
 * Skip a scheduled task without deleting shared activity progress.
 */
export async function skipPlanTask(taskId: string): Promise<void> {
  const db = await getDatabase();

  const result = await db.runAsync(
    `UPDATE plan_task_instances
     SET status = 'skipped',
         updated_at = ?
     WHERE id = ?
       AND status != 'skipped'`,
    new Date().toISOString(),
    taskId,
  );

  if (result.changes === 0) {
    throw new Error("Task not found or already skipped.");
  }
}

/**
 * Restore a skipped task.
 * Existing shared progress is preserved.
 */
export async function restorePlanTask(taskId: string): Promise<void> {
  const db = await getDatabase();

  const result = await db.runAsync(
    `UPDATE plan_task_instances
     SET status = 'pending',
         updated_at = ?
     WHERE id = ?
       AND status = 'skipped'`,
    new Date().toISOString(),
    taskId,
  );

  if (result.changes === 0) {
    throw new Error("Skipped task not found.");
  }
}

/**
 * Retrieve all scheduled tasks for a date with shared progress.
 */
export async function getDailyPlanTasks(
  date: string,
): Promise<PlanTaskRecord[]> {
  validateActivityDate(date);

  const db = await getDatabase();

  return db.getAllAsync<PlanTaskRecord>(
    `${PLAN_TASK_SELECT}
     INNER JOIN monthly_plans plan
       ON plan.id = task.monthly_plan_id
     WHERE task.scheduled_date = ?
       AND (
         plan.plan_type = 'ramadan'
         OR NOT EXISTS (
           SELECT 1
           FROM monthly_plans ramadan
           WHERE ramadan.plan_type = 'ramadan'
             AND ramadan.start_date <= ?
             AND ramadan.end_date >= ?
         )
       )
     ORDER BY
       CASE
         WHEN task.status = 'skipped' THEN 2
         WHEN COALESCE(activity.completed_count, 0) >= task.target_count
           THEN 1
         ELSE 0
       END,
       task.category ASC`,
    date,
    date,
    date,
  );
}

// Get daily progress summary
/**
 * Calculate daily plan progress using shared activity records.
 */
export async function getDailyPlanProgress(
  date: string,
  planId?: string,
): Promise<DailyPlanProgress> {
  validateActivityDate(date);

  const db = await getDatabase();

  const result = await db.getFirstAsync<{
    total: number;
    completed: number;
    pending: number;
    skipped: number;
  }>(
    `SELECT
       COUNT(*) AS total,

       COALESCE(SUM(
         CASE
           WHEN task.status != 'skipped'
             AND COALESCE(activity.completed_count, 0) >= task.target_count
           THEN 1 ELSE 0
         END
       ), 0) AS completed,

       COALESCE(SUM(
         CASE
           WHEN task.status != 'skipped'
             AND COALESCE(activity.completed_count, 0) < task.target_count
           THEN 1 ELSE 0
         END
       ), 0) AS pending,

       COALESCE(SUM(
         CASE WHEN task.status = 'skipped'
           THEN 1 ELSE 0
         END
       ), 0) AS skipped

     FROM plan_task_instances task

     LEFT JOIN daily_activity_records activity
       ON activity.activity_key = task.activity_key
       AND activity.activity_date = task.scheduled_date

     WHERE task.scheduled_date = ?
       AND (? IS NULL OR task.monthly_plan_id = ?)`,
    date,
    planId ?? null,
    planId ?? null,
  );

  const total = result?.total ?? 0;
  const completed = result?.completed ?? 0;
  const pending = result?.pending ?? 0;
  const skipped = result?.skipped ?? 0;

  return {
    total,
    completed,
    pending,
    skipped,
    percentage:
      total - skipped > 0
        ? Math.round((completed / (total - skipped)) * 100)
        : 0,
  };
}

/**
 * Retrieve a Gregorian monthly plan by year and month.
 */
export async function getGeneralPlanByPeriod(
  year: number,
  month: number,
): Promise<MonthlyPlanRecord | null> {
  if (!Number.isInteger(year) || year < 1000 || year > 9999) {
    throw new Error("Invalid Gregorian year.");
  }

  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error("Invalid Gregorian month.");
  }

  const db = await getDatabase();

  return db.getFirstAsync<MonthlyPlanRecord>(
    `SELECT *
     FROM monthly_plans
     WHERE plan_type = 'general'
       AND period_year = ?
       AND period_month = ?
     LIMIT 1`,
    year,
    month,
  );
}

/**
 * Retrieve a Ramadan plan by Hijri year.
 */
export async function getRamadanPlanByStartDate(
  startDate: string,
): Promise<MonthlyPlanRecord | null> {
  validateActivityDate(startDate);

  const db = await getDatabase();

  return db.getFirstAsync<MonthlyPlanRecord>(
    `SELECT *
     FROM monthly_plans
     WHERE plan_type = 'ramadan'
       AND start_date = ?
     LIMIT 1`,
    startDate,
  );
}
/**
 * Retrieve the active Gregorian plan covering a date.
 */
export async function getActiveGeneralPlan(
  date: string,
): Promise<MonthlyPlanRecord | null> {
  const db = await getDatabase();

  return db.getFirstAsync<MonthlyPlanRecord>(
    `SELECT *
     FROM monthly_plans
     WHERE plan_type = 'general'
       AND status = 'active'
       AND start_date <= ?
       AND end_date >= ?
     ORDER BY start_date DESC
     LIMIT 1`,
    date,
    date,
  );
}

/**
 * Retrieve the active Ramadan plan covering a date.
 */
export async function getActiveRamadanPlan(
  date: string,
): Promise<MonthlyPlanRecord | null> {
  const db = await getDatabase();

  return db.getFirstAsync<MonthlyPlanRecord>(
    `SELECT *
     FROM monthly_plans
     WHERE plan_type = 'ramadan'
       AND status = 'active'
       AND start_date <= ?
       AND end_date >= ?
     ORDER BY start_date DESC
     LIMIT 1`,
    date,
    date,
  );
}

/**
 * Retrieve a plan using its ID.
 */
export async function getPlanById(
  planId: string,
): Promise<MonthlyPlanRecord | null> {
  const db = await getDatabase();

  return db.getFirstAsync<MonthlyPlanRecord>(
    `SELECT *
     FROM monthly_plans
     WHERE id = ?
     LIMIT 1`,
    planId,
  );
}

/**
 * Update a plan's lifecycle status.
 */
export async function updatePlanStatus(
  planId: string,
  status: "active" | "completed" | "archived",
): Promise<void> {
  if (!planId.trim()) {
    throw new Error("Plan ID is required.");
  }

  const db = await getDatabase();

  const result = await db.runAsync(
    `UPDATE monthly_plans
     SET status = ?,
         updated_at = ?
     WHERE id = ?`,
    status,
    new Date().toISOString(),
    planId,
  );

  if (result.changes === 0) {
    throw new Error(`Plan not found: ${planId}`);
  }
}

export interface DailyAnalyticsRecord {
  date: string;
  total: number;
  completed: number;
  pending: number;
  skipped: number;
  percentage: number;
}

export async function getPlanDailyAnalytics(
  planId: string,
  startDate: string,
  endDate: string,
): Promise<DailyAnalyticsRecord[]> {
  validateActivityDate(startDate);
  validateActivityDate(endDate);

  if (startDate > endDate) {
    throw new Error("Start date cannot be after end date.");
  }

  const db = await getDatabase();

  const rows = await db.getAllAsync<{
    date: string;
    total: number;
    completed: number;
    pending: number;
    skipped: number;
  }>(
    `SELECT
       task.scheduled_date AS date,
       COUNT(*) AS total,

       COALESCE(SUM(
         CASE
           WHEN task.status != 'skipped'
             AND COALESCE(activity.completed_count, 0) >= task.target_count
           THEN 1 ELSE 0
         END
       ), 0) AS completed,

       COALESCE(SUM(
         CASE
           WHEN task.status != 'skipped'
             AND COALESCE(activity.completed_count, 0) < task.target_count
           THEN 1 ELSE 0
         END
       ), 0) AS pending,

       COALESCE(SUM(
         CASE
           WHEN task.status = 'skipped'
           THEN 1 ELSE 0
         END
       ), 0) AS skipped

     FROM plan_task_instances task

     LEFT JOIN daily_activity_records activity
       ON activity.activity_key = task.activity_key
       AND activity.activity_date = task.scheduled_date

     WHERE task.monthly_plan_id = ?
       AND task.scheduled_date >= ?
       AND task.scheduled_date <= ?

     GROUP BY task.scheduled_date
     ORDER BY task.scheduled_date ASC`,
    planId,
    startDate,
    endDate,
  );

  return rows.map((row) => ({
    ...row,
    percentage:
      row.total - row.skipped > 0
        ? Math.round((row.completed / (row.total - row.skipped)) * 100)
        : 0,
  }));
}

export async function updateAppLanguage(language: AppLanguage): Promise<void> {
  if (!["en", "ta", "si"].includes(language)) {
    throw new Error("Invalid app language.");
  }

  const db = await getDatabase();

  const result = await db.runAsync(
    `UPDATE app_settings
     SET language = ?,
         updated_at = ?
     WHERE id = ?`,
    language,
    new Date().toISOString(),
    SETTINGS_ID,
  );

  if (result.changes === 0) {
    throw new Error("App settings not found.");
  }
}
