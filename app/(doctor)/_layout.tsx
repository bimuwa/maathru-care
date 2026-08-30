import { Stack } from "expo-router";
import { colors } from "@/components/ui";

export default function DoctorLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerTintColor: colors.primaryMid,
        headerStyle: { backgroundColor: colors.background },
        headerShadowVisible: false,
        headerTitleStyle: { fontWeight: "700" },
      }}
    />
  );
}
