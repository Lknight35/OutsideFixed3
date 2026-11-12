import React from "react";
import { Platform } from "react-native";
import Svg, { Path } from "react-native-svg";
/** Dual peaks from the approved Outside visual direction; decorative unless labeled by its parent. */
export function BrandMark({
  size = 32,
  color = "#BC4CFF",
}: {
  size?: number;
  color?: string;
}) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      {...(Platform.OS === "web"
        ? { "aria-hidden": true }
        : {
            accessibilityElementsHidden: true,
            importantForAccessibility: "no" as const,
          })}
    >
      <Path
        d="M5 49 23 17 42 49ZM31 49 45 26 59 49Z"
        fill="none"
        stroke={color}
        strokeWidth={2.8}
        strokeLinejoin="round"
      />
      <Path d="m18 26 5-9 5 9-3-1-2 4-2-4Z" fill={color} />
    </Svg>
  );
}
