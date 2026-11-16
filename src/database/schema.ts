export const INITIAL_SCHEMA = `

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS app_settings (
  id TEXT PRIMARY KEY NOT NULL,
  language TEXT NOT NULL DEFAULT 'en'
    CHECK (language IN ('en', 'ta', 'si')),
  experience_level TEXT NOT NULL DEFAULT 'beginner'
    CHECK (experience_level IN ('beginner', 'intermediate', 'advanced')),
  hijri_calendar_method TEXT NOT NULL DEFAULT 'pending',
  hijri_adjustment_days INTEGER NOT NULL DEFAULT 0,
  onboarding_completed INTEGER NOT NULL DEFAULT 0
    CHECK (onboarding_completed IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS user_goals (
  id TEXT PRIMARY KEY NOT NULL,
  goal_key TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL
);

-- Gregorian monthly plans and manually created Ramadan plans.
CREATE TABLE IF NOT EXISTS monthly_plans (
  id TEXT PRIMARY KEY NOT NULL,

  plan_type TEXT NOT NULL
    CHECK (plan_type IN ('general', 'ramadan')),

  period_year INTEGER NOT NULL,

  period_month INTEGER
    CHECK (period_month IS NULL OR period_month BETWEEN 1 AND 12),

  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,

  status TEXT NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'completed', 'archived')),

  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,

  CHECK (end_date >= start_date),

  CHECK (
    (plan_type = 'general' AND period_month IS NOT NULL)
    OR
    (plan_type = 'ramadan' AND period_month IS NULL)
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_general_plan_period
ON monthly_plans(period_year, period_month)
WHERE plan_type = 'general';

-- A Ramadan plan is uniquely identified by its selected start date.
CREATE UNIQUE INDEX IF NOT EXISTS idx_ramadan_plan_start_date
ON monthly_plans(start_date)
WHERE plan_type = 'ramadan';

CREATE INDEX IF NOT EXISTS idx_monthly_plans_dates
ON monthly_plans(start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_monthly_plans_status
ON monthly_plans(status);

CREATE TABLE IF NOT EXISTS plan_task_instances (
  id TEXT PRIMARY KEY NOT NULL,
  monthly_plan_id TEXT NOT NULL,
  template_key TEXT NOT NULL,
  activity_key TEXT NOT NULL,
  goal_key TEXT NOT NULL,
  category TEXT NOT NULL,
  scheduled_date TEXT NOT NULL,
  frequency TEXT NOT NULL
    CHECK (frequency IN ('daily', 'weekly')),
  title_key TEXT NOT NULL,
  description_key TEXT NOT NULL,
  target_count INTEGER NOT NULL DEFAULT 1,
  unit TEXT NOT NULL,
  linked_feature TEXT,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'skipped')),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,

  FOREIGN KEY (monthly_plan_id)
    REFERENCES monthly_plans(id)
    ON DELETE CASCADE,

  UNIQUE (monthly_plan_id, scheduled_date, template_key),
  CHECK (target_count >= 0)
);

CREATE INDEX IF NOT EXISTS idx_plan_tasks_date
ON plan_task_instances(scheduled_date);

CREATE INDEX IF NOT EXISTS idx_plan_tasks_plan
ON plan_task_instances(monthly_plan_id);

CREATE INDEX IF NOT EXISTS idx_plan_tasks_activity
ON plan_task_instances(activity_key, scheduled_date);

CREATE TABLE IF NOT EXISTS daily_activity_records (
  id TEXT PRIMARY KEY NOT NULL,
  activity_key TEXT NOT NULL,
  activity_date TEXT NOT NULL,
  completed_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,

  UNIQUE (activity_key, activity_date),
  CHECK (completed_count >= 0)
);

CREATE INDEX IF NOT EXISTS idx_activity_records_date
ON daily_activity_records(activity_date);

CREATE INDEX IF NOT EXISTS idx_activity_records_key
ON daily_activity_records(activity_key);

-- Hijri calendar cache remains independent of plan creation.
CREATE TABLE IF NOT EXISTS hijri_months (
  id TEXT PRIMARY KEY NOT NULL,
  hijri_year INTEGER NOT NULL,
  hijri_month INTEGER NOT NULL
    CHECK (hijri_month BETWEEN 1 AND 12),
  start_date TEXT NOT NULL,
  status TEXT NOT NULL
    CHECK (status IN ('confirmed', 'expected')),
  source TEXT NOT NULL DEFAULT 'ACJU',
  source_updated_at TEXT NOT NULL,
  synced_at TEXT NOT NULL,

  UNIQUE (hijri_year, hijri_month),
  UNIQUE (start_date)
);

CREATE INDEX IF NOT EXISTS idx_hijri_months_start_date
ON hijri_months(start_date);

CREATE TABLE IF NOT EXISTS database_health (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  status TEXT NOT NULL,
  checked_at TEXT NOT NULL
);
`;
