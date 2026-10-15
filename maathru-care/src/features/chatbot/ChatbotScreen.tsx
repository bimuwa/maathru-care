import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, Animated, BackHandler, findNodeHandle, KeyboardAvoidingView, Modal, PanResponder, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { BlurView } from "expo-blur";
import { useFonts } from "expo-font";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Nunito_400Regular, Nunito_600SemiBold, Nunito_700Bold, Nunito_800ExtraBold } from "@expo-google-fonts/nunito";
import { NotoSansSinhala_400Regular, NotoSansSinhala_700Bold } from "@expo-google-fonts/noto-sans-sinhala";
import { Screen } from "./components/Screen";
import { MessageBubble } from "./components/MessageBubble";
import { DevPanel } from "./components/DevPanel";
import { CameraPreview } from "./components/CameraPreview";
import { useWebCamera } from "./vision/useWebCamera";
import { preloadBlazeFace } from "./vision/useBlazeFace";
import { colors, fonts, spacing, type } from "./theme";
import { i18n } from "./i18n";
import { useAppStore } from "./store";
import { config } from "./config";
import { createChatApi, openConversation } from "./api/client";
import { ChatDrawer } from "./components/ChatDrawer";
import { MoodInfoModal } from "./components/MoodInfoModal";
import { loadCameraPreference, saveCameraPreference } from "./cameraPreference";
import { useAuth } from "../../context/AuthContext";
import { grantCameraConsent, revokeCamera, setCameraActive, analyseMood } from "./api/sessionApi";
import { sessionId } from "./session";
import { getChatbotAccessToken, subscribeChatbotToken } from "./chatbotAuth";
import { showAlert } from "../../lib/alert";
// Fonts are loaded here (not in a root layout) so the Nunito/Sinhala setup stays scoped to the chatbot.
export function ChatbotScreen() {
  const [loaded] = useFonts({ Nunito_400Regular, Nunito_600SemiBold, Nunito_700Bold, Nunito_800ExtraBold, NotoSansSinhala_400Regular, NotoSansSinhala_700Bold });
  useEffect(() => {
    let cancelled = false;
    getChatbotAccessToken().then(token => { if (!cancelled) useAppStore.getState().setAccessToken(token); }).catch(() => {});
    return () => { cancelled = true; };
  }, []);
  useEffect(() => subscribeChatbotToken(), []);
  if (!loaded) return <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.paper }}><ActivityIndicator color={colors.deepPink} /></View>;
  return <Chat />;
}
function Chat() {
  const userId = useAuth().user?.id ?? null;
  const { language, messages, addMessage, newChat, cameraEnabled, cameraPaused, sentimentEnabled, setSentimentEnabled, consentSeen, setConsentSeen, consentAccepted, conversationId, authenticated, authError } = useAppStore();
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState(false);
  const [focused, setFocused] = useState(false);
  const [composerW, setComposerW] = useState(320);
  const composerRef = useRef<any>(null);
  const [autoH, setAutoH] = useState(0);
  const [dynamicMode, setDynamicMode] = useState(false);
  const [showDev, setShowDev] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const lastReadings = useAppStore(s => s.lastReadings);
  const [showConsent, setShowConsent] = useState(false);
  // The privacy notice shows only the first time a user opens the chat. After that the saved
  // choice is applied: camera back on if they agreed and left it on, otherwise it stays off.
  useEffect(() => {
    // Wait for the chatbot sign-in: a consent call sent before the token exists gets a 401.
    if (!userId || !authenticated) return;
    let cancelled = false;
    loadCameraPreference(userId).then(pref => {
      if (cancelled) return;
      const s = useAppStore.getState();
      if (!pref) { if (!s.consentSeen) setShowConsent(true); return; }
      s.setConsentSeen(true);
      if (pref.accepted) s.setConsentAccepted(true);
      if (pref.accepted && pref.on && !s.cameraEnabled) enableCamera();
    });
    return () => { cancelled = true; };
  }, [userId, authenticated]);
  const scrollRef = useRef<ScrollView>(null);
  const api = useMemo(() => createChatApi(() => useAppStore.getState().scenario), []);
  // When camera sensing is enabled, actually acquire the browser webcam on web (permission prompt +
  // in-use indicator). Detection runs in the background from here; the panel is just a viewport.
  const camera = useWebCamera(cameraEnabled);
  // If the webcam can't start (blocked, or busy in another app or tab), say so and turn the
  // camera switch back off instead of leaving it "on" with nothing captured. The saved
  // preference is left alone, so the camera is tried again next time.
  useEffect(() => {
    if (camera.state !== "denied" && camera.state !== "unavailable") return;
    revokeCamera().catch(() => {});
    useAppStore.getState().setCamera(false);
    if (!useAppStore.getState().sentimentEnabled) useAppStore.getState().setSentimentEnabled(true);
    showAlert("Camera couldn't start", "Your camera may be blocked or in use by another app or browser tab. Close it there and turn Camera on again.");
  }, [camera.state]);
  useEffect(() => { if (cameraEnabled) preloadBlazeFace(); }, [cameraEnabled]);
  // Web: the chat screen never scrolls as a whole -- only the message list does. Lock the document
  // while the chat is open (the page is also pinned to the window via styles.pageWeb).
  useEffect(() => {
    if (Platform.OS !== "web") return;
    const html = document.documentElement, body = document.body;
    const prev = [html.style.overflow, body.style.overflow];
    html.style.overflow = "hidden"; body.style.overflow = "hidden";
    window.scrollTo(0, 0);
    return () => { html.style.overflow = prev[0]; body.style.overflow = prev[1]; };
  }, []);
  // Back to Home: a right swipe from the left edge (iOS uses the native stack gesture), and the
  // Android back button. With no history (chat opened directly) it goes to Home instead.
  const router = useRouter();
  const goBackRef = useRef(() => {});
  goBackRef.current = () => { if (router.canGoBack()) router.back(); else router.replace("/(mother)/home"); };
  const edgeSwipe = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: (_, g) => g.dx > 8 && Math.abs(g.dx) > Math.abs(g.dy),
    onPanResponderTerminationRequest: () => false,
    onPanResponderRelease: (_, g) => { if (g.dx > 60 && Math.abs(g.dy) < 80) goBackRef.current(); },
  })).current;
  useEffect(() => {
    if (Platform.OS !== "android") return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => { goBackRef.current(); return true; });
    return () => sub.remove();
  }, []);
  // Camera sensing only runs while the chat is open: tell the backend when it starts/stops with the screen.
  // The resume waits for the chatbot sign-in; sent earlier it got a 401 and left the backend
  // session paused, so every frame was rejected with 409.
  useEffect(() => {
    if (!authenticated) return;
    const s = useAppStore.getState();
    if (s.cameraEnabled && !s.cameraPaused) setCameraActive(true).catch(() => {});
  }, [authenticated]);
  useEffect(() => () => {
    const c = useAppStore.getState();
    if (c.cameraEnabled && !c.cameraPaused) setCameraActive(false).catch(() => {});
  }, []);
  // Raised = the resting mid-screen position shown before the user engages the composer.
  const raised = messages.length === 0 && !focused;
  // The idle line reserves room on the right for the send button; the moment the text fills it, the
  // field goes full width and grows one real line at a time (max 6), then scrolls. The text size
  // steps down 16 -> 15 once it reaches the 4th line. A rough char-width estimate decides the idle
  // flip and the compact step; the actual pixel height is measured from the DOM (below).
  const MAX_LINES = 6;
  const singleLineBox = 40;
  const estLines = draft.split("\n").reduce((n, s) => n + Math.max(1, Math.ceil(s.length / Math.max(6, Math.floor((composerW - 24) / 11)))), 0);
  // Idle -> dynamic is decided by real measurement (in the effect): stay on one centred line until
  // the text actually reaches the end of the idle area and wraps, then flip. Coming back to idle
  // only when the text is short enough to certainly fit one line again (no flip/unflip loop).
  const singleLine = draft.length === 0 || (!dynamicMode && !draft.includes("\n"));
  const lineHeight = 22;
  const rawLines = autoH ? Math.max(1, Math.round(autoH / lineHeight)) : estLines;
  // Use the length-based estimate (monotonic with input) for the size step so it can't oscillate
  // when the smaller font reflows the text back under the threshold.
  const compact = !singleLine && estLines >= 4;
  const multiline = !singleLine;
  const cap = MAX_LINES * lineHeight + 14;
  const lineCount = Math.min(MAX_LINES, Math.max(1, singleLine ? 1 : rawLines));
  const atCap = !singleLine && rawLines >= MAX_LINES;
  const textHeight = singleLine ? singleLineBox : Math.min(cap, Math.max(autoH, lineCount * lineHeight) + 8);
  const effectiveLineHeight = singleLine ? singleLineBox : lineHeight;
  // Measure the textarea's true wrapped content height from the DOM (RNW's onContentSizeChange is
  // unreliable here). Reach the <textarea> via the composer div, collapse it to nothing, read
  // scrollHeight, restore. Re-runs whenever the mode or line metrics change.
  useLayoutEffect(() => {
    const host: any = composerRef.current;
    const node: any = host && (host.querySelector ? host : findNodeHandle(host));
    const ta: HTMLTextAreaElement | undefined = node && node.querySelector ? node.querySelector("textarea") : undefined;
    if (!ta || typeof ta.scrollHeight !== "number") return;
    const pRows = ta.rows, pH = ta.style.height, pPR = ta.style.paddingRight, pLH = ta.style.lineHeight;
    ta.rows = 1;
    // content height in the current mode -> drives the growing box
    ta.style.height = "0px";
    const sh = ta.scrollHeight;
    // hypothetical idle height: narrow (send button reserved on the right) + idle line-box. This is
    // the single source of truth for the flip, measured the same way in either mode -> no loop.
    ta.style.paddingRight = "52px";
    ta.style.lineHeight = singleLineBox + "px";
    ta.style.height = "0px";
    const idleSh = ta.scrollHeight;
    ta.rows = pRows || 1; ta.style.height = pH; ta.style.paddingRight = pPR; ta.style.lineHeight = pLH;
    if (sh && Math.abs(sh - autoH) > 1) setAutoH(sh);
    const wrapsIdle = draft.includes("\n") || idleSh > singleLineBox + 14;
    if (wrapsIdle !== dynamicMode) setDynamicMode(wrapsIdle);
  }, [draft, composerW, dynamicMode, effectiveLineHeight, compact]);
  const fade = useRef(new Animated.Value(1)).current;
  const dock = useRef(new Animated.Value(1)).current;
  useEffect(() => { Animated.timing(fade, { toValue: focused ? 0 : 1, duration: 160, useNativeDriver: true }).start(); }, [focused]);
  useEffect(() => { Animated.timing(dock, { toValue: raised ? 1 : 0, duration: 240, useNativeDriver: true }).start(); }, [raised]);
  const translateY = dock.interpolate({ inputRange: [0, 1], outputRange: [0, -230] });
  i18n.locale = language;
  // Keep the newest message in view -- scrolls only the message list, never the page.
  useEffect(() => { scrollRef.current?.scrollToEnd({ animated: true }); }, [messages, sending, error]);
  async function send() {
    const text = draft.trim();
    if (!text || sending) return;
    setDraft(""); setError(false);
    addMessage({ id: `u-${Date.now()}`, role: "user", text });
    setSending(true);
    try {
      const response = await api.sendMessage({ session_id: sessionId, text, ui_language: language });
      addMessage({ id: response.message_id, role: "assistant", text: response.response, response });
    } catch { setError(true); } finally { setSending(false); }
    // Real fused mood analysis for the DevPanel. The per-modality camera/text
    // readings shown to users come from the chat reply (Info popup, owner
    // decision 2026-10-15). Fire-and-forget: it never affects the chat reply.
    if (useAppStore.getState().authenticated) {
      analyseMood(text)
        .then(result => useAppStore.getState().setLastMoodAnalysis(result))
        .catch(() => {});
    }
  }
  async function closeConsent(enable: boolean) {
    setConsentSeen(true); setShowConsent(false);
    if (enable) await enableCamera();
    else if (userId) saveCameraPreference(userId, { accepted: useAppStore.getState().consentAccepted, on: false });
  }
  async function enableCamera() {
    try {
      await grantCameraConsent();
      useAppStore.getState().setCamera(true);
      useAppStore.getState().setConsentAccepted(true);
      if (userId) saveCameraPreference(userId, { accepted: true, on: true });
    } catch {
      // consent request failed -- camera stays off, no silent fallback.
    }
  }
  async function toggleCamera() {
    if (cameraEnabled) {
      try { await revokeCamera(); } catch { /* best-effort; still turn preview off */ }
      useAppStore.getState().setCamera(false);
      if (userId) saveCameraPreference(userId, { accepted: true, on: false });
    } else {
      // The privacy notice is shown until the user accepts it once; after that the camera
      // switch re-grants directly (still recorded by the backend as a consent event).
      if (consentAccepted) await enableCamera();
      else setShowConsent(true);
    }
  }
  // Mood needs at least one signal: the camera or the sentiment (text) model.
  function alertOneOn() {
    showAlert("Keep one on", "Camera or Text mood must stay on so I can understand how you feel.");
  }
  function onCameraToggle() {
    if (cameraEnabled) {
      if (!sentimentEnabled) return alertOneOn();
      toggleCamera();
    } else {
      // Only the first time does this open the consent modal, which needs the panel closed.
      if (!consentAccepted) setShowDrawer(false);
      toggleCamera();
    }
  }
  function onSentimentToggle() {
    if (sentimentEnabled && !cameraEnabled) return alertOneOn();
    setSentimentEnabled(!sentimentEnabled);
  }
  function startNewChat() {
    newChat(); setError(false); setShowDrawer(false);
  }
  async function openPastChat(id: string) {
    try {
      await openConversation(id);
      setError(false); setShowDrawer(false);
    } catch {
      showAlert("Couldn't open that chat", "Please try again.");
    }
  }
  return <KeyboardAvoidingView style={[styles.page, Platform.OS === "web" && styles.pageWeb]} behavior={Platform.OS === "ios" ? "padding" : undefined}>
    <View style={styles.headerBar}>
      <View style={styles.headerActions}>
      <Pressable accessibilityRole="button" accessibilityLabel="Menu" onPress={() => setShowDrawer(true)} style={({ pressed }) => [styles.newChatButton, pressed && styles.newChatButtonPressed]}><View style={styles.menuIcon}><View style={styles.menuIconLong} /><View style={styles.menuIconShort} /></View></Pressable>
      </View>
    </View>
    {Platform.OS !== "ios" && !showDrawer && <View {...edgeSwipe.panHandlers} style={styles.edgeSwipe} />}
    <ChatDrawer
      open={showDrawer}
      onClose={() => setShowDrawer(false)}
      onNewChat={startNewChat}
      onOpenChat={openPastChat}
      activeId={conversationId}
      footer={<>
        <SettingRow icon="videocam-outline" label="Camera" value={cameraEnabled} onToggle={onCameraToggle} />
        {Platform.OS === "web" && <SettingRow icon="eye-outline" label="Preview" value={cameraEnabled && showPreview} disabled={!cameraEnabled} onToggle={() => setShowPreview(v => !v)} />}
        <SettingRow icon="chatbubble-ellipses-outline" label="Text mood" value={sentimentEnabled} onToggle={onSentimentToggle} />
        <View style={styles.footerDivider} />
        <Pressable accessibilityRole="button" accessibilityLabel="Info" onPress={() => { setShowDrawer(false); setShowInfo(true); }} style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}>
          <Ionicons name="information-circle-outline" size={20} color={colors.deepPink} />
          <Text style={styles.menuText}>Info</Text>
          <Ionicons name="chevron-forward" size={18} color={colors.deepPink} />
        </Pressable>
      </>}
    />
    <Screen scrollRef={scrollRef} onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}>
      {showDev && <DevPanel />}
      {messages.length === 0
        ? <Animated.View style={[styles.empty, { opacity: fade }]} pointerEvents="none"><Text style={styles.sun}>✦</Text><Text style={styles.emptyTitle}>{i18n.t("emptyTitle")}</Text><Text style={styles.emptyBody}>{i18n.t("emptyBody")}</Text></Animated.View>
        : <View style={styles.messages}>{messages.map(message => <MessageBubble key={message.id} message={message} />)}</View>}
      {sending && <View style={styles.loading}><ActivityIndicator color={colors.deepPink} /><Text style={styles.loadingText}>Listening…</Text></View>}
      {error && <View style={styles.error}><Text style={styles.errorText}>{i18n.t("error")}</Text><Pressable onPress={() => { setError(false); setDraft("Please try again"); }}><Text style={styles.retry}>{i18n.t("retry")}</Text></Pressable></View>}
      {config.apiMode !== "mock" && !authenticated && authError && <View style={styles.error}><Text style={styles.errorText}>{authError}</Text></View>}
    </Screen>
    <CameraPreview state={camera.state} stream={camera.stream} visible={showPreview && cameraEnabled} postingActive={cameraEnabled && !cameraPaused} />
    <Animated.View style={[styles.composerDock, { transform: [{ translateY }] }]}>
      <View ref={composerRef} style={[styles.composer, multiline && styles.composerMultiline]} onLayout={e => { const w = e.nativeEvent.layout.width; if (w > 150) setComposerW(w); }}>
        <TextInput
          multiline
          accessibilityLabel={i18n.t("placeholder")}
          value={draft}
          onChangeText={setDraft}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={i18n.t("placeholder")}
          placeholderTextColor="#B59EA7"
          blurOnSubmit={false}
          scrollEnabled={atCap}
          style={[styles.input, compact && styles.inputCompact, { height: textHeight, lineHeight: effectiveLineHeight, paddingRight: multiline ? 14 : 52 }]}
        />
        <Pressable accessibilityRole="button" accessibilityLabel={i18n.t("send")} onPress={send} style={styles.send}><Ionicons name="search" size={20} color={colors.white} /></Pressable>
      </View>
    </Animated.View>
    <MoodInfoModal visible={showInfo} onClose={() => setShowInfo(false)} readings={lastReadings} cameraEnabled={cameraEnabled} textMoodEnabled={sentimentEnabled} />
    <Modal transparent visible={showConsent} animationType="none" onRequestClose={() => closeConsent(false)}>
      <View style={styles.modalRoot}>
        <BlurView intensity={28} tint="light" style={StyleSheet.absoluteFill} />
        <View style={styles.scrim} />
        <View style={styles.modalCard}>
          <View style={styles.modalHeader}><View style={styles.modalIcon}><Text style={styles.modalIconText}>♡</Text></View><Text style={styles.modalTitle}>{i18n.t("consentTitle")}</Text></View>
          <Text style={styles.modalBody}>{i18n.t("consentBody")}</Text>
          <Pressable style={styles.modalPrimary} onPress={() => closeConsent(true)}><Text style={styles.modalPrimaryText}>{i18n.t("consentAccept")}</Text></Pressable>
          <Pressable style={styles.modalSecondary} onPress={() => closeConsent(false)}><Text style={styles.modalSecondaryText}>{i18n.t("keepOff")}</Text></Pressable>
        </View>
      </View>
    </Modal>
  </KeyboardAvoidingView>;
}
// One settings-menu row: icon, one-word name, on/off toggle. The whole row is the tap target.
function SettingRow({ icon, label, value, disabled, onToggle }: { icon: keyof typeof Ionicons.glyphMap; label: string; value: boolean; disabled?: boolean; onToggle: () => void }) {
  return <Pressable accessibilityRole="switch" accessibilityLabel={label} aria-checked={value} aria-disabled={!!disabled} disabled={disabled} onPress={onToggle} style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed, disabled && styles.menuItemDisabled]}>
    <Ionicons name={icon} size={20} color={colors.deepPink} />
    <Text style={styles.menuText}>{label}</Text>
    <View style={[styles.toggleTrack, value && styles.toggleTrackOn]}><View style={[styles.toggleKnob, value && styles.toggleKnobOn]} /></View>
  </Pressable>;
}
const styles = StyleSheet.create({
  page:{ flex: 1, backgroundColor: colors.paper },
  // Pinned to the visible window, so the screen (and the side panel inside it) always matches it.
  pageWeb: { position: "fixed", top: 0, left: 0, right: 0, bottom: 0 } as any,
  edgeSwipe: { position: "absolute", left: 0, top: 72, bottom: 0, width: 24, zIndex: 40, touchAction: "none" } as any,
  headerBar: { width: "100%", maxWidth: 860, alignSelf: "center", height: 72, paddingHorizontal: spacing.lg, flexDirection: "row", alignItems: "center", justifyContent: "space-between", backgroundColor: colors.card, shadowColor: colors.primary, shadowOpacity: 0.08, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 2, zIndex: 2, boxShadow: "0 3px 8px rgba(217,108,138,.08)" as any },
  newChatButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: "transparent", alignItems: "center", justifyContent: "center", borderWidth: 2.5, borderColor: colors.deepPink, outlineStyle: "none" as any },
  newChatButtonPressed: { backgroundColor: colors.lightPink },
  menuIcon: { width: 18, gap: 5, alignItems: "flex-start" },
  menuIconLong: { width: 18, height: 2.5, borderRadius: 2, backgroundColor: colors.deepPink },
  menuIconShort: { width: 11, height: 2.5, borderRadius: 2, backgroundColor: colors.deepPink },
  headerActions: { flexDirection: "row", alignItems: "center", gap: 10 },
  cameraButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.deepPink, alignItems: "center", justifyContent: "center", borderWidth: 0, shadowOpacity: 0, elevation: 0, outlineStyle: "none" as any },
  cameraButtonOff: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  menuItem: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 12, outlineStyle: "none" as any },
  menuItemPressed: { backgroundColor: colors.veryLightPink },
  menuItemDisabled: { opacity: 0.45 },
  footerDivider: { height: 1, backgroundColor: colors.border, marginVertical: 6, marginHorizontal: 12 },
  menuText: { flex: 1, color: colors.ink, fontFamily: fonts.semiBold, fontSize: 15 },
  toggleTrack: { width: 42, height: 24, borderRadius: 12, backgroundColor: colors.border, padding: 3, justifyContent: "center" },
  toggleTrackOn: { backgroundColor: colors.primary },
  toggleKnob: { width: 18, height: 18, borderRadius: 9, backgroundColor: colors.white, boxShadow: "0 1px 3px rgba(48,39,42,.25)" as any },
  toggleKnobOn: { alignSelf: "flex-end" },
  empty: { alignItems: "center", paddingVertical: 70, paddingHorizontal: spacing.lg },
  sun: { color: colors.deepPink, fontSize: 34, marginBottom: 16 },
  emptyTitle: { color: colors.ink, fontFamily: fonts.extraBold, fontSize: 22, textAlign: "center" },
  emptyBody: { color: colors.muted, fontFamily: fonts.regular, fontSize: type.body, textAlign: "center", lineHeight: 25, marginTop: 10, maxWidth: 360 },
  messages: { marginTop: spacing.lg },
  loading: { flexDirection: "row", gap: 9, alignItems: "center", padding: 10 },
  loadingText: { color: colors.muted, fontFamily: fonts.regular },
  error: { backgroundColor: "#F8EAE5", borderRadius: 12, padding: 12, flexDirection: "row", justifyContent: "space-between", marginVertical: 8 },
  errorText: { color: colors.ink, fontFamily: fonts.regular },
  retry: { color: colors.deepPink, fontFamily: fonts.bold },
  composerDock: { position: "absolute", left: 0, right: 0, bottom: 0, alignItems: "center", paddingHorizontal: spacing.lg, paddingBottom: 16, zIndex: 5 },
  composer: { width: "100%", maxWidth: 828, minHeight: 58, justifyContent: "center", backgroundColor: colors.card, borderRadius: 26, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 8, paddingTop: 8, paddingBottom: 8, shadowColor: colors.primary, shadowOpacity: 0.1, shadowRadius: 12, shadowOffset: { width: 0, height: 0 }, elevation: 3, boxShadow: "0 0 16px rgba(217,108,138,.14)" as any },
  composerMultiline: { justifyContent: "flex-start", paddingTop: 12, paddingBottom: 52 },
  inputCompact: { fontSize: 15 },
  input: { width: "100%", color: colors.ink, fontFamily: fonts.regular, fontSize: type.body, lineHeight: 22, paddingLeft: 12, paddingRight: 52, paddingVertical: 0, textAlignVertical: "top", outlineStyle: "none" as any },
  send: { position: "absolute", right: 7, bottom: 7, width: 44, height: 44, borderRadius: 22, backgroundColor: colors.deepPink, alignItems: "center", justifyContent: "center" },
  modalRoot: { flex: 1, alignItems: "center", justifyContent: "center", padding: spacing.lg },
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(48,39,42,.16)" },
  modalCard: { width: "100%", maxWidth: 420, minHeight: 270, backgroundColor: colors.card, borderRadius: 26, padding: spacing.lg, shadowColor: colors.ink, shadowOpacity: .18, shadowRadius: 24, elevation: 8 },
  modalHeader: { flexDirection: "row", alignItems: "center", gap: 13 },
  modalIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.lightPink, alignItems: "center", justifyContent: "center" },
  modalIconText: { color: colors.deepPink, fontSize: 25 },
  modalTitle: { color: colors.ink, fontFamily: fonts.extraBold, fontSize: 21, flex: 1 },
  modalBody: { color: colors.muted, fontFamily: fonts.regular, fontSize: type.body, lineHeight: 24, marginTop: 14 },
  modalPrimary: { minHeight: 50, backgroundColor: colors.deepPink, borderRadius: 13, alignItems: "center", justifyContent: "center", marginTop: 18, borderWidth: 0, outlineStyle: "none" as any },
  modalPrimaryText: { color: colors.white, fontFamily: fonts.bold, textAlign: "center" },
  modalSecondary: { alignItems: "center", padding: 11 },
  modalSecondaryText: { color: colors.deepPink, fontFamily: fonts.bold }
});
// Composer floats mid-screen while idle (empty conversation, unfocused); on focus the empty-state
// copy fades out and the composer docks just above the tab bar. It is multiline and grows upward
// with the text (capped at 120pt), so on mobile it stays close to the keyboard as the user types.
