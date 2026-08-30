import { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, Alert } from "react-native";
import { getDoctorPatients } from "@/api/doctors";
import { updateDoctorRequest } from "@/api/ctg";
import { getDoctorRequests } from "@/api/ctg";
import { styles } from "@/components/ui";
import { DoctorRequest } from "@/types";

export default function DoctorPatients() {
  const [patients, setPatients] = useState<Record<string, unknown>[]>([]);
  const [pending, setPending] = useState<DoctorRequest[]>([]);

  const load = () => {
    getDoctorPatients().then((d) => setPatients(d.patients)).catch(() => {});
    getDoctorRequests().then((d) => {
      setPending(d.requests.filter((r) => r.status === "PENDING"));
    }).catch(() => {});
  };

  useEffect(() => { load(); }, []);

  const handleRequest = async (id: string, status: "ACTIVE" | "REJECTED") => {
    try {
      await updateDoctorRequest(id, status);
      load();
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "Failed");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Patients</Text>

      {pending.length > 0 && (
        <>
          <Text style={styles.subtitle}>Pending Requests</Text>
          {pending.map((req) => {
            const p = req.patients as { profiles?: { full_name: string } } | undefined;
            return (
              <View key={req.id} style={styles.card}>
                <Text style={styles.cardTitle}>{p?.profiles?.full_name ?? "Patient"}</Text>
                <TouchableOpacity style={styles.button} onPress={() => handleRequest(req.id, "ACTIVE")}>
                  <Text style={styles.buttonText}>Accept</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.button, styles.buttonSecondary]} onPress={() => handleRequest(req.id, "REJECTED")}>
                  <Text style={[styles.buttonText, styles.buttonTextSecondary]}>Reject</Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </>
      )}

      <Text style={styles.subtitle}>Connected Patients</Text>
      <FlatList
        data={patients}
        keyExtractor={(item) => item.id as string}
        renderItem={({ item }) => {
          const p = item.patients as { profiles?: { full_name: string } } | undefined;
          return (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{p?.profiles?.full_name ?? "Patient"}</Text>
              <Text style={styles.cardText}>Status: {item.status as string}</Text>
            </View>
          );
        }}
        ListEmptyComponent={<Text style={styles.cardText}>No connected patients</Text>}
      />
    </View>
  );
}
