import React, { useEffect, useRef, useState } from "react";
import {
  Alert,
  AppState,
  Image,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useVideoPlayer, VideoView } from "expo-video";
import * as Location from "expo-location";
import { LinearGradient } from "expo-linear-gradient";
import {
  Place,
  Request,
  Saved,
  User,
  Video,
  categories,
  distanceLabel,
  relativeTime,
} from "./types";
import { mediaSource, useMediaSource } from "./api";
import {
  Avatar,
  Button,
  colors,
  Empty,
  ErrorBox,
  Field,
  Icon,
  IconName,
  Loading,
  Pill,
  Screen,
  Section,
  styles,
  useLoad,
  useNow,
} from "./ui";
export type DiscoveryProps = {
  request: Request;
  apiUrl: string;
  token: string;
  onPlace: (place: Place) => void;
  onVideo: (video: Video) => void;
  onRecord: (place?: Place) => void;
  onInvite: (place: Place) => void;
  onDiscover: (place: Place) => void;
  saved: Saved;
  onSave: (
    kind: "place" | "video" | "search",
    targetId: string,
    remove?: boolean,
  ) => Promise<void>;
};
const categoryIcon = (category: string) =>
  categories.find((c) => c.id === category)?.icon || "location-outline";
export function PlaceCard({
  place,
  onPress,
  saved,
  onSave,
  wide = false,
}: {
  place: Place;
  onPress: () => void;
  saved?: boolean;
  onSave?: () => void;
  wide?: boolean;
}) {
  return (
    <View style={[d.placeCard, wide && { width: "100%" }]}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`Open ${place.name}`}
      >
        <LinearGradient
          colors={[
            categories.find((c) => c.id === place.category)?.color || "#30203E",
            "#141419",
          ]}
          style={d.placeArt}
        >
          <Icon name={categoryIcon(place.category)} size={36} color="#DDB5F3" />
        </LinearGradient>
        <View style={{ padding: 13, gap: 6 }}>
          <Text style={d.placeTitle} numberOfLines={2}>
            {place.name}
          </Text>
          <Text style={styles.muted} numberOfLines={2}>
            {place.address || "OpenStreetMap place"}
          </Text>
          {!!(place.distanceMeters !== undefined) && (
            <Text style={{ color: colors.accent, fontSize: 11 }}>
              {distanceLabel(place.distanceMeters)}
            </Text>
          )}
        </View>
      </Pressable>
      {!!onSave && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={saved ? "Unsave place" : "Save place"}
          onPress={onSave}
          hitSlop={10}
          style={d.save}
        >
          <Icon name={saved ? "bookmark" : "bookmark-outline"} size={19} />
        </Pressable>
      )}
    </View>
  );
}
export function PlaceGrid({
  places,
  onPlace,
  saved,
  onSave,
}: {
  places: Place[];
  onPlace: (p: Place) => void;
  saved?: Saved;
  onSave?: (p: Place, remove: boolean) => void;
}) {
  return (
    <View style={d.grid}>
      {places.map((place) => (
        <PlaceCard
          key={place.id}
          place={place}
          onPress={() => onPlace(place)}
          saved={saved?.places.some((p) => p.id === place.id)}
          onSave={
            onSave
              ? () =>
                  onSave(place, !!saved?.places.some((p) => p.id === place.id))
              : undefined
          }
        />
      ))}
    </View>
  );
}
function InlinePlayer({
  video,
  apiUrl,
  token,
}: {
  video: Video;
  apiUrl: string;
  token: string;
}) {
  const { source, error: loadError } = useMediaSource(
    video.mediaUrl,
    apiUrl,
    token,
  );
  const player = useVideoPlayer(source || null, (p) => {
    p.loop = true;
    p.play();
  });
  const [error, setError] = useState("");
  useEffect(() => {
    const subscription = player.addListener("statusChange", (event) => {
      if (event.status === "error")
        setError(
          "Video could not be played. Check your connection and try again.",
        );
    });
    return () => subscription.remove();
  }, [player]);
  return (
    <View style={{ flex: 1 }}>
      <VideoView
        player={player}
        style={{ flex: 1 }}
        nativeControls
        allowsFullscreen
        contentFit="cover"
      />
      {!!(error || loadError) && (
        <View
          style={{
            position: "absolute",
            bottom: 12,
            left: 12,
            right: 12,
            backgroundColor: "#08080BE8",
            padding: 12,
            borderRadius: 10,
          }}
        >
          <Text style={{ color: colors.red, fontSize: 12 }}>
            {error || loadError}
          </Text>
        </View>
      )}
    </View>
  );
}
export function VideoCard({
  video,
  apiUrl,
  token,
  onPlace,
  onVideo,
  saved,
  onSave,
  feature = false,
}: {
  video: Video;
  apiUrl: string;
  token: string;
  onPlace: (p: Place) => void;
  onVideo: (v: Video) => void;
  saved?: boolean;
  onSave?: () => void;
  feature?: boolean;
}) {
  const { source } = useMediaSource(video.thumbnailUrl, apiUrl, token);
  const now = useNow();
  return (
    <View style={d.videoCard}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Watch ${video.place.name}, recorded ${new Date(video.recordedAt).toLocaleString()}`}
        onPress={() => onVideo(video)}
        style={[d.videoArt, { aspectRatio: feature ? 0.94 : 1.24 }]}
      >
        {source ? (
          <Image
            source={source}
            style={StyleSheet.absoluteFillObject}
            resizeMode="cover"
          />
        ) : (
          <LinearGradient
            colors={["#291735", "#15121A"]}
            style={StyleSheet.absoluteFillObject}
          />
        )}
        <View style={d.play}>
          <Icon name="play" size={30} />
        </View>
        <LinearGradient
          colors={["transparent", "#08080BEF"]}
          style={d.videoFade}
        />
        <View style={d.timestamp}>
          <Icon name="time-outline" size={12} color="#D7C8E2" />
          <Text style={{ color: "#E4E0EA", fontSize: 11, fontWeight: "600" }}>
            Recorded {relativeTime(video.recordedAt, now).toLowerCase()}
          </Text>
        </View>
        <View style={d.videoLabel}>
          <Text
            style={{
              color: "white",
              fontSize: feature ? 26 : 20,
              fontWeight: "700",
              letterSpacing: -0.7,
            }}
          >
            {video.place.name}
          </Text>
          <View style={[styles.row, { gap: 5 }]}>
            <Icon name="location-outline" size={13} color="#D1C7D9" />
            <Text
              style={{ color: "#D1C7D9", fontSize: 12, flex: 1 }}
              numberOfLines={1}
            >
              {video.place.address}
            </Text>
          </View>
        </View>
      </Pressable>
      <View
        style={[
          styles.row,
          {
            paddingHorizontal: 15,
            paddingVertical: 14,
            justifyContent: "space-between",
          },
        ]}
      >
        <Pressable
          onPress={() => onPlace(video.place)}
          style={{ flex: 1, gap: 4 }}
        >
          <Text style={{ fontSize: 12, fontWeight: "600", color: colors.text }}>
            Explore this place <Text style={{ color: colors.accent }}>↗</Text>
          </Text>
          <Text style={{ fontSize: 10, color: colors.muted }}>
            Capture location checked ·{" "}
            {new Date(video.recordedAt).toLocaleString()}
          </Text>
        </Pressable>
        {!!onSave && (
          <Pressable
            onPress={onSave}
            accessibilityRole="button"
            accessibilityLabel={saved ? "Unsave video" : "Save video"}
            hitSlop={12}
          >
            <Icon
              name={saved ? "bookmark" : "bookmark-outline"}
              color={saved ? colors.accent : colors.text}
            />
          </Pressable>
        )}
      </View>
    </View>
  );
}
export function HomeScreen(props: DiscoveryProps & { onSearch: () => void }) {
  const [category, setCategory] = useState("");
  const [coords, setCoords] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [locating, setLocating] = useState(false);
  const feed = useLoad(
    () =>
      props.request<Video[]>(
        `/feed?${category ? `category=${encodeURIComponent(category)}&` : ""}${coords ? `lat=${coords.latitude}&lng=${coords.longitude}` : ""}`,
      ),
    [category, coords, props.request],
    [],
  );
  async function locate() {
    setLocating(true);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted")
        throw new Error(
          "Location is optional for browsing. Enable it in device settings to find updates near you.",
        );
      const fix = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setCoords(fix.coords);
    } catch (e) {
      Alert.alert(
        "Nearby discovery",
        e instanceof Error ? e.message : "Could not get your location.",
      );
    } finally {
      setLocating(false);
    }
  }
  return (
    <Screen refreshing={feed.loading} onRefresh={feed.reload}>
      <View style={[styles.row, { justifyContent: "space-between" }]}>
        <View>
          <Text style={d.eyebrow}>LESS SCROLLING. MORE LIVING.</Text>
          <Text style={styles.title}>Find your outside.</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Use my location"
          onPress={() => void locate()}
          style={d.locationButton}
        >
          {locating ? (
            <Loading />
          ) : (
            <Icon
              name="navigate-outline"
              color={coords ? colors.accent : colors.text}
            />
          )}
        </Pressable>
      </View>
      <View style={[styles.row, { gap: 6 }]}>
        <Icon name="location-outline" size={14} color={colors.accent} />
        <Text style={styles.muted}>
          {coords
            ? "Discovering near your selected location"
            : "Real places. Recent perspectives."}
        </Text>
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8 }}
      >
        <Pill
          label="For you"
          active={!category}
          onPress={() => setCategory("")}
        />
        {categories
          .filter((c) => c.id !== "coffee")
          .map((c) => (
            <Pill
              key={c.id}
              label={c.name}
              icon={c.icon}
              active={category === c.id}
              onPress={() => setCategory(c.id)}
            />
          ))}
      </ScrollView>
      {!!feed.error && <ErrorBox message={feed.error} onRetry={feed.reload} />}
      <Section title={coords ? "Around you" : "Fresh perspectives"} />
      {!!feed.loading && !feed.data.length ? (
        <Loading />
      ) : feed.data.length ? (
        <View style={{ gap: 18 }}>
          {feed.data.map((video, index) => (
            <VideoCard
              key={video.id}
              video={video}
              feature={index === 0}
              {...props}
              saved={props.saved.videos.some((v) => v.id === video.id)}
              onSave={() =>
                void props.onSave(
                  "video",
                  video.id,
                  props.saved.videos.some((v) => v.id === video.id),
                )
              }
            />
          ))}
        </View>
      ) : !feed.error ? (
        <View style={styles.card}>
          <Empty
            icon="videocam-outline"
            title="Your next discovery starts here"
            description="Recent, approved recordings will appear here as people share real places. Explore a destination or contribute your own perspective."
            action="Find a place"
            onAction={props.onSearch}
          />
        </View>
      ) : null}
      <View style={[styles.row, { gap: 10, padding: 3 }]}>
        <Icon name="shield-checkmark-outline" size={18} color={colors.accent} />
        <Text style={[styles.muted, { flex: 1, fontSize: 11 }]}>
          Recorded in Outside. Location checked. Always shown with the original
          capture time.
        </Text>
      </View>
    </Screen>
  );
}
export function SearchScreen(
  props: DiscoveryProps & { initialQuery?: string; startSaved?: boolean },
) {
  const [mode, setMode] = useState(props.startSaved ? "saved" : "search");
  const [savedTab, setSavedTab] = useState("places");
  const [query, setQuery] = useState(props.initialQuery || "");
  const [submitted, setSubmitted] = useState(props.initialQuery || "");
  const [results, setResults] = useState<Place[]>([]);
  const [matches, setMatches] = useState<Video[]>([]);
  const [videoError, setVideoError] = useState("");
  const searchGeneration = useRef(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  async function search(value = query) {
    if (value.trim().length < 2) {
      setError("Enter at least two characters to search.");
      return;
    }
    setSubmitted(value.trim());
    setQuery(value);
    setMode("search");
    setLoading(true);
    setError("");
    setVideoError("");
    setResults([]);
    setMatches([]);
    const generation = ++searchGeneration.current;
    const [places, videos] = await Promise.allSettled([
      props.request<Place[]>(
        `/places/search?q=${encodeURIComponent(value.trim())}`,
      ),
      props.request<Video[]>(`/feed?q=${encodeURIComponent(value.trim())}`),
    ]);
    if (generation !== searchGeneration.current) return;
    if (places.status === "fulfilled") setResults(places.value);
    else
      setError(
        places.reason instanceof Error
          ? places.reason.message
          : "Place search failed.",
      );
    if (videos.status === "fulfilled") setMatches(videos.value);
    else
      setVideoError(
        videos.reason instanceof Error
          ? videos.reason.message
          : "Recording search failed.",
      );
    setLoading(false);
  }
  useEffect(() => {
    if (props.initialQuery) void search(props.initialQuery);
    return () => {
      searchGeneration.current++;
    };
  }, [props.initialQuery]);
  return (
    <Screen>
      <View>
        <Text style={d.eyebrow}>SOMETHING GOOD IS OUT THERE</Text>
        <Text style={styles.title}>
          {mode === "search"
            ? "What’s your next move?"
            : "Good places, kept close."}
        </Text>
      </View>
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Button
            title="Discover"
            variant={mode === "search" ? "primary" : "secondary"}
            icon="compass-outline"
            onPress={() => setMode("search")}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Button
            title="Saved"
            variant={mode === "saved" ? "primary" : "secondary"}
            icon="bookmark-outline"
            onPress={() => setMode("saved")}
          />
        </View>
      </View>
      {mode === "search" ? (
        <>
          <View style={{ gap: 10 }}>
            <Field
              placeholder="Places, cities, things to do…"
              accessibilityLabel="Search places"
              value={query}
              onChangeText={setQuery}
              returnKeyType="search"
              onSubmitEditing={() => void search()}
            />
            <Button
              title="Search places"
              icon="search-outline"
              onPress={() => void search()}
              loading={loading}
            />
          </View>
          {!!error && (
            <ErrorBox message={error} onRetry={() => void search()} />
          )}
          {!!(submitted.length > 0) && (
            <>
              <Section title="Matching recent updates" />
              {!!videoError && (
                <ErrorBox message={videoError} onRetry={() => void search()} />
              )}
              {loading ? (
                <Loading />
              ) : matches.length ? (
                matches.map((video) => (
                  <VideoCard
                    key={video.id}
                    video={video}
                    {...props}
                    saved={props.saved.videos.some((v) => v.id === video.id)}
                    onSave={() =>
                      void props.onSave(
                        "video",
                        video.id,
                        props.saved.videos.some((v) => v.id === video.id),
                      )
                    }
                  />
                ))
              ) : !videoError ? (
                <Text style={styles.muted}>
                  No matching approved recordings. Search matches actual
                  captions and place details; it does not infer an atmosphere or
                  current activity.
                </Text>
              ) : null}
            </>
          )}
          <Section
            title={submitted ? "Matching places" : "Explore by mood"}
            right={
              submitted
                ? props.saved.searches.some((s) => s.query === submitted)
                  ? "Unsave search"
                  : "Save search"
                : undefined
            }
            onPress={() =>
              void props.onSave(
                "search",
                submitted,
                props.saved.searches.some((s) => s.query === submitted),
              )
            }
          />
          {submitted ? (
            <>
              {loading ? (
                <Loading />
              ) : results.length ? (
                <PlaceGrid
                  places={results}
                  onPlace={props.onPlace}
                  saved={props.saved}
                  onSave={(p, remove) =>
                    void props.onSave("place", p.id, remove)
                  }
                />
              ) : !error ? (
                <Empty
                  icon="search-outline"
                  title="No places found"
                  description="Try a place name, neighborhood, or a broader activity. Results come from real map data."
                />
              ) : null}
              <Button
                title="Browse categories"
                variant="ghost"
                onPress={() => {
                  setSubmitted("");
                  setResults([]);
                  setError("");
                }}
              />
            </>
          ) : (
            <View style={d.grid}>
              {categories.map((c) => (
                <Pressable
                  key={c.id}
                  accessibilityRole="button"
                  onPress={() =>
                    void search(
                      c.id === "outdoors"
                        ? "park"
                        : c.id === "sports"
                          ? "basketball"
                          : c.id,
                    )
                  }
                  style={[d.category, { backgroundColor: c.color + "66" }]}
                >
                  <Icon name={c.icon} size={29} color="#E4C2F7" />
                  <Text
                    style={{
                      color: colors.text,
                      fontSize: 16,
                      fontWeight: "600",
                    }}
                  >
                    {c.name}
                  </Text>
                  <Icon
                    name="arrow-up-right-box-outline"
                    color="#B9A4C9"
                    size={18}
                  />
                </Pressable>
              ))}
            </View>
          )}
          <Text style={[styles.muted, { fontSize: 11 }]}>
            Place data © OpenStreetMap contributors. Video activity appears
            only when an approved recording exists.
          </Text>
        </>
      ) : (
        <>
          <ScrollView
            horizontal
            contentContainerStyle={{ gap: 8 }}
            showsHorizontalScrollIndicator={false}
          >
            {["places", "videos", "searches"].map((tab) => (
              <Pill
                key={tab}
                label={tab[0].toUpperCase() + tab.slice(1)}
                active={savedTab === tab}
                onPress={() => setSavedTab(tab)}
              />
            ))}
          </ScrollView>
          {savedTab === "places" ? (
            props.saved.places.length ? (
              <PlaceGrid
                places={props.saved.places}
                onPlace={props.onPlace}
                saved={props.saved}
                onSave={(p) => void props.onSave("place", p.id, true)}
              />
            ) : (
              <Empty
                icon="bookmark-outline"
                title="Keep a place in mind"
                description="Save places while exploring. They’ll be waiting here for your next outing."
              />
            )
          ) : savedTab === "videos" ? (
            props.saved.videos.length ? (
              props.saved.videos.map((v) => (
                <VideoCard
                  key={v.id}
                  video={v}
                  {...props}
                  saved
                  onSave={() => void props.onSave("video", v.id, true)}
                />
              ))
            ) : (
              <Empty
                icon="videocam-outline"
                title="Your saved perspectives"
                description="Save a recording to find it here. Availability follows the creator’s privacy and discovery window."
              />
            )
          ) : props.saved.searches.length ? (
            props.saved.searches.map((s) => (
              <View key={s.id} style={[styles.card, styles.row]}>
                <Icon name="search-outline" color={colors.accent} />
                <Pressable
                  style={{ flex: 1 }}
                  onPress={() => void search(s.query)}
                >
                  <Text style={styles.text}>{s.query}</Text>
                  <Text style={styles.muted}>Run this search again</Text>
                </Pressable>
                <Pressable
                  onPress={() => void props.onSave("search", s.query, true)}
                  accessibilityLabel="Remove saved search"
                >
                  <Icon name="close-outline" />
                </Pressable>
              </View>
            ))
          ) : (
            <Empty
              icon="search-outline"
              title="Save a good search"
              description="Keep your favorite searches and run them again whenever a new plan comes up."
            />
          )}
        </>
      )}
    </Screen>
  );
}
export function PlaceScreen(props: DiscoveryProps & { place: Place }) {
  const detail = useLoad(
    () =>
      props.request<{ place: Place; videos: Video[]; nearby: Place[] }>(
        `/places/${props.place.id}`,
      ),
    [props.place.id, props.request],
    { place: props.place, videos: [], nearby: [] },
  );
  const place = detail.data.place;
  const saved = props.saved.places.some((p) => p.id === place.id);
  return (
    <Screen refreshing={detail.loading} onRefresh={detail.reload}>
      <LinearGradient colors={["#352045", "#141419"]} style={d.placeHero}>
        <View style={d.placeHeroIcon}>
          <Icon name={categoryIcon(place.category)} size={43} color="#DAB1F1" />
        </View>
        <Text style={d.eyebrow}>
          {place.category.toUpperCase().replace(/_/g, " ")}
        </Text>
        <Text style={[styles.title, { fontSize: 31 }]}>{place.name}</Text>
        <Text style={styles.body}>{place.address}</Text>
        <Text style={[styles.muted, { fontSize: 11 }]}>
          {place.lat.toFixed(5)}, {place.lng.toFixed(5)}
        </Text>
      </LinearGradient>
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Button
            title="Invite friends"
            icon="people-outline"
            onPress={() => props.onInvite(place)}
          />
        </View>
        <Button
          title={saved ? "Saved" : "Save"}
          icon={saved ? "bookmark" : "bookmark-outline"}
          variant="secondary"
          onPress={() => void props.onSave("place", place.id, saved)}
        />
      </View>
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Button
            title="Record here"
            variant="secondary"
            icon="videocam-outline"
            onPress={() => props.onRecord(place)}
          />
        </View>
        <Button
          title="Directions"
          variant="secondary"
          icon="navigate-outline"
          onPress={() => openDirections(place)}
        />
      </View>
      {!!detail.error && (
        <ErrorBox message={detail.error} onRetry={detail.reload} />
      )}
      <Section title="Recent perspectives" />
      {detail.loading ? (
        <Loading />
      ) : detail.data.videos.length ? (
        detail.data.videos.map((video) => (
          <VideoCard
            key={video.id}
            video={video}
            {...props}
            saved={props.saved.videos.some((v) => v.id === video.id)}
            onSave={() =>
              void props.onSave(
                "video",
                video.id,
                props.saved.videos.some((v) => v.id === video.id),
              )
            }
          />
        ))
      ) : (
        <Empty
          icon="videocam-outline"
          title="Be the first perspective"
          description="There are no recent approved recordings here. Share what this place is like when you visit."
          action="Record at this place"
          onAction={() => props.onRecord(place)}
        />
      )}
      <Section title="Make more of the journey" />
      <Button
        title="Discover around here"
        icon="compass-outline"
        variant="secondary"
        onPress={() => props.onDiscover(place)}
      />
      {!!(detail.data.nearby.length > 0) && (
        <PlaceGrid
          places={detail.data.nearby.slice(0, 4)}
          onPlace={props.onPlace}
        />
      )}
      <Text style={[styles.muted, { fontSize: 10 }]}>
        {place.attribution || "© OpenStreetMap contributors"}
      </Text>
    </Screen>
  );
}
export function openDirections(place: Place) {
  const url =
    Platform.OS === "ios"
      ? `http://maps.apple.com/?q=${encodeURIComponent(place.name)}&ll=${place.lat},${place.lng}`
      : `geo:${place.lat},${place.lng}?q=${place.lat},${place.lng}(${encodeURIComponent(place.name)})`;
  void Linking.openURL(url).catch(() =>
    Linking.openURL(
      `https://www.openstreetmap.org/?mlat=${place.lat}&mlon=${place.lng}#map=16/${place.lat}/${place.lng}`,
    ),
  );
}
export function VideoScreen(
  props: DiscoveryProps & { video: Video; userId: string },
) {
  const detail = useLoad(
    () => props.request<Video>(`/videos/${props.video.id}`),
    [props.request, props.video.id],
    null as Video | null,
  );
  useEffect(() => {
    const timer = setInterval(() => {
      if (AppState.currentState === "active") void detail.reload();
    }, 30000);
    const listener = AppState.addEventListener("change", (value) => {
      if (value === "active") void detail.reload();
    });
    return () => {
      clearInterval(timer);
      listener.remove();
    };
  }, [detail.reload]);
  if (detail.error)
    return (
      <Screen>
        <ErrorBox message={detail.error} onRetry={detail.reload} />
      </Screen>
    );
  if (!detail.data)
    return (
      <Screen>
        <Loading />
      </Screen>
    );
  return (
    <AuthorizedVideoScreen
      {...props}
      video={detail.data}
      refreshing={detail.loading}
      onRefresh={detail.reload}
    />
  );
}
function AuthorizedVideoScreen(
  props: DiscoveryProps & {
    video: Video;
    userId: string;
    refreshing: boolean;
    onRefresh: () => Promise<void>;
  },
) {
  const video = props.video;
  const friendship = useLoad(
    () =>
      video.user.id === props.userId
        ? Promise.resolve({ friendship: "self" })
        : props.request<{ friendship: string }>(`/users/${video.user.id}`),
    [props.request, video.user.id, props.userId],
    { friendship: "" },
  );
  const signals = useLoad(
    () =>
      video.user.id === props.userId
        ? props.request<{ user: User; createdAt: string }[]>(
            `/videos/${video.id}/signals`,
          )
        : Promise.resolve([]),
    [props.request, video.id, props.userId],
    [],
  );
  const [reason, setReason] = useState("");
  const [reporting, setReporting] = useState(false);
  const [busy, setBusy] = useState(false);
  const source = mediaSource(video.mediaUrl, props.apiUrl, props.token);
  async function signal() {
    setBusy(true);
    try {
      await props.request(`/videos/${video.id}/signal`, "POST", {});
      Alert.alert(
        "Signal sent",
        "Your friend knows you’re coming. Your location is not shared.",
      );
    } catch (e) {
      Alert.alert(
        "Could not send signal",
        e instanceof Error ? e.message : "Try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function report() {
    setBusy(true);
    try {
      await props.request("/reports", "POST", { videoId: video.id, reason });
      setReporting(false);
      setReason("");
      Alert.alert(
        "Report received",
        "This recording has been sent for review.",
      );
    } catch (e) {
      Alert.alert(
        "Could not submit report",
        e instanceof Error ? e.message : "Try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen refreshing={props.refreshing} onRefresh={props.onRefresh}>
      <View
        style={{
          height: 440,
          maxHeight: 560,
          borderRadius: 20,
          backgroundColor: colors.surface,
          overflow: "hidden",
        }}
      >
        {source ? (
          <InlinePlayer
            video={video}
            apiUrl={props.apiUrl}
            token={props.token}
          />
        ) : (
          <Empty
            icon="videocam-outline"
            title="Video unavailable"
            description="This recording may still be processing or no longer available."
          />
        )}
      </View>
      <View style={[styles.row, { justifyContent: "space-between" }]}>
        <View style={{ flex: 1, gap: 5 }}>
          <Text style={styles.title}>{video.place.name}</Text>
          <Text style={styles.muted}>
            {new Date(video.recordedAt).toLocaleString()}
          </Text>
        </View>
        <Avatar name={video.user.name} uri={video.user.avatarUrl} size={42} />
      </View>
      <Text style={styles.body}>
        {video.caption || `A perspective from ${video.user.name}.`}
      </Text>
      <View style={[styles.row, { gap: 6 }]}>
        <Icon name="shield-checkmark-outline" size={16} color={colors.accent} />
        <Text style={[styles.muted, { fontSize: 11 }]}>
          In-app capture · location checked
        </Text>
      </View>
      <Button
        title="Explore this place"
        icon="location-outline"
        onPress={() => props.onPlace(video.place)}
      />
      {!!(friendship.data.friendship === "friends") && (
        <Button
          title="I’m coming"
          icon="walk-outline"
          variant="secondary"
          onPress={() => void signal()}
          loading={busy}
        />
      )}
      {!!(video.user.id === props.userId && signals.data.length > 0) && (
        <View style={styles.card}>
          <Section
            title="Friends coming"
            right="Refresh"
            onPress={signals.reload}
          />
          {signals.data.map((item) => (
            <View key={item.user.id} style={styles.row}>
              <Avatar
                name={item.user.name}
                uri={item.user.avatarUrl}
                size={36}
              />
              <View style={{ flex: 1 }}>
                <Text style={{ color: colors.text, fontWeight: "600" }}>
                  {item.user.name}
                </Text>
                <Text style={styles.muted}>
                  Signaled {relativeTime(item.createdAt).toLowerCase()}
                </Text>
              </View>
              <Icon name="walk-outline" color={colors.accent} />
            </View>
          ))}
          <Text style={[styles.muted, { fontSize: 11 }]}>
            An intention to join you. No live location is shared.
          </Text>
        </View>
      )}
      <Button
        title={
          props.saved.videos.some((v) => v.id === video.id)
            ? "Remove from saved"
            : "Save this perspective"
        }
        icon="bookmark-outline"
        variant="secondary"
        onPress={() =>
          void props.onSave(
            "video",
            video.id,
            props.saved.videos.some((v) => v.id === video.id),
          )
        }
      />
      <Text style={[styles.muted, { fontSize: 11 }]}>
        Original capture time is shown above. A location check deters obvious
        misuse; it does not independently prove every claim about a scene.
      </Text>
      {!!(video.user.id !== props.userId) && (
        <Button
          title="Report recording"
          icon="flag-outline"
          variant="ghost"
          onPress={() => setReporting(!reporting)}
        />
      )}
      {!!reporting && (
        <View style={styles.card}>
          <Field
            label="What should we review?"
            placeholder="Describe the issue (at least 5 characters)"
            value={reason}
            onChangeText={setReason}
            multiline
          />
          <Button
            title="Send report"
            onPress={() => void report()}
            loading={busy}
            disabled={reason.trim().length < 5}
          />
        </View>
      )}
    </Screen>
  );
}
const d = StyleSheet.create({
  eyebrow: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 2.2,
    color: "#B588CF",
    marginBottom: 8,
  },
  locationButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 14,
    padding: 13,
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  placeCard: {
    width: "48%",
    flexGrow: 1,
    flexBasis: "45%",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 17,
    overflow: "hidden",
  },
  placeArt: { height: 119, alignItems: "center", justifyContent: "center" },
  placeTitle: { color: colors.text, fontSize: 15, fontWeight: "600" },
  save: {
    position: "absolute",
    right: 10,
    top: 10,
    height: 32,
    width: 32,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    backgroundColor: "#08080B80",
  },
  videoCard: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 21,
    overflow: "hidden",
  },
  videoArt: {
    width: "100%",
    backgroundColor: colors.raised,
    justifyContent: "center",
    alignItems: "center",
  },
  play: {
    height: 64,
    width: 64,
    borderRadius: 32,
    backgroundColor: "#FFFFFF24",
    borderColor: "#FFFFFF50",
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  videoFade: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "55%",
  },
  videoLabel: { position: "absolute", bottom: 19, left: 19, right: 19, gap: 7 },
  timestamp: {
    position: "absolute",
    left: 15,
    top: 15,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: "#08080BAA",
    flexDirection: "row",
    gap: 6,
    alignItems: "center",
  },
  category: {
    flexBasis: "46%",
    flexGrow: 1,
    minHeight: 143,
    borderRadius: 18,
    padding: 18,
    gap: 13,
    borderWidth: 1,
    borderColor: "#FFFFFF0E",
  },
  placeHero: {
    padding: 23,
    borderRadius: 21,
    gap: 8,
    borderWidth: 1,
    borderColor: "#422B51",
  },
  placeHeroIcon: {
    height: 73,
    width: 73,
    borderRadius: 24,
    backgroundColor: "#FFFFFF09",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 9,
  },
});
