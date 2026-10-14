import { Redirect } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import React from 'react';
import { useAuth } from '../context/AuthContext';
import { ChatbotScreen } from '../features/chatbot/ChatbotScreen';

export default function ChatbotRoute() {
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

  if (user?.role === 'doctor') {
    return <Redirect href="/(doctor)/home" />;
  }

  return <ChatbotScreen />;
}
