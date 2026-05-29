import type { PropsWithChildren } from "react";
import { useColorScheme, View, StyleSheet, type ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { darkTheme, lightTheme } from "@/theme/colors";

type ScreenContainerProps = PropsWithChildren<{
  style?: ViewStyle;
}>;

export function ScreenContainer({ children, style }: ScreenContainerProps) {
  const colorScheme = useColorScheme();
  const theme = colorScheme === "dark" ? darkTheme : lightTheme;

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <View style={[styles.container, style]}>{children}</View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 16
  }
});
