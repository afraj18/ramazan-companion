import { useState } from "react";
import { Button, ScrollView, Text, View } from "react-native";

import { generateMonthlyPlan } from "../src/features/plans/plan-generator";

import { getPlanTasks, saveGeneratedMonthlyPlan } from "../src/database";

export default function DevPlanTest() {
  const [result, setResult] = useState("Not tested yet");

  async function testPlanGeneration() {
    try {
      const plan = generateMonthlyPlan({
        planId: "test-plan-001",
        hijriYear: 1448,
        hijriMonth: 9,
        startDate: "2027-02-08",
        daysInMonth: 29,
        experienceLevel: "beginner",
        selectedGoals: ["daily_prayers", "quran_reading", "daily_reflection"],
        calendarMethod: "local_moonsighting",
      });

      await saveGeneratedMonthlyPlan(plan);

      const savedTasks = await getPlanTasks(plan.id);

      setResult(
        `SUCCESS

Plan ID: ${plan.id}
Generated tasks: ${plan.tasks.length}
Saved tasks: ${savedTasks.length}

First task:
${JSON.stringify(savedTasks[0], null, 2)}`,
      );
    } catch (error) {
      setResult(error instanceof Error ? error.message : "Unknown error");
    }
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 24, gap: 20 }}>
      <Text style={{ fontSize: 24, fontWeight: "700" }}>
        Plan Database Test
      </Text>

      <Button
        title="Generate and Save Test Plan"
        onPress={testPlanGeneration}
      />

      <View style={{ padding: 12, backgroundColor: "#eeeeee" }}>
        <Text selectable>{result}</Text>
      </View>
    </ScrollView>
  );
}
