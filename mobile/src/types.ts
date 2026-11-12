export type User = {
  id: string;
  name: string;
  avatarUrl: string | null;
  createdAt: string;
};
export type Place = {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  category: string;
  source: "openstreetmap";
  attribution: string;
  distanceMeters?: number;
};
export type Video = {
  id: string;
  user: User;
  place: Place;
  caption: string;
  recordedAt: string;
  createdAt: string;
  durationSeconds: number | null;
  status: "processing" | "pending" | "approved" | "rejected" | "failed";
  visibility: "public" | "friends" | "private";
  verification: "location_checked";
  mediaUrl: string | null;
  thumbnailUrl: string | null;
  expiresAt: string;
  failureReason: string | null;
};
export type Preferences = {
  friendRequests: boolean;
  friendActivity: boolean;
  outsideSignals: boolean;
  invitations: boolean;
  invitationResponses: boolean;
  invitationMessages: boolean;
  mapVisibility: "friends" | "private";
  interests: string[];
};
export type Entitlements = {
  advancedUntil: string | null;
  active: boolean;
  approvedContributions: number;
  progress: number;
  required: 3;
};
export type Account = {
  user: User;
  preferences: Preferences;
  entitlements: Entitlements;
};
export type Saved = {
  places: Place[];
  videos: Video[];
  searches: { id: string; query: string; createdAt: string }[];
};
export type MapData = {
  places: { place: Place; videos: Video[]; hidden: boolean }[];
  visibility: "friends" | "private";
};
export type Request = <T>(
  path: string,
  method?: string,
  body?: unknown,
) => Promise<T>;
export const categories = [
  {
    id: "nightlife",
    name: "Nightlife",
    icon: "moon-outline",
    color: "#522B70",
  },
  {
    id: "food",
    name: "Food & drink",
    icon: "restaurant-outline",
    color: "#734229",
  },
  {
    id: "sports",
    name: "Sports",
    icon: "basketball-outline",
    color: "#314D64",
  },
  { id: "beaches", name: "Beaches", icon: "water-outline", color: "#245F64" },
  {
    id: "events",
    name: "Events",
    icon: "musical-notes-outline",
    color: "#672F54",
  },
  { id: "shopping", name: "Shopping", icon: "bag-outline", color: "#544373" },
  { id: "outdoors", name: "Outdoors", icon: "leaf-outline", color: "#315A43" },
  { id: "coffee", name: "Coffee", icon: "cafe-outline", color: "#68503B" },
] as const;
export function relativeTime(iso: string, now = Date.now()) {
  const date = new Date(iso).getTime();
  if (!Number.isFinite(date)) return "Time unavailable";
  const seconds = Math.max(0, Math.floor((now - date) / 1000));
  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return new Date(iso).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year:
      new Date(iso).getFullYear() !== new Date().getFullYear()
        ? "numeric"
        : undefined,
  });
}
export function distanceLabel(meters?: number) {
  if (meters === undefined) return "";
  return meters < 1000
    ? `${Math.round(meters)} m away`
    : `${(meters / 1000).toFixed(1)} km away`;
}
