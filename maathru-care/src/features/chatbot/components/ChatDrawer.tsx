import { ReactNode, useEffect, useRef, useState } from "react";
import { ActivityIndicator, Animated, Easing, Platform, ScrollView, StyleSheet, Text, View, useWindowDimensions } from "react-native";
import { PressableBox as Pressable } from "./PressableBox";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path, Rect } from "react-native-svg";
import { colors, fonts, spacing } from "../theme";
import { ConversationSummary, listConversations } from "../api/client";

const RECENT_LIMIT = 5;
const faint = "#A8999E";

type Props = {
  open: boolean;
  onClose: () => void;
  onNewChat: () => void;
  onOpenChat: (id: string) => void;
  activeId: string | null;
  /** Rendered pinned to the bottom of the panel (the sensing toggles). */
  footer: ReactNode;
};

// Line icons (24x24 strokes), matching the reference sidebar.
// The divider sits on the left, the side the panel opens from.
export function SidebarIcon({ color, size = 22 }: { color: string; size?: number }) {
  return <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><Rect x={4} y={4} width={16} height={16} rx={2} /><Path d="M9 4v16" /></Svg>;
}
function PenIcon({ color }: { color: string }) {
  return <Svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"><Path d="M12 20h8" /><Path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" /><Path d="M14 6l3 3" /></Svg>;
}
function RecentIcon({ color }: { color: string }) {
  return <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round"><Path d="M5 5h14v14H5z" /><Path d="M9 9h6M9 13h4" /></Svg>;
}
function BubbleIcon({ color }: { color: string }) {
  return <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round"><Path d="M5 6.5A2.5 2.5 0 0 1 7.5 4h9A2.5 2.5 0 0 1 19 6.5v7a2.5 2.5 0 0 1-2.5 2.5H11l-4.5 3v-3.4a2.5 2.5 0 0 1-1.5-2.3z" /></Svg>;
}

function ChevronIcon({ up }: { up: boolean }) {
  return <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={colors.deepPink} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><Path d={up ? "m6 15 6-6 6 6" : "m6 9 6 6 6-6"} /></Svg>;
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (d.toDateString() === new Date().toDateString()) return d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// Left side panel: slides in from the left over a blurred backdrop; tapping the backdrop closes it.
// Only the Recent list scrolls; the page behind is locked while the panel is open.
// Rendered as a layer inside the chat screen (not a window-level Modal), so it always
// covers exactly the chat screen, top to bottom.
export function ChatDrawer({ open, onClose, onNewChat, onOpenChat, activeId, footer }: Props) {
  const { width } = useWindowDimensions();
  // Keep the panel's top and bottom clear of the phone's status and navigation bars (0 on web).
  const insets = useSafeAreaInsets();
  const panelWidth = Math.round(width * 0.65);
  const progress = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(open);
  const [chats, setChats] = useState<ConversationSummary[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      setShowAll(false);
      setFailed(false);
      listConversations().then(setChats).catch(() => setFailed(true));
      Animated.timing(progress, { toValue: 1, duration: 260, easing: Easing.out(Easing.cubic), useNativeDriver: true }).start();
    } else {
      Animated.timing(progress, { toValue: 0, duration: 220, easing: Easing.in(Easing.cubic), useNativeDriver: true }).start(({ finished }) => {
        if (finished) setMounted(false);
      });
    }
  }, [open]);

  useEffect(() => {
    if (Platform.OS !== "web" || !mounted) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [mounted]);

  const translateX = progress.interpolate({ inputRange: [0, 1], outputRange: [-panelWidth, 0] });
  const visibleChats = chats ? (showAll ? chats : chats.slice(0, RECENT_LIMIT)) : [];

  if (!mounted) return null;
  return <View style={styles.root}>
      <Animated.View style={[StyleSheet.absoluteFill, { opacity: progress }]}>
        <BlurView intensity={28} tint="light" style={StyleSheet.absoluteFill} />
        <View style={styles.scrim} />
        <Pressable accessibilityRole="button" accessibilityLabel="Close chats panel" onPress={onClose} style={StyleSheet.absoluteFill} />
      </Animated.View>
      <Animated.View accessibilityViewIsModal style={[styles.panel, { width: panelWidth, paddingTop: 12 + insets.top, paddingBottom: spacing.sm + insets.bottom, transform: [{ translateX }] }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Close sidebar" onPress={onClose} style={({ pressed }) => [styles.navItem, pressed && styles.navItemPressed]}>
          {({ pressed }) => <><SidebarIcon color={pressed ? colors.deepPink : colors.muted} /><Text style={[styles.navText, pressed && styles.navTextPressed]}>Sidebar</Text></>}
        </Pressable>
        <View style={styles.divider} />
        <Pressable accessibilityRole="button" accessibilityLabel="New chat" onPress={onNewChat} style={({ pressed }) => [styles.navItem, pressed && styles.navItemPressed]}>
          <PenIcon color={colors.deepPink} /><Text style={[styles.navText, styles.navTextPressed]}>New chat</Text>
        </Pressable>
        <View style={styles.divider} />
        <View style={styles.label}><RecentIcon color={colors.deepPink} /><Text style={styles.labelText}>RECENT</Text></View>
        <ScrollView style={styles.list} contentContainerStyle={{ paddingBottom: spacing.sm }}>
          {chats === null && !failed && <ActivityIndicator color={colors.deepPink} style={{ marginTop: spacing.sm }} />}
          {failed && <Text style={styles.note}>Couldn't load your chats.</Text>}
          {chats !== null && chats.length === 0 && <Text style={styles.note}>No past chats yet.</Text>}
          {visibleChats.map(chat => {
            const active = chat.id === activeId;
            return <Pressable key={chat.id} accessibilityRole="button" accessibilityLabel={chat.title} onPress={() => onOpenChat(chat.id)} style={({ pressed }) => [styles.chat, (active || pressed) && styles.navItemPressed]}>
              <View style={{ marginTop: 2 }}><BubbleIcon color={colors.deepPink} /></View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={[styles.chatTitle, active && styles.navTextPressed]} numberOfLines={1}>{chat.title}</Text>
                <Text style={styles.chatWhen} numberOfLines={1}>{formatWhen(chat.last_message_at)}</Text>
              </View>
            </Pressable>;
          })}
          {chats !== null && chats.length > RECENT_LIMIT && (
            <Pressable accessibilityRole="button" onPress={() => setShowAll(v => !v)} style={styles.more}>
              <Text style={styles.moreText}>{showAll ? "Show less" : "Show more"}</Text><ChevronIcon up={showAll} />
            </Pressable>
          )}
        </ScrollView>
        <View style={styles.footerDivider} />
        <View style={styles.footer}>{footer}</View>
    </Animated.View>
  </View>;
}

const styles = StyleSheet.create({
  root: { ...StyleSheet.absoluteFill, zIndex: 50, overflow: "hidden" },
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(48,39,42,.16)" },
  panel: { position: "absolute", left: 0, top: 0, bottom: 0, backgroundColor: colors.card, paddingTop: 12, paddingHorizontal: 8, paddingBottom: spacing.sm, shadowColor: colors.ink, shadowOpacity: 0.18, shadowRadius: 24, elevation: 8, boxShadow: "4px 0 24px rgba(48,39,42,.14)" as any },
  navItem: { flexDirection: "row", alignItems: "center", gap: 11, minHeight: 42, paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, outlineStyle: "none" as any },
  navItemPressed: { backgroundColor: colors.veryLightPink },
  navText: { color: colors.muted, fontFamily: fonts.bold, fontSize: 13 },
  navTextPressed: { color: colors.deepPink },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 14, marginHorizontal: 4 },
  label: { flexDirection: "row", alignItems: "center", gap: 7, marginTop: 8, marginBottom: 14, marginHorizontal: 10 },
  labelText: { color: faint, fontFamily: fonts.extraBold, fontSize: 11, letterSpacing: 0.9 },
  list: { flex: 1, overscrollBehavior: "contain" } as any,
  chat: { flexDirection: "row", alignItems: "flex-start", gap: 7, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, outlineStyle: "none" as any },
  chatTitle: { color: colors.muted, fontFamily: fonts.bold, fontSize: 13, lineHeight: 15 },
  chatWhen: { color: faint, fontFamily: fonts.regular, fontSize: 11, marginTop: 1 },
  note: { color: faint, fontFamily: fonts.regular, fontSize: 13, paddingHorizontal: 10 },
  more: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 8, marginHorizontal: 10, paddingVertical: 4, alignSelf: "flex-start" },
  moreText: { color: colors.deepPink, fontFamily: fonts.extraBold, fontSize: 12 },
  footerDivider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.xs, marginHorizontal: 4 },
  footer: { marginHorizontal: -8 }
});
