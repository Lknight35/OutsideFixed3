import React from "react";
import { Linking, Platform, View } from "react-native";
import MapView, { Marker } from "react-native-maps";
import WebView from "react-native-webview";
import Constants from "expo-constants";
import { mapDocument } from "./mapDocument";
export type MapPoint = { id: string; name: string; lat: number; lng: number };
export type MapCanvasProps = {
  points: MapPoint[];
  center?: { lat: number; lng: number };
  onSelect: (id: string) => void;
};
export default function MapCanvas({
  points,
  center,
  onSelect,
}: MapCanvasProps) {
  const focus = center || points[0] || { lat: 0, lng: 0 };
  const native =
    Platform.OS === "ios" ||
    Boolean(Constants.expoConfig?.extra?.googleMapsConfigured);
  return (
    <View
      style={{
        height: 330,
        borderRadius: 20,
        overflow: "hidden",
        backgroundColor: "#16141D",
      }}
    >
      {native ? (
        <MapView
          style={{ flex: 1 }}
          userInterfaceStyle="dark"
          initialRegion={{
            latitude: focus.lat,
            longitude: focus.lng,
            latitudeDelta: 0.04,
            longitudeDelta: 0.04,
          }}
          showsUserLocation={false}
          accessibilityLabel="Map of recorded places"
        >
          {points.map((p) => (
            <Marker
              key={p.id}
              coordinate={{ latitude: p.lat, longitude: p.lng }}
              title={p.name}
              pinColor="#BC4CFF"
              onPress={() => onSelect(p.id)}
            />
          ))}
        </MapView>
      ) : (
        <WebView
          source={{ html: mapDocument(points, focus) }}
          style={{ flex: 1, backgroundColor: "#16141D" }}
          javaScriptEnabled
          applicationNameForUserAgent="Outside/0.1 (+https://github.com/Lknight35/OutsideFixed3)"
          originWhitelist={["*"]}
          setSupportMultipleWindows={false}
          onShouldStartLoadWithRequest={(req) => {
            if (req.url === "https://www.openstreetmap.org/copyright") {
              void Linking.openURL(req.url);
              return false;
            }
            return (
              req.url === "about:blank" || req.url.startsWith("about:srcdoc")
            );
          }}
          onMessage={(event) => {
            try {
              const value = JSON.parse(event.nativeEvent.data);
              if (
                typeof value.id === "string" &&
                points.some((p) => p.id === value.id)
              )
                onSelect(value.id);
            } catch {}
          }}
        />
      )}
    </View>
  );
}
