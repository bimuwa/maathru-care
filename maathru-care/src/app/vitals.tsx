import React from 'react';
import { RoleGuard } from '../components/RoleGuard';
import VitalsScreenContent from '../screens/VitalsScreen';
export default function VitalsScreen() { return <RoleGuard role="mother"><VitalsScreenContent /></RoleGuard>; }
