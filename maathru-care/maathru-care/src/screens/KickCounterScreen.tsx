import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, ActivityIndicator,
  Alert, Animated, RefreshControl,
} from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, Baby, Clock, Heart, AlertTriangle, CheckCircle, Play, Square } from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { useKickSession } from '../context/KickSessionContext';
import { api } from '../services/api';

function formatDuration(totalSec: number) {
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  if (isToday) return `Today, ${time}`;
  return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${time}`;
}

export default function KickCounterScreen() {
  const { user } = useAuth();
  const { session, startSession: globalStart, recordKick, endSession: globalEnd, resetSession } = useKickSession();
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showResult, setShowResult] = useState<null | { completed: boolean; kicks: number; duration: number }>(null);
  const [refreshing, setRefreshing] = useState(false);

  const TARGET = 10;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const heartOpacity = useRef(new Animated.Value(0)).current;

  const fetchHistory = useCallback(async () => {
    if (!user?.id) return;
    try {
      const res = await api.getKickHistory(user.id);
      if (res.success) setHistory(res.sessions || []);
    } catch { /* silent */ }
    setLoading(false);
  }, [user?.id]);

  useEffect(() => { fetchHistory(); }, [fetchHistory]);

  // Watch for auto-completion (when target reached via floating bubble or here)
  useEffect(() => {
    if (!session.isActive && session.kickCount >= TARGET && session.kickCount > 0 && !showResult) {
      handleSessionEnd(true);
    }
  }, [session.isActive, session.kickCount]);

  const handleStart = () => {
    setShowResult(null);
    globalStart();
  };

  const handleKick = () => {
    if (!session.isActive) return;
    recordKick();
    // Pulse animation
    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 1.15, useNativeDriver: true, speed: 50 }),
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 30 }),
    ]).start();
    // Heart flash
    Animated.sequence([
      Animated.timing(heartOpacity, { toValue: 1, duration: 100, useNativeDriver: true }),
      Animated.timing(heartOpacity, { toValue: 0, duration: 500, useNativeDriver: true }),
    ]).start();
  };

  const handleSessionEnd = async (autoCompleted = false) => {
    const result = globalEnd();
    const completed = autoCompleted || result.completed;
    setShowResult({ completed, kicks: result.kicks, duration: result.durationMin });

    if (!user?.id || result.kicks === 0) return;
    setSaving(true);
    try {
      await api.saveKickSession({
        patientId: user.id,
        sessionStart: session.sessionStart,
        sessionEnd: new Date().toISOString(),
        totalKicks: result.kicks,
        durationMinutes: result.durationMin,
        targetKicks: TARGET,
        completed,
      });
      await fetchHistory();
    } catch { Alert.alert('Error', 'Could not save session. Please try again.'); }
    setSaving(false);
  };

  const onRefresh = async () => { setRefreshing(true); await fetchHistory(); setRefreshing(false); };

  const progress = Math.min(session.kickCount / TARGET, 1);
  const inSession = session.isActive;

  return (
    <ScrollView className="flex-1 bg-[#F8FAFC]" refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#15803D" />}>
      {/* Header */}
      <View className="bg-white pt-14 pb-5 px-5" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.04, shadowRadius: 8, elevation: 2 }}>
        <View className="flex-row items-center">
          <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 bg-slate-100 rounded-full items-center justify-center mr-3">
            <ArrowLeft color="#334155" size={20} />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-slate-800 text-xl font-bold">Baby Kick Counter</Text>
            <Text className="text-slate-500 text-xs mt-0.5">Count-to-10 Method</Text>
          </View>
          <View className="w-10 h-10 bg-pink-50 rounded-full items-center justify-center">
            <Baby color="#EC4899" size={20} />
          </View>
        </View>
      </View>

      <View className="px-5 pt-5">
        {!inSession && !showResult && (
          <>
            {/* Info Card */}
            <View className="bg-white rounded-[20px] p-5 mb-4" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 }}>
              <Text className="text-4xl text-center mb-3">👶</Text>
              <Text className="text-slate-800 font-bold text-lg text-center mb-2">How It Works</Text>
              <Text className="text-slate-500 text-sm text-center leading-5">
                Start a session and tap the button each time you feel your baby kick or move.
                The goal is to count <Text className="font-bold text-emerald-700">10 movements</Text>.
                A healthy baby typically reaches 10 kicks within <Text className="font-bold text-emerald-700">2 hours</Text>.
              </Text>
              <View className="flex-row mt-4 gap-2">
                <View className="flex-1 bg-emerald-50 rounded-[14px] p-3 items-center">
                  <Text className="text-emerald-700 font-bold text-lg">10</Text>
                  <Text className="text-emerald-600 text-xs">Target Kicks</Text>
                </View>
                <View className="flex-1 bg-blue-50 rounded-[14px] p-3 items-center">
                  <Text className="text-blue-700 font-bold text-lg">2 hrs</Text>
                  <Text className="text-blue-600 text-xs">Max Duration</Text>
                </View>
                <View className="flex-1 bg-purple-50 rounded-[14px] p-3 items-center">
                  <Text className="text-purple-700 font-bold text-lg">Daily</Text>
                  <Text className="text-purple-600 text-xs">Recommended</Text>
                </View>
              </View>
            </View>

            {/* Floating Bubble Info */}
            <View className="bg-emerald-50 rounded-[16px] p-4 mb-4 border border-emerald-200">
              <Text className="text-emerald-800 font-bold text-sm mb-1">💡 Floating Counter</Text>
              <Text className="text-emerald-700 text-xs leading-4">
                After starting, a floating bubble will appear on all screens. You can navigate away and still record kicks from anywhere in the app!
              </Text>
            </View>

            {/* Start Button */}
            <TouchableOpacity onPress={handleStart} className="bg-emerald-600 rounded-[20px] py-5 items-center mb-6" style={{ shadowColor: '#15803D', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 12, elevation: 6 }}>
              <View className="flex-row items-center gap-2">
                <Play color="#fff" size={22} fill="#fff" />
                <Text className="text-white font-bold text-lg">Start Counting</Text>
              </View>
            </TouchableOpacity>
          </>
        )}

        {/* Active Session */}
        {inSession && (
          <View className="items-center mb-6">
            {/* Timer */}
            <View className="flex-row items-center gap-2 mb-6">
              <Clock color="#64748B" size={16} />
              <Text className="text-slate-600 text-lg font-mono">{formatDuration(session.elapsedSec)}</Text>
            </View>

            {/* Heart flash */}
            <Animated.View style={{ opacity: heartOpacity, position: 'absolute', top: 20, zIndex: 10 }}>
              <Text className="text-4xl">💚</Text>
            </Animated.View>

            {/* Kick Count */}
            <Text className="text-slate-400 text-sm font-semibold mb-2">KICKS</Text>
            <Text className="text-slate-800 text-5xl font-bold mb-1">{session.kickCount} <Text className="text-slate-400 text-2xl">/ {TARGET}</Text></Text>

            {/* Progress Bar */}
            <View className="w-full bg-slate-100 rounded-full h-3 mt-4 mb-8 overflow-hidden">
              <View className="h-full rounded-full" style={{ width: `${progress * 100}%`, backgroundColor: progress >= 1 ? '#10B981' : '#15803D' }} />
            </View>

            {/* Large Kick Button */}
            <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
              <TouchableOpacity
                onPress={handleKick}
                activeOpacity={0.7}
                className="w-40 h-40 rounded-full items-center justify-center"
                style={{ backgroundColor: '#15803D', shadowColor: '#15803D', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 16, elevation: 8 }}
              >
                <Text className="text-5xl mb-1">👣</Text>
                <Text className="text-white font-bold text-sm">TAP FOR KICK</Text>
              </TouchableOpacity>
            </Animated.View>

            <Text className="text-slate-400 text-xs mt-6 text-center">Tap each time you feel a kick, roll, or movement</Text>

            {/* Floating Bubble Reminder */}
            <View className="bg-blue-50 rounded-[14px] px-4 py-2.5 mt-4 flex-row items-center">
              <Text className="text-blue-600 text-xs">💡 You can navigate away — the floating bubble stays active!</Text>
            </View>

            {/* End Session */}
            <TouchableOpacity onPress={() => handleSessionEnd(false)} className="flex-row items-center gap-2 bg-slate-100 rounded-[16px] px-6 py-3.5 mt-4">
              <Square color="#64748B" size={16} />
              <Text className="text-slate-600 font-semibold">End Session</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Session Result */}
        {showResult && !inSession && (
          <View className={`rounded-[20px] p-6 mb-6 ${showResult.completed ? 'bg-emerald-50' : 'bg-orange-50'}`} style={{ borderWidth: 1, borderColor: showResult.completed ? '#A7F3D0' : '#FED7AA' }}>
            <Text className="text-3xl text-center mb-3">{showResult.completed ? '🎉' : '⚠️'}</Text>
            <Text className={`text-center font-bold text-lg ${showResult.completed ? 'text-emerald-700' : 'text-orange-700'}`}>
              {showResult.completed ? 'Great! Baby is Active!' : 'Low Activity Detected'}
            </Text>
            <Text className={`text-center text-sm mt-2 ${showResult.completed ? 'text-emerald-600' : 'text-orange-600'}`}>
              {showResult.kicks} kicks in {showResult.duration} minutes
            </Text>
            {!showResult.completed && (
              <Text className="text-orange-600 text-xs text-center mt-3 leading-4">
                If your baby's movements have decreased, please contact your healthcare provider for evaluation.
              </Text>
            )}
            {saving && <ActivityIndicator color="#15803D" className="mt-3" />}
            <TouchableOpacity onPress={() => { setShowResult(null); resetSession(); }} className="bg-white rounded-[14px] py-3 items-center mt-4">
              <Text className="text-slate-700 font-semibold">New Session</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Session History */}
        <View className="mb-8">
          <Text className="text-slate-800 font-bold text-lg mb-3">Recent Sessions</Text>
          {loading ? (
            <ActivityIndicator color="#15803D" />
          ) : history.length === 0 ? (
            <View className="bg-white rounded-[20px] p-6 items-center" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 3 }}>
              <Text className="text-3xl mb-2">📋</Text>
              <Text className="text-slate-500 text-sm text-center">No sessions recorded yet.{'\n'}Start your first count above!</Text>
            </View>
          ) : (
            history.map((s: any) => (
              <View key={s.id} className="bg-white rounded-[16px] p-4 mb-2 flex-row items-center" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4, elevation: 2 }}>
                <View className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${s.completed ? 'bg-emerald-100' : 'bg-orange-100'}`}>
                  {s.completed ? <CheckCircle color="#10B981" size={18} /> : <AlertTriangle color="#F97316" size={18} />}
                </View>
                <View className="flex-1">
                  <Text className="text-slate-800 font-semibold text-sm">{s.totalKicks} kicks in {s.durationMinutes} min</Text>
                  <Text className="text-slate-400 text-xs mt-0.5">{formatDate(s.createdAt)}</Text>
                </View>
                <View className={`rounded-full px-2.5 py-1 ${s.completed ? 'bg-emerald-50' : 'bg-orange-50'}`}>
                  <Text className={`text-xs font-bold ${s.completed ? 'text-emerald-600' : 'text-orange-600'}`}>
                    {s.completed ? '✓ Healthy' : '⚠ Low'}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
      </View>
    </ScrollView>
  );
}
