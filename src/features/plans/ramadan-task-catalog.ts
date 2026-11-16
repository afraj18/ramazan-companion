import type { TaskTemplate } from "./types";

type RamadanTaskDefinition = Omit<TaskTemplate, "frequency" | "descriptionKey">;

function createTask(task: RamadanTaskDefinition): TaskTemplate {
  return {
    ...task,
    frequency: "daily",
    descriptionKey: "ramadan.dailyTaskDescription",
  };
}

const CORE = {
  beginner: 1,
  intermediate: 1,
  advanced: 1,
};

const QURAN_READING = {
  beginner: 15,
  intermediate: 30,
  advanced: 60,
};

const ISTIGHFAR = {
  beginner: 50,
  intermediate: 100,
  advanced: 300,
};

const REFLECTION = {
  beginner: 2,
  intermediate: 5,
  advanced: 10,
};

const EXTRA_QURAN = {
  beginner: 5,
  intermediate: 15,
  advanced: 30,
};

export const RAMADAN_TASK_CATALOG: TaskTemplate[] = [
  createTask({
    key: "thahajjud_witr",
    activityKey: "ramadan_thahajjud_witr",
    goal: "daily_prayers",
    category: "prayer",
    titleKey: "ramadan.tasks.thahajjudWitr",
    targetByLevel: CORE,
    unit: "sessions",
  }),

  createTask({
    key: "fajr_salah",
    activityKey: "ramadan_fajr",
    goal: "daily_prayers",
    category: "prayer",
    titleKey: "ramadan.tasks.fajrSalah",
    targetByLevel: CORE,
    unit: "prayers",
    linkedFeature: "prayer_tracker",
  }),

  createTask({
    key: "quran_session_1",
    activityKey: "quran_reading",
    goal: "quran_reading",
    category: "quran",
    titleKey: "ramadan.tasks.quranSession1",
    targetByLevel: QURAN_READING,
    unit: "minutes",
    linkedFeature: "quran_tracker",
  }),

  createTask({
    key: "extra_quran_reading",
    activityKey: "ramadan_extra_quran",
    goal: "quran_reading",
    category: "quran",
    titleKey: "ramadan.tasks.extraQuranReading",
    targetByLevel: EXTRA_QURAN,
    unit: "minutes",
    linkedFeature: "quran_tracker",
  }),

  createTask({
    key: "daily_istighfar",
    activityKey: "ramadan_istighfar",
    goal: "daily_dua",
    category: "dua",
    titleKey: "ramadan.tasks.istighfar",
    targetByLevel: ISTIGHFAR,
    unit: "times",
  }),

  createTask({
    key: "daily_muhasaba",
    activityKey: "ramadan_muhasaba",
    goal: "daily_reflection",
    category: "reflection",
    titleKey: "ramadan.tasks.muhasaba",
    targetByLevel: REFLECTION,
    unit: "minutes",
    linkedFeature: "journal",
  }),
];
