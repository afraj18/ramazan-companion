export type ExperienceLevel = "beginner" | "intermediate" | "advanced";

export type PlanType = "general" | "ramadan";

export type PlanStatus = "active" | "completed" | "archived";

export type GoalKey =
  | "daily_prayers"
  | "quran_reading"
  | "daily_dua"
  | "good_character"
  | "charity"
  | "daily_reflection";

export type ActivityKey =
  | "daily_prayers"
  | "quran_reading"
  | "daily_dua"
  | "good_character"
  | "charity"
  | "daily_reflection"
  | "ramadan_muhasaba"
  | "ramadan_istighfar"
  | "ramadan_sleep_dua"
  | "ramadan_occasional_duas"
  | "ramadan_sadaqah"
  | "ramadan_goal_activity"
  | "ramadan_luha_sunnah"
  | "ramadan_morning_dua"
  | "ramadan_fajr"
  | "ramadan_fajr_sunnah"
  | "ramadan_dhuhr"
  | "ramadan_asr"
  | "ramadan_maghrib"
  | "ramadan_isha"
  | "ramadan_taraweeh"
  | "ramadan_witr"
  | "ramadan_qiyam"
  | "ramadan_iftar_meal"
  | "ramadan_suhoor_meal"
  | "ramadan_iftar_dua"
  | "ramadan_suhoor_dua"
  | "ramadan_evening_dua"
  | "ramadan_zuhur"
  | "ramadan_asr_dua"
  | "ramadan_maghrib_dua"
  | "ramadan_isha_dua"
  | "ramadan_taraweeh_dua"
  | "ramadan_witr_dua"
  | "ramadan_qiyam_dua"
  | "ramadan_luha_sunnah_dua"
  | "ramadan_morning_dua_dua"
  | "ramadan_zuhur_sunnah_2"
  | "ramadan_zuhur_sunnah_4"
  | "ramadan_thahajjud_witr"
  | "ramadan_sahoor_dua"
  | "ramadan_sahoor_meal"
  | "ramadan_maghrib_sunnah"
  | "ramadan_isha_sunnah"
  | "ramadan_extra_quran";

export type TaskCategory =
  | "prayer"
  | "quran"
  | "dua"
  | "character"
  | "charity"
  | "reflection";

export type TaskFrequency = "daily" | "weekly";

export type TaskUnit =
  | "prayers"
  | "minutes"
  | "sessions"
  | "actions"
  | "meals"
  | "times";

export interface TaskTemplate {
  key: string;
  activityKey: ActivityKey;
  goal: GoalKey;
  category: TaskCategory;
  frequency: TaskFrequency;
  titleKey: string;
  descriptionKey: string;
  targetByLevel: Record<ExperienceLevel, number>;
  unit: TaskUnit;
  linkedFeature?: "prayer_tracker" | "quran_tracker" | "journal";
}

export interface GeneralPlanInput {
  planId: string;
  year: number;
  month: number;
  experienceLevel: ExperienceLevel;
  selectedGoals: GoalKey[];
}

export interface RamadanPlanInput {
  planId: string;
  startDate: string;
  daysInMonth: 29 | 30;
  experienceLevel: ExperienceLevel;
  selectedGoals: GoalKey[];
}

export interface GeneratedTask {
  id: string;
  templateKey: string;
  activityKey: ActivityKey;
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
  planType: PlanType;
  periodYear: number;
  periodMonth: number | null;
  startDate: string;
  endDate: string;
  daysInMonth: number;
  experienceLevel: ExperienceLevel;
  selectedGoals: GoalKey[];
  tasks: GeneratedTask[];
}
