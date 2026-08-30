import { useEffect, useState } from "react";
import { ScrollView, View, Text, TouchableOpacity, Alert, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { ctgApi, getDoctorRequests } from "@/api/ctg";
import { CtgReport, DoctorFeedback } from "@/types";
import { colors, spacing, styles } from "@/components/ui";
import {
  ClassificationHero,
  MetricGrid,
  FadeInView,
  QuickAction,
} from "@/components/PremiumUI";

export default function CtgResult() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [report, setReport] = useState<CtgReport | null>(null);
  const [feedback, setFeedback] = useState<DoctorFeedback[]>([]);
  const [doctors, setDoctors] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    if (!id) return;
    ctgApi.getReport(id).then((d) => {
      setReport(d.report);
      setFeedback((d.feedback ?? []) as DoctorFeedback[]);
    });
    getDoctorRequests().then((d) => {
      const active = d.requests
        .filter((r) => r.status === "ACTIVE")
        .map((r) => ({
          id: r.doctors!.id,
          name: r.doctors?.profiles?.full_name ?? "Doctor",
        }));
      setDoctors(active);
    });
  }, [id]);

  const a = report?.ctg_analysis;

  const handleShare = (doctorId: string) => {
    if (!id) return;
    ctgApi.shareReport(id, doctorId)
      .then(() => Alert.alert("Shared", "CTG report sent to doctor"))
      .catch((err) => Alert.alert("Error", err.message));
  };

  if (!report) {
    return (
      <SafeAreaView style={localStyles.screen}>
        <Text style={styles.cardText}>Loading analysis...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={localStyles.screen} edges={["bottom"]}>
      <ScrollView contentContainerStyle={localStyles.content} showsVerticalScrollIndicator={false}>
        <FadeInView>
          <Text style={styles.title}>Analysis Report</Text>
          <Text style={styles.subtitle}>AI-assisted CTG interpretation</Text>
        </FadeInView>

        <ClassificationHero
          classification={a?.classification}
          confidence={a?.confidence}
          signalQuality={a?.signal_quality}
          modelVersion={a?.model_version}
        />

        <Text style={localStyles.section}>Fetal & uterine metrics</Text>
        <MetricGrid
          metrics={[
            { icon: "heart-outline", label: "Baseline FHR", value: a?.baseline_fhr ?? "—", unit: "bpm" },
            { icon: "pulse-outline", label: "ST Variability", value: a?.short_term_variability ?? "—" },
            { icon: "trending-up-outline", label: "LT Variability", value: a?.long_term_variability ?? "—" },
            { icon: "arrow-up-outline", label: "Accelerations", value: a?.accelerations ?? "—" },
            { icon: "arrow-down-outline", label: "Decelerations", value: a?.decelerations ?? "—" },
            { icon: "fitness-outline", label: "Contractions", value: a?.contraction_count ?? "—" },
            { icon: "water-outline", label: "Mean UC", value: a?.mean_uc ?? "—" },
            { icon: "speedometer-outline", label: "Max UC", value: a?.max_uc ?? "—" },
          ]}
        />

        {feedback.length > 0 && (
          <FadeInView delay={400}>
            <Text style={localStyles.section}>Doctor feedback</Text>
            {feedback.map((f) => (
              <View key={f.id} style={styles.card}>
                <Text style={styles.cardText}>{f.feedback}</Text>
              </View>
            ))}
          </FadeInView>
        )}

        {doctors.length > 0 && (
          <FadeInView delay={480}>
            <Text style={localStyles.section}>Share with doctor</Text>
            {doctors.map((d) => (
              <QuickAction
                key={d.id}
                icon="share-social-outline"
                label={`Share with ${d.name}`}
                onPress={() => handleShare(d.id)}
              />
            ))}
          </FadeInView>
        )}

        <FadeInView delay={560}>
          <Text style={styles.disclaimer}>
            Research-grade AI output for informational support only. Does not replace clinical assessment.
          </Text>
          <TouchableOpacity style={styles.button} onPress={() => router.push("/(patient)/ctg/history")}>
            <Text style={styles.buttonText}>View history</Text>
          </TouchableOpacity>
        </FadeInView>
      </ScrollView>
    </SafeAreaView>
  );
}

const localStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  section: {
    fontSize: 13,
    fontWeight: "700",
    color: colors.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1,
    marginVertical: spacing.sm,
  },
});
