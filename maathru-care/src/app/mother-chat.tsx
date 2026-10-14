import React from 'react';
import { RoleGuard } from '../components/RoleGuard';
import MotherChatScreen from '../screens/MotherChatScreen';

export default function MotherChatPage() {
  return (
    <RoleGuard role="mother">
      <MotherChatScreen />
    </RoleGuard>
  );
}
