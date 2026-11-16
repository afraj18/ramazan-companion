import { RAMADAN_TASK_CATALOG } from "./ramadan-task-catalog";
import { TASK_CATALOG } from "./task-catalog";

import type {
  ExperienceLevel,
  GeneralPlanInput,
  GeneratedMonthlyPlan,
  GeneratedTask,
  GoalKey,
  RamadanPlanInput,
  TaskTemplate,
} from "./types";

const VALID_EXPERIENCE_LEVELS: ExperienceLevel[] = [
  "beginner",
  "intermediate",
  "advanced",
];

function formatDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function parseDate(date: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error(`Invalid date format: ${date}. Expected YYYY-MM-DD.`);
  }

  const parsed = new Date(`${date}T00:00:00.000Z`);

  if (Number.isNaN(parsed.getTime()) || formatDate(parsed) !== date) {
    throw new Error(`Invalid calendar date: ${date}.`);
  }

  return parsed;
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

function validateCommonInput(
  planId: string,
  experienceLevel: ExperienceLevel,
  selectedGoals: GoalKey[],
): void {
  if (!planId.trim()) {
    throw new Error("Plan ID is required.");
  }

  if (!VALID_EXPERIENCE_LEVELS.includes(experienceLevel)) {
    throw new Error("Invalid experience level.");
  }

  if (!Array.isArray(selectedGoals) || selectedGoals.length === 0) {
    throw new Error("Select at least one goal.");
  }

  if (new Set(selectedGoals).size !== selectedGoals.length) {
    throw new Error("Duplicate goals are not allowed.");
  }
}

function getSelectedTemplates(selectedGoals: GoalKey[]): TaskTemplate[] {
  const templates = TASK_CATALOG.filter((template) =>
    selectedGoals.includes(template.goal),
  );

  if (templates.length === 0) {
    throw new Error("No task templates found for the selected goals.");
  }

  return templates;
}

function generateTasks(
  planId: string,
  startDate: string,
  daysInPlan: number,
  experienceLevel: ExperienceLevel,
  selectedGoals: GoalKey[],
): GeneratedTask[] {
  const templates = getSelectedTemplates(selectedGoals);
  const start = parseDate(startDate);

  const tasks: GeneratedTask[] = [];

  for (const template of templates) {
    const targetCount = template.targetByLevel[experienceLevel];

    if (!Number.isInteger(targetCount) || targetCount < 0) {
      throw new Error(
        `Invalid target count for task template: ${template.key}`,
      );
    }

    const scheduledDays: number[] = [];

    if (template.frequency === "daily") {
      for (let day = 0; day < daysInPlan; day += 1) {
        scheduledDays.push(day);
      }
    } else {
      // Schedule one weekly checkpoint every seven days.
      for (let day = 6; day < daysInPlan; day += 7) {
        scheduledDays.push(day);
      }

      // Include a final checkpoint for an incomplete final week.
      const finalDay = daysInPlan - 1;

      if (
        scheduledDays.length === 0 ||
        scheduledDays[scheduledDays.length - 1] !== finalDay
      ) {
        scheduledDays.push(finalDay);
      }
    }

    for (const day of scheduledDays) {
      const scheduledDate = formatDate(addDays(start, day));

      tasks.push({
        id: `${planId}-${template.key}-${scheduledDate}`,
        templateKey: template.key,
        activityKey: template.activityKey,
        goal: template.goal,
        category: template.category,
        date: scheduledDate,
        frequency: template.frequency,
        titleKey: template.titleKey,
        descriptionKey: template.descriptionKey,
        targetCount,
        unit: template.unit,
        ...(template.linkedFeature
          ? { linkedFeature: template.linkedFeature }
          : {}),
      });
    }
  }

  return tasks;
}

export function generateGeneralPlan(
  input: GeneralPlanInput,
): GeneratedMonthlyPlan {
  validateCommonInput(input.planId, input.experienceLevel, input.selectedGoals);

  const { year, month } = input;

  if (!Number.isInteger(year) || year < 1000 || year > 9999) {
    throw new Error("Invalid Gregorian year.");
  }

  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error("Invalid Gregorian month. Expected 1–12.");
  }

  const startDate = formatDate(new Date(Date.UTC(year, month - 1, 1)));

  const endDate = formatDate(new Date(Date.UTC(year, month, 0)));

  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();

  const tasks = generateTasks(
    input.planId,
    startDate,
    daysInMonth,
    input.experienceLevel,
    input.selectedGoals,
  );

  return {
    id: input.planId,
    planType: "general",
    periodYear: year,
    periodMonth: month,
    startDate,
    endDate,
    daysInMonth,
    experienceLevel: input.experienceLevel,
    selectedGoals: [...input.selectedGoals],
    tasks,
  };
}

function generateRamadanTasks(
  planId: string,
  startDate: string,
  daysInPlan: number,
  experienceLevel: ExperienceLevel,
): GeneratedTask[] {
  const start = parseDate(startDate);
  const tasks: GeneratedTask[] = [];

  for (const template of RAMADAN_TASK_CATALOG) {
    const targetCount = template.targetByLevel[experienceLevel];

    if (!Number.isInteger(targetCount) || targetCount < 0) {
      throw new Error(`Invalid Ramadan target for task: ${template.key}`);
    }

    for (let day = 0; day < daysInPlan; day += 1) {
      const scheduledDate = formatDate(addDays(start, day));

      tasks.push({
        id: `${planId}-${template.key}-${scheduledDate}`,
        templateKey: template.key,
        activityKey: template.activityKey,
        goal: template.goal,
        category: template.category,
        date: scheduledDate,
        frequency: "daily",
        titleKey: template.titleKey,
        descriptionKey: template.descriptionKey,
        targetCount,
        unit: template.unit,
        ...(template.linkedFeature
          ? { linkedFeature: template.linkedFeature }
          : {}),
      });
    }
  }

  return tasks;
}

export function generateRamadanPlan(
  input: RamadanPlanInput,
): GeneratedMonthlyPlan {
  if (!input.planId.trim()) {
    throw new Error("Plan ID is required.");
  }

  if (!VALID_EXPERIENCE_LEVELS.includes(input.experienceLevel)) {
    throw new Error("Invalid experience level.");
  }

  if (input.daysInMonth !== 29 && input.daysInMonth !== 30) {
    throw new Error("Ramadan must have either 29 or 30 days.");
  }

  const start = parseDate(input.startDate);
  const end = addDays(start, input.daysInMonth - 1);

  const tasks = generateRamadanTasks(
    input.planId,
    input.startDate,
    input.daysInMonth,
    input.experienceLevel,
  );

  return {
    id: input.planId,
    planType: "ramadan",
    periodYear: start.getUTCFullYear(),
    periodMonth: null,
    startDate: input.startDate,
    endDate: formatDate(end),
    daysInMonth: input.daysInMonth,
    experienceLevel: input.experienceLevel,
    selectedGoals: [...input.selectedGoals],
    tasks,
  };
}
