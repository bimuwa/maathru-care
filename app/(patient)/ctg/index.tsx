import { View, Text, TouchableOpacity } from "react-native";
import { useRouter } from "expo-router";
import { styles } from "@/components/ui";

export default function CtgIndex() {
  const router = useRouter();
  return (
    <View style={styles.container}>
      <Text style={styles.title}>CTG Analysis</Text>
      <TouchableOpacity style={styles.button} onPress={() => router.push("/(patient)/ctg/upload")}>
        <Text style={styles.buttonText}>Upload Image</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.button, styles.buttonSecondary]} onPress={() => router.push("/(patient)/ctg/manual")}>
        <Text style={[styles.buttonText, styles.buttonTextSecondary]}>Manual Entry</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.button, styles.buttonSecondary]} onPress={() => router.push("/(patient)/ctg/history")}>
        <Text style={[styles.buttonText, styles.buttonTextSecondary]}>History</Text>
      </TouchableOpacity>
    </View>
  );
}
