import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HeartPulse, Calendar, TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react-native';
import { useRouter } from 'expo-router';

import { mealService } from '@/services/mealService';
import { gdmRiskService } from '@/services/gdmRiskService';
import { PREGNANCY_NUTRITION_TARGETS } from '@/constants/pregnancyNutritionTargets';
import { ACTIVE_USER_ID } from '@/constants/userConfig';
import { GDMRiskResponse } from '@/types/gdm';

type Tab = 'daily' | 'weekly' | 'gdm';

export default function WellnessScreen() {
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState<Tab>('daily');
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  
  const [isLoading, setIsLoading] = useState(false);
  const [dailyData, setDailyData] = useState<any[]>([]);
  const [weeklyData, setWeeklyData] = useState<any[]>([]);
  const [gdmResult, setGdmResult] = useState<GDMRiskResponse | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, [activeTab, selectedDate]);

  const loadData = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      if (activeTab === 'daily') {
        const data = await mealService.getDailyNutrition(ACTIVE_USER_ID, selectedDate);
        setDailyData(data);
      } else if (activeTab === 'weekly') {
        const data = await mealService.getWeeklyTrends(ACTIVE_USER_ID);
        setWeeklyData(data);
      } else if (activeTab === 'gdm') {
        // Fetch profile
        const profile = await gdmRiskService.getMaternalProfile(ACTIVE_USER_ID);
        if (!profile) {
           setErrorMsg('Could not load maternal profile.');
           setIsLoading(false);
           return;
        }
        
        try {
          const result = await gdmRiskService.assessRisk(profile);
          setGdmResult(result);
        } catch (err: any) {
           setErrorMsg(err.message || 'Error assessing GDM risk.');
        }
      }
    } catch (err) {
       console.error(err);
       setErrorMsg('An error occurred while loading data.');
    } finally {
      setIsLoading(false);
    }
  };

  const getDailyTotals = () => {
    return dailyData.reduce(
      (acc, log) => ({
        carbs: acc.carbs + (log.total_carbs_g || 0),
        sugar: acc.sugar + (log.total_sugar_g || 0),
        fiber: acc.fiber + (log.total_fiber_g || 0),
        fat: acc.fat + (log.total_fat_g || 0),
        iron: acc.iron + (log.total_iron_mg || 0),
        calcium: acc.calcium + (log.total_calcium_mg || 0),
      }),
      { carbs: 0, sugar: 0, fiber: 0, fat: 0, iron: 0, calcium: 0 }
    );
  };

  const renderDailyNutrients = () => {
    if (isLoading) return <ActivityIndicator size="large" color="#0D9488" style={{ marginTop: 40 }} />;
    
    if (dailyData.length === 0) {
       return (
         <View className="items-center justify-center mt-12 bg-white mx-4 p-6 rounded-2xl shadow-sm border border-slate-100">
           <Calendar size={48} color="#94A3B8" className="mb-4" />
           <Text className="text-lg font-bold text-slate-800 mb-2">No meals logged today</Text>
           <Text className="text-slate-500 text-center mb-6">Scan your meals to track your nutrition.</Text>
           <TouchableOpacity 
             onPress={() => router.push('/detect')}
             className="bg-emerald-600 px-6 py-3 rounded-full"
           >
             <Text className="text-white font-semibold">Log a Meal</Text>
           </TouchableOpacity>
         </View>
       );
    }

    const totals = getDailyTotals();

    const NutrientBar = ({ label, current, target, unit }: any) => {
      const percentage = Math.min(100, Math.round((current / target) * 100)) || 0;
      return (
        <View className="mb-4">
          <View className="flex-row justify-between mb-1">
            <Text className="text-slate-700 font-medium">{label}</Text>
            <Text className="text-slate-500 text-sm">{current.toFixed(1)} / {target} {unit}</Text>
          </View>
          <View className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
            <View 
              className={`h-full ${percentage > 90 ? (label === 'Sugar' ? 'bg-amber-500' : 'bg-emerald-500') : 'bg-emerald-400'}`} 
              style={{ width: `${percentage}%` }} 
            />
          </View>
        </View>
      );
    };

    return (
      <View className="px-4 mt-6 pb-20">
        <View className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 mb-6">
          <Text className="text-lg font-bold text-slate-900 mb-4">Nutrient Targets</Text>
          <NutrientBar label="Iron" current={totals.iron} target={PREGNANCY_NUTRITION_TARGETS.ironMg} unit="mg" />
          <NutrientBar label="Calcium" current={totals.calcium} target={PREGNANCY_NUTRITION_TARGETS.calciumMg} unit="mg" />
          <NutrientBar label="Fiber" current={totals.fiber} target={PREGNANCY_NUTRITION_TARGETS.fiberG} unit="g" />
          <NutrientBar label="Carbs" current={totals.carbs} target={PREGNANCY_NUTRITION_TARGETS.carbsG} unit="g" />
          <NutrientBar label="Sugar" current={totals.sugar} target={PREGNANCY_NUTRITION_TARGETS.sugarG} unit="g" />
          
          {totals.iron < PREGNANCY_NUTRITION_TARGETS.ironMg * 0.5 && (
            <View className="bg-amber-50 rounded-xl p-3 mt-2 flex-row items-start">
               <AlertCircle size={18} color="#D97706" className="mt-0.5 mr-2" />
               <Text className="text-amber-800 text-sm flex-1">Your iron intake is below today's general target.</Text>
            </View>
          )}
        </View>

        <Text className="text-lg font-bold text-slate-900 mb-3 ml-1">Today's Meals</Text>
        {dailyData.map((log) => (
          <View key={log.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 mb-3">
            <Text className="font-bold text-emerald-800 mb-2">{log.meal_type}</Text>
            {log.meal_items?.map((item: any) => (
               <Text key={item.id} className="text-slate-600 mb-1">• {item.item_name}</Text>
            ))}
          </View>
        ))}
      </View>
    );
  };

  const renderWeeklyTrends = () => {
    if (isLoading) return <ActivityIndicator size="large" color="#0D9488" style={{ marginTop: 40 }} />;

    if (weeklyData.length === 0) {
      return (
         <View className="items-center justify-center mt-12 bg-white mx-4 p-6 rounded-2xl shadow-sm border border-slate-100">
           <TrendingUp size={48} color="#94A3B8" className="mb-4" />
           <Text className="text-lg font-bold text-slate-800 mb-2">No weekly data</Text>
           <Text className="text-slate-500 text-center mb-6">Keep logging your meals to see your weekly nutrition trends.</Text>
         </View>
       );
    }

    return (
      <View className="px-4 mt-6 pb-20">
        <View className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 items-center justify-center min-h-[200px]">
           <Text className="text-slate-500 text-center">Weekly charts will render here based on {weeklyData.length} logs.</Text>
        </View>
      </View>
    );
  };

  const renderGdmRisk = () => {
    if (isLoading) {
      return (
        <View className="items-center justify-center mt-20">
          <ActivityIndicator size="large" color="#0D9488" />
          <Text className="text-slate-500 mt-4 font-medium">Analyzing your maternal health profile...</Text>
        </View>
      );
    }

    if (errorMsg) {
      return (
         <View className="items-center justify-center mt-12 bg-white mx-4 p-6 rounded-2xl shadow-sm border border-red-100">
           <AlertCircle size={48} color="#EF4444" className="mb-4" />
           <Text className="text-lg font-bold text-slate-800 mb-2 text-center">Some health information is missing</Text>
           <Text className="text-slate-500 text-center mb-6">
             {errorMsg === 'Could not load maternal profile.' 
                ? 'Please complete your maternal health profile before running the risk assessment.'
                : errorMsg}
           </Text>
         </View>
       );
    }

    if (gdmResult) {
      return (
        <View className="px-4 mt-6 pb-20">
          <View className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 items-center">
             <View className={`w-24 h-24 rounded-full items-center justify-center mb-4 ${gdmResult.riskCategory === 'High Risk' ? 'bg-red-50' : gdmResult.riskCategory === 'Moderate Risk' ? 'bg-amber-50' : 'bg-emerald-50'}`}>
                {gdmResult.riskCategory === 'High Risk' ? <AlertCircle size={48} color="#EF4444" /> : 
                 gdmResult.riskCategory === 'Moderate Risk' ? <AlertCircle size={48} color="#D97706" /> :
                 <CheckCircle2 size={48} color="#10B981" />}
             </View>
             <Text className="text-2xl font-bold text-slate-900 mb-2">{gdmResult.riskCategory}</Text>
             
             {gdmResult.probability && (
               <Text className="text-slate-500 font-medium mb-4">
                 Estimated GDM risk score: {Math.round(gdmResult.probability * 100)}%
               </Text>
             )}

             <View className="bg-slate-50 p-4 rounded-2xl w-full">
                <Text className="text-slate-700 text-center leading-relaxed">
                  {gdmResult.message}
                </Text>
             </View>

             <Text className="text-slate-400 text-xs text-center mt-6">
               This is a risk estimate based on the information provided and is not a medical diagnosis. Please discuss your results with your healthcare professional.
             </Text>
          </View>
        </View>
      );
    }

    return null;
  };

  return (
    <SafeAreaView className="flex-1 bg-[#F8FAFC]">
      <View className="px-6 pt-2 pb-4">
        <Text className="text-2xl font-bold text-slate-900">Maternal Health</Text>
      </View>
      
      <View className="flex-row mx-4 bg-slate-200/50 p-1 rounded-xl mb-2">
        {(['daily', 'weekly', 'gdm'] as Tab[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            onPress={() => setActiveTab(tab)}
            className={`flex-1 py-2.5 items-center rounded-lg ${activeTab === tab ? 'bg-white shadow-sm' : ''}`}
          >
            <Text className={`font-semibold capitalize ${activeTab === tab ? 'text-slate-900' : 'text-slate-500'}`}>
              {tab === 'gdm' ? 'GDM Risk' : tab}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {activeTab === 'daily' && renderDailyNutrients()}
        {activeTab === 'weekly' && renderWeeklyTrends()}
        {activeTab === 'gdm' && renderGdmRisk()}
      </ScrollView>
    </SafeAreaView>
  );
}
