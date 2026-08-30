import { useEffect } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useCtg } from "@/context/CtgContext";
import { colors, spacing } from "@/components/ui";
import { DashboardHeader, HistoryCard, EmptyState, FadeInView } from "@/components/PremiumUI";

export default function CtgHistory() {
  const { reports, loadHistory } = useCtg();
  const router = useRouter();

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const completedCount = reports.filter((r) => r.status === "COMPLETED").length;

  return (
    <SafeAreaView style={localStyles.screen} edges={["bottom"]}>
      <FlatList
        data={reports}
        keyExtractor={(item) => item.id}
        contentContainerStyle={localStyles.content}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            <DashboardHeader
              greeting="Your records"
              name="CTG History"
              subtitle={`${reports.length} total · ${completedCount} completed`}
            />
            <FadeInView delay={80}>
              <View style={localStyles.divider} />
            </FadeInView>
          </>
        }
        renderItem={({ item, index }) => (
          <HistoryCard
            date={new Date(item.recorded_at).toLocaleDateString(undefined, {
              weekday: "short",
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
            classification={item.ctg_analysis?.classification ?? item.status}
            source={item.source}
            confidence={item.ctg_analysis?.confidence}
            delay={120 + index * 60}
            onPress={() => router.push(`/(patient)/ctg/result?id=${item.id}`)}
          />
        )}
        ListEmptyComponent={
          <EmptyState
            icon="documents-outline"
            message="No CTG records yet. Upload an image or enter manual values to get started."
          />
        }
      />
    </SafeAreaView>
  );
}

const localStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  divider: { height: 1, backgroundColor: colors.border, marginBottom: spacing.sm },
});
