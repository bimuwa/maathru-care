import React from 'react';
import { RoleGuard } from '../components/RoleGuard';
import DoctorPatientDetailScreen from '../screens/DoctorPatientDetailScreen';
export default function DoctorPatientDetailPage() { return <RoleGuard role="doctor"><DoctorPatientDetailScreen /></RoleGuard>; }
