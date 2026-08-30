import { useEffect, useState } from "react";
import { ScrollView, Text, Alert, StyleSheet } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { ctgApi } from "@/api/ctg";
import { feedbackApi } from "@/api/analysis";
import { CtgReport, DoctorFeedback } from "@/types";
import { colors, spacing, styles } from "@/components/ui";
import {
  ClassificationHero,
  MetricGrid,
  FadeInView,
  SectionHeader,
  NotesPanel,
  FeedbackCard,
} from "@/components/PremiumUI";

export default function DoctorCtgDetail() {
  const { id, analysisId } = useLocalSearchParams<{ id: string; analysisId?: string }>();
  const [report, setReport] = useState<CtgReport | null>(null);
  const [feedback, setFeedback] = useState<DoctorFeedback[]>([]);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!id) return;
    ctgApi.getReport(id).then((d) => {
      setReport(d.report);
      setFeedback((d.feedback ?? []) as DoctorFeedback[]);
    });
  }, [id]);

  const analysis = report?.ctg_analysis;
  const aid = analysisId ?? analysis?.id;

  const handleSubmit = async () => {
    if (!aid || !notes.trim()) {
      Alert.alert("Error", "Please enter notes before submitting.");
      return;
    }
    setLoading(true);
    try {
      await feedbackApi.createFeedback(aid, notes.trim());
      Alert.alert("Submitted", "Feedback sent to patient");
      setNotes("");
      if (id) {
        const d = await ctgApi.getReport(id);
        setFeedback((d.feedback ?? []) as DoctorFeedback[]);
      }
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  if (!report) {
    return (
      <SafeAreaView style={localStyles.screen}>
        <Text style={styles.cardText}>Loading CTG report...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={localStyles.screen} edges={["bottom"]}>
      <ScrollView contentContainerStyle={localStyles.content} showsVerticalScrollIndicator={false}>
        <FadeInView>
          <Text style={styles.title}>CTG Review</Text>
          <Text style={styles.subtitle}>
            {new Date(report.recorded_at).toLocaleDateString(undefined, {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
            {" · "}
            {report.source}
          </Text>
        </FadeInView>

        <Text style={styles.disclaimer}>AI-assisted analysis — professional review required.</Text>

        <ClassificationHero
          classification={analysis?.classification}
          confidence={analysis?.confidence}
          signalQuality={analysis?.signal_quality}
          modelVersion={analysis?.model_version}
        />

        <SectionHeader title="Fetal & uterine metrics" />
        <MetricGrid
          metrics={[
            { icon: "heart-outline", label: "Baseline FHR", value: analysis?.baseline_fhr ?? "—", unit: "bpm" },
            { icon: "pulse-outline", label: "ST Variability", value: analysis?.short_term_variability ?? "—" },
            { icon: "trending-up-outline", label: "LT Variability", value: analysis?.long_term_variability ?? "—" },
            { icon: "arrow-up-outline", label: "Accelerations", value: analysis?.accelerations ?? "—" },
            { icon: "arrow-down-outline", label: "Decelerations", value: analysis?.decelerations ?? "—" },
            { icon: "fitness-outline", label: "Contractions", value: analysis?.contraction_count ?? "—" },
            { icon: "water-outline", label: "Mean UC", value: analysis?.mean_uc ?? "—" },
            { icon: "speedometer-outline", label: "Max UC", value: analysis?.max_uc ?? "—" },
          ]}
        />

        {feedback.length > 0 && (
          <FadeInView delay={250}>
            <SectionHeader title="Previous feedback" />
            {feedback.map((f) => (
              <FeedbackCard
                key={f.id}
                feedback={f.feedback}
                author={f.doctors?.profiles?.full_name}
                date={new Date(f.created_at).toLocaleDateString()}
              />
            ))}
          </FadeInView>
        )}

        <SectionHeader title="Add feedback" />
        <NotesPanel
          notes={notes}
          onChangeNotes={setNotes}
          onSubmit={handleSubmit}
          loading={loading}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const localStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
});
