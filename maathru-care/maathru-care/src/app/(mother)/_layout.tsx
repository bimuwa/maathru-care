import { Tabs } from 'expo-router';
import { Home, HeartPulse, ScanLine, TrendingUp, User } from 'lucide-react-native';
import { View } from 'react-native';
import React from 'react';

export default function MotherTabLayout() {
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
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="home"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <Home color={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="wellness"
        options={{
          title: 'Wellness',
          tabBarIcon: ({ color }) => <HeartPulse color={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="detect"
        listeners={() => ({
          tabPress: (e) => {
            // Prevent default action (navigation)
            e.preventDefault();
          },
        })}
        options={{
          title: 'Detect AI',
          tabBarIcon: ({ color }) => (
            <View
              style={{
                backgroundColor: '#15803D',
                width: 56,
                height: 56,
                borderRadius: 28,
                alignItems: 'center',
                justifyContent: 'center',
                marginTop: -24,
                borderWidth: 4,
                borderColor: '#FFFFFF',
                shadowColor: '#15803D',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 6,
              }}
            >
              <ScanLine color="#FFFFFF" size={24} />
            </View>
          ),
          tabBarLabel: 'Detect AI',
        }}
      />
      <Tabs.Screen
        name="trends"
        options={{
          title: 'Trends',
          tabBarIcon: ({ color }) => <TrendingUp color={color} size={22} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <User color={color} size={22} />,
        }}
      />
      {/* Hidden screens — not shown in tab bar but within the mother navigation context */}
      <Tabs.Screen name="vitals" options={{ href: null }} />
      <Tabs.Screen name="medications" options={{ href: null }} />
    </Tabs>
  );
}
