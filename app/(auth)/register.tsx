import { useState } from "react";
import { ScrollView, Alert, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { homeRouteForRole } from "@/lib/authRouting";
import { UserRole } from "@/types";
import { colors, spacing } from "@/components/ui";
import { AuthHero, AuthField, GradientButton, RoleSelector, FadeInView } from "@/components/PremiumUI";

export default function RegisterScreen() {
  const { signUp } = useAuth();
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<UserRole>("PATIENT");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!fullName || !email || !password) {
      Alert.alert("Error", "Please fill all fields");
      return;
    }
    setLoading(true);
    try {
      const profile = await signUp(email.trim(), password, fullName.trim(), role);
      router.replace(homeRouteForRole(profile.role));
    } catch (err) {
      Alert.alert("Registration failed", err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={["bottom"]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <AuthHero
            title="Create account"
            subtitle="Register as patient or doctor — no email confirmation required"
            icon="person-add-outline"
          />

          <FadeInView delay={100}>
            <RoleSelector
              options={["PATIENT", "DOCTOR"] as UserRole[]}
              value={role}
              onChange={setRole}
              labels={{ PATIENT: "Patient", DOCTOR: "Doctor" }}
            />

            <AuthField
              label="Full name"
              icon="person-outline"
              placeholder="Your full name"
              value={fullName}
              onChangeText={setFullName}
              autoComplete="name"
            />
            <AuthField
              label="Email"
              icon="mail-outline"
              placeholder="you@example.com"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              autoComplete="email"
            />
            <AuthField
              label="Password"
              icon="lock-closed-outline"
              placeholder="At least 6 characters"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="new-password"
            />

            <GradientButton label="Register" onPress={handleRegister} loading={loading} icon="checkmark-circle-outline" />
          </FadeInView>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
});
