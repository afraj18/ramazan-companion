import * as SQLite from "expo-sqlite";
import type { GeneratedMonthlyPlan } from "../features/plans/types";
import { INITIAL_SCHEMA } from "./schema";

const DATABASE_NAME = "ramazan-companion.db";
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

  await db.execAsync("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;");

  await db.execAsync(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY NOT NULL,
      applied_at TEXT NOT NULL
    );
  `);

  const current = await db.getFirstAsync<{ version: number | null }>(
    "SELECT MAX(version) AS version FROM schema_migrations",
  );

  let currentVersion = current?.version ?? 0;

  // Migration 1: Initial database schema
  if (currentVersion < 1) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(INITIAL_SCHEMA);

      await db.runAsync(
        "INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)",
        1,
        new Date().toISOString(),
      );
    });

    currentVersion = 1;
  }

  // Migration 2: User-selected onboarding goals
  if (currentVersion < 2) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(`
        CREATE TABLE IF NOT EXISTS user_goals (
          id TEXT PRIMARY KEY NOT NULL,
          goal_key TEXT NOT NULL UNIQUE,
          created_at TEXT NOT NULL
        );
      `);

      await db.runAsync(
        "INSERT INTO schema_migrations (version, applied_at) VALUES (?, ?)",
        2,
        new Date().toISOString(),
      );
    });
  }

  // Migration 3: Plan task instances table
  if (currentVersion < 3) {
    await db.withTransactionAsync(async () => {
      await db.execAsync(`
      CREATE TABLE IF NOT EXISTS plan_task_instances (
        id TEXT PRIMARY KEY NOT NULL,

        monthly_plan_id TEXT NOT NULL,
        template_key TEXT NOT NULL,
        goal_key TEXT NOT NULL,
        category TEXT NOT NULL,

        scheduled_date TEXT NOT NULL,
        frequency TEXT NOT NULL
          CHECK (frequency IN ('daily', 'weekly')),

        title_key TEXT NOT NULL,
        description_key TEXT NOT NULL,

        target_count INTEGER NOT NULL DEFAULT 1,
        completed_count INTEGER NOT NULL DEFAULT 0,
        unit TEXT NOT NULL,

        linked_feature TEXT,

        status TEXT NOT NULL DEFAULT 'pending'
          CHECK (status IN ('pending', 'completed', 'skipped')),

        completed_at TEXT,

        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,

        FOREIGN KEY (monthly_plan_id)
          REFERENCES monthly_plans(id)
          ON DELETE CASCADE,

        UNIQUE (monthly_plan_id, scheduled_date, template_key),

        CHECK (target_count >= 0),
        CHECK (completed_count >= 0)
      );

      CREATE INDEX IF NOT EXISTS idx_plan_tasks_date
        ON plan_task_instances(scheduled_date);

      CREATE INDEX IF NOT EXISTS idx_plan_tasks_plan
        ON plan_task_instances(monthly_plan_id);

      CREATE INDEX IF NOT EXISTS idx_plan_tasks_status
        ON plan_task_instances(status);
    `);

      await db.runAsync(
        `INSERT INTO schema_migrations (version, applied_at)
       VALUES (?, ?)`,
        3,
        new Date().toISOString(),
      );
    });
  }

  await db.runAsync(
    "INSERT INTO database_health (status, checked_at) VALUES (?, ?)",
    "ready",
    new Date().toISOString(),
  );

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

  await db.withTransactionAsync(async () => {
    const existingPlan = await db.getFirstAsync<{ id: string }>(
      `SELECT id
       FROM monthly_plans
       WHERE hijri_year = ? AND hijri_month = ?`,
      plan.hijriYear,
      plan.hijriMonth,
    );

    if (existingPlan) {
      throw new Error(
        `A plan already exists for Hijri ${plan.hijriYear}/${plan.hijriMonth}.`,
      );
    }

    await db.runAsync(
      `INSERT INTO monthly_plans (
        id,
        hijri_year,
        hijri_month,
        start_date,
        end_date,
        plan_type,
        status,
        calendar_method,
        calendar_adjustment_days,
        created_at,
        updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      plan.id,
      plan.hijriYear,
      plan.hijriMonth,
      plan.startDate,
      plan.endDate,
      plan.hijriMonth === 9 ? "ramadan" : "standard",
      "active",
      plan.calendarMethod,
      plan.calendarAdjustmentDays,
      now,
      now,
    );

    for (const task of plan.tasks) {
      await db.runAsync(
        `INSERT INTO plan_task_instances (
          id,
          monthly_plan_id,
          template_key,
          goal_key,
          category,
          scheduled_date,
          frequency,
          title_key,
          description_key,
          target_count,
          completed_count,
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
        task.goal,
        task.category,
        task.date,
        task.frequency,
        task.titleKey,
        task.descriptionKey,
        task.targetCount,
        0,
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
  completed_at: string | null;
}

export async function getPlanTasks(planId: string): Promise<PlanTaskRecord[]> {
  const db = await getDatabase();

  return db.getAllAsync<PlanTaskRecord>(
    `SELECT *
     FROM plan_task_instances
     WHERE monthly_plan_id = ?
     ORDER BY scheduled_date ASC, category ASC`,
    planId,
  );
}

export interface MonthlyPlanRecord {
  id: string;
  hijri_year: number;
  hijri_month: number;
  start_date: string;
  end_date: string;
  plan_type: string;
  status: string;
  calendar_method: string;
  calendar_adjustment_days: number;
}

export async function getActiveMonthlyPlan() {
  const db = await getDatabase();

  return db.getFirstAsync<MonthlyPlanRecord>(
    `SELECT *
     FROM monthly_plans
     WHERE status = 'active'
     ORDER BY start_date DESC
     LIMIT 1`,
  );
}
