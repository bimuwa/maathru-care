import { useState } from "react";
import { ScrollView, Text, TouchableOpacity, Alert, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAuth } from "@/context/AuthContext";
import { homeRouteForRole } from "@/lib/authRouting";
import { colors, spacing } from "@/components/ui";
import { AuthHero, AuthField, GradientButton, OutlineButton, FadeInView } from "@/components/PremiumUI";

export default function LoginScreen() {
  const { signIn } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setLoading(true);
    try {
      const profile = await signIn(email.trim(), password);
      router.replace(homeRouteForRole(profile.role));
    } catch (err) {
      Alert.alert("Login failed", err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={["bottom"]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <AuthHero
            title="Welcome back"
            subtitle="Sign in to access your CTG monitoring dashboard"
            icon="log-in-outline"
          />

          <FadeInView delay={100}>
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
              placeholder="Enter your password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoComplete="password"
            />

            <GradientButton label="Sign In" onPress={handleLogin} loading={loading} icon="arrow-forward-outline" />

            <OutlineButton label="Create account" onPress={() => router.push("/(auth)/register")} />

            <TouchableOpacity style={styles.forgotLink} onPress={() => router.push("/(auth)/forgot-password")}>
              <Text style={styles.forgotText}>Forgot password?</Text>
            </TouchableOpacity>
          </FadeInView>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  forgotLink: { alignItems: "center", marginTop: spacing.sm, padding: spacing.sm },
  forgotText: { color: colors.primaryMid, fontWeight: "700", fontSize: 14 },
});
