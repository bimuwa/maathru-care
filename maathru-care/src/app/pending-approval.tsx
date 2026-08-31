import React, { useEffect, useCallback, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Clock, CheckCircle, XCircle, Stethoscope, Building2, RefreshCw, LogOut, AlertTriangle } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';

export default function PendingApprovalScreen() {
  const router = useRouter();
  const { user, updateUser, logout } = useAuth();
  const [status, setStatus] = useState<'pending' | 'approved' | 'rejected' | 'not_found'>(
    (user?.approvalStatus as any) || 'pending'
  );
  const [checking, setChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState(new Date());

  const checkStatus = useCallback(async () => {
    if (!user?.id) return;
    setChecking(true);
    try {
      const res = await api.checkApprovalStatus(user.id);
      setLastChecked(new Date());

      if (res.status === 'approved') {
        // Update stored user with approved status and assigned doctor
        await updateUser({
          approvalStatus: 'approved',
          assignedDoctorId: res.request?.doctorId ?? user.assignedDoctorId,
          assignedDoctorName: res.request?.doctorName ?? user.assignedDoctorName,
        });
        setStatus('approved');
      } else if (res.status === 'rejected') {
        await updateUser({ approvalStatus: 'rejected' });
        setStatus('rejected');
      }
    } catch {
      // Network error — keep showing pending
    } finally {
      setChecking(false);
    }
  }, [user?.id, updateUser]);

  // Auto-poll every 12 seconds
  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, 12000);
    return () => clearInterval(interval);
  }, [checkStatus]);

  const handleEnterApp = () => {
    router.replace('/(mother)/home');
  };

  const handleLogout = async () => {
    Alert.alert('Log Out', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Log Out',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/login');
        },
      },
    ]);
  };

  const handleReselect = async () => {
    // Reset to pending so they can re-register
    await logout();
    router.replace('/register');
  };

  // ── APPROVED ──────────────────────────────────────────────────────────────
  if (status === 'approved') {
    return (
      <View className="flex-1 bg-[#F0FDF4] items-center justify-center px-8">
        <View className="bg-white rounded-[32px] p-8 w-full items-center shadow-sm border border-emerald-100">
          <View className="w-24 h-24 bg-emerald-50 rounded-full items-center justify-center mb-6">
            <CheckCircle color="#15803D" size={48} />
          </View>
          <Text className="text-emerald-700 text-2xl font-bold text-center">You're Approved! 🎉</Text>
          <Text className="text-slate-500 text-sm text-center mt-3 mb-2 leading-5">
            Dr. <Text className="font-bold text-slate-700">{user?.assignedDoctorName ?? 'Your Doctor'}</Text> has approved your Maathru Care account.
          </Text>
          <Text className="text-slate-400 text-xs text-center mb-8">
            You now have full access to all pregnancy health monitoring features.
          </Text>

          <View className="w-full bg-emerald-50 rounded-[16px] p-4 mb-6">
            <View className="flex-row items-center gap-2">
              <Stethoscope color="#15803D" size={16} />
              <Text className="text-emerald-700 font-bold text-sm">{user?.assignedDoctorName}</Text>
            </View>
            <Text className="text-emerald-600 text-xs mt-1 ml-6">Your assigned physician</Text>
          </View>

          <TouchableOpacity
            onPress={handleEnterApp}
            activeOpacity={0.85}
            className="bg-emerald-700 rounded-[16px] py-4 w-full items-center"
          >
            <Text className="text-white font-bold text-base">Enter Maathru Care 🚀</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── REJECTED ──────────────────────────────────────────────────────────────
  if (status === 'rejected') {
    return (
      <View className="flex-1 bg-[#FFF1F2] items-center justify-center px-8">
        <View className="bg-white rounded-[32px] p-8 w-full items-center shadow-sm border border-red-100">
          <View className="w-24 h-24 bg-red-50 rounded-full items-center justify-center mb-6">
            <XCircle color="#EF4444" size={48} />
          </View>
          <Text className="text-red-600 text-2xl font-bold text-center">Request Declined</Text>
          <Text className="text-slate-500 text-sm text-center mt-3 mb-2 leading-5">
            Unfortunately, your approval request was declined by the selected doctor.
          </Text>
          <Text className="text-slate-400 text-xs text-center mb-8">
            This may be because they have a full patient list or are unable to take new patients at this time. Please try selecting a different doctor.
          </Text>

          <View className="w-full bg-amber-50 border border-amber-100 rounded-[16px] p-4 mb-6 flex-row">
            <AlertTriangle color="#F59E0B" size={18} />
            <Text className="text-amber-700 text-xs ml-3 flex-1 leading-4">
              Your account has been created. You can go back and select a different doctor to request approval again.
            </Text>
          </View>

          <TouchableOpacity
            onPress={handleReselect}
            activeOpacity={0.85}
            className="bg-red-500 rounded-[16px] py-4 w-full items-center mb-3"
          >
            <Text className="text-white font-bold text-base">← Select a Different Doctor</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={handleLogout} className="py-2">
            <Text className="text-slate-400 text-sm">Log out</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ── PENDING ──────────────────────────────────────────────────────────────
  return (
    <ScrollView className="flex-1 bg-[#F8FAFC]" contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24 }}>
      <View className="bg-white rounded-[32px] p-8 w-full items-center shadow-sm border border-slate-100">
        {/* Animated waiting icon */}
        <View className="w-28 h-28 bg-amber-50 rounded-full items-center justify-center mb-6">
          <Clock color="#F59E0B" size={52} />
        </View>

        <Text className="text-slate-800 text-2xl font-bold text-center">Waiting for Approval</Text>
        <Text className="text-slate-500 text-sm text-center mt-3 mb-6 leading-5">
          Your request has been sent to{' '}
          <Text className="font-bold text-slate-700">{user?.assignedDoctorName ?? 'your doctor'}</Text>.
          {'\n\n'}Please wait while they review your profile and approve your access to the app.
        </Text>

        {/* Status indicator */}
        <View className="w-full bg-amber-50 border border-amber-200 rounded-[20px] p-5 mb-6">
          <View className="flex-row items-center mb-3">
            <View className="w-3 h-3 rounded-full bg-amber-400 mr-2" />
            <Text className="text-amber-700 font-bold text-sm">Pending Review</Text>
          </View>
          {user?.assignedDoctorName && (
            <View className="flex-row items-center gap-2 mb-2">
              <Stethoscope color="#92400E" size={14} />
              <Text className="text-amber-800 text-sm font-semibold">{user.assignedDoctorName}</Text>
            </View>
          )}
          <Text className="text-amber-600 text-xs leading-4">
            The doctor will see your request on their dashboard the next time they log in. This usually takes a short while.
          </Text>
        </View>

        {/* Patient details reminder */}
        <View className="w-full bg-slate-50 rounded-[16px] p-4 mb-6">
          <Text className="text-slate-500 text-xs font-bold uppercase tracking-wider mb-3">Your Submitted Details</Text>
          <View className="gap-2">
            {[
              { label: 'Name', value: user?.fullName },
              { label: 'Age', value: user?.age ? `${user.age} years` : '—' },
              { label: 'Blood Group', value: user?.bloodGroup || '—' },
              { label: 'Gestational Week', value: user?.gestationalAgeWeeks ? `Week ${user.gestationalAgeWeeks}` : '—' },
            ].map((item, i) => (
              <View key={i} className="flex-row justify-between">
                <Text className="text-slate-400 text-xs">{item.label}</Text>
                <Text className="text-slate-700 text-xs font-semibold">{item.value ?? '—'}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Auto-poll indicator */}
        <View className="flex-row items-center mb-5">
          {checking ? (
            <ActivityIndicator size="small" color="#F59E0B" />
          ) : (
            <View className="w-2 h-2 rounded-full bg-emerald-400" />
          )}
          <Text className="text-slate-400 text-xs ml-2">
            {checking ? 'Checking status...' : `Auto-checking every 12 seconds · Last: ${lastChecked.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`}
          </Text>
        </View>

        <TouchableOpacity
          onPress={checkStatus}
          disabled={checking}
          activeOpacity={0.8}
          className="flex-row items-center justify-center bg-slate-100 rounded-[14px] py-3.5 w-full mb-4"
        >
          <RefreshCw color={checking ? '#CBD5E1' : '#64748B'} size={16} />
          <Text className={`ml-2 font-semibold text-sm ${checking ? 'text-slate-300' : 'text-slate-600'}`}>Check Now</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleLogout} className="flex-row items-center py-2">
          <LogOut color="#94A3B8" size={14} />
          <Text className="text-slate-400 text-sm ml-2">Log out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
