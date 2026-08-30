/**
 * GDMFoodWarningModal.tsx
 * 
 * A premium modal that warns users about foods that may conflict with their
 * GDM risk profile or today's already-consumed nutrition totals.
 * The user can still choose to add the food or skip it.
 */

import React, { useEffect, useRef } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Animated,
  StyleSheet,
} from 'react-native';
import { AlertTriangle, ShieldAlert, Info, ChevronRight, X } from 'lucide-react-native';
import { GDMRiskResponse } from '@/types/gdm';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface FoodWarning {
  severity: 'high' | 'medium' | 'info';
  message: string;
}

interface GDMFoodWarningModalProps {
  visible: boolean;
  riskCategory: GDMRiskResponse['riskCategory'] | null;
  foodNames: string[];        // names of foods being added
  warnings: FoodWarning[];
  onAddAnyway: () => void;
  onSkip: () => void;
  onCheckRisk: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const RISK_COLORS = {
  'High Risk':     { bg: '#FEF2F2', badge: '#FEE2E2', text: '#DC2626', border: '#FECACA' },
  'Moderate Risk': { bg: '#FFFBEB', badge: '#FEF3C7', text: '#D97706', border: '#FDE68A' },
  'Low Risk':      { bg: '#ECFDF5', badge: '#D1FAE5', text: '#059669', border: '#A7F3D0' },
  'Unknown':       { bg: '#F1F5F9', badge: '#E2E8F0', text: '#475569', border: '#CBD5E1' },
};

const SEV_CONFIG = {
  high:   { icon: ShieldAlert, color: '#DC2626', bg: '#FEF2F2' },
  medium: { icon: AlertTriangle, color: '#D97706', bg: '#FFFBEB' },
  info:   { icon: Info,          color: '#3B82F6', bg: '#EFF6FF' },
};

// ─── Component ────────────────────────────────────────────────────────────────

export function GDMFoodWarningModal({
  visible,
  riskCategory,
  foodNames,
  warnings,
  onAddAnyway,
  onSkip,
  onCheckRisk,
}: GDMFoodWarningModalProps) {
  const slideAnim = useRef(new Animated.Value(60)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 0, duration: 320, useNativeDriver: true }),
        Animated.timing(opacityAnim, { toValue: 1, duration: 280, useNativeDriver: true }),
      ]).start();
    } else {
      slideAnim.setValue(60);
      opacityAnim.setValue(0);
    }
  }, [visible]);

  const hasHighSeverity = warnings.some((w) => w.severity === 'high');
  const riskColors = riskCategory ? RISK_COLORS[riskCategory] : RISK_COLORS['Unknown'];

  const foodLabel =
    foodNames.length === 1
      ? foodNames[0]
      : `${foodNames.slice(0, -1).join(', ')} & ${foodNames[foodNames.length - 1]}`;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onSkip}
    >
      <Animated.View style={[s.backdrop, { opacity: opacityAnim }]}>
        <Animated.View
          style={[s.sheet, { transform: [{ translateY: slideAnim }] }]}
        >
          {/* ── Header ─────────────────────────────────────── */}
          <View style={s.headerRow}>
            <View style={[s.warningIconWrap, { backgroundColor: hasHighSeverity ? '#FEF2F2' : '#FFFBEB' }]}>
              <AlertTriangle
                size={26}
                color={hasHighSeverity ? '#DC2626' : '#D97706'}
              />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={s.headerTitle}>Nutrition Advisory</Text>
              <Text style={s.headerSub} numberOfLines={2}>
                Before adding <Text style={{ fontWeight: '700' }}>{foodLabel}</Text>
              </Text>
            </View>
            <TouchableOpacity onPress={onSkip} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
              <X size={20} color="#94A3B8" />
            </TouchableOpacity>
          </View>

          {/* ── GDM Badge ───────────────────────────────────── */}
          <View style={[s.riskBadge, { backgroundColor: riskColors.badge, borderColor: riskColors.border }]}>
            {riskCategory ? (
              <ShieldAlert size={14} color={riskColors.text} style={{ marginRight: 6 }} />
            ) : (
              <Info size={14} color={riskColors.text} style={{ marginRight: 6 }} />
            )}
            <Text style={[s.riskBadgeText, { color: riskColors.text }]}>
              GDM Status: {riskCategory || 'Not Assessed'}
            </Text>
          </View>

          {/* ── Warning List ─────────────────────────────────── */}
          <ScrollView style={s.warningList} showsVerticalScrollIndicator={false}>
            {warnings.map((w, i) => {
              const cfg = SEV_CONFIG[w.severity];
              const IconComp = cfg.icon;
              return (
                <View key={i} style={[s.warningItem, { backgroundColor: cfg.bg }]}>
                  <IconComp size={18} color={cfg.color} style={{ marginRight: 10, marginTop: 1, flexShrink: 0 }} />
                  <Text style={[s.warningText, { color: cfg.color === '#DC2626' ? '#7F1D1D' : cfg.color === '#D97706' ? '#78350F' : '#1D4ED8' }]}>
                    {w.message}
                  </Text>
                </View>
              );
            })}
          </ScrollView>

          {/* ── Footer Note ──────────────────────────────────── */}
          <Text style={s.footerNote}>
            {!riskCategory 
              ? "We noticed some high nutrients. Check your GDM risk for personalized advice!" 
              : "This is a nutritional advisory based on your health profile. The final decision is yours."}
          </Text>

          {/* ── Action Buttons ───────────────────────────────── */}
          <View style={s.btnRow}>
            <TouchableOpacity onPress={onAddAnyway} style={s.skipBtn} activeOpacity={0.8}>
              <Text style={s.skipBtnText}>Add Anyway</Text>
            </TouchableOpacity>

            {!riskCategory ? (
              <TouchableOpacity
                onPress={onCheckRisk}
                style={[s.addBtn, { backgroundColor: '#2563EB' }]}
                activeOpacity={0.85}
              >
                <Text style={s.addBtnText}>Check GDM Risk</Text>
                <ChevronRight size={16} color="#FFFFFF" strokeWidth={2.5} />
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={onSkip}
                style={[s.addBtn, hasHighSeverity && { backgroundColor: '#DC2626' }]}
                activeOpacity={0.85}
              >
                <Text style={s.addBtnText}>Skip This Food</Text>
              </TouchableOpacity>
            )}
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.55)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 32,
    maxHeight: '80%',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  warningIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  headerSub: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
  },
  riskBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 16,
  },
  riskBadgeText: {
    fontSize: 13,
    fontWeight: '600',
  },
  warningList: {
    maxHeight: 220,
    marginBottom: 12,
  },
  warningItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '500',
  },
  footerNote: {
    fontSize: 11,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 16,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  skipBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
  },
  skipBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#475569',
  },
  addBtn: {
    flex: 1,
    backgroundColor: '#047857',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    shadowColor: '#047857',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 5,
  },
  addBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    marginRight: 4,
  },
});
