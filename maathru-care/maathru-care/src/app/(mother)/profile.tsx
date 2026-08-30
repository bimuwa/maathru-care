import React from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  User,
  Heart,
  Phone,
  Mail,
  Calendar,
  LogOut,
  Baby,
  Droplets,
  ShieldCheck,
} from 'lucide-react-native';
import { useAuth } from '../../context/AuthContext';

function InfoRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <View className="flex-row items-center py-3 border-b border-slate-50">
      <View className="w-8 items-center">{icon}</View>
      <View className="flex-1 ml-3">
        <Text className="text-slate-400 text-xs">{label}</Text>
        <Text className="text-slate-800 font-semibold text-sm mt-0.5">{value}</Text>
      </View>
    </View>
  );
}

export default function MotherProfileScreen() {
  const router = useRouter();
  const { user, logout } = useAuth();

  const handleLogout = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/login');
          },
        },
      ]
    );
  };

  const weeks = user?.gestationalAgeWeeks ?? 0;

  return (
    <ScrollView className="flex-1 bg-slate-50" showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View className="bg-emerald-700 pt-14 pb-16 px-5 items-center">
        <View className="bg-white/20 w-20 h-20 rounded-full items-center justify-center mb-3">
          <User color="#FFFFFF" size={36} />
        </View>
        <Text className="text-white text-xl font-bold">{user?.fullName}</Text>
        <Text className="text-emerald-200 text-sm mt-1">Pregnant Mom • Week {weeks}</Text>
      </View>

      <View className="px-5 -mt-6">
        {/* Stats row */}
        <View className="flex-row gap-3 mb-4">
          <View className="bg-white rounded-[16px] p-4 flex-1 items-center shadow-sm shadow-slate-100">
            <Baby color="#15803D" size={22} />
            <Text className="text-slate-800 font-bold text-lg mt-1">{weeks}w</Text>
            <Text className="text-slate-400 text-xs">Gestation</Text>
          </View>
          <View className="bg-white rounded-[16px] p-4 flex-1 items-center shadow-sm shadow-slate-100">
            <Droplets color="#15803D" size={22} />
            <Text className="text-slate-800 font-bold text-lg mt-1">{user?.bloodGroup ?? '—'}</Text>
            <Text className="text-slate-400 text-xs">Blood Group</Text>
          </View>
          <View className="bg-white rounded-[16px] p-4 flex-1 items-center shadow-sm shadow-slate-100">
            <ShieldCheck color="#15803D" size={22} />
            <Text className="text-slate-800 font-bold text-lg mt-1">{user?.age ?? '—'}</Text>
            <Text className="text-slate-400 text-xs">Age (yrs)</Text>
          </View>
        </View>

        {/* Profile Info */}
        <View className="bg-white rounded-[20px] p-5 mb-4 shadow-sm shadow-slate-100">
          <Text className="text-slate-700 font-bold text-sm mb-3">Personal Details</Text>
          <InfoRow icon={<Mail color="#94A3B8" size={16} />} label="Email" value={user?.email ?? '—'} />
          <InfoRow icon={<Phone color="#94A3B8" size={16} />} label="Phone" value={user?.phone ?? '—'} />
          <InfoRow icon={<User color="#94A3B8" size={16} />} label="Age" value={`${user?.age ?? '—'} years`} />
          <InfoRow icon={<Baby color="#94A3B8" size={16} />} label="Gestational Age" value={`${weeks} weeks`} />
          <InfoRow icon={<Droplets color="#94A3B8" size={16} />} label="Blood Group" value={user?.bloodGroup ?? '—'} />
        </View>

        {/* Assigned Doctor */}
        {user?.assignedDoctorName && (
          <TouchableOpacity
            onPress={() =>
              router.push({
                pathname: '/mother-doctor-profile',
                params: {
                  doctorId: user.assignedDoctorId ?? '',
                  doctorName: user.assignedDoctorName ?? '',
                },
              })
            }
            activeOpacity={0.8}
            className="bg-white rounded-[20px] p-5 mb-4 shadow-sm shadow-slate-100 border border-transparent"
          >
            <View className="flex-row items-center justify-between">
              <Text className="text-slate-700 font-bold text-sm mb-3">Assigned Doctor</Text>
              <Text className="text-emerald-600 text-xs font-semibold mb-3">View Profile →</Text>
            </View>
            <View className="flex-row items-center">
              <View className="bg-emerald-50 w-12 h-12 rounded-full items-center justify-center mr-3">
                <Heart color="#15803D" size={20} />
              </View>
              <View>
                <Text className="text-slate-800 font-bold">{user.assignedDoctorName}</Text>
                <Text className="text-slate-400 text-xs">Obstetrics & Gynaecology</Text>
                <Text className="text-emerald-600 text-xs mt-0.5">Tap to view details & feedback</Text>
              </View>
            </View>
          </TouchableOpacity>
        )}

        {/* AI Model Info */}
        <View className="bg-emerald-50 border border-emerald-100 rounded-[20px] p-5 mb-4">
          <Text className="text-emerald-700 font-bold text-sm mb-2">About the AI Model</Text>
          <Text className="text-emerald-600 text-xs leading-5">
            Maathru Care uses a tuned XGBoost classifier trained on 998 maternal health records.
            The model achieves 98.00% accuracy on held-out test data and uses 13 clinical features
            for risk prediction. SHAP (SHapley Additive exPlanations) is used for transparent,
            patient-level explanation of each prediction.{'\n\n'}
            This is a decision-support tool, not a medical diagnosis system. Always consult your
            doctor for clinical decisions.
          </Text>
        </View>

        {/* Sign Out */}
        <TouchableOpacity
          onPress={handleLogout}
          className="bg-red-50 border border-red-100 rounded-[16px] p-4 flex-row items-center justify-center mb-10"
        >
          <LogOut color="#EF4444" size={18} />
          <Text className="text-red-500 font-semibold ml-2">Sign Out</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
