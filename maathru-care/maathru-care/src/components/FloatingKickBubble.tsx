import React, { useRef, useState } from 'react';
import {
  View, Text, TouchableOpacity, Animated, PanResponder,
  Dimensions, StyleSheet,
} from 'react-native';
import { router, usePathname } from 'expo-router';
import { useKickSession } from '../context/KickSessionContext';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const BUBBLE_SIZE = 64;
const MINI_SIZE = 48;

export default function FloatingKickBubble() {
  const { session, recordKick } = useKickSession();
  const pathname = usePathname();

  // Don't show on the kick-counter screen itself (it has its own UI)
  // Don't show if no active session
  if (!session.isActive || pathname === '/kick-counter') return null;

  return <DraggableBubble session={session} onKick={recordKick} />;
}

function DraggableBubble({ session, onKick }: {
  session: { kickCount: number; elapsedSec: number; targetKicks: number };
  onKick: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const pan = useRef(new Animated.ValueXY({ x: SCREEN_W - BUBBLE_SIZE - 16, y: SCREEN_H * 0.65 })).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, g) => Math.abs(g.dx) > 5 || Math.abs(g.dy) > 5,
      onPanResponderGrant: () => {
        pan.setOffset({ x: (pan.x as any)._value, y: (pan.y as any)._value });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
      onPanResponderRelease: (_, g) => {
        pan.flattenOffset();
        // Snap to nearest edge
        const currentX = (pan.x as any)._value;
        const snapX = currentX < SCREEN_W / 2 ? 16 : SCREEN_W - (expanded ? 200 : BUBBLE_SIZE) - 16;
        Animated.spring(pan.x, { toValue: snapX, useNativeDriver: false, speed: 20 }).start();
        // Clamp Y
        const currentY = (pan.y as any)._value;
        const clampedY = Math.max(60, Math.min(currentY, SCREEN_H - 120));
        if (clampedY !== currentY) {
          Animated.spring(pan.y, { toValue: clampedY, useNativeDriver: false }).start();
        }
        // If didn't move much, treat as tap
        if (Math.abs(g.dx) < 5 && Math.abs(g.dy) < 5) {
          setExpanded(prev => !prev);
        }
      },
    })
  ).current;

  const handleKick = () => {
    onKick();
    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 1.3, useNativeDriver: true, speed: 50 }),
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 30 }),
    ]).start();
  };

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const progress = Math.min(session.kickCount / session.targetKicks, 1);

  return (
    <Animated.View
      style={[styles.container, { transform: pan.getTranslateTransform() }]}
      {...panResponder.panHandlers}
    >
      {expanded ? (
        /* ── Expanded Panel ── */
        <View style={styles.expandedPanel}>
          {/* Header */}
          <View style={styles.expandedHeader}>
            <Text style={styles.expandedTitle}>👶 Kicks</Text>
            <Text style={styles.timerText}>{formatTime(session.elapsedSec)}</Text>
          </View>

          {/* Count */}
          <Text style={styles.countText}>
            {session.kickCount} <Text style={styles.countTarget}>/ {session.targetKicks}</Text>
          </Text>

          {/* Progress bar */}
          <View style={styles.progressBg}>
            <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
          </View>

          {/* Kick button */}
          <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <TouchableOpacity onPress={handleKick} style={styles.kickBtn} activeOpacity={0.7}>
              <Text style={styles.kickBtnText}>👣 TAP</Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Go to full screen */}
          <TouchableOpacity onPress={() => router.push('/kick-counter')} style={styles.expandLink}>
            <Text style={styles.expandLinkText}>Open Full Screen →</Text>
          </TouchableOpacity>
        </View>
      ) : (
        /* ── Collapsed Bubble ── */
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <TouchableOpacity onPress={handleKick} style={styles.bubble} activeOpacity={0.7}>
            <Text style={styles.bubbleEmoji}>👣</Text>
            <View style={styles.badgeContainer}>
              <Text style={styles.badgeText}>{session.kickCount}</Text>
            </View>
          </TouchableOpacity>
        </Animated.View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    zIndex: 9999,
    elevation: 999,
  },
  // ── Collapsed Bubble ──
  bubble: {
    width: BUBBLE_SIZE,
    height: BUBBLE_SIZE,
    borderRadius: BUBBLE_SIZE / 2,
    backgroundColor: '#15803D',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#15803D',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 10,
  },
  bubbleEmoji: {
    fontSize: 26,
  },
  badgeContainer: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    borderRadius: 12,
    minWidth: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 5,
    borderWidth: 2,
    borderColor: '#fff',
  },
  badgeText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '800',
  },
  // ── Expanded Panel ──
  expandedPanel: {
    width: 190,
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 12,
    borderWidth: 1.5,
    borderColor: '#D1FAE5',
  },
  expandedHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  expandedTitle: {
    fontWeight: '700',
    color: '#15803D',
    fontSize: 14,
  },
  timerText: {
    fontFamily: 'monospace',
    color: '#64748B',
    fontSize: 12,
  },
  countText: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1E293B',
    textAlign: 'center',
    marginBottom: 6,
  },
  countTarget: {
    fontSize: 16,
    color: '#94A3B8',
    fontWeight: '600',
  },
  progressBg: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: 10,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#15803D',
    borderRadius: 3,
  },
  kickBtn: {
    backgroundColor: '#15803D',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    shadowColor: '#15803D',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  kickBtnText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 15,
  },
  expandLink: {
    marginTop: 8,
    alignItems: 'center',
  },
  expandLinkText: {
    color: '#15803D',
    fontSize: 11,
    fontWeight: '600',
  },
});
