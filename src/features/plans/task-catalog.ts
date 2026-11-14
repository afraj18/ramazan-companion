import type { TaskTemplate } from "./types";

export const TASK_CATALOG: TaskTemplate[] = [
  {
    key: "track_daily_prayers",
    goal: "daily_prayers",
    category: "prayer",
    frequency: "daily",
    titleKey: "tasks.trackDailyPrayers",
    descriptionKey: "tasks.trackDailyPrayersDescription",
    targetByLevel: {
      beginner: 5,
      intermediate: 5,
      advanced: 5,
    },
    unit: "prayers",
    linkedFeature: "prayer_tracker",
  },

  {
    key: "daily_quran_reading",
    goal: "quran_reading",
    category: "quran",
    frequency: "daily",
    titleKey: "tasks.dailyQuranReading",
    descriptionKey: "tasks.dailyQuranReadingDescription",
    targetByLevel: {
      beginner: 5,
      intermediate: 10,
      advanced: 20,
    },
    unit: "minutes",
    linkedFeature: "quran_tracker",
  },

  {
    key: "daily_dua_review",
    goal: "daily_dua",
    category: "dua",
    frequency: "daily",
    titleKey: "tasks.dailyDua",
    descriptionKey: "tasks.dailyDuaDescription",
    targetByLevel: {
      beginner: 1,
      intermediate: 1,
      advanced: 1,
    },
    unit: "sessions",
  },

  {
    key: "daily_good_deed",
    goal: "good_character",
    category: "character",
    frequency: "daily",
    titleKey: "tasks.dailyGoodDeed",
    descriptionKey: "tasks.dailyGoodDeedDescription",
    targetByLevel: {
      beginner: 1,
      intermediate: 1,
      advanced: 1,
    },
    unit: "actions",
  },

  {
    key: "weekly_charity",
    goal: "charity",
    category: "charity",
    frequency: "weekly",
    titleKey: "tasks.weeklyCharity",
    descriptionKey: "tasks.weeklyCharityDescription",
    targetByLevel: {
      beginner: 1,
      intermediate: 1,
      advanced: 1,
    },
    unit: "actions",
  },

  {
    key: "daily_muhasaba",
    goal: "daily_reflection",
    category: "reflection",
    frequency: "daily",
    titleKey: "tasks.dailyReflection",
    descriptionKey: "tasks.dailyReflectionDescription",
    targetByLevel: {
      beginner: 2,
      intermediate: 5,
      advanced: 10,
    },
    unit: "minutes",
    linkedFeature: "journal",
  },
];
