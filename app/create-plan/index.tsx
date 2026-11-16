import { router } from "expo-router";
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

const PLAN_OPTIONS = [
  {
    id: "general",
    title: "General Monthly Plan",
    description:
      "Build your monthly routine with goals and daily activities for the month.",
    route: "/create-plan/general" as const,
    icon: "01",
  },
  {
    id: "ramadan",
    title: "Ramadan Plan",
    description:
      "Create a dedicated Ramadan routine with daily worship activities and a difficulty level.",
    route: "/create-plan/ramadan" as const,
    icon: "02",
  },
];

export default function CreatePlanScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Text style={styles.backText}>← Back</Text>
        </Pressable>

        <View style={styles.header}>
          <Text style={styles.eyebrow}>PLAN YOUR JOURNEY</Text>
          <Text style={styles.title}>Create a Plan</Text>
          <Text style={styles.subtitle}>
            Choose the type of plan you want to create.
          </Text>
        </View>

        <View style={styles.options}>
          {PLAN_OPTIONS.map((option) => (
            <Pressable
              key={option.id}
              style={({ pressed }) => [
                styles.optionCard,
                pressed && styles.optionCardPressed,
              ]}
              onPress={() => router.push(option.route)}
            >
              <View style={styles.optionTop}>
                <View style={styles.numberContainer}>
                  <Text style={styles.number}>{option.icon}</Text>
                </View>
                <Text style={styles.arrow}>↗</Text>
              </View>

              <Text style={styles.optionTitle}>{option.title}</Text>
              <Text style={styles.optionDescription}>{option.description}</Text>

              <Text style={styles.actionText}>Continue →</Text>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F7F2",
  },
  content: {
    padding: 24,
    paddingTop: 16,
    paddingBottom: 40,
  },
  backButton: {
    alignSelf: "flex-start",
    paddingVertical: 8,
    marginBottom: 28,
  },
  backText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#526052",
  },
  header: {
    marginBottom: 32,
  },
  eyebrow: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.8,
    color: "#9A8050",
    marginBottom: 10,
  },
  title: {
    fontSize: 30,
    fontWeight: "700",
    color: "#203B30",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 23,
    color: "#777B73",
  },
  options: {
    gap: 16,
  },
  optionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 22,
    borderWidth: 1,
    borderColor: "#EAE9E1",
  },
  optionCardPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.99 }],
  },
  optionTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  numberContainer: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: "#F1F2E9",
    alignItems: "center",
    justifyContent: "center",
  },
  number: {
    fontSize: 13,
    fontWeight: "700",
    color: "#526B50",
  },
  arrow: {
    fontSize: 22,
    color: "#9A8050",
  },
  optionTitle: {
    fontSize: 19,
    fontWeight: "700",
    color: "#203B30",
    marginBottom: 8,
  },
  optionDescription: {
    fontSize: 14,
    lineHeight: 22,
    color: "#777B73",
    marginBottom: 22,
  },
  actionText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#8A7042",
  },
});
