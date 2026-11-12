import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  AppState,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import {
  CameraView,
  useCameraPermissions,
  useMicrophonePermissions,
} from "expo-camera";
import * as Location from "expo-location";
import * as FileSystem from "expo-file-system/legacy";
import { useVideoPlayer, VideoView } from "expo-video";
import type { Place, Request, Video } from "./types";
import {
  Button,
  colors,
  Empty,
  ErrorBox,
  Field,
  Icon,
  Pill,
  Screen,
  styles,
} from "./ui";

type CaptureTicket = {
  id: string;
  serverTime: string;
  expiresAt: string;
  uploadUrl: string;
  maxDurationSeconds: number;
  maxBytes: number;
};
type Phase =
  | "idle"
  | "locating"
  | "recording"
  | "finishing"
  | "review"
  | "uploading";
type Fix = {
  lat: number;
  lng: number;
  accuracyMeters: number;
  locationTimestamp: string;
  mocked: boolean;
};
type Props = {
  request: Request;
  apiUrl: string;
  token: string;
  place?: Place;
  onSelectPlace: () => void;
  onUploaded: (video: Video) => void;
};

function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "Something went wrong. Please try again.";
}
async function removeLocal(uri: string | null) {
  if (uri)
    await FileSystem.deleteAsync(uri, { idempotent: true }).catch(
      () => undefined,
    );
}
async function currentFix(): Promise<Fix> {
  const permission = await Location.requestForegroundPermissionsAsync();
  if (!permission.granted)
    throw new Error(
      "Location access is required to post a place update. You can keep exploring without it. Enable location in your device settings to record.",
    );
  if (!(await Location.hasServicesEnabledAsync()))
    throw new Error(
      "Turn on location services to check that you are at this place.",
    );
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const position = await Promise.race([
    Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High }),
    new Promise<never>((_, reject) => {
      timeout = setTimeout(
        () =>
          reject(
            new Error(
              "GPS is taking too long. Move outdoors or closer to a window and try again.",
            ),
          ),
        25000,
      );
    }),
  ]).finally(() => {
    if (timeout) clearTimeout(timeout);
  });
  if (position.mocked)
    throw new Error(
      "This device reported a simulated location. Outside cannot accept this recording.",
    );
  if (Date.now() - position.timestamp > 30000)
    throw new Error(
      "Your location fix is too old. Move somewhere with a clearer GPS signal and try again.",
    );
  if (position.coords.accuracy === null || position.coords.accuracy > 100)
    throw new Error(
      "Your GPS signal is not accurate enough yet. Move closer to a window or outdoors and try again.",
    );
  return {
    lat: position.coords.latitude,
    lng: position.coords.longitude,
    accuracyMeters: position.coords.accuracy,
    locationTimestamp: new Date(position.timestamp).toISOString(),
    mocked: Boolean(position.mocked),
  };
}
function CaptureReview({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (value) => {
    value.loop = false;
  });
  return (
    <VideoView
      player={player}
      nativeControls
      allowsFullscreen
      style={recordStyles.camera}
      contentFit="contain"
    />
  );
}

export function RecordScreen({
  request,
  apiUrl,
  token,
  place,
  onSelectPlace,
  onUploaded,
}: Props) {
  const { height: windowHeight } = useWindowDimensions();
  const cameraHeight = Math.min(480, Math.max(180, Math.round(windowHeight * 0.36)));
  const [cameraPermission, requestCameraPermission, getCameraPermission] =
    useCameraPermissions();
  const [
    microphonePermission,
    requestMicrophonePermission,
    getMicrophonePermission,
  ] = useMicrophonePermissions();
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState("");
  const [cameraReady, setCameraReady] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [caption, setCaption] = useState("");
  const [visibility, setVisibility] = useState<
    "public" | "friends" | "private"
  >("public");
  const [localUri, setLocalUri] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [ticket, setTicket] = useState<CaptureTicket | null>(null);
  const camera = useRef<CameraView | null>(null);
  const mounted = useRef(true);
  const phaseRef = useRef<Phase>("idle");
  const uriRef = useRef<string | null>(null);
  const interrupted = useRef(false);
  const startedAt = useRef(0);
  const operation = useRef(0);
  const uploadTask = useRef<ReturnType<
    typeof FileSystem.createUploadTask
  > | null>(null);
  phaseRef.current = phase;
  uriRef.current = localUri;

  useEffect(() => {
    mounted.current = true;
    const listener = AppState.addEventListener("change", (state) => {
      if (state === "active") {
        void getCameraPermission().catch(() => undefined);
        void getMicrophonePermission().catch(() => undefined);
      }
      if (
        (state === "background" && phaseRef.current === "locating") ||
        (state !== "active" &&
          ["recording", "finishing"].includes(phaseRef.current))
      ) {
        interrupted.current = true;
        operation.current++;
        camera.current?.stopRecording();
        if (mounted.current) {
          setPhase("idle");
          setTicket(null);
          setError(
            "Recording was interrupted when the app left the screen. Start a new capture when you are ready.",
          );
        }
      }
    });
    return () => {
      mounted.current = false;
      interrupted.current = true;
      operation.current++;
      listener.remove();
      camera.current?.stopRecording();
      void uploadTask.current?.cancelAsync().catch(() => undefined);
      void removeLocal(uriRef.current);
    };
  }, [getCameraPermission, getMicrophonePermission]);

  useEffect(() => {
    if (phase !== "recording") return;
    const interval = setInterval(
      () =>
        setElapsed(
          Math.min(60, Math.floor((Date.now() - startedAt.current) / 1000)),
        ),
      250,
    );
    return () => clearInterval(interval);
  }, [phase]);

  async function allowCamera() {
    setError("");
    try {
      const cameraResult = await requestCameraPermission();
      const microphoneResult = cameraResult.granted
        ? await requestMicrophonePermission()
        : null;
      if (!cameraResult.granted || !microphoneResult?.granted)
        setError(
          "Camera and microphone access let you record a place update. You can still discover and save places without them.",
        );
    } catch (cause) {
      setError(errorMessage(cause));
    }
  }

  async function begin() {
    if (
      !place ||
      !cameraReady ||
      phaseRef.current !== "idle" ||
      !camera.current
    )
      return;
    phaseRef.current = "locating";
    const id = ++operation.current;
    interrupted.current = false;
    setError("");
    setElapsed(0);
    setPhase("locating");
    let capturedUri: string | null = null;
    try {
      const fix = await currentFix();
      if (!mounted.current || id !== operation.current) return;
      const nextTicket = await request<CaptureTicket>(
        "/capture/tickets",
        "POST",
        { placeId: place.id, ...fix },
      );
      if (!mounted.current || id !== operation.current) return;
      setTicket(nextTicket);
      startedAt.current = Date.now();
      setPhase("recording");
      const result = await camera.current?.recordAsync({
        maxDuration: Math.min(60, nextTicket.maxDurationSeconds),
        maxFileSize: Math.min(38 * 1024 * 1024, nextTicket.maxBytes),
        ...(Platform.OS === "ios" ? { codec: "avc1" as const } : {}),
      });
      if (!mounted.current || id !== operation.current || interrupted.current) {
        await removeLocal(result?.uri || null);
        return;
      }
      if (!result?.uri)
        throw new Error(
          "The camera did not return a recording. Please try again.",
        );
      capturedUri = result.uri;
      const info = await FileSystem.getInfoAsync(result.uri);
      if (info.exists && "size" in info && info.size > nextTicket.maxBytes) {
        await removeLocal(result.uri);
        throw new Error(
          "This recording exceeds the upload size limit. Please record a shorter update.",
        );
      }
      if (!mounted.current || id !== operation.current || interrupted.current) {
        await removeLocal(result.uri);
        return;
      }
      setLocalUri(result.uri);
      setPhase("review");
    } catch (cause) {
      await removeLocal(capturedUri);
      if (mounted.current && id === operation.current) {
        setError(errorMessage(cause));
        setTicket(null);
        setPhase("idle");
      }
    }
  }

  function stop() {
    if (phaseRef.current !== "recording" || elapsed < 3) return;
    phaseRef.current = "finishing";
    setPhase("finishing");
    camera.current?.stopRecording();
  }

  async function discard() {
    const discardedUri = localUri;
    setLocalUri(null);
    setTicket(null);
    setError("");
    setCameraReady(false);
    setPhase("idle");
    await removeLocal(discardedUri);
  }

  async function upload() {
    if (!ticket || !localUri || phaseRef.current !== "review") return;
    phaseRef.current = "uploading";
    const id = ++operation.current;
    setError("");
    setProgress(0);
    setPhase("uploading");
    try {
      // The server requires a fresh second fix before accepting the upload.
      const endFix = await currentFix();
      if (!mounted.current || id !== operation.current) return;
      const endpoint = new URL(
        ticket.uploadUrl,
        `${apiUrl.replace(/\/$/, "")}/`,
      );
      if (endpoint.origin !== new URL(apiUrl).origin)
        throw new Error(
          "The upload destination does not match the configured Outside server.",
        );
      const task = FileSystem.createUploadTask(
        endpoint.toString(),
        localUri,
        {
          httpMethod: "POST",
          uploadType: FileSystem.FileSystemUploadType.MULTIPART,
          fieldName: "video",
          mimeType: localUri.toLowerCase().endsWith(".mov")
            ? "video/quicktime"
            : "video/mp4",
          sessionType: FileSystem.FileSystemSessionType.FOREGROUND,
          headers: { Authorization: `Bearer ${token}` },
          parameters: {
            lat: String(endFix.lat),
            lng: String(endFix.lng),
            accuracyMeters: String(endFix.accuracyMeters),
            locationTimestamp: endFix.locationTimestamp,
            cameraFacing: "back",
            caption: caption.trim(),
            visibility,
          },
        },
        (event) => {
          if (
            mounted.current &&
            id === operation.current &&
            event.totalBytesExpectedToSend > 0
          )
            setProgress(event.totalBytesSent / event.totalBytesExpectedToSend);
        },
      );
      uploadTask.current = task;
      const response = await task.uploadAsync();
      uploadTask.current = null;
      if (!response)
        throw new Error(
          "The upload was interrupted. Your clip is still here; try again while this capture session is valid.",
        );
      let body: { data?: Video; error?: { message?: string } };
      try {
        body = JSON.parse(response.body);
      } catch {
        throw new Error(
          `The server returned an unreadable upload response (${response.status}).`,
        );
      }
      if (!body || typeof body !== "object")
        throw new Error(
          "The server did not return a valid Outside upload response.",
        );
      if (response.status < 200 || response.status >= 300 || !body.data)
        throw new Error(
          body.error?.message ||
            `Upload failed (${response.status}). Please try again.`,
        );
      const video = body.data;
      await removeLocal(localUri);
      if (!mounted.current || id !== operation.current) return;
      setLocalUri(null);
      setTicket(null);
      setPhase("idle");
      setCaption("");
      onUploaded(video);
    } catch (cause) {
      uploadTask.current = null;
      if (mounted.current && id === operation.current) {
        setError(errorMessage(cause));
        setPhase("review");
      }
    }
  }

  if (Platform.OS === "web")
    return (
      <Screen>
        <Empty
          icon="videocam-outline"
          title="Capture Outside, on your phone"
          description="Place updates use the native rear camera and a fresh device location. Open the iOS or Android app to record."
        />
      </Screen>
    );

  const hasPermissions =
    cameraPermission?.granted && microphonePermission?.granted;
  const cannotAskAgain =
    (cameraPermission &&
      !cameraPermission.granted &&
      !cameraPermission.canAskAgain) ||
    (microphonePermission &&
      !microphonePermission.granted &&
      !microphonePermission.canAskAgain);
  const busy =
    phase === "locating" || phase === "finishing" || phase === "uploading";
  const isCapturing = phase === "recording" || phase === "finishing";

  return (
    <Screen>
      <View style={{ gap: 7 }}>
        <Text style={styles.title}>A real moment.</Text>
        <Text style={styles.body}>Show what it feels like to be there.</Text>
      </View>
      {error ? <ErrorBox message={error} /> : null}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Choose recording place"
        disabled={phase !== "idle"}
        onPress={onSelectPlace}
        style={[styles.card, styles.row, { padding: 15 }]}
      >
        <View style={recordStyles.placeIcon}>
          <Icon name="location-outline" color={colors.accent} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.text, { fontSize: 15, fontWeight: "700" }]}>
            {place?.name || "Choose your place"}
          </Text>
          <Text numberOfLines={2} style={styles.muted}>
            {place?.address || "Find the real place where you are now"}
          </Text>
        </View>
        {!!(phase === "idle") && (
          <Icon name="chevron-forward" size={18} color={colors.muted} />
        )}
      </Pressable>
      {!place ? (
        <Empty
          icon="navigate-outline"
          title="Where are you Outside?"
          description="Choose a real nearby place before you record. Your location is checked at capture and upload."
          action="Find a place"
          onAction={onSelectPlace}
        />
      ) : !hasPermissions ? (
        <View style={styles.card}>
          <View style={recordStyles.permissionIcon}>
            <Icon name="videocam-outline" size={38} color={colors.accent} />
          </View>
          <Text
            style={[
              styles.text,
              { fontSize: 20, fontWeight: "700", textAlign: "center" },
            ]}
          >
            Let the place speak.
          </Text>
          <Text style={[styles.body, { textAlign: "center" }]}>
            Allow the rear camera and microphone to capture a short update.
            Location access is requested when you start.
          </Text>
          <Button
            title={
              cannotAskAgain
                ? "Open device settings"
                : "Enable camera & microphone"
            }
            icon={cannotAskAgain ? "settings-outline" : "camera-outline"}
            onPress={() => {
              if (cannotAskAgain) void Linking.openSettings();
              else void allowCamera();
            }}
          />
        </View>
      ) : (
        <>
          <View style={[recordStyles.cameraFrame, { height: cameraHeight }]}>
            {localUri ? (
              <CaptureReview uri={localUri} />
            ) : (
              <CameraView
                ref={camera}
                style={recordStyles.camera}
                facing="back"
                mode="video"
                videoQuality="720p"
                videoBitrate={2500000}
                onCameraReady={() => setCameraReady(true)}
                onMountError={(event) => {
                  setError(
                    event.message ||
                      "The camera could not start. Try reopening this screen.",
                  );
                  setCameraReady(false);
                }}
              />
            )}
            {!localUri && (
              <View pointerEvents="none" style={recordStyles.cameraTop}>
                <View style={recordStyles.captureBadge}>
                  <View
                    style={[
                      recordStyles.dot,
                      {
                        backgroundColor: isCapturing
                          ? colors.red
                          : colors.accent,
                      },
                    ]}
                  />
                  <Text style={recordStyles.badgeText}>
                    {isCapturing
                      ? `${String(Math.floor(elapsed / 60)).padStart(2, "0")}:${String(elapsed % 60).padStart(2, "0")}`
                      : "REAR CAMERA"}
                  </Text>
                </View>
                <Text style={recordStyles.limit}>60 sec max</Text>
              </View>
            )}
            {!!(phase === "locating") && (
              <View style={recordStyles.overlay}>
                <ActivityIndicator color={colors.accent} size="large" />
                <Text style={recordStyles.overlayText}>
                  Checking your location…
                </Text>
              </View>
            )}
            {!!(phase === "uploading") && (
              <View style={recordStyles.overlay}>
                <ActivityIndicator color={colors.accent} size="large" />
                <Text style={recordStyles.overlayText}>
                  {progress > 0
                    ? `Uploading ${Math.round(progress * 100)}%`
                    : "Checking location & preparing upload…"}
                </Text>
                <View style={recordStyles.progressTrack}>
                  <View
                    style={[
                      recordStyles.progressFill,
                      { width: `${Math.round(progress * 100)}%` },
                    ]}
                  />
                </View>
              </View>
            )}
          </View>
          {phase === "recording" || phase === "finishing" ? (
            <View style={{ alignItems: "center", gap: 12 }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Stop recording"
                disabled={phase === "finishing" || elapsed < 3}
                onPress={stop}
                style={recordStyles.recordRing}
              >
                <View style={recordStyles.stopSquare} />
              </Pressable>
              <Text style={styles.muted}>
                {phase === "finishing"
                  ? "Finishing your clip…"
                  : elapsed < 3
                    ? "Capture at least 3 seconds"
                    : "Tap to stop"}
              </Text>
            </View>
          ) : localUri ? (
            <>
              <Field
                label="A little context (optional)"
                placeholder="What should someone know before they go?"
                value={caption}
                onChangeText={setCaption}
                maxLength={500}
                multiline
                editable={!busy}
              />
              <Text style={styles.label}>Who can see this update?</Text>
              <View style={[styles.row, { flexWrap: "wrap" }]}>
                {(["public", "friends", "private"] as const).map((value) => (
                  <Pill
                    key={value}
                    label={
                      value === "public"
                        ? "Discovery"
                        : value === "friends"
                          ? "Friends"
                          : "Only me"
                    }
                    icon={
                      value === "public"
                        ? "earth-outline"
                        : value === "friends"
                          ? "people-outline"
                          : "lock-closed-outline"
                    }
                    active={visibility === value}
                    onPress={() => {
                      if (!busy) setVisibility(value);
                    }}
                  />
                ))}
              </View>
              <Text style={styles.muted}>
                Stay at this place while you upload. Your location is checked
                again. Updates are processed and reviewed before appearing in
                feeds or maps.
              </Text>
              <Button
                title={
                  phase === "uploading"
                    ? "Uploading update…"
                    : "Share this moment"
                }
                icon="cloud-upload-outline"
                onPress={() => void upload()}
                loading={phase === "uploading"}
              />
              <Button
                title="Discard & record again"
                variant="ghost"
                onPress={() => void discard()}
                disabled={busy}
              />
            </>
          ) : (
            <View style={{ alignItems: "center", gap: 12 }}>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Start recording"
                disabled={!cameraReady || busy}
                onPress={() => void begin()}
                style={[
                  recordStyles.recordRing,
                  (!cameraReady || busy) && { opacity: 0.4 },
                ]}
              >
                <View style={recordStyles.recordCircle} />
              </Pressable>
              <Text style={styles.muted}>
                {phase === "locating"
                  ? "Getting a fresh location…"
                  : cameraReady
                    ? "Tap to record"
                    : "Starting camera…"}
              </Text>
            </View>
          )}
        </>
      )}
      <View style={[styles.row, { alignItems: "flex-start", gap: 9 }]}>
        <Icon name="shield-checkmark-outline" color={colors.accent} size={17} />
        <Text style={[styles.muted, { flex: 1 }]}>
          In-app capture. Real place. Checked location. GPS checks help deter
          false claims; they do not guarantee authenticity.
        </Text>
      </View>
    </Screen>
  );
}

const recordStyles = StyleSheet.create({
  placeIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#2D143D",
    alignItems: "center",
    justifyContent: "center",
  },
  permissionIcon: {
    alignSelf: "center",
    width: 84,
    height: 84,
    borderRadius: 25,
    backgroundColor: "#281036",
    justifyContent: "center",
    alignItems: "center",
    marginVertical: 10,
  },
  cameraFrame: {
    width: "100%",
    backgroundColor: "#101014",
    borderRadius: 22,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.line,
  },
  camera: { flex: 1, width: "100%", height: "100%" },
  cameraTop: {
    position: "absolute",
    left: 15,
    right: 15,
    top: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  captureBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
    borderRadius: 30,
    paddingHorizontal: 11,
    paddingVertical: 8,
    backgroundColor: "#08080BD9",
  },
  badgeText: {
    fontSize: 11,
    letterSpacing: 1,
    fontWeight: "700",
    color: colors.text,
  },
  dot: { width: 7, height: 7, borderRadius: 4 },
  limit: {
    color: "white",
    fontSize: 11,
    fontWeight: "600",
    backgroundColor: "#08080BD9",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 20,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#08080BC9",
    alignItems: "center",
    justifyContent: "center",
    gap: 17,
    padding: 25,
  },
  overlayText: {
    color: colors.text,
    fontSize: 14,
    textAlign: "center",
    lineHeight: 21,
  },
  recordRing: {
    width: 82,
    height: 82,
    borderRadius: 42,
    borderWidth: 3,
    borderColor: "#D5B3E9",
    alignItems: "center",
    justifyContent: "center",
    padding: 5,
  },
  recordCircle: {
    width: 64,
    height: 64,
    borderRadius: 34,
    backgroundColor: colors.purple,
  },
  stopSquare: {
    width: 31,
    height: 31,
    borderRadius: 7,
    backgroundColor: colors.red,
  },
  progressTrack: {
    height: 4,
    width: "85%",
    borderRadius: 3,
    backgroundColor: "#3E3049",
    overflow: "hidden",
  },
  progressFill: { height: 4, borderRadius: 3, backgroundColor: colors.accent },
});
