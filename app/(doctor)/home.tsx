import { useEffect, useState } from "react";
import { ScrollView, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { getDoctorRequests } from "@/api/ctg";
import { getDoctorSharedReports } from "@/api/doctors";
import { colors, spacing } from "@/components/ui";
import { DashboardHeader, StatCard, QuickAction, FadeInView } from "@/components/PremiumUI";

export default function DoctorHome() {
  const { profile, signOut } = useAuth();
  const [pending, setPending] = useState(0);
  const [shared, setShared] = useState(0);
  const router = useRouter();

  useEffect(() => {
    getDoctorRequests().then((d) => {
      setPending(d.requests.filter((r) => r.status === "PENDING").length);
    });
    getDoctorSharedReports().then((d) => setShared(d.reports.length));
  }, []);

  return (
    <SafeAreaView style={styles.screen} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <DashboardHeader
          greeting="Welcome back"
          name={`Dr. ${profile?.full_name ?? ""}`}
          subtitle="Clinical review dashboard"
        />

        <View style={styles.statRow}>
          <StatCard
            icon="person-add-outline"
            label="Pending requests"
            value={pending}
            tint={colors.warning}
            delay={0}
          />
          <StatCard
            icon="folder-open-outline"
            label="Shared CTGs"
            value={shared}
            tint={colors.primaryMid}
            delay={80}
          />
        </View>

        <FadeInView delay={140}>
          <View style={styles.reviewBanner}>
            <Text style={styles.reviewTitle}>Review queue</Text>
            <Text style={styles.reviewBody}>
              {shared > 0
                ? `${shared} patient report${shared === 1 ? "" : "s"} awaiting your review.`
                : "No shared CTG reports yet. Accept patient connections to receive traces."}
            </Text>
          </View>
        </FadeInView>

        <Text style={styles.section}>Actions</Text>
        <QuickAction icon="people-outline" label="Manage patients" onPress={() => router.push("/(doctor)/patients")} primary />
        <QuickAction icon="analytics-outline" label="Shared CTG reports" onPress={() => router.push("/(doctor)/ctg")} />

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
  reviewBanner: {
    backgroundColor: colors.surface,
    borderRadius: 16,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  reviewTitle: { fontSize: 16, fontWeight: "700", color: colors.text },
  reviewBody: { fontSize: 14, color: colors.textMuted, marginTop: 6, lineHeight: 20 },
  section: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: spacing.sm,
    marginTop: spacing.md,
  },
  signOut: { alignItems: "center", marginTop: spacing.lg, padding: spacing.sm },
  signOutText: { color: colors.danger, fontWeight: "600" },
});
