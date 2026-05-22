import { ActivityIndicator, StyleSheet, Text, useColorScheme, View } from "react-native";
import { Redirect } from "expo-router";
import { useAuthSession } from "@/hooks/useAuthSession";
import { useOnboarding } from "@/hooks/useOnboarding";
import { useProfile } from "@/hooks/useProfile";
import { darkTheme, lightTheme } from "@/theme/colors";

export default function EntryPoint() {
  const { session, loading } = useAuthSession();
  const { isOnboardingComplete } = useOnboarding();
  const { profile, loading: profileLoading } = useProfile(session?.user.id);
  const colorScheme = useColorScheme();
  const theme = colorScheme === "dark" ? darkTheme : lightTheme;

  if (loading || isOnboardingComplete === null || (session && profileLoading)) {
    return (
      <View style={[styles.loadingContainer, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={theme.accent} />
        <Text style={[styles.loadingText, { color: theme.textSecondary }]}>
          Preparing your logistics dashboard...
        </Text>
      </View>
    );
  }

  if (!isOnboardingComplete) {
    return <Redirect href="/(onboarding)" />;
  }

  if (!session) {
    return <Redirect href="/(auth)/login" />;
  }

  if (profile?.role === "driver") {
    return <Redirect href="/(driver)/home" />;
  }

  if (profile?.role === "admin") {
    return <Redirect href="/(customer)/home" />;
  }

  return <Redirect href="/(customer)/home" />;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24
  },
  loadingText: {
    marginTop: 16,
    fontSize: 14,
    textAlign: "center"
  }
});
