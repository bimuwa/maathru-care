import { Tabs } from 'expo-router';
import { Home, HeartPulse, ScanLine, Users2, User } from 'lucide-react-native';
import { View } from 'react-native';
import React from 'react';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#15803D',
        tabBarInactiveTintColor: '#94A3B8',
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopWidth: 1,
          borderTopColor: '#F1F5F9',
          height: 80,
          paddingBottom: 25,
          paddingTop: 10,
          elevation: 10,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.05,
          shadowRadius: 12,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 4,
        }
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Home color={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="wellness"
        options={{
          title: 'Wellness',
          tabBarIcon: ({ color, size }) => <HeartPulse color={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="detect"
        options={{
          title: 'Meal Scan',
          tabBarIcon: ({ color }) => (
            <View className="bg-emerald-600 w-14 h-14 rounded-full items-center justify-center -mt-6 border-4 border-white shadow-sm">
              <ScanLine color="#FFFFFF" size={24} />
            </View>
          ),
          tabBarLabel: 'Meal Scan',
        }}
      />
      <Tabs.Screen
        name="community"
        options={{
          title: 'Community',
          tabBarIcon: ({ color, size }) => <Users2 color={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <User color={color} size={22} />,
        }}
      />
    </Tabs>
  );
}
