import React, { useEffect, useRef } from "react";
import { View } from "react-native";
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
  const frame = useRef<HTMLIFrameElement | null>(null);
  useEffect(() => {
    function receive(event: MessageEvent) {
      if (event.source !== frame.current?.contentWindow) return;
      const value = event.data;
      if (
        value?.type === "outside-map-place" &&
        typeof value.id === "string" &&
        points.some((p) => p.id === value.id)
      )
        onSelect(value.id);
    }
    window.addEventListener("message", receive);
    return () => window.removeEventListener("message", receive);
  }, [points, onSelect]);
  return (
    <View
      style={{
        height: 330,
        borderRadius: 20,
        overflow: "hidden",
        backgroundColor: "#16141D",
      }}
    >
      {React.createElement("iframe", {
        ref: frame,
        srcDoc: mapDocument(points, center),
        title: "Map of places",
        sandbox: "allow-scripts",
        style: { height: "100%", width: "100%", border: 0 },
      })}
    </View>
  );
}
