import { Redirect } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, View } from "react-native";

import { getOnboardingStatus } from "../src/database";
import { colors } from "../src/theme/colors";

export default function Index() {
  const [destination, setDestination] = useState<"onboarding" | "tabs" | null>(
    null,
  );

  useEffect(() => {
    let mounted = true;

    getOnboardingStatus()
      .then((completed) => {
        if (mounted) {
          setDestination(completed ? "tabs" : "onboarding");
        }
      })
      .catch((error) => {
        console.error("Failed to check onboarding:", error);
      });

    return () => {
      mounted = false;
    };
  }, []);

  if (destination === "onboarding") {
    return <Redirect href="/onboarding" />;
  }

  if (destination === "tabs") {
    return <Redirect href="/(tabs)" />;
  }

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: colors.background,
      }}
    >
      <ActivityIndicator color={colors.primary} size="large" />
    </View>
  );
}
