import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  TextInput,
  Platform,
  ScrollView,
} from 'react-native';
import { Calendar, ChevronLeft, ChevronRight, X, Check, Clock } from 'lucide-react-native';

interface DatePickerModalProps {
  visible: boolean;
  value: Date;
  onConfirm: (date: Date) => void;
  onCancel: () => void;
  minimumDate?: Date;
  maximumDate?: Date;
  title?: string;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

const WEEKDAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export function DatePickerModal({
  visible,
  value,
  onConfirm,
  onCancel,
  minimumDate,
  maximumDate,
  title = 'Select Last Menstrual Period',
}: DatePickerModalProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(() => value || new Date());
  const [viewYear, setViewYear] = useState<number>(() => (value || new Date()).getFullYear());
  const [viewMonth, setViewMonth] = useState<number>(() => (value || new Date()).getMonth());
  const [textInputVal, setTextInputVal] = useState<string>('');

  const minDate = useMemo(() => {
    if (minimumDate) {
      const d = new Date(minimumDate);
      d.setHours(0, 0, 0, 0);
      return d;
    }
    return undefined;
  }, [minimumDate]);

  const maxDate = useMemo(() => {
    if (maximumDate) {
      const d = new Date(maximumDate);
      d.setHours(23, 59, 59, 999);
      return d;
    }
    return undefined;
  }, [maximumDate]);

  const formatDateYMD = (d: Date) => {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  };

  useEffect(() => {
    if (visible) {
      const initial = value instanceof Date && !isNaN(value.getTime()) ? value : new Date();
      setSelectedDate(initial);
      setViewYear(initial.getFullYear());
      setViewMonth(initial.getMonth());
      setTextInputVal(formatDateYMD(initial));
    }
  }, [visible, value]);

  // Calendar calculations
  const daysInMonth = useMemo(() => {
    return new Date(viewYear, viewMonth + 1, 0).getDate();
  }, [viewYear, viewMonth]);

  const firstDayWeekday = useMemo(() => {
    return new Date(viewYear, viewMonth, 1).getDay();
  }, [viewYear, viewMonth]);

  const canGoPrev = useMemo(() => {
    if (!minDate) return true;
    const prevMonthEnd = new Date(viewYear, viewMonth, 0, 23, 59, 59);
    return prevMonthEnd >= minDate;
  }, [minDate, viewYear, viewMonth]);

  const canGoNext = useMemo(() => {
    if (!maxDate) return true;
    const nextMonthStart = new Date(viewYear, viewMonth + 1, 1, 0, 0, 0);
    return nextMonthStart <= maxDate;
  }, [maxDate, viewYear, viewMonth]);

  const handlePrevMonth = () => {
    if (!canGoPrev) return;
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (!canGoNext) return;
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleSelectDay = (day: number) => {
    const newDate = new Date(viewYear, viewMonth, day);
    if (minDate && newDate < minDate) return;
    if (maxDate && newDate > maxDate) return;
    setSelectedDate(newDate);
    setTextInputVal(formatDateYMD(newDate));
  };

  const handleManualDateChange = (txt: string) => {
    setTextInputVal(txt);
    if (/^\d{4}-\d{2}-\d{2}$/.test(txt)) {
      const [y, m, d] = txt.split('-').map(Number);
      const parsed = new Date(y, m - 1, d);
      if (
        parsed.getFullYear() === y &&
        parsed.getMonth() === m - 1 &&
        parsed.getDate() === d
      ) {
        if ((!minDate || parsed >= minDate) && (!maxDate || parsed <= maxDate)) {
          setSelectedDate(parsed);
          setViewYear(y);
          setViewMonth(m - 1);
        }
      }
    }
  };

  const applyPresetWeeksAgo = (weeks: number) => {
    const target = new Date(Date.now() - weeks * 7 * 24 * 60 * 60 * 1000);
    if (minDate && target < minDate) return;
    if (maxDate && target > maxDate) return;
    setSelectedDate(target);
    setViewYear(target.getFullYear());
    setViewMonth(target.getMonth());
    setTextInputVal(formatDateYMD(target));
  };

  // Gestational age calculation
  const gestationalWeeks = useMemo(() => {
    if (!selectedDate) return null;
    const diffMs = Date.now() - selectedDate.getTime();
    if (diffMs < 0) return null;
    const weeks = Math.floor(diffMs / (1000 * 60 * 60 * 24 * 7));
    return weeks >= 0 && weeks <= 42 ? weeks : null;
  }, [selectedDate]);

  // Available year pills for quick switching (covers minDate to maxDate)
  const currentYear = new Date().getFullYear();
  const yearOptions = [currentYear - 1, currentYear];

  const today = new Date();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onCancel}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: 'rgba(15, 23, 42, 0.45)',
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 16,
          paddingVertical: 24,
        }}
      >
        <View
          style={{
            backgroundColor: '#FFFFFF',
            borderRadius: 24,
            width: '100%',
            maxWidth: 390,
            padding: 20,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 10 },
            shadowOpacity: 0.15,
            shadowRadius: 25,
            elevation: 16,
            borderWidth: 1,
            borderColor: '#E2E8F0',
          }}
        >
          {/* Header */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 8 }}>
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: '#DCFCE7',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginRight: 10,
                }}
              >
                <Calendar size={18} color="#15803D" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: '#0F172A' }}>
                  {title}
                </Text>
                <Text style={{ fontSize: 11, color: '#64748B' }}>
                  Select or enter the first day of your LMP
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={onCancel}
              style={{ padding: 6, borderRadius: 12, backgroundColor: '#F1F5F9' }}
              activeOpacity={0.7}
            >
              <X size={18} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Selected Date Summary & Gestational age banner */}
          <View
            style={{
              backgroundColor: '#F0FDF4',
              borderRadius: 12,
              paddingVertical: 8,
              paddingHorizontal: 12,
              marginBottom: 14,
              borderWidth: 1,
              borderColor: '#BBF7D0',
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <View>
              <Text style={{ fontSize: 10, color: '#166534', fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 }}>
                Selected Date
              </Text>
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#14532D', marginTop: 1 }}>
                {selectedDate.toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </Text>
            </View>
            {gestationalWeeks !== null && (
              <View
                style={{
                  backgroundColor: '#15803D',
                  paddingHorizontal: 8,
                  paddingVertical: 4,
                  borderRadius: 8,
                }}
              >
                <Text style={{ fontSize: 11, fontWeight: '700', color: '#FFFFFF' }}>
                  ~{gestationalWeeks} wks along
                </Text>
              </View>
            )}
          </View>

          {/* Quick Preset Pills */}
          <View style={{ flexDirection: 'row', gap: 6, marginBottom: 14 }}>
            {[
              { label: '4w ago', weeks: 4 },
              { label: '8w ago', weeks: 8 },
              { label: '12w ago', weeks: 12 },
              { label: '20w ago', weeks: 20 },
              { label: 'Today', weeks: 0 },
            ].map((preset) => (
              <TouchableOpacity
                key={preset.label}
                onPress={() => applyPresetWeeksAgo(preset.weeks)}
                style={{
                  flex: 1,
                  paddingVertical: 5,
                  borderRadius: 8,
                  backgroundColor: '#F8FAFC',
                  borderWidth: 1,
                  borderColor: '#E2E8F0',
                  alignItems: 'center',
                }}
                activeOpacity={0.7}
              >
                <Text style={{ fontSize: 11, fontWeight: '600', color: '#475569' }}>
                  {preset.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Month & Year Navigation */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: 10,
              paddingHorizontal: 4,
            }}
          >
            <TouchableOpacity
              onPress={handlePrevMonth}
              disabled={!canGoPrev}
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: canGoPrev ? '#F1F5F9' : '#F8FAFC',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: canGoPrev ? 1 : 0.4,
              }}
              activeOpacity={0.7}
            >
              <ChevronLeft size={18} color={canGoPrev ? '#1E293B' : '#94A3B8'} />
            </TouchableOpacity>

            <View style={{ alignItems: 'center' }}>
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#0F172A' }}>
                {MONTH_NAMES[viewMonth]} {viewYear}
              </Text>
            </View>

            <TouchableOpacity
              onPress={handleNextMonth}
              disabled={!canGoNext}
              style={{
                width: 32,
                height: 32,
                borderRadius: 16,
                backgroundColor: canGoNext ? '#F1F5F9' : '#F8FAFC',
                alignItems: 'center',
                justifyContent: 'center',
                opacity: canGoNext ? 1 : 0.4,
              }}
              activeOpacity={0.7}
            >
              <ChevronRight size={18} color={canGoNext ? '#1E293B' : '#94A3B8'} />
            </TouchableOpacity>
          </View>

          {/* Fast Year Switcher */}
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 12 }}>
            {yearOptions.map((yr) => (
              <TouchableOpacity
                key={yr}
                onPress={() => setViewYear(yr)}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 3,
                  borderRadius: 12,
                  backgroundColor: viewYear === yr ? '#15803D' : '#F1F5F9',
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '700',
                    color: viewYear === yr ? '#FFFFFF' : '#64748B',
                  }}
                >
                  {yr}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Weekday Labels */}
          <View style={{ flexDirection: 'row', marginBottom: 6 }}>
            {WEEKDAY_NAMES.map((w, idx) => (
              <View key={idx} style={{ flex: 1, alignItems: 'center' }}>
                <Text
                  style={{
                    fontSize: 11,
                    fontWeight: '600',
                    color: idx === 0 || idx === 6 ? '#94A3B8' : '#64748B',
                  }}
                >
                  {w}
                </Text>
              </View>
            ))}
          </View>

          {/* Calendar Days Grid */}
          <View style={{ marginBottom: 14 }}>
            {Array.from({ length: Math.ceil((firstDayWeekday + daysInMonth) / 7) }).map(
              (_, rowIndex) => (
                <View key={rowIndex} style={{ flexDirection: 'row', marginVertical: 2 }}>
                  {Array.from({ length: 7 }).map((__, colIndex) => {
                    const dayNumber = rowIndex * 7 + colIndex - firstDayWeekday + 1;
                    if (dayNumber < 1 || dayNumber > daysInMonth) {
                      return <View key={colIndex} style={{ flex: 1, height: 34 }} />;
                    }

                    const cellDateStart = new Date(viewYear, viewMonth, dayNumber, 0, 0, 0);
                    const cellDateEnd = new Date(viewYear, viewMonth, dayNumber, 23, 59, 59);
                    const isBeforeMin = minDate ? cellDateEnd < minDate : false;
                    const isAfterMax = maxDate ? cellDateStart > maxDate : false;
                    const isDisabled = isBeforeMin || isAfterMax;

                    const isSelected =
                      selectedDate &&
                      selectedDate.getFullYear() === viewYear &&
                      selectedDate.getMonth() === viewMonth &&
                      selectedDate.getDate() === dayNumber;

                    const isCurrentDay =
                      today.getFullYear() === viewYear &&
                      today.getMonth() === viewMonth &&
                      today.getDate() === dayNumber;

                    return (
                      <TouchableOpacity
                        key={colIndex}
                        onPress={() => handleSelectDay(dayNumber)}
                        disabled={isDisabled}
                        activeOpacity={0.7}
                        style={{
                          flex: 1,
                          height: 34,
                          alignItems: 'center',
                          justifyContent: 'center',
                          borderRadius: 17,
                          backgroundColor: isSelected ? '#15803D' : 'transparent',
                          borderWidth: isCurrentDay && !isSelected ? 1 : 0,
                          borderColor: '#15803D',
                          opacity: isDisabled ? 0.25 : 1,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 12,
                            fontWeight: isSelected ? '700' : isCurrentDay ? '600' : '500',
                            color: isSelected
                              ? '#FFFFFF'
                              : isCurrentDay
                              ? '#15803D'
                              : '#1E293B',
                          }}
                        >
                          {dayNumber}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )
            )}
          </View>

          {/* Manual Date Input */}
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              backgroundColor: '#F8FAFC',
              borderRadius: 12,
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderWidth: 1,
              borderColor: '#E2E8F0',
              marginBottom: 16,
            }}
          >
            <Clock size={14} color="#64748B" style={{ marginRight: 8 }} />
            <Text style={{ fontSize: 11, color: '#64748B', marginRight: 6 }}>
              Date (YYYY-MM-DD):
            </Text>
            <TextInput
              value={textInputVal}
              onChangeText={handleManualDateChange}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="#94A3B8"
              style={{
                flex: 1,
                fontSize: 12,
                color: '#0F172A',
                fontWeight: '600',
                paddingVertical: 2,
              }}
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Action Buttons */}
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity
              onPress={onCancel}
              style={{
                flex: 1,
                backgroundColor: '#F1F5F9',
                paddingVertical: 12,
                borderRadius: 14,
                alignItems: 'center',
              }}
              activeOpacity={0.7}
            >
              <Text style={{ fontSize: 13, fontWeight: '600', color: '#475569' }}>
                Cancel
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => onConfirm(selectedDate)}
              style={{
                flex: 1.5,
                backgroundColor: '#15803D',
                paddingVertical: 12,
                borderRadius: 14,
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'center',
                gap: 6,
              }}
              activeOpacity={0.8}
            >
              <Check size={16} color="#FFFFFF" />
              <Text style={{ fontSize: 13, fontWeight: '700', color: '#FFFFFF' }}>
                Confirm Date
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
