import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import {
  Brain,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  Bell,
  ShieldCheck,
} from 'lucide-react-native';
import { RiskPredictionResult, FeatureImpact } from '../services/api';

const RISK_COLORS: Record<string, string> = {
  Low: '#10B981',
  Moderate: '#F59E0B',
  High: '#F97316',
  'Very High': '#EF4444',
};

const RISK_BG: Record<string, string> = {
  Low: '#ECFDF5',
  Moderate: '#FFFBEB',
  High: '#FFF7ED',
  'Very High': '#FEF2F2',
};

function ProbabilityMeter({ value }: { value: number }) {
  const clamp = Math.min(100, Math.max(0, value));
  let barColor = '#10B981';
  if (clamp >= 80) barColor = '#EF4444';
  else if (clamp >= 60) barColor = '#F97316';
  else if (clamp >= 30) barColor = '#F59E0B';

  return (
    <View className="mb-4">
      <View className="flex-row justify-between mb-2">
        <Text className="text-slate-600 text-xs font-semibold">High-Risk Probability</Text>
        <Text className="text-slate-800 font-bold text-sm">{value.toFixed(1)}%</Text>
      </View>
      <View className="h-4 bg-slate-100 rounded-full overflow-hidden">
        <View
          className="h-full rounded-full"
          style={{ width: `${clamp}%`, backgroundColor: barColor }}
        />
      </View>
      <View className="flex-row justify-between mt-1">
        <Text className="text-xs text-slate-400">0% (Low)</Text>
        <Text className="text-xs text-slate-400">100% (Very High)</Text>
      </View>
    </View>
  );
}

function FactorCard({ factor }: { factor: FeatureImpact }) {
  const isIncreasing = factor.contribution === 'increases_risk';
  return (
    <View className="flex-row items-start py-3 border-b border-slate-50">
      <View
        className="w-8 h-8 rounded-full items-center justify-center mr-3 mt-0.5"
        style={{ backgroundColor: isIncreasing ? '#FEF2F2' : '#ECFDF5' }}
      >
        {isIncreasing ? (
          <TrendingUp color="#EF4444" size={14} />
        ) : (
          <TrendingDown color="#10B981" size={14} />
        )}
      </View>
      <View className="flex-1">
        <View className="flex-row items-center justify-between">
          <Text className="text-slate-800 font-semibold text-sm">{factor.displayName}</Text>
          <Text
            className="text-xs font-bold"
            style={{ color: isIncreasing ? '#EF4444' : '#10B981' }}
          >
            {isIncreasing ? '↑ Increases' : '↓ Decreases'}
          </Text>
        </View>
        <Text className="text-slate-500 text-xs mt-0.5">
          Value: {factor.value} {factor.unit}
        </Text>
        <Text className="text-slate-400 text-xs mt-1 leading-4">{factor.explanation}</Text>
      </View>
    </View>
  );
}

export default function RiskResultScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const [showFactors, setShowFactors] = useState(true);
  const [showRecommendations, setShowRecommendations] = useState(true);

  let result: RiskPredictionResult | null = null;
  try {
    result = JSON.parse(params.result as string) as RiskPredictionResult;
  } catch {
    result = null;
  }

  if (!result) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <Text className="text-slate-500">No result data found.</Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-4 bg-emerald-700 px-6 py-3 rounded-full">
          <Text className="text-white font-bold">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const riskColor = RISK_COLORS[result.riskLevel] ?? '#10B981';
  const riskBg = RISK_BG[result.riskLevel] ?? '#ECFDF5';

  return (
    <ScrollView className="flex-1 bg-slate-50" showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View className="bg-emerald-700 pt-14 pb-8 px-5">
        <TouchableOpacity onPress={() => router.back()} className="flex-row items-center mb-4">
          <ArrowLeft color="#FFFFFF" size={20} />
          <Text className="text-white ml-2 font-semibold">Back to Assessment</Text>
        </TouchableOpacity>
        <View className="flex-row items-center mb-2">
          <Brain color="#FFFFFF" size={18} />
          <Text className="text-white text-xs font-bold ml-2 uppercase tracking-wider">
            AI Assessment Result
          </Text>
        </View>
        <Text className="text-white text-2xl font-bold">Pregnancy Risk Analysis</Text>
        {result.createdAt && (
          <Text className="text-emerald-200 text-xs mt-1">
            {new Date(result.createdAt).toLocaleString()}
          </Text>
        )}
      </View>

      <View className="px-5 pt-4">
        {/* Alert Banner */}
        {result.isAlertRequired && (
          <View className="bg-red-50 border border-red-200 rounded-[16px] p-4 mb-4 flex-row items-center">
            <Bell color="#EF4444" size={20} />
            <View className="flex-1 ml-3">
              <Text className="text-red-700 font-bold text-sm">Doctor Alert Sent</Text>
              <Text className="text-red-500 text-xs mt-0.5">
                Your doctor has been notified about this high-risk assessment.
              </Text>
            </View>
          </View>
        )}

        {/* Risk Level Card */}
        <View
          className="rounded-[20px] p-6 mb-4 items-center"
          style={{ backgroundColor: riskBg, borderWidth: 1.5, borderColor: riskColor + '40' }}
        >
          <View
            className="px-6 py-2 rounded-full mb-3"
            style={{ backgroundColor: riskColor }}
          >
            <Text className="text-white font-bold text-base">{result.riskLevel} Risk</Text>
          </View>
          <Text className="text-slate-800 font-bold text-4xl">{result.highRiskProbability.toFixed(1)}%</Text>
          <Text className="text-slate-500 text-sm mt-1">Model-estimated high-risk probability</Text>
        </View>

        {/* Probability Meter */}
        <View className="bg-white rounded-[20px] p-5 mb-4 shadow-sm shadow-slate-100">
          <ProbabilityMeter value={result.highRiskProbability} />
          <Text className="text-slate-600 text-sm">{result.summary}</Text>
        </View>

        {/* SHAP Factors */}
        {result.factors && result.factors.length > 0 && (
          <View className="bg-white rounded-[20px] p-5 mb-4 shadow-sm shadow-slate-100">
            <TouchableOpacity
              onPress={() => setShowFactors(!showFactors)}
              className="flex-row items-center justify-between mb-2"
            >
              <View className="flex-row items-center">
                <Brain color="#15803D" size={18} />
                <Text className="text-slate-800 font-bold text-sm ml-2">
                  Key Influencing Factors (SHAP AI)
                </Text>
              </View>
              {showFactors ? <ChevronUp color="#94A3B8" size={18} /> : <ChevronDown color="#94A3B8" size={18} />}
            </TouchableOpacity>
            <Text className="text-slate-400 text-xs mb-3">
              These factors contributed to the model prediction. This does not imply medical causation.
            </Text>
            {showFactors && result.factors.slice(0, 6).map((f, i) => (
              <FactorCard key={i} factor={f} />
            ))}
          </View>
        )}

        {/* Recommendations */}
        {result.recommendations && result.recommendations.length > 0 && (
          <View className="bg-white rounded-[20px] p-5 mb-4 shadow-sm shadow-slate-100">
            <TouchableOpacity
              onPress={() => setShowRecommendations(!showRecommendations)}
              className="flex-row items-center justify-between mb-2"
            >
              <View className="flex-row items-center">
                <ShieldCheck color="#15803D" size={18} />
                <Text className="text-slate-800 font-bold text-sm ml-2">
                  Preventive Guidance
                </Text>
              </View>
              {showRecommendations ? <ChevronUp color="#94A3B8" size={18} /> : <ChevronDown color="#94A3B8" size={18} />}
            </TouchableOpacity>
            {showRecommendations && result.recommendations.map((rec, i) => (
              <View key={i} className="flex-row items-start py-2">
                <Text className="text-emerald-500 mr-2 mt-0.5">•</Text>
                <Text className="text-slate-600 text-sm flex-1 leading-5">{rec}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Disclaimer */}
        <View className="bg-amber-50 border border-amber-100 rounded-[16px] p-4 mb-5">
          <Text className="text-amber-700 text-xs leading-5">{result.disclaimer}</Text>
        </View>

        {/* Actions */}
        <TouchableOpacity
          onPress={() => router.replace('/(mother)/trends')}
          className="bg-emerald-700 rounded-[16px] py-4 items-center flex-row justify-center mb-4"
        >
          <TrendingUp color="#FFFFFF" size={18} />
          <Text className="text-white font-bold text-sm ml-2">View Risk Trends & History</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => router.back()}
          className="bg-white border border-slate-200 rounded-[16px] py-4 items-center mb-10"
        >
          <Text className="text-slate-600 font-semibold text-sm">New Assessment</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}
