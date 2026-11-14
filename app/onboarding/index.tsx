import { router } from "expo-router";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
    ActivityIndicator,
    Pressable,
    ScrollView,
    StyleSheet,
    Text,
    View,
} from "react-native";

import {
    AppLanguage,
    ExperienceLevel,
    ONBOARDING_GOALS,
    OnboardingGoal,
    saveOnboarding,
} from "../../src/database";
import i18n from "../../src/i18n";
import { colors } from "../../src/theme/colors";

const LANGUAGES: {
  value: AppLanguage;
  label: string;
  nativeLabel: string;
}[] = [
  { value: "en", label: "English", nativeLabel: "English" },
  { value: "ta", label: "Tamil", nativeLabel: "தமிழ்" },
  { value: "si", label: "Sinhala", nativeLabel: "සිංහල" },
];

const LEVELS: ExperienceLevel[] = ["beginner", "intermediate", "advanced"];

export default function OnboardingScreen() {
  const { t } = useTranslation();

  const [step, setStep] = useState(1);
  const [language, setLanguage] = useState<AppLanguage>("en");
  const [experienceLevel, setExperienceLevel] =
    useState<ExperienceLevel>("beginner");

  const [selectedGoals, setSelectedGoals] = useState<OnboardingGoal[]>([
    "daily_prayers",
    "quran_reading",
  ]);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function toggleGoal(goal: OnboardingGoal) {
    setSelectedGoals((current) =>
      current.includes(goal)
        ? current.filter((item) => item !== goal)
        : [...current, goal],
    );
  }

  async function finishOnboarding() {
    if (selectedGoals.length === 0) {
      setError(t("onboarding.selectGoalError"));
      return;
    }

    setSaving(true);
    setError("");

    try {
      await saveOnboarding({
        language,
        experienceLevel,
        goals: selectedGoals,
      });

      await i18n.changeLanguage(language);

      router.replace("/(tabs)");
    } catch (cause) {
      console.error("Onboarding save failed:", cause);
      setError(t("onboarding.saveError"));
      setSaving(false);
    }
  }

  function nextStep() {
    if (step < 3) {
      setStep((current) => current + 1);
    } else {
      void finishOnboarding();
    }
  }

  return (
    <View style={styles.screen}>
      <View style={styles.top}>
        <Text style={styles.brand}>RAMAZAN COMPANION</Text>
        <Text style={styles.step}>
          {t("onboarding.step", { current: step, total: 3 })}
        </Text>

        <View style={styles.progressTrack}>
          <View
            style={[styles.progressFill, { width: `${(step / 3) * 100}%` }]}
          />
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {step === 1 && (
          <>
            <Text style={styles.title}>{t("onboarding.languageTitle")}</Text>

            <Text style={styles.description}>
              {t("onboarding.languageDescription")}
            </Text>

            {LANGUAGES.map((item) => (
              <OptionCard
                key={item.value}
                selected={language === item.value}
                onPress={() => setLanguage(item.value)}
                title={item.nativeLabel}
                subtitle={item.label}
              />
            ))}
          </>
        )}

        {step === 2 && (
          <>
            <Text style={styles.title}>{t("onboarding.levelTitle")}</Text>

            <Text style={styles.description}>
              {t("onboarding.levelDescription")}
            </Text>

            {LEVELS.map((level) => (
              <OptionCard
                key={level}
                selected={experienceLevel === level}
                onPress={() => setExperienceLevel(level)}
                title={t(`onboarding.${level}`)}
                subtitle={t(`onboarding.${level}Description`)}
              />
            ))}
          </>
        )}

        {step === 3 && (
          <>
            <Text style={styles.title}>{t("onboarding.goalsTitle")}</Text>

            <Text style={styles.description}>
              {t("onboarding.goalsDescription")}
            </Text>

            <Text style={styles.selectedCount}>
              {t("onboarding.selected", {
                count: selectedGoals.length,
              })}
            </Text>

            {ONBOARDING_GOALS.map((goal) => (
              <OptionCard
                key={goal}
                selected={selectedGoals.includes(goal)}
                onPress={() => toggleGoal(goal)}
                title={t(`onboarding.${goal}`)}
              />
            ))}
          </>
        )}

        {!!error && <Text style={styles.error}>{error}</Text>}
      </ScrollView>

      <View style={styles.footer}>
        {step > 1 && (
          <Pressable
            style={styles.backButton}
            disabled={saving}
            onPress={() => setStep((current) => current - 1)}
          >
            <Text style={styles.backText}>{t("onboarding.back")}</Text>
          </Pressable>
        )}

        <Pressable
          style={[
            styles.continueButton,
            step === 1 && styles.fullButton,
            saving && styles.disabledButton,
          ]}
          disabled={saving}
          onPress={nextStep}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.continueText}>
              {step === 3 ? t("onboarding.finish") : t("onboarding.continue")}
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

function OptionCard({
  title,
  subtitle,
  selected,
  onPress,
}: {
  title: string;
  subtitle?: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.option, selected && styles.optionSelected]}
    >
      <View style={styles.optionContent}>
        <Text style={styles.optionTitle}>{title}</Text>

        {subtitle && <Text style={styles.optionSubtitle}>{subtitle}</Text>}
      </View>

      <View style={[styles.radio, selected && styles.radioSelected]}>
        {selected && <View style={styles.radioInner} />}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: 58,
  },
  top: {
    paddingHorizontal: 24,
  },
  brand: {
    color: colors.primary,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 2,
  },
  step: {
    color: colors.muted,
    fontSize: 11,
    marginTop: 24,
    fontWeight: "600",
  },
  progressTrack: {
    height: 4,
    backgroundColor: colors.border,
    borderRadius: 4,
    marginTop: 10,
    overflow: "hidden",
  },
  progressFill: {
    height: 4,
    backgroundColor: colors.gold,
    borderRadius: 4,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 34,
    paddingBottom: 24,
  },
  title: {
    color: colors.text,
    fontSize: 27,
    lineHeight: 35,
    fontWeight: "800",
  },
  description: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 22,
    marginTop: 10,
    marginBottom: 24,
  },
  selectedCount: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 12,
  },
  option: {
    minHeight: 70,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: 16,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  optionSelected: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  optionContent: {
    flex: 1,
    paddingRight: 12,
  },
  optionTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
  },
  optionSubtitle: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 18,
    marginTop: 5,
  },
  radio: {
    width: 21,
    height: 21,
    borderRadius: 11,
    borderWidth: 1.5,
    borderColor: colors.muted,
    justifyContent: "center",
    alignItems: "center",
  },
  radioSelected: {
    borderColor: colors.primary,
  },
  radioInner: {
    width: 11,
    height: 11,
    borderRadius: 6,
    backgroundColor: colors.primary,
  },
  footer: {
    paddingHorizontal: 24,
    paddingTop: 14,
    paddingBottom: 28,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    flexDirection: "row",
    gap: 12,
  },
  backButton: {
    minHeight: 52,
    paddingHorizontal: 22,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: "center",
    alignItems: "center",
  },
  backText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: "700",
  },
  continueButton: {
    flex: 1,
    minHeight: 52,
    backgroundColor: colors.primary,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  fullButton: {
    flex: 1,
  },
  disabledButton: {
    opacity: 0.6,
  },
  continueText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  error: {
    color: "#B42318",
    fontSize: 13,
    marginTop: 12,
  },
});
