export const palette = {
  gold: "#F4B400",
  green: "#1D8F4E",
  red: "#D14343",
  charcoal: "#101218",
  slate: "#1D2330",
  smoke: "#E6ECF4",
  ink: "#09101D",
  white: "#FFFFFF"
} as const;

export const lightTheme = {
  background: "#F7F9FC",
  surface: "#FFFFFF",
  textPrimary: "#09101D",
  textSecondary: "#5C677A",
  border: "#D7DDE8",
  accent: palette.gold,
  success: palette.green,
  danger: palette.red
} as const;

export const darkTheme = {
  background: "#090C12",
  surface: "#101218",
  textPrimary: "#F4F6F9",
  textSecondary: "#9CA9BD",
  border: "#232A39",
  accent: palette.gold,
  success: "#3BC57B",
  danger: "#FF6A6A"
} as const;
