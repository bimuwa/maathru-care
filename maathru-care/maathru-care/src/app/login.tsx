import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Heart, Mail, Lock, Eye, EyeOff, Stethoscope, Baby } from 'lucide-react-native';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';

type LoginRole = 'mother' | 'doctor';

export default function LoginScreen() {
  const router = useRouter();
  const { login } = useAuth();

  const [activeRole, setActiveRole] = useState<LoginRole>('mother');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({});

  const handleRoleSwitch = (role: LoginRole) => {
    setActiveRole(role);
    setEmail('');
    setPassword('');
    setErrors({});
    setShowPassword(false);
  };

  const validate = () => {
    const newErrors: { email?: string; password?: string } = {};
    if (!email.trim()) newErrors.email = 'Email is required';
    else if (!email.includes('@')) newErrors.email = 'Enter a valid email address';
    if (!password) newErrors.password = 'Password is required';
    else if (password.length < 6) newErrors.password = 'Password must be at least 6 characters';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleLogin = async () => {
    if (!validate()) return;
    setIsLoading(true);
    try {
      const response = await api.login(email.trim().toLowerCase(), password);
      if (response.success) {
        await login(response.user as any, response.token);
        api.setAuthToken(response.token);
        if (response.user.role === 'doctor') {
          router.replace('/(doctor)/home');
        } else {
          router.replace('/(mother)/home');
        }
      } else {
        Alert.alert('Login Failed', 'Invalid email or password. Please try again.');
      }
    } catch (err: any) {
      Alert.alert(
        'Connection Error',
        err.message || 'Unable to connect to server. Please check your Wi-Fi and try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-slate-50"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header / Brand ── */}
        <View className="bg-emerald-700 pt-16 pb-12 px-6 items-center rounded-b-[44px]">
          <View className="bg-white/20 w-20 h-20 rounded-full items-center justify-center mb-4">
            <Heart color="#FFFFFF" size={36} fill="#FFFFFF" />
          </View>
          <Text className="text-white text-3xl font-bold tracking-wide">Maathru Care</Text>
          <Text className="text-emerald-100 text-sm mt-1">Maternal Health & Risk Monitoring</Text>
        </View>

        <View className="flex-1 px-6 pt-8">

          {/* ── Role Toggle ── */}
          <View className="bg-white rounded-[20px] p-1.5 flex-row mb-8 shadow-sm shadow-slate-200 border border-slate-100">
            <TouchableOpacity
              onPress={() => handleRoleSwitch('mother')}
              activeOpacity={0.85}
              className={`flex-1 flex-row items-center justify-center py-3.5 rounded-[16px] ${
                activeRole === 'mother' ? 'bg-emerald-700' : 'bg-transparent'
              }`}
            >
              <Baby color={activeRole === 'mother' ? '#fff' : '#64748B'} size={18} />
              <Text
                className={`ml-2 font-bold text-sm ${
                  activeRole === 'mother' ? 'text-white' : 'text-slate-500'
                }`}
              >
                Pregnant Mom
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleRoleSwitch('doctor')}
              activeOpacity={0.85}
              className={`flex-1 flex-row items-center justify-center py-3.5 rounded-[16px] ${
                activeRole === 'doctor' ? 'bg-emerald-700' : 'bg-transparent'
              }`}
            >
              <Stethoscope color={activeRole === 'doctor' ? '#fff' : '#64748B'} size={18} />
              <Text
                className={`ml-2 font-bold text-sm ${
                  activeRole === 'doctor' ? 'text-white' : 'text-slate-500'
                }`}
              >
                Doctor
              </Text>
            </TouchableOpacity>
          </View>

          {/* ── Login Card ── */}
          <View className="bg-white rounded-[24px] p-6 shadow-sm shadow-slate-200 border border-slate-100">

            {/* Card header */}
            <View className="flex-row items-center mb-1">
              <View className="bg-emerald-50 w-9 h-9 rounded-full items-center justify-center mr-3">
                {activeRole === 'mother'
                  ? <Baby color="#15803D" size={18} />
                  : <Stethoscope color="#15803D" size={18} />}
              </View>
              <Text className="text-slate-800 text-xl font-bold">
                {activeRole === 'mother' ? 'Welcome Back 👶' : 'Doctor Login 🩺'}
              </Text>
            </View>
            <Text className="text-slate-400 text-sm mb-6 ml-12">
              {activeRole === 'mother'
                ? 'Sign in to monitor your pregnancy health'
                : 'Access your patient management dashboard'}
            </Text>

            {/* Email field */}
            <Text className="text-slate-600 text-xs font-bold uppercase tracking-wider mb-2">
              Email Address
            </Text>
            <View
              className={`flex-row items-center bg-slate-50 rounded-[14px] px-4 py-3.5 mb-1 border ${
                errors.email ? 'border-red-300 bg-red-50' : 'border-slate-200'
              }`}
            >
              <Mail color={errors.email ? '#EF4444' : '#94A3B8'} size={18} />
              <TextInput
                className="flex-1 ml-3 text-slate-800 text-sm"
                placeholder={activeRole === 'mother' ? 'your@email.com' : 'dr.name@hospital.com'}
                placeholderTextColor="#CBD5E1"
                value={email}
                onChangeText={(t) => { setEmail(t); setErrors((e) => ({ ...e, email: undefined })); }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
            {errors.email && (
              <Text className="text-red-500 text-xs mb-3 ml-1">{errors.email}</Text>
            )}

            {/* Password field */}
            <Text className="text-slate-600 text-xs font-bold uppercase tracking-wider mb-2 mt-4">
              Password
            </Text>
            <View
              className={`flex-row items-center bg-slate-50 rounded-[14px] px-4 py-3.5 mb-1 border ${
                errors.password ? 'border-red-300 bg-red-50' : 'border-slate-200'
              }`}
            >
              <Lock color={errors.password ? '#EF4444' : '#94A3B8'} size={18} />
              <TextInput
                className="flex-1 ml-3 text-slate-800 text-sm"
                placeholder="Enter your password"
                placeholderTextColor="#CBD5E1"
                value={password}
                onChangeText={(t) => { setPassword(t); setErrors((e) => ({ ...e, password: undefined })); }}
                secureTextEntry={!showPassword}
                autoCorrect={false}
              />
              <TouchableOpacity
                onPress={() => setShowPassword(!showPassword)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                {showPassword
                  ? <EyeOff color="#94A3B8" size={18} />
                  : <Eye color="#94A3B8" size={18} />}
              </TouchableOpacity>
            </View>
            {errors.password && (
              <Text className="text-red-500 text-xs mb-3 ml-1">{errors.password}</Text>
            )}

            {/* Login Button */}
            <TouchableOpacity
              onPress={handleLogin}
              disabled={isLoading}
              activeOpacity={0.85}
              className="rounded-[14px] py-4 items-center mt-6"
              style={{
                backgroundColor: isLoading ? '#86EFAC' : '#15803D',
              }}
            >
              {isLoading ? (
                <ActivityIndicator color="#FFFFFF" size="small" />
              ) : (
                <Text className="text-white font-bold text-base">
                  {activeRole === 'mother' ? 'Sign In as Mother' : 'Sign In as Doctor'}
                </Text>
              )}
            </TouchableOpacity>

            {/* Create Account */}
            <View className="flex-row justify-center items-center mt-5">
              <Text className="text-slate-400 text-sm">New to Maathru Care? </Text>
              <TouchableOpacity
                onPress={() => router.push('/register')}
                disabled={isLoading}
                hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
              >
                <Text className="text-emerald-700 text-sm font-bold">Create Account</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* ── Disclaimer ── */}
          <Text className="text-slate-400 text-xs text-center mt-6 px-4 mb-8 leading-5">
            This application is an AI-assisted decision-support tool for pregnancy monitoring.
            {'\n'}It does not replace professional medical advice.
          </Text>

        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
