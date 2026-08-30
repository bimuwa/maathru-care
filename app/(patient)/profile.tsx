import { View, Text } from "react-native";
import { useAuth } from "@/context/AuthContext";
import { styles } from "@/components/ui";

export default function PatientProfile() {
  const { profile } = useAuth();
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>{profile?.full_name}</Text>
        <Text style={styles.cardText}>{profile?.email}</Text>
        <Text style={styles.cardText}>Role: {profile?.role}</Text>
      </View>
    </View>
  );
}
