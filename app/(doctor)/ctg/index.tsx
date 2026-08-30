import { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { getDoctorSharedReports } from "@/api/doctors";
import { styles } from "@/components/ui";

export default function DoctorCtgList() {
  const [reports, setReports] = useState<Record<string, unknown>[]>([]);
  const router = useRouter();

  useEffect(() => {
    getDoctorSharedReports().then((d) => setReports(d.reports)).catch(() => {});
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Shared CTG Reports</Text>
      <FlatList
        data={reports}
        keyExtractor={(item) => item.id as string}
        renderItem={({ item }) => {
          const report = item.ctg_reports as Record<string, unknown> | undefined;
          const analysis = report?.ctg_analysis as Record<string, unknown> | undefined;
          const patient = report?.patients as { profiles?: { full_name: string } } | undefined;
          return (
            <TouchableOpacity
              style={styles.card}
              onPress={() => router.push(`/(doctor)/ctg/${report?.id}?analysisId=${analysis?.id}`)}
            >
              <Text style={styles.cardTitle}>{patient?.profiles?.full_name ?? "Patient"}</Text>
              <Text style={styles.cardText}>{analysis?.classification as string ?? "Pending"}</Text>
              <Text style={styles.cardText}>{new Date(item.shared_at as string).toLocaleDateString()}</Text>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={<Text style={styles.cardText}>No shared reports</Text>}
      />
    </View>
  );
}
