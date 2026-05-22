import { useState } from "react";
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
import { AppButton } from "@/components/AppButton";
import { ScreenContainer } from "@/components/ScreenContainer";
import { supabase } from "@/lib/supabase";
import { darkTheme, lightTheme } from "@/theme/colors";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const colorScheme = useColorScheme();
  const theme = colorScheme === "dark" ? darkTheme : lightTheme;

  const handleLogin = async () => {
    setBusy(true);
    setErrorMessage(null);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password
    });

    setBusy(false);

    if (error) {
      setErrorMessage(error.message);
      return;
    }

    router.replace("/");
  };

  return (
    <ScreenContainer>
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.textPrimary }]}>Welcome back</Text>
        <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
          Sign in to book trucks or complete deliveries.
        </Text>
      </View>

      <View style={styles.form}>
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          placeholder="Email address"
          placeholderTextColor={theme.textSecondary}
          style={[
            styles.input,
            { backgroundColor: theme.surface, color: theme.textPrimary, borderColor: theme.border }
          ]}
          value={email}
          onChangeText={setEmail}
        />
        <TextInput
          secureTextEntry
          placeholder="Password"
          placeholderTextColor={theme.textSecondary}
          style={[
            styles.input,
            { backgroundColor: theme.surface, color: theme.textPrimary, borderColor: theme.border }
          ]}
          value={password}
          onChangeText={setPassword}
        />

        {errorMessage ? (
          <Text style={[styles.errorText, { color: theme.danger }]}>{errorMessage}</Text>
        ) : null}

        <AppButton label={busy ? "Signing in..." : "Sign in"} onPress={handleLogin} disabled={busy} />
        {busy ? <ActivityIndicator color={theme.accent} /> : null}
      </View>

      <Pressable onPress={() => router.push("/(auth)/register")}>
        <Text style={[styles.switchText, { color: theme.textSecondary }]}>
          No account yet? <Text style={{ color: theme.accent, fontWeight: "700" }}>Create one</Text>
        </Text>
      </Pressable>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  header: {
    marginTop: 24,
    gap: 10
  },
  title: {
    fontSize: 30,
    fontWeight: "800"
  },
  subtitle: {
    fontSize: 16,
    lineHeight: 24
  },
  form: {
    marginTop: 28,
    gap: 12
  },
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    fontSize: 16
  },
  errorText: {
    fontSize: 14,
    fontWeight: "600"
  },
  switchText: {
    marginTop: 24,
    textAlign: "center",
    fontSize: 14
  }
});
