import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  useColorScheme,
  View
} from "react-native";
import { router } from "expo-router";
import { AppButton } from "@/components/AppButton";
import { ScreenContainer } from "@/components/ScreenContainer";
import { useAuthSession } from "@/hooks/useAuthSession";
import { getDriverOnboardingProgress } from "@/lib/driverOnboarding";
import { supabase } from "@/lib/supabase";
import { darkTheme, lightTheme } from "@/theme/colors";
import type { DriverOnboardingProgress } from "@/types/domain";

type JobCard = {
  id: string;
  pickup_address: string;
  dropoff_address: string;
  fare_total: number;
  status: string;
  scheduled_for: string;
};

export default function DriverHomeScreen() {
  const [isOnline, setIsOnline] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState("pending");
  const [onboardingProgress, setOnboardingProgress] = useState<DriverOnboardingProgress | null>(
    null
  );
  const [jobs, setJobs] = useState<JobCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingOnline, setUpdatingOnline] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { session } = useAuthSession();
  const colorScheme = useColorScheme();
  const theme = colorScheme === "dark" ? darkTheme : lightTheme;

  const fetchDriverState = useCallback(async () => {
    if (!session?.user.id) {
      setLoading(false);
      return;
    }

    const [driverResponse, jobsResponse] = await Promise.all([
      supabase
        .from("drivers")
        .select("is_online, verification_status")
        .eq("user_id", session.user.id)
        .single(),
      supabase
        .from("bookings")
        .select("id, pickup_address, dropoff_address, fare_total, status, scheduled_for")
        .eq("driver_id", session.user.id)
        .in("status", ["driver_assigned", "accepted", "arrived_pickup", "in_transit"])
        .order("scheduled_for", { ascending: true })
        .limit(10)
    ]);

    if (driverResponse.error) {
      setErrorMessage(driverResponse.error.message);
    } else {
      setIsOnline(driverResponse.data?.is_online ?? false);
      setVerificationStatus(driverResponse.data?.verification_status ?? "pending");
      const progress = await getDriverOnboardingProgress(session.user.id);
      setOnboardingProgress(progress);
    }

    if (jobsResponse.error) {
      setErrorMessage(jobsResponse.error.message);
      setJobs([]);
    } else {
      setJobs((jobsResponse.data as JobCard[]) ?? []);
    }

    setLoading(false);
  }, [session?.user.id]);

  useEffect(() => {
    if (!session) {
      router.replace("/(auth)/login");
      return;
    }

    fetchDriverState().catch((error: unknown) => {
      setLoading(false);
      setErrorMessage(error instanceof Error ? error.message : "Could not load driver data");
    });
  }, [fetchDriverState, session]);

  const toggleOnline = async (next: boolean) => {
    if (!session?.user.id) {
      return;
    }

    if (next && !onboardingProgress?.complete) {
      setErrorMessage("Complete onboarding and wait for approval before going online.");
      return;
    }

    setUpdatingOnline(true);
    setErrorMessage(null);
    const { error } = await supabase
      .from("drivers")
      .update({ is_online: next })
      .eq("user_id", session.user.id);
    setUpdatingOnline(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    setIsOnline(next);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace("/(auth)/login");
  };

  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={[styles.brand, { color: theme.accent }]}>Driver Console</Text>
          <Text style={[styles.title, { color: theme.textPrimary }]}>Today&apos;s dispatch</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Stay online to receive nearby cargo and household moving requests.
          </Text>
        </View>

        <View style={[styles.onlineCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View>
            <Text style={[styles.onlineTitle, { color: theme.textPrimary }]}>Availability</Text>
            <Text style={{ color: theme.textSecondary, marginTop: 4 }}>
              {isOnline ? "Online and visible to customers" : "Offline - currently hidden"}
            </Text>
            <Text style={{ color: theme.textSecondary, marginTop: 4 }}>
              Verification status: {verificationStatus.toUpperCase()}
            </Text>
          </View>
          <Switch
            value={isOnline}
            onValueChange={toggleOnline}
            disabled={updatingOnline || !onboardingProgress?.complete || verificationStatus !== "approved"}
            trackColor={{ false: theme.border, true: theme.success }}
          />
        </View>

        {onboardingProgress && !onboardingProgress.complete ? (
          <View style={[styles.sectionCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
              Complete onboarding to receive jobs
            </Text>
            <Text style={[styles.helperText, { color: theme.textSecondary }]}>
              Upload your Ghana Card, selfie verification, and truck photos for quick approval.
            </Text>
            <View style={styles.progressList}>
              <Text style={{ color: theme.textSecondary }}>
                {onboardingProgress.hasGhanaCardNumber ? "✓" : "•"} Ghana Card details
              </Text>
              <Text style={{ color: theme.textSecondary }}>
                {onboardingProgress.hasGhanaCardImage ? "✓" : "•"} Ghana Card image
              </Text>
              <Text style={{ color: theme.textSecondary }}>
                {onboardingProgress.hasSelfieImage ? "✓" : "•"} Selfie verification
              </Text>
              <Text style={{ color: theme.textSecondary }}>
                {onboardingProgress.hasVehicleProfile ? "✓" : "•"} Vehicle profile
              </Text>
              <Text style={{ color: theme.textSecondary }}>
                {onboardingProgress.hasTruckPhotos ? "✓" : "•"} Truck photos
              </Text>
            </View>
            <View style={{ marginTop: 12 }}>
              <AppButton label="Continue onboarding" onPress={() => router.push("/(driver)/onboarding")} />
            </View>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Active jobs</Text>
          {loading ? <ActivityIndicator color={theme.accent} /> : null}
          {errorMessage ? <Text style={{ color: theme.danger }}>{errorMessage}</Text> : null}
          {!loading && jobs.length === 0 ? (
            <Text style={{ color: theme.textSecondary }}>
              No active trips. Keep your status online to receive requests quickly.
            </Text>
          ) : null}
          {jobs.map((job) => (
            <Pressable
              key={job.id}
              style={[styles.jobCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
            >
              <Text style={[styles.jobRoute, { color: theme.textPrimary }]}>
                {job.pickup_address}
                {" -> "}
                {job.dropoff_address}
              </Text>
              <Text style={[styles.jobMeta, { color: theme.textSecondary }]}>
                Fare GHS {job.fare_total.toFixed(2)} | Status: {job.status}
              </Text>
              <Text style={[styles.jobMeta, { color: theme.textSecondary }]}>
                Schedule: {new Date(job.scheduled_for).toLocaleString()}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.footerButtons}>
          <AppButton label="Open wallet and payouts" onPress={() => {}} />
          <AppButton label="Sign out" variant="secondary" onPress={handleSignOut} />
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: 18,
    marginTop: 4
  },
  brand: {
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 8,
    textTransform: "uppercase"
  },
  title: {
    fontSize: 30,
    fontWeight: "800",
    marginBottom: 8
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22
  },
  onlineCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  onlineTitle: {
    fontSize: 16,
    fontWeight: "700"
  },
  sectionCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginTop: 16
  },
  section: {
    marginTop: 22,
    gap: 10
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700"
  },
  jobCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 6
  },
  jobRoute: {
    fontSize: 15,
    fontWeight: "700",
    lineHeight: 22
  },
  jobMeta: {
    fontSize: 13
  },
  helperText: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 20
  },
  progressList: {
    marginTop: 10,
    gap: 6
  },
  footerButtons: {
    marginTop: 24,
    marginBottom: 20,
    gap: 10
  }
});
