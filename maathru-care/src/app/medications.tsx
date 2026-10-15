import React from 'react';
import { RoleGuard } from '../components/RoleGuard';
import MedicationScreenContent from '../screens/MedicationScreen';
export default function MedicationScreen() { return <RoleGuard role="mother"><MedicationScreenContent /></RoleGuard>; }
