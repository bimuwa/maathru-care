import React from 'react';
import { RoleGuard } from '../components/RoleGuard';
import MotherDoctorProfileScreen from '../screens/MotherDoctorProfileScreen';

export default function MotherDoctorProfilePage() {
  return (
    <RoleGuard role="mother">
      <MotherDoctorProfileScreen />
    </RoleGuard>
  );
}
