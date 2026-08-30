import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import '../global.css';
import React, { useEffect } from 'react';
import { AuthProvider } from '../context/AuthContext';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ headerShown: false }} />
        <Stack.Screen name="(mother)" options={{ headerShown: false }} />
        <Stack.Screen name="(doctor)" options={{ headerShown: false }} />
        <Stack.Screen name="doctor-patient-detail" options={{ headerShown: false }} />
        <Stack.Screen name="doctor-chat" options={{ headerShown: false }} />
        <Stack.Screen name="register" options={{ headerShown: false }} />
        <Stack.Screen name="pending-approval" options={{ headerShown: false }} />
        <Stack.Screen name="risk-result" options={{ headerShown: false }} />
        <Stack.Screen name="mother-doctor-profile" options={{ headerShown: false }} />
        <Stack.Screen name="mother-chat" options={{ headerShown: false }} />
      </Stack>
    </AuthProvider>
  );
}
