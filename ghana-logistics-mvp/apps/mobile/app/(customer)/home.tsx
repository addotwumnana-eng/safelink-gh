import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useColorScheme,
  View
} from "react-native";
import { router } from "expo-router";
import { AppButton } from "@/components/AppButton";
import { ScreenContainer } from "@/components/ScreenContainer";
import { ACCRA_MUNICIPALITIES } from "@/constants/municipalities";
import { useNearbyDrivers } from "@/hooks/useNearbyDrivers";
import { useAuthSession } from "@/hooks/useAuthSession";
import { supabase } from "@/lib/supabase";
import { darkTheme, lightTheme } from "@/theme/colors";

export default function CustomerHomeScreen() {
  const { session } = useAuthSession();
  const [municipality, setMunicipality] = useState<string>(ACCRA_MUNICIPALITIES[0]);
  const { drivers, loading, error } = useNearbyDrivers(municipality);
  const colorScheme = useColorScheme();
  const theme = colorScheme === "dark" ? darkTheme : lightTheme;

  useEffect(() => {
    if (!session) {
      router.replace("/(auth)/login");
    }
  }, [session]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace("/(auth)/login");
  };

  return (
    <ScreenContainer>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={[styles.brand, { color: theme.accent }]}>Voda Haul</Text>
          <Text style={[styles.title, { color: theme.textPrimary }]}>Book your truck</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Find trusted drivers nearby for household moves, market deliveries, and cargo transport.
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Municipality</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
            {ACCRA_MUNICIPALITIES.map((item) => {
              const active = item === municipality;
              return (
                <Pressable
                  key={item}
                  onPress={() => setMunicipality(item)}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: active ? theme.accent : theme.surface,
                      borderColor: theme.border
                    }
                  ]}
                >
                  <Text style={{ color: active ? "#101218" : theme.textPrimary, fontWeight: "700" }}>
                    {item}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        <View style={[styles.infoCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Text style={[styles.cardTitle, { color: theme.textPrimary }]}>Escrow-protected booking</Text>
          <Text style={[styles.cardText, { color: theme.textSecondary }]}>
            Your payment is held securely and only released after delivery confirmation.
          </Text>
          <View style={styles.quickStats}>
            <Text style={[styles.statBadge, { color: theme.success }]}>Payment secured</Text>
            <Text style={[styles.statBadge, { color: theme.accent }]}>Live tracking ready</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>
            Nearby available drivers
          </Text>
          {loading ? <ActivityIndicator color={theme.accent} /> : null}
          {error ? <Text style={{ color: theme.danger }}>{error}</Text> : null}
          {!loading && !error && drivers.length === 0 ? (
            <Text style={{ color: theme.textSecondary }}>No drivers online in {municipality} right now.</Text>
          ) : null}

          {drivers.map((driver) => (
            <View
              key={driver.driver_id}
              style={[styles.driverCard, { backgroundColor: theme.surface, borderColor: theme.border }]}
            >
              <Text style={[styles.driverName, { color: theme.textPrimary }]}>{driver.full_name}</Text>
              <Text style={[styles.driverMeta, { color: theme.textSecondary }]}>
                {driver.truck_type} - {driver.capacity_kg.toLocaleString()}kg capacity
              </Text>
              <Text style={[styles.driverMeta, { color: theme.textSecondary }]}>
                {driver.distance_km.toFixed(1)} km away in {driver.municipality_name}
              </Text>
              <Text style={[styles.driverMeta, { color: theme.textSecondary }]}>
                Rating {driver.average_rating.toFixed(1)} / 5.0
              </Text>
            </View>
          ))}
        </View>

        <View style={styles.footerButtons}>
          <AppButton label="Start a new booking" onPress={() => {}} />
          <AppButton label="Sign out" variant="secondary" onPress={handleSignOut} />
        </View>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: 20,
    marginTop: 4
  },
  brand: {
    fontSize: 13,
    fontWeight: "800",
    marginBottom: 10,
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
  section: {
    marginTop: 22,
    gap: 10
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700"
  },
  chipRow: {
    gap: 8,
    paddingVertical: 2
  },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8
  },
  infoCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginTop: 24,
    gap: 8
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700"
  },
  cardText: {
    fontSize: 14,
    lineHeight: 20
  },
  quickStats: {
    flexDirection: "row",
    gap: 12,
    marginTop: 2
  },
  statBadge: {
    fontWeight: "700",
    fontSize: 12
  },
  driverCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 5
  },
  driverName: {
    fontSize: 16,
    fontWeight: "700"
  },
  driverMeta: {
    fontSize: 13
  },
  footerButtons: {
    marginTop: 24,
    marginBottom: 20,
    gap: 10
  }
});
