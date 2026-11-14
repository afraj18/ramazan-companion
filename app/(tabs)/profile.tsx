import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "../../src/theme/colors";

import { getDatabase } from "@/database";
import { exportDatabase } from "@/database/exportDatabase";

export default function ProfileScreen() {
  const handleExport = async () => {
    try {
      const database = await getDatabase();
      await exportDatabase(database);
    } catch (error) {
      console.error(error);
      Alert.alert("Export failed", "Unable to export the database.");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Your profile</Text>
      <Text style={styles.body}>
        Language, calendar preferences, goals, history and backup settings will
        be added in upcoming milestones.
      </Text>
      <Pressable onPress={handleExport}>
        <Text>Export SQLite Database</Text>
      </Pressable>
    </View>
  );
}
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: 24,
    paddingTop: 70,
  },
  title: { color: colors.text, fontSize: 26, fontWeight: "700" },
  body: { color: colors.muted, marginTop: 12, lineHeight: 21 },
});
