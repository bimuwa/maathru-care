import { Stack, useRouter, useSegments, useRootNavigationState } from "expo-router";
import { useEffect } from "react";
import { ActivityIndicator, View } from "react-native";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { CtgProvider } from "@/context/CtgContext";
import { colors } from "@/components/ui";
import { homeRouteForRole } from "@/lib/authRouting";

function RootNavigator() {
  const { profile, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const navigationState = useRootNavigationState();

  useEffect(() => {
    if (!navigationState?.key || loading) return;

    const inAuthGroup = segments[0] === "(auth)";

    if (profile && inAuthGroup) {
      router.replace(homeRouteForRole(profile.role));
      return;
    }

    if (!profile && !inAuthGroup) {
      router.replace("/(auth)/login");
    }
  }, [profile, loading, segments, navigationState?.key, router]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(patient)" />
      <Stack.Screen name="(doctor)" />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <CtgProvider>
        <RootNavigator />
      </CtgProvider>
    </AuthProvider>
  );
}
