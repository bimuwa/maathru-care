import { useState } from "react";
import { ScrollView, Alert, StyleSheet, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { resetPassword } from "@/api/auth";
import { colors, spacing } from "@/components/ui";
import { AuthHero, AuthField, GradientButton, FadeInView } from "@/components/PremiumUI";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleReset = async () => {
    if (!email.trim() || !newPassword) {
      Alert.alert("Error", "Enter your email and a new password.");
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      const result = await resetPassword(email.trim(), newPassword);
      Alert.alert("Password updated", result.message);
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "Could not reset password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen} edges={["bottom"]}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <AuthHero
            title="Reset password"
            subtitle="Set a new password directly — no email confirmation needed"
            icon="key-outline"
          />

          <FadeInView delay={100}>
            <AuthField
              label="Email"
              icon="mail-outline"
              placeholder="Account email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            <AuthField
              label="New password"
              icon="lock-closed-outline"
              placeholder="At least 6 characters"
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
            />

            <GradientButton label="Update password" onPress={handleReset} loading={loading} icon="shield-checkmark-outline" />
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
