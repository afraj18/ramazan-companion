export type ExperienceLevel = "beginner" | "intermediate" | "advanced";

export type GoalKey =
  | "daily_prayers"
  | "quran_reading"
  | "daily_dua"
  | "good_character"
  | "charity"
  | "daily_reflection";

export type TaskCategory =
  | "prayer"
  | "quran"
  | "dua"
  | "character"
  | "charity"
  | "reflection";

export type TaskFrequency = "daily" | "weekly";

export type HijriCalendarMethod = "local_moonsighting";

export type TaskUnit = "prayers" | "minutes" | "sessions" | "actions";

export interface TaskTemplate {
  key: string;
  goal: GoalKey;
  category: TaskCategory;
  frequency: TaskFrequency;
  titleKey: string;
  descriptionKey: string;
  targetByLevel: Record<ExperienceLevel, number>;
  unit: TaskUnit;
  linkedFeature?: "prayer_tracker" | "quran_tracker" | "journal";
}

export interface MonthlyPlanInput {
  planId: string;
  hijriYear: number;
  hijriMonth: number;

  /**
   * Gregorian date confirmed for the first day
   * of the Hijri month by local moon sighting.
   * Format: YYYY-MM-DD
   */
  startDate: string;

  /**
   * The confirmed month length.
   * Usually 29 or 30 days.
   */
  daysInMonth: 29 | 30;

  experienceLevel: ExperienceLevel;
  selectedGoals: GoalKey[];

  calendarMethod: HijriCalendarMethod;
  calendarAdjustmentDays?: number;
}

export interface GeneratedTask {
  id: string;
  templateKey: string;
  goal: GoalKey;
  category: TaskCategory;
  date: string;
  frequency: TaskFrequency;
  titleKey: string;
  descriptionKey: string;
  targetCount: number;
  unit: TaskUnit;
  linkedFeature?: "prayer_tracker" | "quran_tracker" | "journal";
}

export interface GeneratedMonthlyPlan {
  id: string;
  hijriYear: number;
  hijriMonth: number;
  startDate: string;
  endDate: string;
  daysInMonth: number;
  experienceLevel: ExperienceLevel;
  selectedGoals: GoalKey[];
  calendarMethod: HijriCalendarMethod;
  calendarAdjustmentDays: number;
  tasks: GeneratedTask[];
}
