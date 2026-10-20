import { useEffect, useMemo, useRef, useState } from "react";
import { Animated, PanResponder, StyleSheet, Text, View } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { deleteAsync } from "expo-file-system/legacy";
import { colors, fonts } from "../theme";
import { config } from "../config";
import { WebCameraState } from "../vision/useWebCamera";
import { detectAndCrop, faceDetectionAvailable, type FaceFraction } from "../vision/nativeFace";
import { postFrameFile } from "../api/sessionApi";

const W = 140;
const H = 186;

// Native self-view and frame posting -- the phone's version of CameraPreview.tsx (web).
// While the camera is on, a front-camera photo is taken about once per config.ferSampleMs,
// ML Kit finds the face on the phone, and only the JPEG face crop is posted (as on web).
// Every photo and crop is deleted from the phone right after use; nothing is kept.
// The camera stays mounted while on, whether or not the panel is shown, so opening it is instant.
export function CameraPreview({ visible, postingActive }: { state: WebCameraState; stream: MediaStream | null; visible: boolean; postingActive: boolean }) {
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);
  const [ready, setReady] = useState(false);
  const [face, setFace] = useState<FaceFraction | null>(null);
  const [photoSize, setPhotoSize] = useState<{ w: number; h: number } | null>(null);
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const dragOffset = useRef({ x: 0, y: 0 });

  const on = postingActive || visible;
  const granted = !!permission?.granted;

  useEffect(() => {
    if (on && permission && !permission.granted && permission.canAskAgain) requestPermission();
  }, [on, permission?.granted]);

  useEffect(() => {
    if (!on) { setReady(false); setFace(null); }
  }, [on]);

  // Capture -> detect -> post loop. One frame at a time; the next starts only after the last
  // finished, at least config.ferSampleMs apart. Stops as soon as posting is paused or revoked.
  useEffect(() => {
    if (!postingActive || !granted || !ready || !faceDetectionAvailable) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    async function tick() {
      const started = Date.now();
      const files: string[] = [];
      try {
        const photo = await cameraRef.current?.takePictureAsync({ quality: 0.5, shutterSound: false });
        if (photo && !stopped) {
          files.push(photo.uri);
          setPhotoSize({ w: photo.width, h: photo.height });
          const result = await detectAndCrop(photo);
          files.push(...result.files);
          if (!stopped) {
            setFace(result.crop?.box ?? null);
            if (result.crop) await postFrameFile(result.crop.uri);
          }
        }
      } catch (err) {
        console.warn(`[camera] frame skipped: ${String(err)}`);
      } finally {
        files.forEach(uri => { deleteAsync(uri, { idempotent: true }).catch(() => {}); });
      }
      if (!stopped) timer = setTimeout(tick, Math.max(0, config.ferSampleMs - (Date.now() - started)));
    }

    tick();
    return () => { stopped = true; if (timer) clearTimeout(timer); };
  }, [postingActive, granted, ready]);

  const responder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: (_e, g) => Math.abs(g.dx) > 2 || Math.abs(g.dy) > 2,
        onPanResponderGrant: () => {
          pan.setOffset({ ...dragOffset.current });
          pan.setValue({ x: 0, y: 0 });
        },
        onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
        onPanResponderRelease: (_e, g) => {
          dragOffset.current = { x: dragOffset.current.x + g.dx, y: dragOffset.current.y + g.dy };
          pan.flattenOffset();
        }
      }),
    [pan]
  );

  if (!on) return null;

  // Map the face box from photo fractions onto the mirrored, cover-cropped preview.
  let boxStyle: { left: number; top: number; width: number; height: number } | null = null;
  if (visible && face && photoSize) {
    const scale = Math.max(W / photoSize.w, H / photoSize.h);
    const cropX = (photoSize.w * scale - W) / 2;
    const cropY = (photoSize.h * scale - H) / 2;
    const left = face.x * photoSize.w * scale - cropX;
    const top = face.y * photoSize.h * scale - cropY;
    const width = face.w * photoSize.w * scale;
    const height = face.h * photoSize.h * scale;
    boxStyle = { left: W - (left + width), top, width, height }; // mirror X, like the preview
  }

  return (
    <Animated.View
      {...(visible ? responder.panHandlers : {})}
      pointerEvents={visible ? "auto" : "none"}
      style={[styles.wrap, !visible && styles.hidden, visible && { transform: [{ translateX: pan.x }, { translateY: pan.y }] }]}
    >
      {granted
        ? <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="front" animateShutter={false} onCameraReady={() => setReady(true)} />
        : <View style={styles.message}><Text style={styles.messageText}>{permission && !permission.canAskAgain ? "Camera access is off for this app in Settings." : "Waiting for camera permission…"}</Text></View>}
      {visible && boxStyle && <View style={[styles.faceBox, boxStyle]} pointerEvents="none" />}
      {visible && granted && <View style={styles.dot} />}
      {visible && granted && !faceDetectionAvailable && <Text style={styles.note}>Camera mood needs the app build, not Expo Go.</Text>}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", right: 14, top: 120, width: W, height: H, borderRadius: 16, overflow: "hidden", backgroundColor: colors.ink, borderWidth: 1, borderColor: colors.border, zIndex: 8 },
  // Hidden = moved off-screen at full size, so the camera keeps running for frame capture.
  hidden: { left: -10000, right: undefined, borderWidth: 0 },
  message: { flex: 1, alignItems: "center", justifyContent: "center", padding: 10, backgroundColor: colors.card },
  messageText: { color: colors.muted, fontFamily: fonts.regular, fontSize: 12, textAlign: "center" },
  dot: { position: "absolute", left: 8, top: 8, width: 9, height: 9, borderRadius: 5, backgroundColor: "#3FBF6A" },
  faceBox: { position: "absolute", borderWidth: 2, borderColor: "#3FBF6A", borderRadius: 6 },
  note: { position: "absolute", left: 0, right: 0, bottom: 0, padding: 6, backgroundColor: "rgba(0,0,0,.55)", color: colors.white, fontFamily: fonts.regular, fontSize: 10, textAlign: "center" }
});
