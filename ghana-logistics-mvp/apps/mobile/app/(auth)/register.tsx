import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  useColorScheme,
  View
} from "react-native";
import { router } from "expo-router";
import { ScreenContainer } from "@/components/ScreenContainer";
import { AppButton } from "@/components/AppButton";
import { supabase } from "@/lib/supabase";
import { darkTheme, lightTheme } from "@/theme/colors";
import type { AppRole } from "@/types/domain";

const roleOptions: Array<{ role: AppRole; label: string }> = [
  { role: "customer", label: "Customer" },
  { role: "driver", label: "Driver" }
];

export default function RegisterScreen() {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<AppRole>("customer");
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const colorScheme = useColorScheme();
  const theme = colorScheme === "dark" ? darkTheme : lightTheme;

  const isSubmitDisabled = useMemo(
    () => busy || !fullName.trim() || !phone.trim() || !email.trim() || password.length < 8,
    [busy, email, fullName, password.length, phone]
  );

  const handleSignUp = async () => {
    setBusy(true);
    setErrorMessage(null);
    setFeedback(null);

    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        data: {
          full_name: fullName.trim(),
          phone_number: phone.trim(),
          role
        }
      }
    });

    setBusy(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    if (!data.session) {
      setFeedback("Account created. Check your email to verify before login.");
      return;
    }

    router.replace("/");
  };

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.textPrimary }]}>Create account</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Join Voda Haul for secure logistics in Accra.
        </Text>
      </View>

      <View style={styles.roleContainer}>
        {roleOptions.map((item) => {
          const selected = role === item.role;
          return (
            <Pressable
              key={item.role}
              onPress={() => setRole(item.role)}
              style={[
                styles.roleChip,
                {
                  backgroundColor: selected ? theme.accent : theme.surface,
                  borderColor: theme.border
                }
              ]}
            >
              <Text
                style={[
                  styles.roleChipLabel,
                  { color: selected ? "#111722" : theme.textPrimary }
                ]}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.form}>
        <TextInput
          placeholder="Full name"
          placeholderTextColor={theme.textSecondary}
          style={[styles.input, { backgroundColor: theme.surface, color: theme.textPrimary, borderColor: theme.border }]}
          value={fullName}
          onChangeText={setFullName}
        />
        <TextInput
          placeholder="Phone number (+233...)"
          placeholderTextColor={theme.textSecondary}
          keyboardType="phone-pad"
          style={[styles.input, { backgroundColor: theme.surface, color: theme.textPrimary, borderColor: theme.border }]}
          value={phone}
          onChangeText={setPhone}
        />
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          placeholder="Email address"
          placeholderTextColor={theme.textSecondary}
          style={[styles.input, { backgroundColor: theme.surface, color: theme.textPrimary, borderColor: theme.border }]}
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          secureTextEntry
          placeholder="Password (minimum 8 chars)"
          placeholderTextColor={theme.textSecondary}
          style={[styles.input, { backgroundColor: theme.surface, color: theme.textPrimary, borderColor: theme.border }]}
          value={password}
          onChangeText={setPassword}
        />

        {errorMessage ? (
          <Text style={[styles.message, { color: theme.danger }]}>{errorMessage}</Text>
        ) : null}

        {feedback ? (
          <Text style={[styles.message, { color: theme.success }]}>{feedback}</Text>
        ) : null}

        <AppButton
          label={busy ? "Creating account..." : "Create account"}
          onPress={handleSignUp}
          disabled={isSubmitDisabled}
        />
        {busy ? <ActivityIndicator color={theme.accent} /> : null}
      </View>

      <Pressable onPress={() => router.push("/(auth)/login")}>
        <Text style={[styles.switchText, { color: theme.textSecondary }]}>
          Already have an account? <Text style={{ color: theme.accent, fontWeight: "700" }}>Sign in</Text>
        </Text>
      </Pressable>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    marginTop: 16,
    gap: 8
  },
  title: {
    fontSize: 30,
    fontWeight: "800"
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 22
  },
  roleContainer: {
    marginTop: 20,
    flexDirection: "row",
    gap: 10
  },
  roleChip: {
    flex: 1,
    borderRadius: 14,
    borderWidth: 1,
    minHeight: 46,
    alignItems: "center",
    justifyContent: "center"
  },
  roleChipLabel: {
    fontWeight: "700"
  },
  form: {
    marginTop: 20,
    gap: 12
  },
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    fontSize: 16
  },
  message: {
    fontSize: 13,
    lineHeight: 19
  },
  switchText: {
    marginTop: 20,
    textAlign: "center",
    fontSize: 14
  }
});
