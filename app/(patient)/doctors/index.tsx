import { useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, TextInput, Alert } from "react-native";
import { searchDoctors } from "@/api/doctors";
import { sendDoctorRequest } from "@/api/ctg";
import { styles } from "@/components/ui";

export default function DoctorsIndex() {
  const [search, setSearch] = useState("");
  const [doctors, setDoctors] = useState<Record<string, unknown>[]>([]);

  useEffect(() => {
    searchDoctors(search).then((d) => setDoctors(d.doctors)).catch(() => {});
  }, [search]);

  const handleRequest = async (doctorId: string) => {
    try {
      await sendDoctorRequest(doctorId);
      Alert.alert("Sent", "Connection request sent");
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "Failed");
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Find a Doctor</Text>
      <TextInput style={styles.input} placeholder="Search..." value={search} onChangeText={setSearch} />
      <FlatList
        data={doctors}
        keyExtractor={(item) => item.id as string}
        renderItem={({ item }) => {
          const p = item.profiles as { full_name?: string; email?: string } | undefined;
          return (
            <View style={styles.card}>
              <Text style={styles.cardTitle}>{p?.full_name ?? "Doctor"}</Text>
              <Text style={styles.cardText}>{item.specialization as string} — {item.hospital as string}</Text>
              <TouchableOpacity style={styles.button} onPress={() => handleRequest(item.id as string)}>
                <Text style={styles.buttonText}>Send Request</Text>
              </TouchableOpacity>
            </View>
          );
        }}
      />
    </View>
  );
}
