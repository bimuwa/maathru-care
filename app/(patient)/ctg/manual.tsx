import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert } from "react-native";
import { useRouter } from "expo-router";
import { ctgApi } from "@/api/ctg";
import { ManualCtgValues } from "@/types";
import { styles } from "@/components/ui";

const fields: { key: keyof ManualCtgValues; label: string }[] = [
  { key: "baseline_fhr", label: "Baseline FHR (bpm)" },
  { key: "short_term_variability", label: "Short-term Variability" },
  { key: "long_term_variability", label: "Long-term Variability" },
  { key: "accelerations", label: "Accelerations" },
  { key: "decelerations", label: "Decelerations" },
  { key: "contraction_count", label: "Contraction Count" },
  { key: "mean_uc", label: "Mean UC" },
  { key: "max_uc", label: "Max UC" },
];

export default function CtgManual() {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const parsed: ManualCtgValues = {
      baseline_fhr: Number(values.baseline_fhr),
      short_term_variability: Number(values.short_term_variability),
      long_term_variability: Number(values.long_term_variability),
      accelerations: Number(values.accelerations),
      decelerations: Number(values.decelerations),
      contraction_count: Number(values.contraction_count),
      mean_uc: Number(values.mean_uc),
      max_uc: Number(values.max_uc),
    };

    if (parsed.baseline_fhr < 30 || parsed.baseline_fhr > 240) {
      Alert.alert("Invalid", "Baseline FHR must be 30-240 bpm");
      return;
    }

    setLoading(true);
    try {
      const { report } = await ctgApi.createReport("MANUAL");
      await ctgApi.saveManualValues(report.id, parsed);
      router.replace(`/(patient)/ctg/analyzing?id=${report.id}`);
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.title}>Manual CTG Entry</Text>
      {fields.map(({ key, label }) => (
        <View key={key}>
          <Text style={{ marginBottom: 4, color: "#6C757D" }}>{label}</Text>
          <TextInput
            style={styles.input}
            keyboardType="numeric"
            value={values[key] ?? ""}
            onChangeText={(v) => setValues((s) => ({ ...s, [key]: v }))}
          />
        </View>
      ))}
      <TouchableOpacity style={styles.button} onPress={handleSubmit} disabled={loading}>
        <Text style={styles.buttonText}>{loading ? "Saving..." : "Submit & Analyze"}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
