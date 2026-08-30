import { Stack } from "expo-router";
import { colors } from "@/components/ui";

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        title: "CTG Monitor",
        headerStyle: { backgroundColor: colors.background },
        headerTintColor: colors.primaryMid,
        headerTitleStyle: { fontWeight: "700", color: colors.text },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    />
  );
}
