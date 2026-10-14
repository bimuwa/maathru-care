import React from 'react';
import { RoleGuard } from '../components/RoleGuard';
import { ChatbotScreen } from '../features/chatbot/ChatbotScreen';

export default function ChatbotRoute() {
  return (
    <RoleGuard role="mother">
      <ChatbotScreen />
    </RoleGuard>
  );
}
