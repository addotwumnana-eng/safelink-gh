import { useMemo, useState } from "react";
import { StyleSheet, Text, useColorScheme, View } from "react-native";
import { router } from "expo-router";
import { AppButton } from "@/components/AppButton";
import { ScreenContainer } from "@/components/ScreenContainer";
import { useOnboarding } from "@/hooks/useOnboarding";
import { darkTheme, lightTheme } from "@/theme/colors";

const slides = [
  {
    title: "Move anything in Accra, fast",
    body: "Book mini trucks, Kia Rhino, pickups, tippers, and cargo trucks with transparent pricing."
  },
  {
    title: "Pay securely with escrow",
    body: "Your payment is held safely until delivery is confirmed with your unique delivery PIN."
  },
  {
    title: "Track every trip live",
    body: "See driver location in real time, contact your driver quickly, and rate after delivery."
  }
];

export default function OnboardingScreen() {
  const [index, setIndex] = useState(0);
  const { completeOnboarding } = useOnboarding();
  const colorScheme = useColorScheme();
  const theme = colorScheme === "dark" ? darkTheme : lightTheme;

  const isLast = index === slides.length - 1;
  const current = useMemo(() => slides[index] ?? slides[0]!, [index]);

  const handlePrimary = async () => {
    if (!isLast) {
      setIndex((prev) => prev + 1);
      return;
    }

    await completeOnboarding();
    router.replace("/(auth)/register");
  };

  return (
    <ScreenContainer>
      <View style={styles.topArea}>
        <Text style={[styles.badge, { color: theme.accent }]}>CarryGO</Text>
        <Text style={[styles.title, { color: theme.textPrimary }]}>{current.title}</Text>
        <Text style={[styles.body, { color: theme.textSecondary }]}>{current.body}</Text>
      </View>

      <View style={styles.bottomArea}>
        <View style={styles.dots}>
          {slides.map((slide, i) => (
            <View
              key={slide.title}
              style={[
                styles.dot,
                { backgroundColor: i === index ? theme.accent : theme.border }
              ]}
            />
          ))}
        </View>
        <AppButton
          label={isLast ? "Create account" : "Continue"}
          onPress={handlePrimary}
        />
        {!isLast ? (
          <View style={styles.skipWrap}>
            <AppButton
              label="Skip onboarding"
              variant="secondary"
              onPress={() => setIndex(slides.length - 1)}
            />
          </View>
        ) : null}
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  topArea: {
    flex: 1,
    justifyContent: "center",
    gap: 14
  },
  badge: {
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase"
  },
  title: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: "800"
  },
  body: {
    fontSize: 17,
    lineHeight: 26
  },
  bottomArea: {
    gap: 16,
    paddingBottom: 8
  },
  dots: {
    flexDirection: "row",
    gap: 8
  },
  dot: {
    width: 28,
    height: 6,
    borderRadius: 99
  },
  skipWrap: {
    marginTop: 8
  }
});
