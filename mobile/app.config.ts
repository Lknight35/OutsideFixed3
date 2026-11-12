import type { ExpoConfig } from "expo/config";
const mapsKey = process.env.GOOGLE_MAPS_API_KEY;
const config: ExpoConfig = {
  name: "Outside",
  slug: "outside",
  version: "0.1.0",
  scheme: "outside",
  icon: "./assets/icon.png",
  orientation: "portrait",
  userInterfaceStyle: "dark",
  newArchEnabled: true,
  ios: {
    bundleIdentifier: "app.outside.discovery",
    supportsTablet: true,
    infoPlist: {
      NSLocationWhenInUseUsageDescription:
        "Outside uses your location while you record to associate your update with a real place.",
      NSCameraUsageDescription: "Record a place update using the rear camera.",
      NSMicrophoneUsageDescription:
        "Include the sounds of the place in your video.",
      NSLocalNetworkUsageDescription:
        "Connect to your own Outside development server on your Wi-Fi network.",
      NSAppTransportSecurity: { NSAllowsLocalNetworking: true },
    },
  },
  android: {
    package: "app.outside.discovery",
    versionCode: 1,
    edgeToEdgeEnabled: true,
    allowBackup: false,
    blockedPermissions: [
      "android.permission.READ_EXTERNAL_STORAGE",
      "android.permission.WRITE_EXTERNAL_STORAGE",
      "android.permission.READ_MEDIA_VIDEO",
      "android.permission.SYSTEM_ALERT_WINDOW",
    ],
    permissions: [
      "CAMERA",
      "RECORD_AUDIO",
      "ACCESS_FINE_LOCATION",
      "ACCESS_COARSE_LOCATION",
      "POST_NOTIFICATIONS",
    ],
    ...(mapsKey ? { config: { googleMaps: { apiKey: mapsKey } } } : {}),
  },
  plugins: [
    [
      "expo-camera",
      {
        cameraPermission: "Record real updates from places you visit.",
        microphonePermission: "Include ambient sound in your place update.",
        recordAudioAndroid: true,
      },
    ],
    [
      "expo-location",
      {
        locationWhenInUsePermission:
          "Verify the place where you record. Outside does not continuously track you.",
      },
    ],
    "expo-secure-store",
    "expo-video",
    "expo-font",
    "expo-asset",
    [
      "expo-image-picker",
      {
        photosPermission:
          "Choose a profile photo. Outside does not upload camera-roll videos.",
      },
    ],
    [
      "expo-build-properties",
      {
        android: {
          usesCleartextTraffic: process.env.OUTSIDE_ALLOW_LOCAL_HTTP === "1",
        },
      },
    ],
  ],
  extra: {
    apiUrl: process.env.EXPO_PUBLIC_API_URL || "",
    googleMapsConfigured: Boolean(mapsKey),
  },
};
export default config;
