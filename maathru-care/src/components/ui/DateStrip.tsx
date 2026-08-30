import React, { useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';

interface DateStripProps {
  selectedDate: Date;
  onDateChange: (date: Date) => void;
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function DateStrip({ selectedDate, onDateChange }: DateStripProps) {
  const scrollRef = useRef<ScrollView>(null);

  // Build 7 days: 3 past + today + 3 future
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - 3 + i);
    return d;
  });

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const isToday = (d: Date) => isSameDay(d, today);
  const isSelected = (d: Date) => isSameDay(d, selectedDate);

  // Auto-scroll to today (index 3) on mount
  useEffect(() => {
    setTimeout(() => {
      scrollRef.current?.scrollTo({ x: 3 * 68, animated: true });
    }, 100);
  }, []);

  return (
    <View className="mb-2">
      {/* Month label */}
      <Text className="text-xs font-semibold text-emerald-700 uppercase tracking-widest mb-2 ml-4">
        {MONTH_NAMES[today.getMonth()]} {today.getFullYear()}
      </Text>

      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
        style={{ flexDirection: 'row' }}
      >
        {days.map((day, index) => {
          const selected = isSelected(day);
          const todayFlag = isToday(day);

          return (
            <TouchableOpacity
              key={index}
              onPress={() => onDateChange(day)}
              activeOpacity={0.75}
              style={{ alignItems: 'center', width: 52 }}
            >
              {/* Day name */}
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: '600',
                  marginBottom: 6,
                  color: selected ? '#047857' : todayFlag ? '#059669' : '#94A3B8',
                  letterSpacing: 0.5,
                }}
              >
                {DAY_NAMES[day.getDay()]}
              </Text>

              {/* Date circle */}
              <View
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 22,
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: selected
                    ? '#059669'
                    : todayFlag
                    ? '#D1FAE5'
                    : '#F8FAFC',
                  borderWidth: selected ? 0 : todayFlag ? 1.5 : 1,
                  borderColor: selected ? 'transparent' : todayFlag ? '#6EE7B7' : '#E2E8F0',
                  shadowColor: selected ? '#059669' : 'transparent',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: selected ? 0.3 : 0,
                  shadowRadius: 6,
                  elevation: selected ? 4 : 0,
                }}
              >
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: selected ? '700' : todayFlag ? '600' : '500',
                    color: selected ? '#FFFFFF' : todayFlag ? '#047857' : '#64748B',
                  }}
                >
                  {day.getDate()}
                </Text>
              </View>

              {/* Today dot */}
              {todayFlag && !selected && (
                <View
                  style={{
                    width: 4,
                    height: 4,
                    borderRadius: 2,
                    backgroundColor: '#059669',
                    marginTop: 4,
                  }}
                />
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}
