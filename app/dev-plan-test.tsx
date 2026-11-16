import { useState } from "react";
import { Button, ScrollView, Text, View } from "react-native";

import {
    getDailyPlanProgress,
    getPlanTasks,
    updatePlanTaskProgress,
} from "../src/database";
import {
    getHijriDate,
    getHijriMonths,
    syncHijriCalendar,
} from "../src/features/calendar/hijri-calendar";

import { getDatabase, initializeDatabase } from "../src/database";

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

  async function testCalendarMigration() {
    try {
      await initializeDatabase();

      const db = await getDatabase();

      const columns = await db.getAllAsync<{
        name: string;
        type: string;
      }>("PRAGMA table_info(hijri_months)");

      console.log("Hijri calendar columns:", columns);

      const migration = await db.getFirstAsync<{
        version: number;
        applied_at: string;
      }>("SELECT version, applied_at FROM schema_migrations WHERE version = 4");

      console.log("Migration 4:", migration);

      setResult(
        migration && columns.length > 0
          ? `Migration 4 successful. Found ${columns.length} columns.`
          : "Migration 4 verification failed.",
      );
    } catch (error) {
      console.error("Calendar migration failed:", error);

      setResult(
        error instanceof Error ? error.message : "Calendar migration failed.",
      );
    }
  }

  async function testHijriCalendar() {
    try {
      await initializeDatabase();

      const syncedCount = await syncHijriCalendar();
      const months = await getHijriMonths();
      const today = await getHijriDate();

      console.log("Synced records:", syncedCount);
      console.log("Cached months:", months);
      console.log("Today's Hijri date:", today);

      setResult(
        today
          ? `${today.hijriDay} ${today.monthName} ${today.hijriYear} AH`
          : "No confirmed Hijri date available.",
      );
    } catch (error) {
      console.error("Calendar test failed:", error);

      setResult(
        error instanceof Error
          ? error.message
          : "Calendar synchronization failed.",
      );
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
      <Button title="Test Calendar Migration" onPress={testCalendarMigration} />

      <Button title="Test Hijri Calendar" onPress={testHijriCalendar} />

      <View style={{ padding: 12, backgroundColor: "#eeeeee" }}>
        <Text selectable>{result}</Text>
      </View>
    </ScrollView>
  );
}
