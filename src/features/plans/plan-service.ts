import {
    getGeneralPlanByPeriod,
    getPlanById,
    getRamadanPlanByStartDate,
    saveGeneratedMonthlyPlan,
} from "../../database";

import { generateGeneralPlan, generateRamadanPlan } from "./plan-generator";

import type { GeneralPlanInput, RamadanPlanInput } from "./types";

import type { MonthlyPlanRecord } from "../../database";

export interface PlanCreationResult {
  plan: MonthlyPlanRecord;
  created: boolean;
}

export async function createGeneralPlan(
  input: GeneralPlanInput,
): Promise<PlanCreationResult> {
  const existingPlan = await getGeneralPlanByPeriod(input.year, input.month);

  if (existingPlan) {
    return { plan: existingPlan, created: false };
  }

  const generatedPlan = generateGeneralPlan(input);

  try {
    await saveGeneratedMonthlyPlan(generatedPlan);
  } catch (error) {
    const planAfterError = await getGeneralPlanByPeriod(
      input.year,
      input.month,
    );

    if (planAfterError) {
      return { plan: planAfterError, created: false };
    }

    throw error;
  }

  const savedPlan = await getPlanById(input.planId);

  if (!savedPlan) {
    throw new Error(
      `General plan was saved but could not be retrieved: ${input.planId}`,
    );
  }

  return { plan: savedPlan, created: true };
}

/**
 * Create a manually configured Ramadan plan.
 * The selected start date identifies the plan.
 */
export async function createRamadanPlan(
  input: RamadanPlanInput,
): Promise<PlanCreationResult> {
  const existingPlan = await getRamadanPlanByStartDate(input.startDate);

  if (existingPlan) {
    return { plan: existingPlan, created: false };
  }

  const generatedPlan = generateRamadanPlan(input);

  try {
    await saveGeneratedMonthlyPlan(generatedPlan);
  } catch (error) {
    // Handle a concurrent creation using the same start date.
    const planAfterError = await getRamadanPlanByStartDate(input.startDate);

    if (planAfterError) {
      return { plan: planAfterError, created: false };
    }

    // For example, this also allows the database to reject
    // a different Ramadan plan whose dates overlap this one.
    throw error;
  }

  const savedPlan = await getPlanById(input.planId);

  if (!savedPlan) {
    throw new Error(
      `Ramadan plan was saved but could not be retrieved: ${input.planId}`,
    );
  }

  return { plan: savedPlan, created: true };
}
