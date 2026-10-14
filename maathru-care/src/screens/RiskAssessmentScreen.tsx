import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  User,
  Baby,
  Activity,
  FlaskConical,
  ChevronDown,
  ChevronUp,
  Brain,
  ArrowRight,
} from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { api, MaternalRiskFormData } from '../services/api';

// ─── Picker Component ────────────────────────────────────────────────────────
function OptionPicker({
  label,
  options,
  value,
  onSelect,
}: {
  label: string;
  options: { label: string; value: number }[];
  value: number;
  onSelect: (v: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);
  return (
    <View className="mb-4">
      <Text className="text-slate-600 text-sm font-semibold mb-1.5">{label}</Text>
      <TouchableOpacity
        onPress={() => setOpen(!open)}
        className="flex-row items-center bg-slate-50 border border-slate-200 rounded-[14px] px-4 py-3.5"
      >
        <Text className="flex-1 text-slate-800 text-sm">{selected?.label ?? 'Select...'}</Text>
        {open ? <ChevronUp color="#94A3B8" size={16} /> : <ChevronDown color="#94A3B8" size={16} />}
      </TouchableOpacity>
      {open && (
        <View className="bg-white border border-slate-200 rounded-[14px] mt-1 overflow-hidden shadow-sm">
          {options.map((opt) => (
            <TouchableOpacity
              key={opt.value}
              onPress={() => { onSelect(opt.value); setOpen(false); }}
              className={`px-4 py-3 border-b border-slate-50 ${opt.value === value ? 'bg-emerald-50' : ''}`}
            >
              <Text className={`text-sm ${opt.value === value ? 'text-emerald-700 font-bold' : 'text-slate-700'}`}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

// ─── Number Input ────────────────────────────────────────────────────────────
function NumberInput({
  label,
  value,
  onChangeText,
  unit,
  placeholder,
  keyboardType = 'numeric',
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  unit?: string;
  placeholder?: string;
  keyboardType?: 'numeric' | 'decimal-pad';
}) {
  return (
    <View className="mb-4">
      <Text className="text-slate-600 text-sm font-semibold mb-1.5">
        {label}{unit ? <Text className="text-slate-400 font-normal"> ({unit})</Text> : null}
      </Text>
      <TextInput
        className="bg-slate-50 border border-slate-200 rounded-[14px] px-4 py-3.5 text-slate-800 text-sm"
        placeholder={placeholder ?? `Enter ${label.toLowerCase()}`}
        placeholderTextColor="#94A3B8"
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
      />
    </View>
  );
}

// ─── Section Header ──────────────────────────────────────────────────────────
function SectionHeader({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <View className="flex-row items-center mb-4 mt-2">
      <View className="bg-emerald-50 p-2 rounded-[10px] mr-3">{icon}</View>
      <Text className="text-slate-800 font-bold text-base">{title}</Text>
    </View>
  );
}

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function RiskAssessmentScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const [isLoading, setIsLoading] = useState(false);

  // Form state
  const [age, setAge] = useState('');
  const [gravida, setGravida] = useState(1);
  const [tetanus, setTetanus] = useState(1);
  const [gestationalAge, setGestationalAge] = useState(String(user?.gestationalAgeWeeks ?? ''));
  const [weightKg, setWeightKg] = useState('');
  const [heightFt, setHeightFt] = useState('');
  const [systolicBP, setSystolicBP] = useState('');
  const [diastolicBP, setDiastolicBP] = useState('');
  const [fetalPosition, setFetalPosition] = useState(0);
  const [fetalHeartRate, setFetalHeartRate] = useState('');
  const [urineSugar, setUrineSugar] = useState(0);
  const [vdrl, setVdrl] = useState(0);
  const [hbsAg, setHbsAg] = useState(0);

  const validate = (): string | null => {
    if (!age || isNaN(+age) || +age < 14 || +age > 55) return 'Enter a valid age (14–55)';
    if (!gestationalAge || isNaN(+gestationalAge) || +gestationalAge < 1 || +gestationalAge > 44)
      return 'Enter valid gestational age (1–44 weeks)';
    if (!weightKg || isNaN(+weightKg) || +weightKg < 30 || +weightKg > 200)
      return 'Enter valid weight (30–200 kg)';
    if (!heightFt || isNaN(+heightFt) || +heightFt < 3 || +heightFt > 8)
      return 'Enter valid height (3–8 ft)';
    if (!systolicBP || isNaN(+systolicBP) || +systolicBP < 60 || +systolicBP > 220)
      return 'Enter valid systolic BP (60–220)';
    if (!diastolicBP || isNaN(+diastolicBP) || +diastolicBP < 40 || +diastolicBP > 150)
      return 'Enter valid diastolic BP (40–150)';
    if (+diastolicBP >= +systolicBP) return 'Diastolic BP must be less than Systolic BP';
    if (!fetalHeartRate || isNaN(+fetalHeartRate) || +fetalHeartRate < 60 || +fetalHeartRate > 200)
      return 'Enter valid fetal heart rate (60–200 bpm)';
    return null;
  };

  const handleSubmit = async () => {
    const error = validate();
    if (error) { Alert.alert('Validation Error', error); return; }

    setIsLoading(true);
    const payload: MaternalRiskFormData = {
      patientId: user?.id,
      age: +age,
      gravida,
      tetanusVaccination: tetanus,
      gestationalAge: +gestationalAge,
      weightKg: +weightKg,
      heightFt: +heightFt,
      fetalPosition,
      fetalHeartRate: +fetalHeartRate,
      urineSugar,
      vdrl,
      hbsAg,
      systolicBP: +systolicBP,
      diastolicBP: +diastolicBP,
    };

    try {
      const result = await api.assessRisk(payload);
      router.push({ pathname: '/risk-result', params: { result: JSON.stringify(result) } });
    } catch (err: any) {
      Alert.alert('Assessment Failed', err.message ?? 'Could not connect to the server. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Quick-fill high risk preset
  const fillHighRisk = () => {
    setAge('38'); setGravida(3); setTetanus(1);
    setGestationalAge('36'); setWeightKg('82'); setHeightFt('5.1');
    setSystolicBP('155'); setDiastolicBP('105');
    setFetalPosition(1); setFetalHeartRate('168');
    setUrineSugar(1); setVdrl(1); setHbsAg(0);
  };

  const fillLowRisk = () => {
    setAge('25'); setGravida(1); setTetanus(2);
    setGestationalAge('28'); setWeightKg('58'); setHeightFt('5.4');
    setSystolicBP('110'); setDiastolicBP('70');
    setFetalPosition(0); setFetalHeartRate('138');
    setUrineSugar(0); setVdrl(0); setHbsAg(0);
  };

  const gravOptions = [{ label: '1st pregnancy', value: 1 }, { label: '2nd pregnancy', value: 2 }, { label: '3rd+ pregnancy', value: 3 }];
  const tetOptions = [{ label: '1st dose', value: 1 }, { label: '2nd dose', value: 2 }, { label: '3rd dose', value: 3 }];
  const posOptions = [{ label: 'Normal (cephalic)', value: 0 }, { label: 'Abnormal (breech/transverse)', value: 1 }];
  const boolOptions = [{ label: 'Negative / No', value: 0 }, { label: 'Positive / Yes', value: 1 }];

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-slate-50"
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View className="bg-emerald-700 pt-14 pb-8 px-5">
          <View className="flex-row items-center mb-2">
            <Brain color="#FFFFFF" size={22} />
            <Text className="text-white text-xs font-bold ml-2 uppercase tracking-wider">AI Powered</Text>
          </View>
          <Text className="text-white text-2xl font-bold">Maternal Risk Assessment</Text>
          <Text className="text-emerald-200 text-sm mt-1">
            Enter clinical measurements for AI-powered pregnancy risk analysis
          </Text>
        </View>

        <View className="px-5 pt-4">

          {/* Section: Patient Information */}
          <SectionHeader icon={<User color="#15803D" size={18} />} title="Patient Information" />
          <NumberInput label="Age" value={age} onChangeText={setAge} unit="years" placeholder="e.g. 28" />
          <OptionPicker label="Pregnancy No. (Gravida)" options={gravOptions} value={gravida} onSelect={setGravida} />

          {/* Section: Pregnancy Information */}
          <SectionHeader icon={<Baby color="#15803D" size={18} />} title="Pregnancy Information" />
          <NumberInput label="Gestational Age" value={gestationalAge} onChangeText={setGestationalAge} unit="weeks" placeholder="e.g. 28" />
          <OptionPicker label="Tetanus Vaccination" options={tetOptions} value={tetanus} onSelect={setTetanus} />

          {/* Section: Maternal Measurements */}
          <SectionHeader icon={<Activity color="#15803D" size={18} />} title="Maternal Measurements" />
          <NumberInput label="Weight" value={weightKg} onChangeText={setWeightKg} unit="kg" placeholder="e.g. 60" keyboardType="decimal-pad" />
          <NumberInput label="Height" value={heightFt} onChangeText={setHeightFt} unit="ft" placeholder="e.g. 5.3" keyboardType="decimal-pad" />
          <NumberInput label="Systolic Blood Pressure" value={systolicBP} onChangeText={setSystolicBP} unit="mmHg" placeholder="e.g. 120" />
          <NumberInput label="Diastolic Blood Pressure" value={diastolicBP} onChangeText={setDiastolicBP} unit="mmHg" placeholder="e.g. 80" />

          {/* Section: Fetal Information */}
          <SectionHeader icon={<Baby color="#15803D" size={18} />} title="Fetal Information" />
          <OptionPicker label="Fetal Position" options={posOptions} value={fetalPosition} onSelect={setFetalPosition} />
          <NumberInput label="Fetal Heart Rate" value={fetalHeartRate} onChangeText={setFetalHeartRate} unit="bpm" placeholder="e.g. 140" />

          {/* Section: Laboratory Results */}
          <SectionHeader icon={<FlaskConical color="#15803D" size={18} />} title="Laboratory Results" />
          <OptionPicker label="Urine Sugar" options={boolOptions} value={urineSugar} onSelect={setUrineSugar} />
          <OptionPicker label="VDRL (Syphilis Test)" options={boolOptions} value={vdrl} onSelect={setVdrl} />
          <OptionPicker label="HBsAg (Hepatitis B)" options={boolOptions} value={hbsAg} onSelect={setHbsAg} />

          {/* Disclaimer */}
          <View className="bg-amber-50 border border-amber-100 rounded-[16px] p-4 mb-5">
            <Text className="text-amber-700 text-xs leading-5">
              ⚕️ This AI-generated assessment is for decision-support purposes only and does not replace professional medical evaluation. Always consult your doctor.
            </Text>
          </View>

          {/* Submit */}
          <TouchableOpacity
            onPress={handleSubmit}
            disabled={isLoading}
            className="bg-emerald-700 rounded-[16px] py-4 items-center flex-row justify-center mb-10"
          >
            {isLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <Brain color="#FFFFFF" size={20} />
                <Text className="text-white font-bold text-base ml-2">Analyze Risk Now</Text>
                <ArrowRight color="#FFFFFF" size={18} style={{ marginLeft: 6 }} />
              </>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
