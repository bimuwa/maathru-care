import { StyleSheet } from "react-native";

export const colors = {
  primary: "#1B4332",
  primaryMid: "#2D6A4F",
  primaryLight: "#40916C",
  accent: "#52B788",
  accentSoft: "#95D5B2",
  background: "#F0F4F8",
  surface: "#FFFFFF",
  surfaceElevated: "#FFFFFF",
  text: "#0D1B2A",
  textMuted: "#5C677D",
  border: "#E2E8F0",
  warning: "#F4A261",
  warningBg: "#FFF4E6",
  danger: "#E63946",
  dangerBg: "#FFEBEE",
  success: "#2A9D8F",
  successBg: "#E8F5F3",
  suspect: "#E9C46A",
  suspectBg: "#FFF8E7",
  gradientStart: "#1B4332",
  gradientEnd: "#2D6A4F",
  shadow: "rgba(13, 27, 42, 0.08)",
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const radius = {
  sm: 10,
  md: 16,
  lg: 22,
  xl: 28,
};

export const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  screenContent: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.md,
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: colors.text,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: colors.textMuted,
    marginTop: 4,
    lineHeight: 22,
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 12,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.text,
    marginBottom: 4,
  },
  cardText: {
    fontSize: 14,
    color: colors.textMuted,
    lineHeight: 20,
  },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: 14,
    marginBottom: spacing.sm,
    fontSize: 16,
    color: colors.text,
  },
  button: {
    backgroundColor: colors.primaryMid,
    borderRadius: radius.sm,
    padding: 16,
    alignItems: "center",
    marginBottom: spacing.sm,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 2,
  },
  buttonSecondary: {
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.primaryMid,
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  buttonTextSecondary: {
    color: colors.primaryMid,
  },
  disclaimer: {
    fontSize: 12,
    color: colors.textMuted,
    lineHeight: 18,
    marginTop: spacing.sm,
    padding: spacing.md,
    backgroundColor: colors.warningBg,
    borderRadius: radius.sm,
    borderLeftWidth: 3,
    borderLeftColor: colors.warning,
  },
  badge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 99,
    backgroundColor: colors.primaryLight,
    marginTop: 4,
  },
  badgeText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "700",
  },
});

export function classificationTheme(status?: string | null) {
  const s = (status ?? "").toLowerCase();
  if (s.includes("pathological") || s.includes("insufficient")) {
    return { bg: colors.dangerBg, accent: colors.danger, label: status ?? "Unknown" };
  }
  if (s.includes("suspect")) {
    return { bg: colors.suspectBg, accent: colors.suspect, label: status ?? "Suspect" };
  }
  if (s.includes("normal")) {
    return { bg: colors.successBg, accent: colors.success, label: status ?? "Normal" };
  }
  return { bg: colors.background, accent: colors.primaryMid, label: status ?? "Pending" };
}
