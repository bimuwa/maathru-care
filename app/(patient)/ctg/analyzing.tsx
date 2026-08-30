import { useEffect, useState } from "react";
import { Text, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { ctgApi } from "@/api/ctg";
import { colors, spacing } from "@/components/ui";
import { AnalysisLoader } from "@/components/PremiumUI";

export default function CtgAnalyzing() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    ctgApi
      .analyze(id)
      .then(() => router.replace(`/(patient)/ctg/result?id=${id}`))
      .catch((err) => setError(err instanceof Error ? err.message : "Analysis failed"));
  }, [id, router]);

  return (
    <SafeAreaView style={styles.screen}>
      <AnalysisLoader />
      {error && <Text style={styles.error}>{error}</Text>}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  error: {
    color: colors.danger,
    textAlign: "center",
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
    fontWeight: "600",
  },
});
