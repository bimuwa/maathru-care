import React from 'react';
import { Redirect } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useAuth } from '../context/AuthContext';

export default function IndexScreen() {
  const { isAuthenticated, isLoading, user } = useAuth();

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <ActivityIndicator size="large" color="#15803D" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return <Redirect href="/login" />;
  }

  if (user?.role === 'doctor') {
    return <Redirect href="/(doctor)/home" />;
  }

  // Mother: check approval status
  if (user?.role === 'mother') {
    const status = user.approvalStatus;
    if (status === 'pending' || status === 'rejected') {
      return <Redirect href={'/pending-approval' as any} />;
    }
    return <Redirect href="/(mother)/home" />;
  }

  return <Redirect href="/login" />;
}

