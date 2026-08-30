import { useEffect, useState } from "react";
import { ScrollView, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { useCtg } from "@/context/CtgContext";
import { remindersApi } from "@/api/reminders";
import { getDoctorRequests } from "@/api/ctg";
import { colors, spacing } from "@/components/ui";
import {
  DashboardHeader,
  StatCard,
  QuickAction,
  InfoPanel,
  FadeInView,
} from "@/components/PremiumUI";
import { Reminder } from "@/types";
import { classificationTheme } from "@/components/ui";

export default function PatientHome() {
  const { profile, signOut } = useAuth();
  const { reports, loadHistory } = useCtg();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [doctorName, setDoctorName] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    loadHistory();
    remindersApi.list().then((d) => setReminders(d.reminders)).catch(() => {});
    getDoctorRequests().then((d) => {
      const active = d.requests.find((r) => r.status === "ACTIVE");
      const doc = active?.doctors as { profiles?: { full_name: string } } | undefined;
      setDoctorName(doc?.profiles?.full_name ?? null);
    }).catch(() => {});
  }, [loadHistory]);

  const latest = reports[0];
  const nextReminder = reminders.find((r) => r.status === "PENDING");
  const completedCount = reports.filter((r) => r.status === "COMPLETED").length;
  const latestClass = latest?.ctg_analysis?.classification ?? latest?.status ?? "—";
  const classTheme = classificationTheme(latestClass);

  return (
    <SafeAreaView style={styles.screen} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <DashboardHeader
          greeting="Good day"
          name={profile?.full_name ?? "Patient"}
          subtitle="Your CTG monitoring dashboard"
        />

        <View style={styles.statRow}>
          <StatCard icon="documents-outline" label="Total CTGs" value={reports.length} delay={0} />
          <StatCard icon="checkmark-circle-outline" label="Completed" value={completedCount} tint={colors.success} delay={80} />
        </View>

        <Text style={styles.section}>Latest analysis</Text>
        <FadeInView delay={120}>
          <View style={[styles.latestCard, { borderLeftColor: classTheme.accent }]}>
            <Text style={styles.latestLabel}>Most recent trace</Text>
            <Text style={[styles.latestStatus, { color: classTheme.accent }]}>{latestClass}</Text>
            {latest ? (
              <>
                <Text style={styles.latestMeta}>
                  {new Date(latest.recorded_at).toLocaleDateString(undefined, {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}
                </Text>
                <TouchableOpacity onPress={() => router.push(`/(patient)/ctg/result?id=${latest.id}`)}>
                  <Text style={styles.link}>View full report →</Text>
                </TouchableOpacity>
              </>
            ) : (
              <Text style={styles.latestMeta}>Upload your first CTG to get AI-assisted insights.</Text>
            )}
          </View>
        </FadeInView>

        <Text style={styles.section}>Care team</Text>
        <InfoPanel
          icon="medkit-outline"
          title="Connected doctor"
          body={doctorName ?? "No doctor linked yet"}
          actionLabel={doctorName ? "Manage connection" : "Find a doctor"}
          onAction={() => router.push("/(patient)/doctors")}
        />
        <InfoPanel
          icon="alarm-outline"
          title="Next reminder"
          body={nextReminder?.title ?? "No upcoming reminders"}
          actionLabel="View reminders"
          onAction={() => router.push("/(patient)/reminders")}
        />

        <Text style={styles.section}>Quick actions</Text>
        <QuickAction icon="camera-outline" label="Upload CTG image" onPress={() => router.push("/(patient)/ctg/upload")} primary />
        <QuickAction icon="create-outline" label="Enter manual values" onPress={() => router.push("/(patient)/ctg/manual")} />
        <QuickAction icon="time-outline" label="CTG history" onPress={() => router.push("/(patient)/ctg/history")} />

        <TouchableOpacity onPress={signOut} style={styles.signOut}>
          <Text style={styles.signOutText}>Sign out</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  statRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: spacing.sm },
  section: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  latestCard: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 4,
    marginBottom: spacing.sm,
  },
  latestLabel: { fontSize: 12, color: colors.textMuted, fontWeight: "600" },
  latestStatus: { fontSize: 28, fontWeight: "800", marginTop: 4 },
  latestMeta: { fontSize: 14, color: colors.textMuted, marginTop: 6 },
  link: { color: colors.primaryMid, fontWeight: "700", marginTop: 10, fontSize: 14 },
  signOut: { alignItems: "center", marginTop: spacing.lg, padding: spacing.sm },
  signOutText: { color: colors.danger, fontWeight: "600" },
});
