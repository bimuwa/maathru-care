import { useEffect, useRef, useState } from "react";
import {
  Animated,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ViewStyle,
  TextInput,
  TextInputProps,
  ActivityIndicator,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing, classificationTheme } from "./ui";

type IconName = keyof typeof Ionicons.glyphMap;

export function FadeInView({
  children,
  delay = 0,
  style,
}: {
  children: React.ReactNode;
  delay?: number;
  style?: ViewStyle;
}) {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(16)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 500,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 500,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, [delay, opacity, translateY]);

  return (
    <Animated.View style={[{ opacity, transform: [{ translateY }] }, style]}>
      {children}
    </Animated.View>
  );
}

export function DashboardHeader({
  greeting,
  name,
  subtitle,
}: {
  greeting: string;
  name: string;
  subtitle: string;
}) {
  return (
    <LinearGradient
      colors={[colors.gradientStart, colors.gradientEnd]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.headerGradient}
    >
      <Text style={styles.headerGreeting}>{greeting}</Text>
      <Text style={styles.headerName}>{name}</Text>
      <Text style={styles.headerSubtitle}>{subtitle}</Text>
    </LinearGradient>
  );
}

export function StatCard({
  icon,
  label,
  value,
  tint = colors.primaryMid,
  delay = 0,
}: {
  icon: IconName;
  label: string;
  value: string | number;
  tint?: string;
  delay?: number;
}) {
  return (
    <FadeInView delay={delay} style={styles.statCardWrap}>
      <View style={styles.statCard}>
        <View style={[styles.statIconWrap, { backgroundColor: `${tint}18` }]}>
          <Ionicons name={icon} size={22} color={tint} />
        </View>
        <Text style={styles.statValue}>{value}</Text>
        <Text style={styles.statLabel}>{label}</Text>
      </View>
    </FadeInView>
  );
}

export function QuickAction({
  icon,
  label,
  onPress,
  primary = false,
}: {
  icon: IconName;
  label: string;
  onPress: () => void;
  primary?: boolean;
}) {
  if (primary) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.85}>
        <LinearGradient
          colors={[colors.gradientStart, colors.gradientEnd]}
          style={styles.quickActionPrimary}
        >
          <Ionicons name={icon} size={22} color="#FFF" />
          <Text style={styles.quickActionPrimaryText}>{label}</Text>
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  return (
    <TouchableOpacity style={styles.quickActionSecondary} onPress={onPress} activeOpacity={0.85}>
      <Ionicons name={icon} size={20} color={colors.primaryMid} />
      <Text style={styles.quickActionSecondaryText}>{label}</Text>
    </TouchableOpacity>
  );
}

export function InfoPanel({
  icon,
  title,
  body,
  actionLabel,
  onAction,
}: {
  icon: IconName;
  title: string;
  body: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.infoPanel}>
      <View style={styles.infoPanelIcon}>
        <Ionicons name={icon} size={20} color={colors.primaryMid} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.infoPanelTitle}>{title}</Text>
        <Text style={styles.infoPanelBody}>{body}</Text>
        {actionLabel && onAction && (
          <TouchableOpacity onPress={onAction}>
            <Text style={styles.infoPanelAction}>{actionLabel}</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

export function ClassificationHero({
  classification,
  confidence,
  signalQuality,
  modelVersion,
}: {
  classification?: string | null;
  confidence?: number | null;
  signalQuality?: string | null;
  modelVersion?: string | null;
}) {
  const theme = classificationTheme(classification);
  const pct = confidence != null ? Math.round(confidence * 100) : null;
  const progress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(progress, {
      toValue: pct ?? 0,
      duration: 900,
      delay: 200,
      useNativeDriver: false,
    }).start();
  }, [pct, progress]);

  const width = progress.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"],
  });

  return (
    <FadeInView>
      <View style={[styles.classHero, { backgroundColor: theme.bg, borderColor: `${theme.accent}44` }]}>
        <Text style={styles.classHeroLabel}>AI Classification</Text>
        <Text style={[styles.classHeroStatus, { color: theme.accent }]}>{theme.label}</Text>
        {pct != null && (
          <View style={styles.confidenceBlock}>
            <View style={styles.confidenceRow}>
              <Text style={styles.confidenceLabel}>Confidence</Text>
              <Text style={styles.confidenceValue}>{pct}%</Text>
            </View>
            <View style={styles.progressTrack}>
              <Animated.View style={[styles.progressFill, { width, backgroundColor: theme.accent }]} />
            </View>
          </View>
        )}
        <View style={styles.metaRow}>
          <MetaChip label="Signal" value={signalQuality ?? "N/A"} />
          <MetaChip label="Model" value={modelVersion ?? "N/A"} />
        </View>
      </View>
    </FadeInView>
  );
}

function MetaChip({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.metaChip}>
      <Text style={styles.metaChipLabel}>{label}</Text>
      <Text style={styles.metaChipValue} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

export function MetricGrid({
  metrics,
}: {
  metrics: { icon: IconName; label: string; value: string | number; unit?: string }[];
}) {
  return (
    <View style={styles.metricGrid}>
      {metrics.map((m, i) => (
        <FadeInView key={m.label} delay={100 + i * 80} style={styles.metricItemWrap}>
          <View style={styles.metricItem}>
            <Ionicons name={m.icon} size={18} color={colors.primaryMid} />
            <Text style={styles.metricValue}>
              {m.value}
              {m.unit ? <Text style={styles.metricUnit}> {m.unit}</Text> : null}
            </Text>
            <Text style={styles.metricLabel}>{m.label}</Text>
          </View>
        </FadeInView>
      ))}
    </View>
  );
}

export function AnalysisLoader() {
  const spin = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0.6)).current;
  const steps = ["Detecting graph region", "Extracting FHR trace", "Reading contractions", "Running classifier"];
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    Animated.loop(
      Animated.timing(spin, { toValue: 1, duration: 2200, useNativeDriver: true }),
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.6, duration: 800, useNativeDriver: true }),
      ]),
    ).start();
    const t = setInterval(() => setStepIndex((i) => (i + 1) % steps.length), 1800);
    return () => clearInterval(t);
  }, [pulse, spin, steps.length]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });

  return (
    <View style={styles.loaderWrap}>
      <Animated.View style={{ opacity: pulse, transform: [{ rotate }] }}>
        <LinearGradient colors={[colors.gradientStart, colors.accent]} style={styles.loaderRing}>
          <View style={styles.loaderInner}>
            <Ionicons name="pulse" size={36} color={colors.primaryMid} />
          </View>
        </LinearGradient>
      </Animated.View>
      <Text style={styles.loaderTitle}>Analyzing CTG</Text>
      <Text style={styles.loaderStep}>{steps[stepIndex]}</Text>
    </View>
  );
}

export function AuthHero({
  title,
  subtitle,
  icon = "heart-circle-outline",
}: {
  title: string;
  subtitle: string;
  icon?: IconName;
}) {
  return (
    <FadeInView>
      <LinearGradient
        colors={[colors.gradientStart, colors.gradientEnd]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.authHero}
      >
        <View style={styles.authIconRing}>
          <Ionicons name={icon} size={36} color="#FFF" />
        </View>
        <Text style={styles.authTitle}>{title}</Text>
        <Text style={styles.authSubtitle}>{subtitle}</Text>
      </LinearGradient>
    </FadeInView>
  );
}

export function AuthField({
  label,
  icon,
  ...inputProps
}: {
  label: string;
  icon: IconName;
} & TextInputProps) {
  return (
    <View style={styles.authField}>
      <Text style={styles.authFieldLabel}>{label}</Text>
      <View style={styles.authInputWrap}>
        <Ionicons name={icon} size={20} color={colors.textMuted} />
        <TextInput
          style={styles.authInput}
          placeholderTextColor={colors.textMuted}
          {...inputProps}
        />
      </View>
    </View>
  );
}

export function GradientButton({
  label,
  onPress,
  loading = false,
  disabled = false,
  icon,
}: {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  icon?: IconName;
}) {
  return (
    <TouchableOpacity onPress={onPress} disabled={disabled || loading} activeOpacity={0.85}>
      <LinearGradient
        colors={[colors.gradientStart, colors.gradientEnd]}
        style={[styles.gradientBtn, (disabled || loading) && { opacity: 0.65 }]}
      >
        {loading ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <>
            {icon && <Ionicons name={icon} size={20} color="#FFF" />}
            <Text style={styles.gradientBtnText}>{label}</Text>
          </>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
}

export function OutlineButton({
  label,
  onPress,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <TouchableOpacity
      style={[styles.outlineBtn, disabled && { opacity: 0.65 }]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.85}
    >
      <Text style={styles.outlineBtnText}>{label}</Text>
    </TouchableOpacity>
  );
}

export function RoleSelector<T extends string>({
  options,
  value,
  onChange,
  labels,
}: {
  options: T[];
  value: T;
  onChange: (v: T) => void;
  labels?: Record<T, string>;
}) {
  const icons: Record<string, IconName> = {
    PATIENT: "person-outline",
    DOCTOR: "medkit-outline",
  };

  return (
    <View style={styles.roleRow}>
      {options.map((opt) => {
        const active = value === opt;
        return (
          <TouchableOpacity
            key={opt}
            style={[styles.rolePill, active && styles.rolePillActive]}
            onPress={() => onChange(opt)}
            activeOpacity={0.85}
          >
            <Ionicons
              name={icons[opt] ?? "ellipse-outline"}
              size={18}
              color={active ? colors.primaryMid : colors.textMuted}
            />
            <Text style={[styles.rolePillText, active && styles.rolePillTextActive]}>
              {labels?.[opt] ?? opt}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

export function SectionHeader({ title }: { title: string }) {
  return <Text style={styles.sectionHeader}>{title}</Text>;
}

export function HistoryCard({
  date,
  classification,
  source,
  confidence,
  onPress,
  delay = 0,
}: {
  date: string;
  classification: string;
  source: string;
  confidence?: number | null;
  onPress: () => void;
  delay?: number;
}) {
  const theme = classificationTheme(classification);
  const pct = confidence != null ? Math.round(confidence * 100) : null;

  return (
    <FadeInView delay={delay}>
      <TouchableOpacity
        style={[styles.historyCard, { borderLeftColor: theme.accent }]}
        onPress={onPress}
        activeOpacity={0.85}
      >
        <Text style={styles.historyDate}>{date}</Text>
        <Text style={[styles.historyClass, { color: theme.accent }]}>{classification}</Text>
        <View style={styles.historyMeta}>
          <View style={styles.sourceBadge}>
            <Text style={styles.sourceBadgeText}>{source}</Text>
          </View>
          {pct != null && <Text style={styles.confBadge}>{pct}% confidence</Text>}
        </View>
      </TouchableOpacity>
    </FadeInView>
  );
}

export function EmptyState({ icon, message }: { icon: IconName; message: string }) {
  return (
    <View style={styles.emptyState}>
      <Ionicons name={icon} size={40} color={colors.textMuted} />
      <Text style={styles.emptyStateText}>{message}</Text>
    </View>
  );
}

export function NotesPanel({
  notes,
  onChangeNotes,
  onSubmit,
  loading,
  submitLabel = "Submit Feedback",
}: {
  notes: string;
  onChangeNotes: (v: string) => void;
  onSubmit: () => void;
  loading?: boolean;
  submitLabel?: string;
}) {
  return (
    <FadeInView delay={300}>
      <View style={styles.notesCard}>
        <Text style={styles.infoPanelTitle}>Doctor notes</Text>
        <Text style={styles.infoPanelBody}>Add professional comments and recommendations for the patient.</Text>
        <TextInput
          style={styles.notesInput}
          multiline
          placeholder="Enter your clinical assessment..."
          placeholderTextColor={colors.textMuted}
          value={notes}
          onChangeText={onChangeNotes}
        />
        <GradientButton label={submitLabel} onPress={onSubmit} loading={loading} icon="send-outline" />
      </View>
    </FadeInView>
  );
}

export function FeedbackCard({ feedback, author, date }: { feedback: string; author?: string; date?: string }) {
  return (
    <View style={styles.feedbackItem}>
      <Text style={styles.feedbackText}>{feedback}</Text>
      {(author || date) && (
        <Text style={styles.feedbackMeta}>
          {[author, date].filter(Boolean).join(" · ")}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  headerGradient: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  headerGreeting: { color: "rgba(255,255,255,0.85)", fontSize: 14, fontWeight: "600" },
  headerName: { color: "#FFF", fontSize: 26, fontWeight: "800", marginTop: 4 },
  headerSubtitle: { color: "rgba(255,255,255,0.9)", fontSize: 14, marginTop: 6 },
  statCardWrap: { width: "48%" },
  statCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 110,
  },
  statIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.sm,
  },
  statValue: { fontSize: 24, fontWeight: "800", color: colors.text },
  statLabel: { fontSize: 12, color: colors.textMuted, marginTop: 2, fontWeight: "600" },
  quickActionPrimary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 16,
    borderRadius: radius.sm,
    marginBottom: spacing.sm,
  },
  quickActionPrimaryText: { color: "#FFF", fontSize: 16, fontWeight: "700" },
  quickActionSecondary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 14,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  quickActionSecondaryText: { color: colors.primaryMid, fontSize: 15, fontWeight: "600" },
  infoPanel: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  infoPanelIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: `${colors.primaryMid}12`,
    alignItems: "center",
    justifyContent: "center",
  },
  infoPanelTitle: { fontSize: 15, fontWeight: "700", color: colors.text },
  infoPanelBody: { fontSize: 13, color: colors.textMuted, marginTop: 4, lineHeight: 19 },
  infoPanelAction: { color: colors.primaryMid, fontWeight: "700", marginTop: 8, fontSize: 13 },
  classHero: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    marginBottom: spacing.md,
  },
  classHeroLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  classHeroStatus: { fontSize: 32, fontWeight: "800", marginTop: 6, letterSpacing: -0.5 },
  confidenceBlock: { marginTop: spacing.md },
  confidenceRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 6 },
  confidenceLabel: { fontSize: 13, color: colors.textMuted, fontWeight: "600" },
  confidenceValue: { fontSize: 13, fontWeight: "800", color: colors.text },
  progressTrack: {
    height: 8,
    backgroundColor: "rgba(0,0,0,0.06)",
    borderRadius: 99,
    overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: 99 },
  metaRow: { flexDirection: "row", gap: spacing.sm, marginTop: spacing.md },
  metaChip: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.65)",
    borderRadius: radius.sm,
    padding: 10,
  },
  metaChipLabel: { fontSize: 11, color: colors.textMuted, fontWeight: "600" },
  metaChipValue: { fontSize: 13, fontWeight: "700", color: colors.text, marginTop: 2 },
  metricGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  metricItemWrap: { width: "48%" },
  metricItem: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 96,
  },
  metricValue: { fontSize: 22, fontWeight: "800", color: colors.text, marginTop: 8 },
  metricUnit: { fontSize: 13, fontWeight: "600", color: colors.textMuted },
  metricLabel: { fontSize: 12, color: colors.textMuted, marginTop: 4, fontWeight: "600" },
  loaderWrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.lg },
  loaderRing: {
    width: 120,
    height: 120,
    borderRadius: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  loaderInner: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  loaderTitle: { fontSize: 22, fontWeight: "800", color: colors.text, marginTop: spacing.lg },
  loaderStep: { fontSize: 14, color: colors.textMuted, marginTop: spacing.sm },
  // Auth
  authHero: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    alignItems: "center",
  },
  authIconRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  authTitle: { color: "#FFF", fontSize: 26, fontWeight: "800", letterSpacing: -0.5 },
  authSubtitle: { color: "rgba(255,255,255,0.88)", fontSize: 14, marginTop: 6, textAlign: "center", lineHeight: 20 },
  authField: { marginBottom: spacing.sm },
  authFieldLabel: { fontSize: 13, fontWeight: "700", color: colors.textMuted, marginBottom: 6, marginLeft: 2 },
  authInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 14,
    gap: 10,
  },
  authInput: { flex: 1, paddingVertical: 14, fontSize: 16, color: colors.text },
  gradientBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 16,
    borderRadius: radius.sm,
    marginBottom: spacing.sm,
  },
  gradientBtnText: { color: "#FFF", fontSize: 16, fontWeight: "700" },
  outlineBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 15,
    borderRadius: radius.sm,
    backgroundColor: colors.surface,
    borderWidth: 1.5,
    borderColor: colors.primaryMid,
    marginBottom: spacing.sm,
  },
  outlineBtnText: { color: colors.primaryMid, fontSize: 16, fontWeight: "700" },
  roleRow: { flexDirection: "row", gap: spacing.sm, marginBottom: spacing.md },
  rolePill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    padding: 14,
    borderRadius: radius.sm,
    borderWidth: 1.5,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  rolePillActive: { borderColor: colors.primaryMid, backgroundColor: `${colors.primaryMid}10` },
  rolePillText: { fontSize: 14, fontWeight: "700", color: colors.textMuted },
  rolePillTextActive: { color: colors.primaryMid },
  sectionHeader: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  historyCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
    borderLeftWidth: 4,
  },
  historyDate: { fontSize: 15, fontWeight: "700", color: colors.text },
  historyClass: { fontSize: 22, fontWeight: "800", marginTop: 4 },
  historyMeta: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 8 },
  sourceBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 99,
    backgroundColor: `${colors.primaryMid}15`,
  },
  sourceBadgeText: { fontSize: 11, fontWeight: "700", color: colors.primaryMid },
  confBadge: { fontSize: 12, color: colors.textMuted, fontWeight: "600" },
  emptyState: {
    alignItems: "center",
    padding: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyStateText: { fontSize: 15, color: colors.textMuted, marginTop: spacing.sm, textAlign: "center" },
  notesCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.md,
  },
  notesInput: {
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    padding: 14,
    fontSize: 15,
    color: colors.text,
    minHeight: 120,
    textAlignVertical: "top",
    marginBottom: spacing.sm,
  },
  feedbackItem: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
    borderLeftWidth: 3,
    borderLeftColor: colors.primaryMid,
  },
  feedbackText: { fontSize: 14, color: colors.text, lineHeight: 21 },
  feedbackMeta: { fontSize: 12, color: colors.textMuted, marginTop: 6, fontWeight: "600" },
});
