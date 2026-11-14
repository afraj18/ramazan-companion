import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import type { SQLiteDatabase } from "expo-sqlite";
import { Platform } from "react-native";

export async function exportDatabase(db: SQLiteDatabase) {
  try {
    if (Platform.OS === "web") {
      throw new Error(
        "This export implementation requires Android or iOS Expo Go.",
      );
    }

    const databaseBytes = await db.serializeAsync();

    const base64 = btoa(
      Array.from(databaseBytes)
        .map((byte) => String.fromCharCode(byte))
        .join(""),
    );

    const directory = FileSystem.cacheDirectory;

    console.log("Cache directory:", directory);

    if (!directory) {
      throw new Error(
        "Expo FileSystem cache directory is unavailable. Check your Expo Go runtime.",
      );
    }

    const fileUri = `${directory}ramazan-companion-export.db`;

    await FileSystem.writeAsStringAsync(fileUri, base64, {
      encoding: FileSystem.EncodingType.Base64,
    });

    if (!(await Sharing.isAvailableAsync())) {
      throw new Error("Sharing is unavailable.");
    }

    await Sharing.shareAsync(fileUri, {
      mimeType: "application/x-sqlite3",
      dialogTitle: "Export Ramazan Companion Database",
    });
  } catch (error) {
    console.error("Database export failed:", error);
    throw error;
  }
}
