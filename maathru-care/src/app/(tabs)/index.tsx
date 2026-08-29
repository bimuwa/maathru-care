import { ScrollView, View } from 'react-native';
import React from 'react';
import { SafeAreaView } from 'react-native-safe-area-context';
import Header from '@/components/Header';
import PregnancyOverviewCard from '@/components/PregnancyOverviewCard';
import AiNutritionCard from '@/components/AiNutritionCard';
import RecentAnalysisWidget from '@/components/RecentAnalysisWidget';
import HealthInsightsList from '@/components/HealthInsightsList';
import QuickActionsGrid from '@/components/QuickActionsGrid';
import SmartRecommendation from '@/components/SmartRecommendation';

export default function HomeScreen() {
  return (
    <SafeAreaView className="flex-1 bg-slate-50" edges={['top']}>
      <ScrollView 
        className="flex-1" 
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 10, paddingBottom: 40 }}
        showsVerticalScrollIndicator={false}
      >
        <Header />
        <PregnancyOverviewCard />
        <AiNutritionCard />
        <RecentAnalysisWidget />
        <HealthInsightsList />
        <QuickActionsGrid />
        <SmartRecommendation />
      </ScrollView>
    </SafeAreaView>
  );
}
