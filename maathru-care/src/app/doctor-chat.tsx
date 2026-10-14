import React from 'react';
import { RoleGuard } from '../components/RoleGuard';
import DoctorChatScreen from '../screens/DoctorChatScreen';
export default function DoctorChatPage() { return <RoleGuard role="doctor"><DoctorChatScreen /></RoleGuard>; }
