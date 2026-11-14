export const INITIAL_SCHEMA = `
CREATE TABLE IF NOT EXISTS app_settings (
  id TEXT PRIMARY KEY NOT NULL,
  language TEXT NOT NULL DEFAULT 'en' CHECK (language IN ('en', 'ta', 'si')),
  experience_level TEXT NOT NULL DEFAULT 'beginner' CHECK (experience_level IN ('beginner', 'intermediate', 'advanced')),
  hijri_calendar_method TEXT NOT NULL DEFAULT 'pending',
  hijri_adjustment_days INTEGER NOT NULL DEFAULT 0,
  onboarding_completed INTEGER NOT NULL DEFAULT 0 CHECK (onboarding_completed IN (0, 1)),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS monthly_plans (
  id TEXT PRIMARY KEY NOT NULL,
  hijri_year INTEGER NOT NULL,
  hijri_month INTEGER NOT NULL CHECK (hijri_month BETWEEN 1 AND 12),
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  plan_type TEXT NOT NULL DEFAULT 'standard' CHECK (plan_type IN ('standard', 'ramadan')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  calendar_method TEXT NOT NULL,
  calendar_adjustment_days INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (hijri_year, hijri_month),
  CHECK (end_date >= start_date)
);

CREATE TABLE IF NOT EXISTS database_health (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  status TEXT NOT NULL,
  checked_at TEXT NOT NULL
);
`;
