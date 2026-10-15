import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { BlurView } from "expo-blur";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts, spacing, type } from "../theme";
import type { ModalityReading } from "../api/contracts";
import type { MoodReadings } from "../store";

const STATES = ["calm", "neutral", "distressed"] as const;
const LABELS: Record<(typeof STATES)[number], string> = { calm: "Calm", neutral: "Neutral", distressed: "Distressed" };

type Props = {
  visible: boolean;
  onClose: () => void;
  readings: MoodReadings | null;
  cameraEnabled: boolean;
  textMoodEnabled: boolean;
};

const pct = (value: number) => `${Math.round(value * 100)}%`;

function Reading({ icon, title, reading, emptyText }: { icon: keyof typeof Ionicons.glyphMap; title: string; reading: ModalityReading | null; emptyText: string }) {
  return <View style={styles.section}>
    <View style={styles.sectionHeader}>
      <Ionicons name={icon} size={20} color={colors.deepPink} />
      <Text style={styles.sectionTitle}>{title}</Text>
      {reading && <Text style={styles.result}>{LABELS[reading.state]} · {pct(reading.scores[reading.state])}</Text>}
    </View>
    {reading
      ? STATES.map(state => <View key={state} style={styles.barRow}>
        <Text style={styles.barLabel}>{LABELS[state]}</Text>
        <View style={styles.barTrack}><View style={[styles.barFill, { width: `${Math.round(reading.scores[state] * 100)}%` }, state === reading.state && styles.barFillTop]} /></View>
        <Text style={styles.barValue}>{pct(reading.scores[state])}</Text>
      </View>)
      : <Text style={styles.empty}>{emptyText}</Text>}
  </View>;
}

// Camera and text mood readings from the last message, over a blurred backdrop like the consent popup.
export function MoodInfoModal({ visible, onClose, readings, cameraEnabled, textMoodEnabled }: Props) {
  const noMessage = "Send a message to see a reading.";
  const cameraEmpty = !cameraEnabled ? "Camera is off." : !readings ? noMessage : "No face was detected for your last message.";
  const textEmpty = !textMoodEnabled ? "Text mood is off."
    : !readings ? noMessage
    : readings.language !== "si" ? "Text mood reads Sinhala messages only."
    : "No text reading for your last message.";

  return <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
    <View style={styles.root}>
      <BlurView intensity={28} tint="light" style={StyleSheet.absoluteFill} />
      <View style={styles.scrim} />
      <Pressable accessibilityLabel="Close info" onPress={onClose} style={StyleSheet.absoluteFill} />
      <View style={styles.card}>
        <View style={styles.header}>
          <View style={styles.headerIcon}><Ionicons name="information" size={24} color={colors.deepPink} /></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.title}>Mood info</Text>
            <Text style={styles.subtitle}>From your last message</Text>
          </View>
        </View>
        <Reading icon="videocam-outline" title="Camera" reading={cameraEnabled && readings ? readings.face : null} emptyText={cameraEmpty} />
        <Reading icon="chatbubble-ellipses-outline" title="Text mood" reading={textMoodEnabled && readings ? readings.text : null} emptyText={textEmpty} />
        <Pressable accessibilityRole="button" onPress={onClose} style={styles.primary}><Text style={styles.primaryText}>Close</Text></Pressable>
      </View>
    </View>
  </Modal>;
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.lg },
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(48,39,42,.16)" },
  card: { width: "100%", maxWidth: 420, backgroundColor: colors.card, borderRadius: 26, padding: spacing.lg, shadowColor: colors.ink, shadowOpacity: .18, shadowRadius: 24, elevation: 8 },
  header: { flexDirection: "row", alignItems: "center", gap: 13, marginBottom: spacing.sm },
  headerIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.lightPink, alignItems: "center", justifyContent: "center" },
  title: { color: colors.ink, fontFamily: fonts.extraBold, fontSize: 21 },
  subtitle: { color: colors.muted, fontFamily: fonts.regular, fontSize: 13, marginTop: 1 },
  section: { marginTop: spacing.md, gap: 8 },
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 10 },
  sectionTitle: { flex: 1, color: colors.ink, fontFamily: fonts.bold, fontSize: type.body },
  result: { color: colors.deepPink, fontFamily: fonts.bold, fontSize: 15 },
  barRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingLeft: 30 },
  barLabel: { width: 74, color: colors.muted, fontFamily: fonts.semiBold, fontSize: 13 },
  barTrack: { flex: 1, height: 8, borderRadius: 4, backgroundColor: colors.veryLightPink, overflow: "hidden" },
  barFill: { height: 8, borderRadius: 4, backgroundColor: colors.lightPink },
  barFillTop: { backgroundColor: colors.primary },
  barValue: { width: 38, textAlign: "right", color: colors.muted, fontFamily: fonts.semiBold, fontSize: 13 },
  empty: { color: colors.muted, fontFamily: fonts.regular, fontSize: 14, paddingLeft: 30 },
  primary: { minHeight: 50, backgroundColor: colors.deepPink, borderRadius: 13, alignItems: "center", justifyContent: "center", marginTop: spacing.lg, outlineStyle: "none" as any },
  primaryText: { color: colors.white, fontFamily: fonts.bold }
});
