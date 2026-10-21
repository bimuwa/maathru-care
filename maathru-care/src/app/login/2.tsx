import React from 'react';
import { Redirect } from 'expo-router';
import LoginScreen from '../login';

export default function DoctorMockLoginRoute() {
  if (!__DEV__) return <Redirect href="/login" />;
  return <LoginScreen mockDoctorOnly />;
}
