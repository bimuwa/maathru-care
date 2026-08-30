import { useEffect, useState } from "react";
import { View, Text, FlatList } from "react-native";
import { getDoctorRequests } from "@/api/ctg";
import { DoctorRequest } from "@/types";
import { styles } from "@/components/ui";

export default function DoctorRequests() {
  const [requests, setRequests] = useState<DoctorRequest[]>([]);

  useEffect(() => {
    getDoctorRequests().then((d) => setRequests(d.requests as DoctorRequest[])).catch(() => {});
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Doctor Requests</Text>
      <FlatList
        data={requests}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>{item.doctors?.profiles?.full_name ?? "Doctor"}</Text>
            <Text style={styles.cardText}>Status: {item.status}</Text>
          </View>
        )}
        ListEmptyComponent={<Text style={styles.cardText}>No requests yet</Text>}
      />
    </View>
  );
}
