import { Stack } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Text, View } from "react-native";

import { getAppSettings, initializeDatabase } from "../src/database";
import "../src/i18n";
import i18n from "../src/i18n";
import { colors } from "../src/theme/colors";

export default function RootLayout() {
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function bootstrap() {
      try {
        await initializeDatabase();

        const settings = await getAppSettings();

        if (settings?.language) {
          await i18n.changeLanguage(settings.language);
        }

        if (mounted) setReady(true);
      } catch (cause) {
        console.error("App initialization failed:", cause);

        if (mounted) {
          setError(
            cause instanceof Error
              ? cause.message
              : "App initialization failed",
          );
        }
      }
    }

    void bootstrap();

    return () => {
      mounted = false;
    };
  }, []);

  if (error) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          padding: 24,
          backgroundColor: colors.background,
        }}
      >
        <Text style={{ color: colors.text, fontSize: 18 }}>
          App initialization failed
        </Text>
        <Text style={{ color: colors.muted, marginTop: 12 }}>{error}</Text>
      </View>
    );
  }

  if (!ready) {
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

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="onboarding" />
      <Stack.Screen name="(tabs)" />
    </Stack>
  );
}
