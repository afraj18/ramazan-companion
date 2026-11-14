import { TASK_CATALOG } from "./task-catalog";

import type {
    GeneratedMonthlyPlan,
    GeneratedTask,
    MonthlyPlanInput,
} from "./types";

function validateInput(input: MonthlyPlanInput): void {
  if (!input.planId.trim()) {
    throw new Error("Plan ID is required.");
  }

  if (!Number.isInteger(input.hijriYear) || input.hijriYear < 1) {
    throw new Error("Invalid Hijri year.");
  }

  if (
    !Number.isInteger(input.hijriMonth) ||
    input.hijriMonth < 1 ||
    input.hijriMonth > 12
  ) {
    throw new Error("Hijri month must be between 1 and 12.");
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.startDate)) {
    throw new Error("Start date must use YYYY-MM-DD format.");
  }

  const parsedDate = new Date(`${input.startDate}T00:00:00.000Z`);

  if (
    Number.isNaN(parsedDate.getTime()) ||
    parsedDate.toISOString().slice(0, 10) !== input.startDate
  ) {
    throw new Error("Invalid Gregorian start date.");
  }

  if (![29, 30].includes(input.daysInMonth)) {
    throw new Error("Hijri month must have 29 or 30 days.");
  }

  if (input.selectedGoals.length === 0) {
    throw new Error("Select at least one goal.");
  }

  const uniqueGoals = new Set(input.selectedGoals);

  if (uniqueGoals.size !== input.selectedGoals.length) {
    throw new Error("Duplicate goals are not allowed.");
  }
}

function addDays(date: string, days: number): string {
  const result = new Date(`${date}T00:00:00.000Z`);

  result.setUTCDate(result.getUTCDate() + days);

  return result.toISOString().slice(0, 10);
}

export function generateMonthlyPlan(
  input: MonthlyPlanInput,
): GeneratedMonthlyPlan {
  validateInput(input);

  const selectedGoals = [...input.selectedGoals];

  const endDate = addDays(input.startDate, input.daysInMonth - 1);

  const selectedTemplates = TASK_CATALOG.filter((template) =>
    selectedGoals.includes(template.goal),
  );

  const tasks: GeneratedTask[] = [];

  for (const template of selectedTemplates) {
    const targetCount = template.targetByLevel[input.experienceLevel];

    if (template.frequency === "daily") {
      for (let day = 0; day < input.daysInMonth; day++) {
        const date = addDays(input.startDate, day);

        tasks.push({
          id: `${input.planId}:${date}:${template.key}`,
          templateKey: template.key,
          goal: template.goal,
          category: template.category,
          date,
          frequency: "daily",
          titleKey: template.titleKey,
          descriptionKey: template.descriptionKey,
          targetCount,
          unit: template.unit,
          linkedFeature: template.linkedFeature,
        });
      }
    }

    if (template.frequency === "weekly") {
      for (let day = 6; day < input.daysInMonth; day += 7) {
        const date = addDays(input.startDate, day);

        tasks.push({
          id: `${input.planId}:${date}:${template.key}`,
          templateKey: template.key,
          goal: template.goal,
          category: template.category,
          date,
          frequency: "weekly",
          titleKey: template.titleKey,
          descriptionKey: template.descriptionKey,
          targetCount,
          unit: template.unit,
          linkedFeature: template.linkedFeature,
        });
      }

      // Add a final partial-week task if the month
      // ends before the next regular weekly checkpoint.
      const lastCheckpoint = Math.floor((input.daysInMonth - 1) / 7) * 7;

      if (lastCheckpoint !== input.daysInMonth - 1) {
        const date = endDate;

        tasks.push({
          id: `${input.planId}:${date}:${template.key}`,
          templateKey: template.key,
          goal: template.goal,
          category: template.category,
          date,
          frequency: "weekly",
          titleKey: template.titleKey,
          descriptionKey: template.descriptionKey,
          targetCount,
          unit: template.unit,
          linkedFeature: template.linkedFeature,
        });
      }
    }
  }

  return {
    id: input.planId,
    hijriYear: input.hijriYear,
    hijriMonth: input.hijriMonth,
    startDate: input.startDate,
    endDate,
    daysInMonth: input.daysInMonth,
    experienceLevel: input.experienceLevel,
    selectedGoals,
    calendarMethod: input.calendarMethod,
    calendarAdjustmentDays: input.calendarAdjustmentDays ?? 0,
    tasks,
  };
}
