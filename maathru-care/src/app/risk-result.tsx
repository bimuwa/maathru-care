import React from 'react';
import { RoleGuard } from '../components/RoleGuard';
import RiskResultScreen from '../screens/RiskResultScreen';

export default function RiskResultPage() {
  return (
    <RoleGuard role="mother">
      <RiskResultScreen />
    </RoleGuard>
  );
}
