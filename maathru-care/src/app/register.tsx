import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { DatePickerModal } from '../components/ui/DatePickerModal';
import { useRouter } from 'expo-router';
import {
  Mail, Lock, User, Phone, ArrowLeft, Calendar, Stethoscope,
  Building2, Droplet, Hash, ChevronRight, CheckCircle, Search, Eye, EyeOff,
} from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { api, RegisterData } from '../services/api';
import { supabase } from '../lib/supabase';

type Step = 'role_details' | 'doctor_select' | 'submitting';

interface DoctorInfo {
  id: string;
  fullName: string;
  specialty: string;
  hospital: string;
  medicalLicense: string;
  phone: string;
}

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

function GdmYesNoChoice({ value, onChange }: { value: boolean | null; onChange: (value: boolean) => void }) {
  return <View className="flex-row gap-3 mb-4">
    {[
      { value: true, label: 'ඔව් / Yes' },
      { value: false, label: 'නැහැ / No' },
    ].map((option) => {
      const selected = value === option.value;
      return <TouchableOpacity key={option.label} accessibilityRole="radio" accessibilityState={{ checked: selected }}
        onPress={() => onChange(option.value)} className="flex-1 items-center justify-center rounded-[14px] py-3 border"
        style={{ backgroundColor: selected ? '#15803D' : '#F8FAFC', borderColor: selected ? '#15803D' : '#CBD5E1' }}>
        <Text className="font-bold text-sm" style={{ color: selected ? '#FFFFFF' : '#475569' }}>{option.label}</Text>
      </TouchableOpacity>;
    })}
  </View>;
}

export default function RegisterScreen() {
  const router = useRouter();
  const { login } = useAuth();

  const [activeRole, setActiveRole] = useState<'mother' | 'doctor'>('mother');
  const [step, setStep] = useState<Step>('role_details');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Common fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');

  // Mother fields
  const [age, setAge] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [lmpDate, setLmpDate] = useState('');
  const [gravida, setGravida] = useState('');
  const [familyHistory, setFamilyHistory] = useState<boolean | null>(null);
  const [unexplainedPrenatalLoss, setUnexplainedPrenatalLoss] = useState<boolean | null>(null);
  const [sedentaryLifestyle, setSedentaryLifestyle] = useState<boolean | null>(null);

  // Doctor fields
  const [medicalLicense, setMedicalLicense] = useState('');
  const [specialty, setSpecialty] = useState('');
  const [hospital, setHospital] = useState('');

  // Doctor selection (Step 2 for mothers)
  const [doctors, setDoctors] = useState<DoctorInfo[]>([]);
  const [filteredDoctors, setFilteredDoctors] = useState<DoctorInfo[]>([]);
  const [doctorSearch, setDoctorSearch] = useState('');
  const [selectedDoctorId, setSelectedDoctorId] = useState('');
  const [loadingDoctors, setLoadingDoctors] = useState(false);
  const [doctorLoadError, setDoctorLoadError] = useState('');

  const [error, setError] = useState('');
  // Date picker state for LMP
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [lmpDateObj, setLmpDateObj] = useState<Date>(new Date(Date.now() - 1000 * 60 * 60 * 24 * 7 * 20)); // default ~20wks ago

  // Registered user data (used after step 1 completes)
  const [registeredUser, setRegisteredUser] = useState<any>(null);
  const [registeredToken, setRegisteredToken] = useState('');

  const fetchDoctors = useCallback(async () => {
    setLoadingDoctors(true);
    setDoctorLoadError('');
    try {
      const res = await api.getRegisteredDoctors();
      if (res.success) {
        setDoctors(res.doctors);
        setFilteredDoctors(res.doctors);
      } else {
        setDoctorLoadError('Could not load the doctor list. Please try again.');
      }
    } catch (err) {
      console.error('[register] Failed to load approved doctors:', err);
      setDoctorLoadError('Could not load the doctor list. Check your connection and try again.');
    } finally {
      setLoadingDoctors(false);
    }
  }, []);

  const handleDoctorSearch = (text: string) => {
    setDoctorSearch(text);
    if (!text.trim()) {
      setFilteredDoctors(doctors);
    } else {
      const lower = text.toLowerCase();
      setFilteredDoctors(
        doctors.filter(
          (d) =>
            d.fullName.toLowerCase().includes(lower) ||
            d.specialty.toLowerCase().includes(lower) ||
            d.hospital.toLowerCase().includes(lower) ||
            d.medicalLicense.toLowerCase().includes(lower)
        )
      );
    }
  };

  const validateStep1 = (): boolean => {
    setError('');
    if (!fullName.trim() || !email.trim() || !password || !phone.trim()) {
      setError('Please fill in all personal details.');
      return false;
    }
    if (!email.includes('@')) {
      setError('Please enter a valid email address.');
      return false;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return false;
    }
    if (activeRole === 'mother' && (!age.trim() || !bloodGroup || !lmpDate || !gravida.trim())) {
      setError('Please fill in all pregnancy details.');
      return false;
    }
    if (activeRole === 'mother' && (!Number.isInteger(Number(age)) || Number(age) < 10 || Number(age) > 70)) {
      setError('වයස අවුරුදු 10ත් 70ත් අතර පූර්ණ සංඛ්‍යාවක් ඇතුළත් කරන්න. / Enter an age from 10 to 70 as a whole number.');
      return false;
    }
    if (activeRole === 'mother' && (!Number.isInteger(Number(gravida)) || Number(gravida) < 1 || Number(gravida) > 25)) {
      setError('ගැබ් ගැනීම් ගණන 1ත් 25ත් අතර පූර්ණ සංඛ්‍යාවක් විය යුතුය. / Enter a whole number of pregnancies from 1 to 25.');
      return false;
    }
    if (activeRole === 'mother' && (familyHistory === null || unexplainedPrenatalLoss === null || sedentaryLifestyle === null)) {
      setError('කරුණාකර ප්‍රශ්න තුනටම ඔව් හෝ නැහැ තෝරන්න. / Please answer all three questions with Yes or No.');
      return false;
    }
    if (activeRole === 'doctor' && (!medicalLicense.trim() || !specialty.trim() || !hospital.trim())) {
      setError('Please fill in all professional credentials.');
      return false;
    }
    return true;
  };

  // Step 1 → Register account → if doctor, done. If mother, go to doctor selection
  const handleStep1Submit = async () => {
    if (!validateStep1()) return;
    setIsLoading(true);
    setError('');
    try {
      const payload: RegisterData = {
        role: activeRole, fullName: fullName.trim(),
        email: email.trim().toLowerCase(), password, phone: phone.trim(),
      };
      if (activeRole === 'mother') {
        payload.age = age; payload.bloodGroup = bloodGroup;
        payload.lmpDate = lmpDate; payload.gravida = gravida;
        const [lmpYear, lmpMonth, lmpDay] = lmpDate.split('-').map(Number);
        const lmpUtc = Date.UTC(lmpYear, lmpMonth - 1, lmpDay);
        const now = new Date();
        const todayUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
        payload.gestationalWeek = String(Math.max(0, Math.floor((todayUtc - lmpUtc) / (7 * 24 * 60 * 60 * 1000))));
        payload.familyHistory = familyHistory;
        payload.unexplainedPrenatalLoss = unexplainedPrenatalLoss;
        payload.sedentaryLifestyle = sedentaryLifestyle;
      } else {
        payload.medicalLicense = medicalLicense; payload.specialty = specialty; payload.hospital = hospital;
      }

      const response = await api.register(payload);
      if (response.success) {
        if (activeRole === 'doctor') {
          if (response.user.approvalStatus !== 'approved') {
            await supabase.auth.signOut();
            setError('Your doctor account was created and is awaiting administrator approval. You can sign in after it is approved.');
            return;
          }
          await login({ ...response.user as any, approvalStatus: 'not_required' }, response.token);
          api.setAuthToken(response.token);
          router.replace('/(doctor)/home');
        } else {
          // Mothers must select a doctor first
          setRegisteredUser(response.user);
          setRegisteredToken(response.token);
          await fetchDoctors();
          setStep('doctor_select');
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create account. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2 → Submit approval request to selected doctor
  const handleDoctorSelect = async () => {
    if (!selectedDoctorId) {
      Alert.alert('Select a Doctor', 'Please tap on a doctor card to select your doctor before continuing.');
      return;
    }
    setStep('submitting');
    try {
      await api.submitApprovalRequest({
        patientId: registeredUser.id,
        patientName: registeredUser.fullName,
        patientAge: registeredUser.age || 0,
        patientBloodGroup: registeredUser.bloodGroup || '—',
        patientGestationalWeeks: registeredUser.gestationalAgeWeeks || 0,
        patientPhone: registeredUser.phone || '',
        patientEmail: registeredUser.email || '',
        doctorId: selectedDoctorId,
      });

      // Log in with pending status — app will show locked screen
      const selectedDoctor = doctors.find(d => d.id === selectedDoctorId);
      await login({
        ...registeredUser,
        assignedDoctorId: selectedDoctorId,
        assignedDoctorName: selectedDoctor?.fullName || '',
        approvalStatus: 'pending',
      }, registeredToken);
      api.setAuthToken(registeredToken);

      router.replace('/(mother)/home');
    } catch (err: any) {
      setStep('doctor_select');
      Alert.alert('Error', err.message || 'Failed to send request. Please try again.');
    }
  };

  // ─── RENDER: Step 1 — Account Details ────────────────────────────────────
  if (step === 'role_details') {
    return (
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} className="flex-1 bg-[#F8FAFC]">
        <ScrollView contentContainerStyle={{ flexGrow: 1 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Header */}
          <View className="bg-[#15803D] pt-16 pb-8 px-5 rounded-b-[40px]">
            <TouchableOpacity onPress={() => router.back()} className="mb-4">
              <ArrowLeft color="#FFFFFF" size={24} />
            </TouchableOpacity>
            <View className="items-center">
              <View className="w-16 h-16 bg-white/20 rounded-full items-center justify-center mb-3">
                <User color="#FFFFFF" size={32} />
              </View>
              <Text className="text-white text-2xl font-bold">Create Account</Text>
              <Text className="text-emerald-100 text-sm mt-1">
                {activeRole === 'mother' ? 'Step 1 of 2 — Your Details' : 'Professional Registration'}
              </Text>
            </View>
          </View>

          <View className="px-5 pt-8 pb-10">
            {/* Role Toggle */}
            <View className="flex-row bg-slate-200 rounded-full p-1 mb-6">
              <TouchableOpacity
                onPress={() => { setActiveRole('mother'); setError(''); }}
                className={`flex-1 flex-row items-center justify-center py-3 rounded-full ${activeRole === 'mother' ? 'bg-[#15803D]' : 'bg-transparent'}`}
              >
                <User color={activeRole === 'mother' ? '#FFFFFF' : '#64748B'} size={18} />
                <Text className={`ml-2 font-bold ${activeRole === 'mother' ? 'text-white' : 'text-slate-500'}`}>Pregnant Mom</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => { setActiveRole('doctor'); setError(''); }}
                className={`flex-1 flex-row items-center justify-center py-3 rounded-full ${activeRole === 'doctor' ? 'bg-[#15803D]' : 'bg-transparent'}`}
              >
                <Stethoscope color={activeRole === 'doctor' ? '#FFFFFF' : '#64748B'} size={18} />
                <Text className={`ml-2 font-bold ${activeRole === 'doctor' ? 'text-white' : 'text-slate-500'}`}>Doctor</Text>
              </TouchableOpacity>
            </View>

            {/* Form Card */}
            <View className="bg-white rounded-[24px] p-6 shadow-sm shadow-slate-200 border border-slate-100">
              {error ? (
                <View className="bg-red-50 p-3 rounded-xl mb-4 border border-red-100">
                  <Text className="text-red-600 text-xs text-center">{error}</Text>
                </View>
              ) : null}

              <Text className="text-slate-600 text-xs font-bold uppercase tracking-wider mb-1">{activeRole === 'mother' ? 'පුද්ගලික තොරතුරු / Personal Information' : 'Personal Information'}</Text>
              <View className="h-px bg-slate-100 mb-4" />

              {[
                { icon: <User color="#94A3B8" size={18} />, label: 'සම්පූර්ණ නම / Full Name', placeholder: activeRole === 'doctor' ? 'Full Name (e.g. Dr. Jane Doe)' : 'Full Name', value: fullName, setter: setFullName, type: 'default' as const },
                { icon: <Mail color="#94A3B8" size={18} />, label: 'විද්‍යුත් තැපැල් ලිපිනය / Email Address', placeholder: 'Email Address', value: email, setter: setEmail, type: 'email-address' as const },
                { icon: <Phone color="#94A3B8" size={18} />, label: 'දුරකථන අංකය / Phone Number', placeholder: 'Phone Number', value: phone, setter: setPhone, type: 'phone-pad' as const },
              ].map((field, i) => (
                <View key={i} className="mb-3">
                  {activeRole === 'mother' && <Text className="text-slate-600 text-sm font-semibold mb-2">{field.label}</Text>}
                  <View className="flex-row items-center bg-slate-50 rounded-[14px] px-4 py-3.5 border border-slate-200">
                    {field.icon}
                    <TextInput className="flex-1 ml-3 text-slate-800 text-sm" placeholder={field.placeholder} placeholderTextColor="#CBD5E1" keyboardType={field.type} autoCapitalize={field.type === 'email-address' ? 'none' : 'words'} value={field.value} onChangeText={field.setter} accessibilityLabel={activeRole === 'mother' ? field.label : field.placeholder} />
                  </View>
                </View>
              ))}

              {/* Password */}
              {activeRole === 'mother' && <Text className="text-slate-600 text-sm font-semibold mb-2">මුරපදය / Password</Text>}
              <View className="flex-row items-center bg-slate-50 rounded-[14px] px-4 py-3.5 mb-5 border border-slate-200">
                <Lock color="#94A3B8" size={18} />
                <TextInput
                  className="flex-1 ml-3 text-slate-800 text-sm"
                  placeholder="Password (min. 6 characters)"
                  placeholderTextColor="#CBD5E1"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                  autoCapitalize="none"
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                  {showPassword ? <EyeOff color="#94A3B8" size={18} /> : <Eye color="#94A3B8" size={18} />}
                </TouchableOpacity>
              </View>

              {/* Mother-specific fields */}
              {activeRole === 'mother' && (
                <>
                  <Text className="text-slate-600 text-xs font-bold uppercase tracking-wider mb-1 mt-1">Pregnancy Profile / ගර්භණී තොරතුරු</Text>
                  <View className="h-px bg-slate-100 mb-4" />

                  <Text className="text-slate-600 text-sm font-semibold mb-2">වයස / Age</Text>
                  <View className="flex-row items-center bg-slate-50 rounded-[14px] px-4 py-3.5 mb-4 border border-slate-200"><User color="#94A3B8" size={16} /><TextInput className="flex-1 ml-2 text-slate-800 text-sm" placeholder="වයස අවුරුදු / Age in years" placeholderTextColor="#CBD5E1" keyboardType="number-pad" value={age} onChangeText={setAge} accessibilityLabel="වයස / Age" /></View>

                  <Text className="text-slate-600 text-sm font-semibold mb-1">ගැබ් ගැනීම් ගණන / Number of Pregnancies</Text>
                  <Text className="text-slate-500 text-xs mb-2">වත්මන් ගැබ් ගැනීමත් ගණන් කරන්න; මෙය දරුවන් ගණන නොවේ. / Include this pregnancy; this is not the number of children.</Text>
                  <View className="flex-row items-center bg-slate-50 rounded-[14px] px-4 py-3.5 mb-4 border border-slate-200"><Hash color="#94A3B8" size={16} /><TextInput className="flex-1 ml-2 text-slate-800 text-sm" placeholder="ගැබ් ගැනීම් ගණන / Pregnancy count" placeholderTextColor="#CBD5E1" keyboardType="number-pad" value={gravida} onChangeText={setGravida} accessibilityLabel="ගැබ් ගැනීම් ගණන / Number of Pregnancies" /></View>

                  <Text className="text-slate-600 text-sm font-semibold mb-2">රුධිර කාණ්ඩය / Blood Group</Text>
                  <View className="flex-row flex-wrap gap-2 mb-4">{BLOOD_GROUPS.map((bg) => <TouchableOpacity key={bg} accessibilityRole="radio" accessibilityState={{ checked: bloodGroup === bg }} onPress={() => setBloodGroup(bg)} className="px-4 py-2 rounded-full border" style={{ backgroundColor: bloodGroup === bg ? '#15803D' : '#F8FAFC', borderColor: bloodGroup === bg ? '#15803D' : '#E2E8F0' }}><Text className="text-sm font-bold" style={{ color: bloodGroup === bg ? '#fff' : '#64748B' }}>{bg}</Text></TouchableOpacity>)}</View>

                  <Text className="text-slate-600 text-sm font-semibold mb-2">අවසන් මාසික වාරය ආරම්භ වූ දිනය / Last Menstrual Period</Text>
                  <TouchableOpacity onPress={() => setShowDatePicker(true)} className="flex-row items-center bg-slate-50 rounded-[14px] px-4 py-3.5 mb-4 border border-slate-200" activeOpacity={0.7}><Calendar color={lmpDate ? '#15803D' : '#94A3B8'} size={18} /><Text className="flex-1 ml-3 text-sm" style={{ color: lmpDate ? '#1E293B' : '#CBD5E1' }}>{lmpDate || 'දිනය තෝරන්න / Select date'}</Text></TouchableOpacity>

                  {showDatePicker && (Platform.OS === 'web' ? <DatePickerModal visible={showDatePicker} value={lmpDateObj} maximumDate={new Date()} minimumDate={new Date(Date.now() - 1000 * 60 * 60 * 24 * 290)} onConfirm={(selected: Date) => { setLmpDateObj(selected); const yyyy = selected.getFullYear(); const mm = String(selected.getMonth() + 1).padStart(2, '0'); const dd = String(selected.getDate()).padStart(2, '0'); setLmpDate(`${yyyy}-${mm}-${dd}`); setShowDatePicker(false); }} onCancel={() => setShowDatePicker(false)} /> : Platform.OS === 'ios' ? <Modal transparent animationType="slide"><View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' }}><View style={{ backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20 }}><Text style={{ fontSize: 16, fontWeight: 'bold', color: '#1E293B', marginBottom: 12, textAlign: 'center' }}>අවසන් මාසික වාරය / Last Menstrual Period</Text><DateTimePicker value={lmpDateObj} mode="date" display="spinner" maximumDate={new Date()} minimumDate={new Date(Date.now() - 1000 * 60 * 60 * 24 * 290)} onChange={(_: any, selected?: Date) => { if (selected) { setLmpDateObj(selected); const yyyy = selected.getFullYear(); const mm = String(selected.getMonth() + 1).padStart(2, '0'); const dd = String(selected.getDate()).padStart(2, '0'); setLmpDate(`${yyyy}-${mm}-${dd}`); } }} /><TouchableOpacity onPress={() => setShowDatePicker(false)} style={{ backgroundColor: '#15803D', borderRadius: 14, padding: 14, marginTop: 8 }}><Text style={{ color: '#fff', fontWeight: 'bold', textAlign: 'center' }}>තහවුරු කරන්න / Confirm</Text></TouchableOpacity></View></View></Modal> : <DateTimePicker value={lmpDateObj} mode="date" display="calendar" maximumDate={new Date()} minimumDate={new Date(Date.now() - 1000 * 60 * 60 * 24 * 290)} onChange={(_: any, selected?: Date) => { setShowDatePicker(false); if (selected) { setLmpDateObj(selected); const yyyy = selected.getFullYear(); const mm = String(selected.getMonth() + 1).padStart(2, '0'); const dd = String(selected.getDate()).padStart(2, '0'); setLmpDate(`${yyyy}-${mm}-${dd}`); } }} />)}

                  <Text className="text-slate-600 text-xs font-bold uppercase tracking-wider mb-1 mt-4">GDM Information / GDM තොරතුරු</Text>
                  <View className="h-px bg-slate-100 mb-4" />
                  <Text className="text-slate-600 text-sm font-semibold mb-1">පවුලේ දියවැඩියා ඉතිහාසයක් තිබේද? / Family History of Diabetes</Text><GdmYesNoChoice value={familyHistory} onChange={setFamilyHistory} />
                  <Text className="text-slate-600 text-sm font-semibold mb-1">පැහැදිලි හේතුවක් නොමැතිව පෙර ගර්භයක් අහිමි වී තිබේද? / Unexplained Prenatal Loss</Text><GdmYesNoChoice value={unexplainedPrenatalLoss} onChange={setUnexplainedPrenatalLoss} />
                  <Text className="text-slate-600 text-sm font-semibold mb-1">ඔබගේ දෛනික ජීවන රටාවෙහි ශාරීරික ක්‍රියාකාරකම් අඩුද? / Sedentary Lifestyle</Text>
                  <Text className="text-slate-500 text-xs mb-2">බොහෝ වේලාවක් වාඩි වී සිටීම සහ නිතිපතා ක්‍රියාකාරකම් අඩුවීම සලකා බලන්න. / Think about sitting most of the day with little regular activity.</Text><GdmYesNoChoice value={sedentaryLifestyle} onChange={setSedentaryLifestyle} />
                </>
              )}

              {/* Doctor-specific fields */}
              {activeRole === 'doctor' && (
                <>
                  <Text className="text-slate-600 text-xs font-bold uppercase tracking-wider mb-1 mt-1">Medical Credentials</Text>
                  <View className="h-px bg-slate-100 mb-4" />
                  <View className="flex-row items-center bg-slate-50 rounded-[14px] px-4 py-3.5 mb-3 border border-slate-200">
                    <Hash color="#94A3B8" size={18} />
                    <TextInput className="flex-1 ml-3 text-slate-800 text-sm" placeholder="Medical License / SLMC Reg. No." placeholderTextColor="#CBD5E1" value={medicalLicense} onChangeText={setMedicalLicense} />
                  </View>
                  <View className="flex-row items-center bg-slate-50 rounded-[14px] px-4 py-3.5 mb-3 border border-slate-200">
                    <Stethoscope color="#94A3B8" size={18} />
                    <TextInput className="flex-1 ml-3 text-slate-800 text-sm" placeholder="Specialization (e.g. Obstetrician)" placeholderTextColor="#CBD5E1" value={specialty} onChangeText={setSpecialty} />
                  </View>
                  <View className="flex-row items-center bg-slate-50 rounded-[14px] px-4 py-3.5 mb-5 border border-slate-200">
                    <Building2 color="#94A3B8" size={18} />
                    <TextInput className="flex-1 ml-3 text-slate-800 text-sm" placeholder="Primary Hospital / Clinic" placeholderTextColor="#CBD5E1" value={hospital} onChangeText={setHospital} />
                  </View>
                </>
              )}

              <TouchableOpacity onPress={handleStep1Submit} disabled={isLoading} activeOpacity={0.85}
                className="rounded-[14px] py-4 items-center mt-2 flex-row justify-center"
                style={{ backgroundColor: isLoading ? '#86EFAC' : '#15803D' }}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <>
                    <Text className="text-white font-bold text-base">
                      {activeRole === 'doctor' ? 'Create Doctor Account' : 'Continue — Select Your Doctor'}
                    </Text>
                    {activeRole === 'mother' && <ChevronRight color="#fff" size={20} />}
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  // ─── RENDER: Step 2 — Doctor Selection (Mother only) ─────────────────────
  if (step === 'doctor_select') {
    return (
      <View className="flex-1 bg-[#F8FAFC]">
        {/* Header */}
        <View className="bg-[#15803D] pt-14 pb-6 px-5 rounded-b-[32px]">
          <TouchableOpacity onPress={() => setStep('role_details')} className="flex-row items-center mb-3">
            <ArrowLeft color="#FFFFFF" size={20} />
            <Text className="text-white ml-2 font-semibold">Back</Text>
          </TouchableOpacity>
          <Text className="text-white text-2xl font-bold">Choose Your Doctor</Text>
          <Text className="text-emerald-100 text-sm mt-1">Step 2 of 2 — Select a doctor to request approval from</Text>
          {/* Search */}
          <View className="flex-row items-center bg-white/20 rounded-[14px] px-3 py-2.5 mt-4">
            <Search color="#D1FAE5" size={16} />
            <TextInput
              className="flex-1 ml-2 text-white text-sm"
              placeholder="Search by name, specialty or hospital..."
              placeholderTextColor="#A7F3D0"
              value={doctorSearch}
              onChangeText={handleDoctorSearch}
            />
          </View>
        </View>

        {loadingDoctors ? (
          <View className="flex-1 items-center justify-center">
            <ActivityIndicator size="large" color="#15803D" />
            <Text className="text-slate-400 mt-3">Loading available doctors...</Text>
          </View>
        ) : doctorLoadError ? (
          <View className="flex-1 items-center justify-center px-8">
            <Text className="text-slate-600 font-bold text-center">Doctor list unavailable</Text>
            <Text className="text-slate-400 text-sm text-center mt-2">{doctorLoadError}</Text>
            <TouchableOpacity onPress={fetchDoctors} className="mt-5 rounded-xl bg-[#15803D] px-6 py-3">
              <Text className="text-white font-semibold">Try again</Text>
            </TouchableOpacity>
          </View>
        ) : filteredDoctors.length === 0 ? (
          <View className="flex-1 items-center justify-center px-8">
            <Text className="text-4xl mb-3">👨‍⚕️</Text>
            <Text className="text-slate-600 font-bold text-center">
              {doctors.length === 0 ? 'No doctors registered yet' : 'No matching doctors'}
            </Text>
            <Text className="text-slate-400 text-sm text-center mt-2">
              {doctors.length === 0
                ? 'No doctor profiles are available yet. Please check again later or contact your care team.'
                : 'Try another name, specialty or hospital.'}
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredDoctors}
            keyExtractor={(d) => d.id}
            contentContainerStyle={{ padding: 20, paddingBottom: 120 }}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => {
              const isSelected = selectedDoctorId === item.id;
              return (
                <TouchableOpacity
                  onPress={() => setSelectedDoctorId(item.id)}
                  activeOpacity={0.85}
                  className="bg-white rounded-[20px] p-5 mb-4 border"
                  style={{
                    borderColor: isSelected ? '#15803D' : '#E2E8F0',
                    shadowColor: isSelected ? '#15803D' : '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: isSelected ? 0.15 : 0.05,
                    shadowRadius: 8,
                    elevation: isSelected ? 4 : 2,
                  }}
                >
                  <View className="flex-row items-start justify-between">
                    <View className="flex-row items-center flex-1">
                      <View
                        className="w-14 h-14 rounded-full items-center justify-center mr-3"
                        style={{ backgroundColor: isSelected ? '#15803D' : '#ECFDF5' }}
                      >
                        <Text className="font-bold text-xl" style={{ color: isSelected ? '#fff' : '#15803D' }}>
                          {item.fullName.replace('Dr. ', '').charAt(0)}
                        </Text>
                      </View>
                      <View className="flex-1">
                        <Text className="text-slate-800 font-bold text-base">{item.fullName}</Text>
                        <Text className="text-emerald-700 text-sm font-semibold">{item.specialty}</Text>
                        <Text className="text-slate-500 text-xs mt-0.5">{item.hospital}</Text>
                      </View>
                    </View>
                    {isSelected && (
                      <View className="bg-emerald-50 w-8 h-8 rounded-full items-center justify-center">
                        <CheckCircle color="#15803D" size={20} />
                      </View>
                    )}
                  </View>
                  <View className="h-px bg-slate-100 my-3" />
                  <View className="flex-row gap-4">
                    <View>
                      <Text className="text-slate-400 text-xs">Reg. No.</Text>
                      <Text className="text-slate-700 text-xs font-semibold mt-0.5">{item.medicalLicense}</Text>
                    </View>
                    {item.phone ? (
                      <View>
                        <Text className="text-slate-400 text-xs">Phone</Text>
                        <Text className="text-slate-700 text-xs font-semibold mt-0.5">{item.phone}</Text>
                      </View>
                    ) : null}
                  </View>
                  {isSelected && (
                    <View className="bg-emerald-50 rounded-[10px] p-3 mt-3 flex-row items-center">
                      <CheckCircle color="#15803D" size={14} />
                      <Text className="text-emerald-700 text-xs font-semibold ml-2">Selected — Approval request will be sent to this doctor</Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            }}
          />
        )}

        {/* Sticky bottom button */}
        {!loadingDoctors && filteredDoctors.length > 0 && (
          <View className="absolute bottom-0 left-0 right-0 px-5 pb-8 pt-4 bg-[#F8FAFC] border-t border-slate-100">
            <TouchableOpacity
              onPress={handleDoctorSelect}
              activeOpacity={0.85}
              className="rounded-[16px] py-4 items-center"
              style={{ backgroundColor: selectedDoctorId ? '#15803D' : '#94A3B8' }}
            >
              <Text className="text-white font-bold text-base">
                {selectedDoctorId ? 'Send Approval Request →' : 'Select a Doctor to Continue'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }

  // ─── RENDER: Submitting ───────────────────────────────────────────────────
  return (
    <View className="flex-1 bg-[#F8FAFC] items-center justify-center px-8">
      <ActivityIndicator size="large" color="#15803D" />
      <Text className="text-slate-700 font-bold text-lg mt-4">Sending Request...</Text>
      <Text className="text-slate-400 text-sm text-center mt-2">
        Contacting your selected doctor and setting up your account.
      </Text>
    </View>
  );
}
