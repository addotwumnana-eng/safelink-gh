import { Pressable, StyleSheet, Text, useColorScheme } from "react-native";
import { darkTheme, lightTheme } from "@/theme/colors";

type AppButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  variant?: "primary" | "secondary";
};

export function AppButton({
  label,
  onPress,
  disabled = false,
  variant = "primary"
}: AppButtonProps) {
  const colorScheme = useColorScheme();
  const theme = colorScheme === "dark" ? darkTheme : lightTheme;
  const isPrimary = variant === "primary";

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: isPrimary ? theme.accent : theme.surface,
          borderColor: theme.border,
          opacity: disabled ? 0.6 : pressed ? 0.85 : 1
        }
      ]}
    >
      <Text
        style={[
          styles.label,
          { color: isPrimary ? "#101218" : theme.textPrimary }
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 18
  },
  label: {
    fontSize: 16,
    fontWeight: "700"
  }
});
