import { useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const ONBOARDING_KEY = "@voda:onboarding-complete";

export function useOnboarding() {
  const [isOnboardingComplete, setOnboardingComplete] = useState<boolean | null>(
    null
  );

  useEffect(() => {
    AsyncStorage.getItem(ONBOARDING_KEY)
      .then((value) => setOnboardingComplete(value === "1"))
      .catch(() => setOnboardingComplete(false));
  }, []);

  const completeOnboarding = async () => {
    await AsyncStorage.setItem(ONBOARDING_KEY, "1");
    setOnboardingComplete(true);
  };

  return { isOnboardingComplete, completeOnboarding };
}
