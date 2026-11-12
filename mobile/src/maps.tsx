import React, { useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { MapData, Place, Request, Video } from "./types";
import {
  Button,
  colors,
  Empty,
  ErrorBox,
  Field,
  Icon,
  Loading,
  Screen,
  Section,
  styles,
  useLoad,
} from "./ui";
import MapCanvas from "./MapCanvas";
import { nearDestination } from "./geo";
import { openDirections } from "./discovery";
export function PlacesMapScreen({
  request,
  userId,
  own,
  onPlace,
  onVideo,
}: {
  request: Request;
  userId?: string;
  own: boolean;
  onPlace: (place: Place) => void;
  onVideo: (video: Video) => void;
}) {
  const map = useLoad(
    () => request<MapData>(userId ? `/users/${userId}/map` : "/map"),
    [request, userId],
    { places: [], visibility: "private" },
  );
  const [selected, setSelected] = useState("");
  const [busy, setBusy] = useState("");
  const entry = map.data.places.find((p) => p.place.id === selected);
  async function hide(id: string, hidden: boolean) {
    setBusy(id);
    try {
      await request(`/map/places/${id}/privacy`, "PUT", { hidden });
      await map.reload();
    } catch (e) {
      Alert.alert(
        "Could not update privacy",
        e instanceof Error ? e.message : "Try again.",
      );
    } finally {
      setBusy("");
    }
  }
  return (
    <Screen refreshing={map.loading} onRefresh={map.reload}>
      <View>
        <Text style={styles.title}>{own ? "Your map" : "Friend’s map"}</Text>
        <Text style={styles.body}>
          {own
            ? "Places you’ve captured, memories you keep."
            : "Explore the places your friend has chosen to share."}
        </Text>
      </View>
      {!!map.error && <ErrorBox message={map.error} onRetry={map.reload} />}
      {!!map.loading && !map.data.places.length ? (
        <Loading />
      ) : map.data.places.length ? (
        <>
          <MapCanvas
            key={map.data.places.map((p) => p.place.id).join(",")}
            points={map.data.places.map((p) => p.place)}
            onSelect={setSelected}
          />
          {!!entry && (
            <View style={[styles.card, { borderColor: "#713990" }]}>
              <Text
                style={{ color: colors.text, fontWeight: "700", fontSize: 18 }}
              >
                {entry.place.name}
              </Text>
              <Text style={styles.body}>{entry.place.address}</Text>
              <Button
                title="Explore place"
                onPress={() => onPlace(entry.place)}
                variant="secondary"
              />
              {!!(entry.videos.length > 0) && (
                <Button
                  title="Watch your memory"
                  icon="play-outline"
                  onPress={() => onVideo(entry.videos[0])}
                />
              )}
            </View>
          )}
          <Section title="Recorded places" />
          {map.data.places.map((item) => (
            <View key={item.place.id} style={styles.card}>
              <Pressable
                style={styles.row}
                onPress={() => {
                  setSelected(item.place.id);
                  onPlace(item.place);
                }}
              >
                <Icon name="location-outline" color={colors.accent} />
                <View style={{ flex: 1, gap: 5 }}>
                  <Text style={{ color: colors.text, fontWeight: "600" }}>
                    {item.place.name}
                  </Text>
                  <Text style={styles.muted} numberOfLines={2}>
                    {item.place.address}
                  </Text>
                  <Text style={[styles.muted, { fontSize: 11 }]}>
                    {item.place.lat.toFixed(5)}, {item.place.lng.toFixed(5)}
                  </Text>
                </View>
                <Icon name="chevron-forward" color={colors.muted} />
              </Pressable>
              {!!own && (
                <Button
                  title={
                    item.hidden
                      ? "Hidden from others · Make visible"
                      : "Hide this location from others"
                  }
                  icon={item.hidden ? "eye-off-outline" : "eye-outline"}
                  variant="secondary"
                  small
                  loading={busy === item.place.id}
                  onPress={() => void hide(item.place.id, !item.hidden)}
                />
              )}
            </View>
          ))}
        </>
      ) : !map.error ? (
        <Empty
          icon="map-outline"
          title={own ? "A map that grows with you" : "No shared locations yet"}
          description={
            own
              ? "Your approved recordings add real places to this map. You control whether friends can explore them."
              : "Your friend has no visible recorded places to share. Private and hidden locations do not appear."
          }
        />
      ) : null}
      <Text style={[styles.muted, { fontSize: 11 }]}>
        {!!own && map.data.visibility === "private"
          ? "Your map is private. Change map visibility in Settings to share with mutual friends. "
          : "Maps show recorded places. Outside does not continuously track anyone. "}
        {own
          ? "Hiding a location also hides your videos there from public discovery, saves, and direct access by other people. "
          : ""}
        Map data © OpenStreetMap contributors.
      </Text>
    </Screen>
  );
}
export function DiscoverAroundScreen({
  request,
  place,
  onPlace,
  onInvite,
}: {
  request: Request;
  place: Place;
  onPlace: (place: Place) => void;
  onInvite: (place: Place) => void;
}) {
  const nearby = useLoad(
    () => request<Place[]>(`/places/${place.id}/nearby`),
    [request, place.id],
    [],
  );
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Place[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Place | null>(null);
  const locations = results === null ? nearby.data : results;
  const points = [place, ...locations.filter((p) => p.id !== place.id)];
  async function search() {
    if (query.trim().length < 2) {
      setError("Enter at least two characters.");
      return;
    }
    setSearching(true);
    setError("");
    try {
      setResults(
        nearDestination(
          place,
          await request<Place[]>(
            `/places/search?q=${encodeURIComponent(query.trim())}&lat=${place.lat}&lng=${place.lng}`,
          ),
        ),
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Search failed.");
    } finally {
      setSearching(false);
    }
  }
  return (
    <Screen refreshing={nearby.loading} onRefresh={nearby.reload}>
      <View>
        <Text
          style={{
            color: colors.accent,
            fontSize: 10,
            fontWeight: "700",
            letterSpacing: 2,
            marginBottom: 8,
          }}
        >
          BEFORE. AFTER. OR A LITTLE DETOUR.
        </Text>
        <Text style={styles.title}>Discover around</Text>
        <Text style={styles.body}>{place.name}</Text>
      </View>
      <MapCanvas
        key={points.map((p) => p.id).join(",")}
        points={points}
        center={place}
        onSelect={(id) => setSelected(points.find((p) => p.id === id) || null)}
      />
      {!!selected && (
        <View style={[styles.card, { borderColor: "#713990" }]}>
          <Text style={{ color: colors.text, fontWeight: "700", fontSize: 18 }}>
            {selected.name}
          </Text>
          <Text style={styles.body}>{selected.address}</Text>
          <Button
            title="Explore this place"
            onPress={() => onPlace(selected)}
          />
        </View>
      )}
      <Button
        title="Watch destination updates"
        icon="play-circle-outline"
        variant="secondary"
        onPress={() => onPlace(place)}
      />
      <Section title="Find the next stop" />
      <Field
        placeholder="Coffee, restaurants, parks…"
        value={query}
        onChangeText={setQuery}
        onSubmitEditing={() => void search()}
        returnKeyType="search"
      />
      <Button
        title="Search around destination"
        icon="search-outline"
        loading={searching}
        onPress={() => void search()}
      />
      {!!(error || nearby.error) && (
        <ErrorBox
          message={error || nearby.error}
          onRetry={() => (error ? void search() : void nearby.reload())}
        />
      )}
      <Section title={results === null ? "Nearby places" : "Within 20 km"} />
      {!!nearby.loading && results === null ? (
        <Loading />
      ) : locations.length ? (
        locations.map((p) => (
          <View key={p.id} style={styles.card}>
            <Pressable onPress={() => onPlace(p)} style={styles.row}>
              <Icon name="location-outline" color={colors.accent} />
              <View style={{ flex: 1, gap: 5 }}>
                <Text
                  style={{
                    color: colors.text,
                    fontSize: 16,
                    fontWeight: "600",
                  }}
                >
                  {p.name}
                </Text>
                <Text style={styles.muted}>{p.address}</Text>
              </View>
              <Icon name="chevron-forward" color={colors.muted} />
            </Pressable>
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Button
                  title="Directions"
                  icon="navigate-outline"
                  variant="secondary"
                  small
                  onPress={() => openDirections(p)}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Button
                  title="Invite"
                  icon="people-outline"
                  variant="secondary"
                  small
                  onPress={() => onInvite(p)}
                />
              </View>
            </View>
          </View>
        ))
      ) : (
        <Empty
          icon="compass-outline"
          title="A little exploring goes a long way"
          description={
            results === null
              ? "No nearby places are indexed yet. Search for something you’d like to do around your destination."
              : "No matching places were found within 20 km. Try a specific neighborhood or a broader activity."
          }
        />
      )}
      <Text style={[styles.muted, { fontSize: 11 }]}>
        Nearby results are real map locations; distance and local indexing do
        not establish current activity. Open the place for genuine recent
        recordings. © OpenStreetMap contributors.
      </Text>
    </Screen>
  );
}
