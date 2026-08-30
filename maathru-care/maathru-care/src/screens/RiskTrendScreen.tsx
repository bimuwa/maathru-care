import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Brain,
  ChevronRight,
  BarChart2,
  HelpCircle,
} from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { api, RiskPredictionResult } from '../services/api';

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

function TrendBar({ value, maxValue }: { value: number; maxValue: number }) {
  const width = maxValue > 0 ? (value / maxValue) * 100 : 0;
  let color = '#10B981';
  if (value >= 80) color = '#EF4444';
  else if (value >= 60) color = '#F97316';
  else if (value >= 30) color = '#F59E0B';
  return (
    <View className="h-2 bg-slate-100 rounded-full overflow-hidden flex-1">
      <View className="h-full rounded-full" style={{ width: `${width}%`, backgroundColor: color }} />
    </View>
  );
}

function getDeltaLabel(current: number, previous: number) {
  const diff = current - previous;
  if (Math.abs(diff) < 2) return { label: 'Stable', icon: <Minus color="#64748B" size={14} />, color: '#64748B' };
  if (diff > 0) return { label: `+${diff.toFixed(1)}%`, icon: <TrendingUp color="#EF4444" size={14} />, color: '#EF4444' };
  return { label: `${diff.toFixed(1)}%`, icon: <TrendingDown color="#10B981" size={14} />, color: '#10B981' };
}

export default function RiskTrendScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const [history, setHistory] = useState<RiskPredictionResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [compareData, setCompareData] = useState<any>(null);

  const loadHistory = useCallback(async () => {
    if (!user?.id) return;
    setIsLoading(true);
    try {
      const res = await api.getRiskHistory(user.id);
      if (res.success) {
        setHistory(res.history);
        // Get delta comparison for latest 2 assessments
        if (res.history.length >= 2) {
          try {
            const cmpRes = await api.compareRisk(
              res.history[0].id ?? '',
              res.history[1].id ?? ''
            );
            if (cmpRes.success) setCompareData(cmpRes.comparison);
          } catch {}
        }
      }
    } catch {
    } finally {
      setIsLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  const maxProb = Math.max(...history.map((h) => h.highRiskProbability), 0);

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-slate-50">
        <ActivityIndicator size="large" color="#15803D" />
        <Text className="text-slate-400 mt-3">Loading risk history...</Text>
      </View>
    );
  }

  const current = history[0];
  const previous = history[1];
  const delta = current && previous ? getDeltaLabel(current.highRiskProbability, previous.highRiskProbability) : null;

  return (
    <ScrollView className="flex-1 bg-slate-50" showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View className="bg-emerald-700 pt-14 pb-8 px-5">
        <View className="flex-row items-center mb-2">
          <BarChart2 color="#FFFFFF" size={20} />
          <Text className="text-white text-xs font-bold ml-2 uppercase tracking-wider">Risk Monitoring</Text>
        </View>
        <Text className="text-white text-2xl font-bold">Risk Trend Analysis</Text>
        <Text className="text-emerald-200 text-sm mt-1">
          Track how your AI-estimated risk changes over time
        </Text>
      </View>

      <View className="px-5 pt-4">
        {history.length === 0 ? (
          <View className="bg-white rounded-[20px] p-8 items-center shadow-sm shadow-slate-100">
            <Brain color="#94A3B8" size={40} />
            <Text className="text-slate-500 font-semibold mt-3">No assessments yet</Text>
            <Text className="text-slate-400 text-sm text-center mt-1">
              Complete your first AI risk assessment to see trends here.
            </Text>
            <TouchableOpacity
              onPress={() => router.push('/(mother)/detect')}
              className="bg-emerald-700 rounded-[14px] px-6 py-3 mt-5"
            >
              <Text className="text-white font-bold">Start Assessment</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Current Risk Summary */}
            {current && (
              <View
                className="rounded-[20px] p-5 mb-4"
                style={{
                  backgroundColor: RISK_BG[current.riskLevel] ?? '#ECFDF5',
                  borderWidth: 1,
                  borderColor: (RISK_COLORS[current.riskLevel] ?? '#10B981') + '40',
                }}
              >
                <Text className="text-slate-500 text-xs font-semibold uppercase mb-2">Latest Assessment</Text>
                <View className="flex-row items-center justify-between">
                  <View>
                    <Text className="text-slate-800 font-bold text-3xl">
                      {current.highRiskProbability.toFixed(1)}%
                    </Text>
                    <View
                      className="px-3 py-1 rounded-full self-start mt-1"
                      style={{ backgroundColor: RISK_COLORS[current.riskLevel] ?? '#10B981' }}
                    >
                      <Text className="text-white font-bold text-xs">{current.riskLevel} Risk</Text>
                    </View>
                  </View>
                  {delta && (
                    <View className="items-center bg-white/80 p-3 rounded-[14px]">
                      {delta.icon}
                      <Text className="font-bold text-sm mt-1" style={{ color: delta.color }}>
                        {delta.label}
                      </Text>
                      <Text className="text-slate-400 text-xs">vs previous</Text>
                    </View>
                  )}
                </View>
                {current.createdAt && (
                  <Text className="text-slate-400 text-xs mt-3">
                    {new Date(current.createdAt).toLocaleDateString('en-US', {
                      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
                    })}
                  </Text>
                )}
              </View>
            )}

            {/* Timeline Bar Chart */}
            <View className="bg-white rounded-[20px] p-5 mb-4 shadow-sm shadow-slate-100">
              <Text className="text-slate-800 font-bold text-sm mb-4">
                Risk Probability Timeline
              </Text>
              {[...history].reverse().map((h, i) => (
                <View key={h.id ?? i} className="mb-3">
                  <View className="flex-row items-center justify-between mb-1">
                    <Text className="text-slate-500 text-xs">
                      {h.createdAt
                        ? new Date(h.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                        : `Assessment ${i + 1}`}
                    </Text>
                    <View className="flex-row items-center gap-2">
                      <View
                        className="px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: RISK_BG[h.riskLevel] ?? '#ECFDF5' }}
                      >
                        <Text
                          className="text-xs font-semibold"
                          style={{ color: RISK_COLORS[h.riskLevel] ?? '#10B981' }}
                        >
                          {h.riskLevel}
                        </Text>
                      </View>
                      <Text className="text-slate-700 font-bold text-xs">
                        {h.highRiskProbability.toFixed(1)}%
                      </Text>
                    </View>
                  </View>
                  <TrendBar value={h.highRiskProbability} maxValue={maxProb} />
                </View>
              ))}
            </View>

            {/* Why did my risk change? */}
            {compareData && (
              <View className="bg-white rounded-[20px] p-5 mb-4 shadow-sm shadow-slate-100">
                <View className="flex-row items-center mb-3">
                  <HelpCircle color="#15803D" size={18} />
                  <Text className="text-slate-800 font-bold text-sm ml-2">
                    Why Did My Risk Change?
                  </Text>
                </View>
                <View className="bg-slate-50 rounded-[14px] p-3 mb-3">
                  <Text className="text-slate-600 text-sm leading-5">
                    {compareData.explanation ??
                      `The model-estimated high-risk probability changed from ${previous?.highRiskProbability?.toFixed(1)}% to ${current?.highRiskProbability?.toFixed(1)}% between your last two assessments.`}
                  </Text>
                </View>
                {compareData.changedFeatures && compareData.changedFeatures.length > 0 && (
                  <>
                    <Text className="text-slate-600 font-semibold text-xs mb-2">Input changes detected:</Text>
                    {compareData.changedFeatures.map((f: any, i: number) => (
                      <View key={i} className="flex-row items-center py-1.5 border-b border-slate-50">
                        <Text className="text-slate-500 text-xs w-28">{f.displayName ?? f.feature}</Text>
                        <Text className="text-slate-400 text-xs mx-2">{f.previous}</Text>
                        <Text className="text-slate-400">→</Text>
                        <Text className="text-slate-800 text-xs font-semibold ml-2">{f.current}</Text>
                      </View>
                    ))}
                  </>
                )}
                {compareData.topContributors && compareData.topContributors.length > 0 && (
                  <>
                    <Text className="text-slate-600 font-semibold text-xs mt-3 mb-2">
                      Top model contributors (SHAP):
                    </Text>
                    {compareData.topContributors.slice(0, 4).map((c: any, i: number) => (
                      <View key={i} className="flex-row items-center py-1">
                        <Text className="text-slate-400 text-xs w-4">{i + 1}.</Text>
                        <Text className="text-slate-700 text-xs ml-1">{c.displayName ?? c.feature}</Text>
                        <View className="flex-1 ml-2">
                          <View
                            className="h-1.5 rounded-full"
                            style={{
                              width: `${Math.min(100, Math.abs(c.shapValue ?? 0) * 50)}%`,
                              backgroundColor: (c.shapValue ?? 0) > 0 ? '#EF4444' : '#10B981',
                            }}
                          />
                        </View>
                      </View>
                    ))}
                  </>
                )}
              </View>
            )}

            {/* Full History List */}
            <Text className="text-slate-800 font-bold text-sm mb-3">
              All Assessments ({history.length})
            </Text>
            {history.map((h, i) => (
              <View
                key={h.id ?? i}
                className="bg-white rounded-[16px] p-4 mb-3 flex-row items-center border border-slate-100"
              >
                <View className="flex-1">
                  <Text className="text-slate-500 text-xs">
                    {h.createdAt
                      ? new Date(h.createdAt).toLocaleDateString('en-US', {
                          weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
                        })
                      : `Assessment ${history.length - i}`}
                  </Text>
                  <Text className="text-slate-800 font-bold text-lg mt-0.5">
                    {h.highRiskProbability.toFixed(1)}%
                  </Text>
                </View>
                <View
                  className="px-3 py-1 rounded-full"
                  style={{ backgroundColor: RISK_COLORS[h.riskLevel] ?? '#10B981' }}
                >
                  <Text className="text-white font-bold text-xs">{h.riskLevel}</Text>
                </View>
              </View>
            ))}
          </>
        )}
        <View className="h-8" />
      </View>
    </ScrollView>
  );
}
