import { useState } from "react";
import { View, Text, Image, TouchableOpacity, Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { ctgApi } from "@/api/ctg";
import { styles } from "@/components/ui";

export default function CtgUpload() {
  const [uri, setUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const pickImage = async (useCamera: boolean) => {
    const perm = useCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission required");
      return;
    }
    const result = useCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.8 })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.8 });
    if (!result.canceled) setUri(result.assets[0].uri);
  };

  const handleUpload = async () => {
    if (!uri) return;
    setLoading(true);
    try {
      const { report } = await ctgApi.createReport("IMAGE");
      await ctgApi.uploadImage(report.id, uri, "ctg.jpg");
      router.replace(`/(patient)/ctg/analyzing?id=${report.id}`);
    } catch (err) {
      Alert.alert("Upload failed", err instanceof Error ? err.message : "Error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Upload CTG</Text>
      <Text style={styles.subtitle}>Take a photo or choose from gallery</Text>

      {uri && <Image source={{ uri }} style={{ width: "100%", height: 200, borderRadius: 8, marginBottom: 16 }} />}

      <TouchableOpacity style={styles.button} onPress={() => pickImage(true)}>
        <Text style={styles.buttonText}>Take Photo</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.button, styles.buttonSecondary]} onPress={() => pickImage(false)}>
        <Text style={[styles.buttonText, styles.buttonTextSecondary]}>Choose from Gallery</Text>
      </TouchableOpacity>
      {uri && (
        <TouchableOpacity style={styles.button} onPress={handleUpload} disabled={loading}>
          <Text style={styles.buttonText}>{loading ? "Uploading..." : "Confirm & Analyze"}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
