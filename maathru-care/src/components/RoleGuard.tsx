import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import React from 'react';
import { useAuth } from '../context/AuthContext';

export function RoleGuard({ role, children }: { role?: 'mother' | 'doctor'; children: React.ReactNode }) {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8FAFC' }}>
        <ActivityIndicator size="large" color="#15803D" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  if (role && user?.role !== role) {
    return <Redirect href={user?.role === 'doctor' ? '/(doctor)/home' : '/(mother)/home'} />;
  }

  return <>{children}</>;
}
