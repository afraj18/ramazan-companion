import { useState } from "react";
import { Button, ScrollView, Text, View } from "react-native";


import {
    getDailyPlanProgress,
    getPlanTasks,
    updatePlanTaskProgress
} from "../src/database";

export default function DevPlanTest() {
  const [result, setResult] = useState("Not tested yet");

  async function testPlanGeneration() {
    try {
      const planId = "test-plan-001";

      // Retrieve the plan that was already saved.
      const savedTasks = await getPlanTasks(planId);

      if (savedTasks.length === 0) {
        throw new Error(
          "No saved tasks found. Generate and save the plan first.",
        );
      }

      // Find the prayer task instead of relying on array order.
      const prayerTask = savedTasks.find(
        (task) => task.template_key === "track_daily_prayers",
      );

      if (!prayerTask) {
        throw new Error("Prayer task not found.");
      }

      // Record one completed prayer.
      await updatePlanTaskProgress(prayerTask.id, 1);

      // Retrieve updated records.
      const updatedTasks = await getPlanTasks(planId);

      const updatedPrayerTask = updatedTasks.find(
        (task) => task.id === prayerTask.id,
      );

      const dailyProgress = await getDailyPlanProgress(
        prayerTask.scheduled_date,
      );

      setResult(
        `SUCCESS

Saved tasks: ${updatedTasks.length}

Updated task:
${updatedPrayerTask?.title_key}

Completed count:
${updatedPrayerTask?.completed_count}

Task status:
${updatedPrayerTask?.status}

Daily progress:
${JSON.stringify(dailyProgress, null, 2)}`,
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
