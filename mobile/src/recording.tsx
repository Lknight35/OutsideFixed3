import React from "react";
import type { Place, Request, Video } from "./types";
import { Empty, Screen } from "./ui";
export function RecordScreen(_props: {
  request: Request;
  apiUrl: string;
  token: string;
  place?: Place;
  onSelectPlace: () => void;
  onUploaded: (video: Video) => void;
}) {
  return (
    <Screen>
      <Empty
        icon="videocam-outline"
        title="Capture Outside, on your phone"
        description="Place updates use the native rear camera and a fresh device location. Open the iOS or Android app to record."
      />
    </Screen>
  );
}
