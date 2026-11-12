import React, { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import {
  Avatar,
  Button,
  colors,
  Empty,
  ErrorBox,
  Field,
  Icon,
  Loading,
  Pill,
  Screen,
  Section,
  styles,
  useExpired,
  useLoad,
} from "./ui";

export type Request = <T>(
  path: string,
  method?: string,
  body?: unknown,
) => Promise<T>;
export type SocialPlace = {
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
type User = {
  id: string;
  name: string;
  avatarUrl: string | null;
  createdAt: string;
};
type FriendRequest = { id: string; user: User; createdAt: string };
type FriendData = {
  friends: User[];
  incoming: FriendRequest[];
  outgoing: FriendRequest[];
};
type Video = {
  id: string;
  user: User;
  place: SocialPlace;
  recordedAt: string;
  caption: string;
};
type ResponseStatus = "organizer" | "pending" | "accepted" | "declined";
type Invitation = {
  id: string;
  organizer: User;
  place: SocialPlace;
  startsAt: string;
  endsAt: string;
  note: string;
  createdAt: string;
  myResponse: ResponseStatus;
  recipients?: { user: User; response: string }[];
  chatExpiresAt: string;
};
type Message = {
  id: string;
  senderId: string;
  text: string;
  place: SocialPlace | null;
  createdAt: string;
};
type Notification = {
  id: string;
  type: string;
  title: string;
  body: string;
  resourceId: string | null;
  readAt: string | null;
  createdAt: string;
};
const emptyFriends: FriendData = { friends: [], incoming: [], outgoing: [] };
const errText = (error: unknown) =>
  error instanceof Error ? error.message : "Please try again.";
const formatDate = (date: string) =>
  new Date(date).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
const formatTime = (date: string) =>
  new Date(date).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
const timestamp = (date: string) => `${formatDate(date)} · ${formatTime(date)}`;

function PersonRow({
  user,
  subtitle,
  onPress,
  children,
}: {
  user: User;
  subtitle?: string;
  onPress?: () => void;
  children?: React.ReactNode;
}) {
  return (
    <View style={[styles.card, local.person]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Open ${user.name}'s profile`}
        onPress={onPress}
        disabled={!onPress}
        style={[styles.row, { flex: 1 }]}
      >
        <Avatar name={user.name} uri={user.avatarUrl} />
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={local.name}>{user.name}</Text>
          {!!subtitle && <Text style={styles.muted}>{subtitle}</Text>}
        </View>
      </Pressable>
      {children}
    </View>
  );
}
function PlaceRow({
  place,
  onPress,
  subtitle,
}: {
  place: SocialPlace;
  onPress: () => void;
  subtitle?: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${place.name}`}
      onPress={onPress}
      style={[styles.card, styles.row]}
    >
      <View style={local.placeIcon}>
        <Icon name="location-outline" color={colors.accent} />
      </View>
      <View style={{ flex: 1, gap: 4 }}>
        <Text style={local.name}>{place.name}</Text>
        <Text style={styles.muted} numberOfLines={2}>
          {subtitle || place.address}
        </Text>
      </View>
      <Icon name="chevron-forward" size={17} color={colors.muted} />
    </Pressable>
  );
}
function Segment({
  options,
  value,
  onChange,
}: {
  options: { id: string; title: string }[];
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <View style={local.segment}>
      {options.map((option) => (
        <Pressable
          accessibilityRole="tab"
          accessibilityState={{ selected: option.id === value }}
          key={option.id}
          onPress={() => onChange(option.id)}
          style={[
            local.segmentItem,
            option.id === value && local.segmentActive,
          ]}
        >
          <Text
            style={[
              local.segmentText,
              option.id === value && { color: colors.text },
            ]}
          >
            {option.title}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

export function FriendsScreen({
  request,
  onFriend,
  onPlace,
  onInvitations,
  onCreateInvite,
}: {
  request: Request;
  onFriend: (id: string) => void;
  onPlace: (place: SocialPlace) => void;
  onInvitations: () => void;
  onCreateInvite: () => void;
}) {
  const [tab, setTab] = useState("activity");
  const friends = useLoad(
    () => request<FriendData>("/friends"),
    [request],
    emptyFriends,
  );
  const activity = useLoad(
    () => request<Video[]>("/feed?friends=true"),
    [request],
    [],
  );
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<User[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [busy, setBusy] = useState("");
  async function search() {
    if (query.trim().length < 3) {
      setSearchError("Enter an exact email or at least 3 letters of a name.");
      return;
    }
    setSearching(true);
    setSearchError("");
    try {
      setResults(
        await request<User[]>(
          `/users/search?q=${encodeURIComponent(query.trim())}`,
        ),
      );
    } catch (error) {
      setSearchError(errText(error));
    } finally {
      setSearching(false);
    }
  }
  async function respond(id: string, response: "accepted" | "declined") {
    setBusy(id);
    try {
      await request(`/friends/requests/${id}/respond`, "POST", { response });
      await friends.reload();
    } catch (error) {
      Alert.alert("Could not update request", errText(error));
    } finally {
      setBusy("");
    }
  }
  async function addFriend(userId: string) {
    setBusy(userId);
    try {
      await request("/friends/requests", "POST", { userId });
      await friends.reload();
      Alert.alert(
        "Request sent",
        "They can accept your request to become mutual friends.",
      );
    } catch (error) {
      Alert.alert("Could not send request", errText(error));
    } finally {
      setBusy("");
    }
  }
  const knownIds = new Set([
    ...friends.data.friends.map((friend) => friend.id),
    ...friends.data.outgoing.map((item) => item.user.id),
    ...friends.data.incoming.map((item) => item.user.id),
  ]);
  return (
    <Screen
      refreshing={friends.loading || activity.loading}
      onRefresh={() => {
        void friends.reload();
        void activity.reload();
      }}
    >
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Friends</Text>
          <Text style={styles.body}>Good places. Better company.</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open invitations"
          style={local.headerIcon}
          onPress={onInvitations}
        >
          <Icon name="mail-outline" color={colors.accent} />
        </Pressable>
      </View>
      <Segment
        options={[
          { id: "activity", title: "Activity" },
          { id: "friends", title: "My friends" },
        ]}
        value={tab}
        onChange={setTab}
      />
      {tab === "activity" ? (
        <>
          {activity.error ? (
            <ErrorBox message={activity.error} onRetry={activity.reload} />
          ) : activity.loading && !activity.data.length ? (
            <Loading />
          ) : activity.data.length ? (
            <>
              <Section title="Out in the world" />
              {activity.data.map((video) => (
                <Pressable
                  key={video.id}
                  style={styles.card}
                  onPress={() => onPlace(video.place)}
                  accessibilityRole="button"
                  accessibilityLabel={`${video.user.name} at ${video.place.name}`}
                >
                  <View style={styles.row}>
                    <Avatar
                      name={video.user.name}
                      uri={video.user.avatarUrl}
                      size={40}
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={local.name}>{video.user.name}</Text>
                      <Text style={styles.muted}>
                        Recorded {timestamp(video.recordedAt)}
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.row, { paddingTop: 4 }]}>
                    <Icon name="location-outline" color={colors.accent} />
                    <Text style={[local.name, { flex: 1 }]}>
                      {video.place.name}
                    </Text>
                    <Icon
                      name="chevron-forward"
                      size={16}
                      color={colors.muted}
                    />
                  </View>
                  {!!video.caption && (
                    <Text style={styles.body}>{video.caption}</Text>
                  )}
                </Pressable>
              ))}
            </>
          ) : (
            <Empty
              icon="people-outline"
              title="Your next outing starts here"
              description="When friends share approved place updates with you, their recent activity appears here."
              action="Find your friends"
              onAction={() => setTab("friends")}
            />
          )}
          <Button
            title="Invite friends out"
            icon="add-outline"
            onPress={onCreateInvite}
          />
          <Button
            title="Your invitations"
            icon="mail-outline"
            variant="secondary"
            onPress={onInvitations}
          />
        </>
      ) : (
        <>
          <Section title="Find your people" />
          <Field
            placeholder="Name or exact email"
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            returnKeyType="search"
            onSubmitEditing={() => void search()}
          />
          <Button
            title="Find friends"
            icon="search-outline"
            variant="secondary"
            onPress={() => void search()}
            loading={searching}
          />
          {!!searchError && <ErrorBox message={searchError} />}
          {!!(results !== null) && (
            <>
              {results.length ? (
                results.map((user) => (
                  <PersonRow
                    key={user.id}
                    user={user}
                    onPress={() => onFriend(user.id)}
                  >
                    {knownIds.has(user.id) ? (
                      <Icon
                        name="checkmark-circle-outline"
                        color={colors.accent}
                      />
                    ) : (
                      <Button
                        title="Add"
                        small
                        loading={busy === user.id}
                        onPress={() => void addFriend(user.id)}
                      />
                    )}
                  </PersonRow>
                ))
              ) : (
                <Text style={styles.body}>
                  No matching people. Try their exact email.
                </Text>
              )}
            </>
          )}
          {!!friends.error && (
            <ErrorBox message={friends.error} onRetry={friends.reload} />
          )}
          {!!friends.data.incoming.length && (
            <>
              <Section title="Friend requests" />
              {friends.data.incoming.map((item) => (
                <View key={item.id} style={styles.card}>
                  <PersonRow
                    user={item.user}
                    onPress={() => onFriend(item.user.id)}
                    subtitle="Wants to be friends"
                  />
                  <View style={styles.row}>
                    <View style={{ flex: 1 }}>
                      <Button
                        title="Accept"
                        small
                        loading={busy === item.id}
                        onPress={() => void respond(item.id, "accepted")}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Button
                        title="Decline"
                        small
                        variant="secondary"
                        disabled={busy === item.id}
                        onPress={() => void respond(item.id, "declined")}
                      />
                    </View>
                  </View>
                </View>
              ))}
            </>
          )}
          <Section title="My friends" />
          {!!friends.loading && !friends.data.friends.length ? (
            <Loading />
          ) : friends.data.friends.length ? (
            friends.data.friends.map((user) => (
              <PersonRow
                key={user.id}
                user={user}
                subtitle="Mutual friends"
                onPress={() => onFriend(user.id)}
              >
                <Icon name="chevron-forward" size={17} color={colors.muted} />
              </PersonRow>
            ))
          ) : (
            !friends.error && (
              <Text style={styles.body}>
                Friendships start with a request. Find someone you know above.
              </Text>
            )
          )}
          {!!friends.data.outgoing.length && (
            <>
              <Section title="Sent requests" />
              {friends.data.outgoing.map((item) => (
                <PersonRow
                  key={item.id}
                  user={item.user}
                  subtitle="Waiting for their response"
                  onPress={() => onFriend(item.user.id)}
                >
                  <Icon name="time-outline" color={colors.muted} />
                </PersonRow>
              ))}
            </>
          )}
        </>
      )}
    </Screen>
  );
}

export function InvitationsScreen({
  request,
  userId,
  onInvitation,
  onCreate,
}: {
  request: Request;
  userId: string;
  onInvitation: (id: string) => void;
  onCreate: () => void;
}) {
  const invitations = useLoad(
    () => request<Invitation[]>("/invitations"),
    [request],
    [],
  );
  const [tab, setTab] = useState("active");
  const [busy, setBusy] = useState("");
  const list = invitations.data.filter((invitation) =>
    tab === "pending"
      ? invitation.myResponse === "pending"
      : invitation.myResponse !== "pending",
  );
  async function respond(id: string, response: "accepted" | "declined") {
    setBusy(id);
    try {
      await request(`/invitations/${id}/respond`, "POST", { response });
      await invitations.reload();
      if (response === "accepted") onInvitation(id);
    } catch (error) {
      Alert.alert("Could not update invitation", errText(error));
    } finally {
      setBusy("");
    }
  }
  return (
    <Screen refreshing={invitations.loading} onRefresh={invitations.reload}>
      <View>
        <Text style={styles.title}>Invitations</Text>
        <Text style={styles.body}>Make a plan. Go somewhere together.</Text>
      </View>
      <Button title="Create invitation" icon="add-outline" onPress={onCreate} />
      <Segment
        options={[
          { id: "active", title: "Your plans" },
          { id: "pending", title: "Pending" },
        ]}
        value={tab}
        onChange={setTab}
      />
      {!!invitations.error && (
        <ErrorBox message={invitations.error} onRetry={invitations.reload} />
      )}
      {!!invitations.loading && !invitations.data.length ? (
        <Loading />
      ) : list.length ? (
        list.map((invitation) => (
          <View key={invitation.id} style={styles.card}>
            <Pressable
              onPress={() => onInvitation(invitation.id)}
              accessibilityRole="button"
              accessibilityLabel={`Open invitation to ${invitation.place.name}`}
              style={{ gap: 13 }}
            >
              <View style={styles.row}>
                <View style={local.placeIcon}>
                  <Icon name="calendar-outline" color={colors.accent} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={local.overline}>
                    {formatDate(invitation.startsAt)} ·{" "}
                    {formatTime(invitation.startsAt)}
                  </Text>
                  <Text style={[local.name, { fontSize: 20 }]}>
                    {invitation.place.name}
                  </Text>
                </View>
                <Icon name="chevron-forward" color={colors.muted} size={18} />
              </View>
              <Text style={styles.muted}>
                {invitation.organizer.id === userId
                  ? "Organized by you"
                  : `From ${invitation.organizer.name}`}
                {invitation.myResponse !== "pending"
                  ? ` · ${invitation.myResponse === "organizer" ? "Organizer" : invitation.myResponse === "accepted" ? "Accepted" : "Declined"}`
                  : ""}
              </Text>
            </Pressable>
            {!!(invitation.myResponse === "pending") && (
              <View style={styles.row}>
                <View style={{ flex: 1 }}>
                  <Button
                    title="Accept"
                    small
                    loading={busy === invitation.id}
                    onPress={() => void respond(invitation.id, "accepted")}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Button
                    title="Decline"
                    small
                    variant="secondary"
                    disabled={busy === invitation.id}
                    onPress={() => void respond(invitation.id, "declined")}
                  />
                </View>
              </View>
            )}
          </View>
        ))
      ) : (
        !invitations.error && (
          <Empty
            icon="calendar-outline"
            title={tab === "pending" ? "All caught up" : "Room for a new plan"}
            description={
              tab === "pending"
                ? "Invitations awaiting your response appear here."
                : "Invite friends to a real place and discover what is nearby."
            }
          />
        )
      )}
    </Screen>
  );
}

function ChatThread({
  request,
  invitation,
  userId,
  peerId,
  onPlace,
}: {
  request: Request;
  invitation: Invitation;
  userId: string;
  peerId?: string;
  onPlace: (place: SocialPlace) => void;
}) {
  const query = peerId ? `?peerId=${encodeURIComponent(peerId)}` : "";
  const thread = useLoad(
    () =>
      request<{ messages: Message[]; expiresAt: string }>(
        `/invitations/${invitation.id}/messages${query}`,
      ),
    [request, invitation.id, peerId],
    { messages: [], expiresAt: invitation.chatExpiresAt },
  );
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [shareQuery, setShareQuery] = useState("");
  const [places, setPlaces] = useState<SocialPlace[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    setText("");
    setPlaces(null);
    setShareQuery("");
    setError("");
  }, [invitation.id, peerId]);
  async function send(placeId?: string) {
    if (!placeId && !text.trim()) return;
    setSending(true);
    setError("");
    try {
      await request(`/invitations/${invitation.id}/messages`, "POST", {
        ...(peerId ? { peerId } : {}),
        ...(text.trim() ? { text: text.trim() } : {}),
        ...(placeId ? { placeId } : {}),
      });
      setText("");
      setPlaces(null);
      setShareQuery("");
      await thread.reload();
    } catch (error) {
      setError(errText(error));
    } finally {
      setSending(false);
    }
  }
  async function search() {
    if (shareQuery.trim().length < 2) {
      setError("Enter a place name with at least 2 letters.");
      return;
    }
    setSearching(true);
    setError("");
    try {
      setPlaces(
        await request<SocialPlace[]>(
          `/places/search?q=${encodeURIComponent(shareQuery.trim())}&lat=${invitation.place.lat}&lng=${invitation.place.lng}`,
        ),
      );
    } catch (error) {
      setError(errText(error));
    } finally {
      setSearching(false);
    }
  }
  return (
    <>
      <Section
        title="Private conversation"
        right="Refresh"
        onPress={thread.reload}
      />
      <Text style={styles.muted}>
        Only you and{" "}
        {invitation.myResponse === "organizer"
          ? invitation.recipients?.find((item) => item.user.id === peerId)?.user
              .name || "this invitee"
          : invitation.organizer.name}
        . Visible until {timestamp(thread.data.expiresAt)}.
      </Text>
      {thread.error ? (
        <ErrorBox message={thread.error} onRetry={thread.reload} />
      ) : (
        <>
          {!!thread.loading && !thread.data.messages.length ? (
            <Loading />
          ) : thread.data.messages.length ? (
            thread.data.messages.map((message) => (
              <View
                key={message.id}
                style={[
                  local.bubble,
                  message.senderId === userId
                    ? local.myBubble
                    : local.theirBubble,
                ]}
              >
                {!!message.text && (
                  <Text style={local.messageText}>{message.text}</Text>
                )}
                {!!message.place && (
                  <Pressable
                    onPress={() => onPlace(message.place!)}
                    accessibilityRole="button"
                    accessibilityLabel={`Open shared place ${message.place.name}`}
                    style={[styles.row, { gap: 8 }]}
                  >
                    <Icon name="location-outline" color={colors.accent} />
                    <View style={{ flex: 1 }}>
                      <Text style={local.name}>{message.place.name}</Text>
                      <Text style={styles.muted}>
                        The Next Move · Open place
                      </Text>
                    </View>
                  </Pressable>
                )}
                <Text style={local.messageTime}>
                  {formatTime(message.createdAt)}
                </Text>
              </View>
            ))
          ) : (
            <Text style={styles.body}>
              A little coordination for this outing. Messages stay between the
              two of you.
            </Text>
          )}
          <Field
            placeholder="Message about this outing"
            accessibilityLabel="Private invitation message"
            value={text}
            onChangeText={setText}
            multiline
            maxLength={2000}
          />
          <Button
            title="Send message"
            icon="arrow-up-outline"
            disabled={!text.trim()}
            loading={sending}
            onPress={() => void send()}
          />
          <View style={[styles.card, { marginTop: 5 }]}>
            <View style={styles.row}>
              <Icon name="compass-outline" color={colors.accent} />
              <Text style={local.name}>The Next Move</Text>
            </View>
            <Text style={styles.body}>
              Have another place in mind? Share it privately for before or
              after.
            </Text>
            <Field
              placeholder="Find a place to share"
              value={shareQuery}
              onChangeText={setShareQuery}
              returnKeyType="search"
              onSubmitEditing={() => void search()}
            />
            <Button
              title="Find a place"
              variant="secondary"
              small
              loading={searching}
              onPress={() => void search()}
            />
            {!!(places !== null) &&
              (places.length ? (
                places.map((place) => (
                  <View key={place.id} style={{ gap: 7, paddingTop: 8 }}>
                    <Pressable onPress={() => onPlace(place)}>
                      <Text style={local.name}>{place.name}</Text>
                      <Text style={styles.muted}>{place.address}</Text>
                    </Pressable>
                    <Button
                      title="Share this place"
                      variant="secondary"
                      small
                      disabled={sending}
                      onPress={() => void send(place.id)}
                    />
                  </View>
                ))
              ) : (
                <Text style={styles.body}>
                  No places found. Try a specific name or neighborhood.
                </Text>
              ))}
          </View>
        </>
      )}
      {!!error && <ErrorBox message={error} />}
    </>
  );
}

export function InviteDetailScreen({
  request,
  id,
  userId,
  onPlace,
  onDiscover,
}: {
  request: Request;
  id: string;
  userId: string;
  onPlace: (place: SocialPlace) => void;
  onDiscover: (place: SocialPlace) => void;
}) {
  const invitation = useLoad(
    () => request<Invitation>(`/invitations/${id}`),
    [request, id],
    null as Invitation | null,
  );
  const [busy, setBusy] = useState(false);
  const [peerId, setPeerId] = useState<string | undefined>();
  const data = invitation.data;
  const chatExpired = useExpired(data?.chatExpiresAt);
  const accepted =
    data?.recipients?.filter((item) => item.response === "accepted") || [];
  const activePeer = accepted.some((item) => item.user.id === peerId)
    ? peerId
    : accepted[0]?.user.id;
  async function respond(response: "accepted" | "declined") {
    setBusy(true);
    try {
      invitation.setData(
        await request<Invitation>(`/invitations/${id}/respond`, "POST", {
          response,
        }),
      );
    } catch (error) {
      Alert.alert("Could not update invitation", errText(error));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen refreshing={invitation.loading} onRefresh={invitation.reload}>
      {!!invitation.error && (
        <ErrorBox message={invitation.error} onRetry={invitation.reload} />
      )}
      {!data ? (
        invitation.loading ? (
          <Loading />
        ) : null
      ) : (
        <>
          <View style={local.invitationHero}>
            <View style={local.bigIcon}>
              <Icon name="calendar-outline" size={36} color={colors.accent} />
            </View>
            <Text style={local.overline}>YOU'RE GOING OUTSIDE</Text>
            <Text style={[styles.title, { textAlign: "center" }]}>
              {data.place.name}
            </Text>
            <Text style={[styles.body, { textAlign: "center" }]}>
              {data.place.address}
            </Text>
            <Pill
              label={
                data.myResponse === "organizer"
                  ? "Organized by you"
                  : data.myResponse === "pending"
                    ? "Awaiting your response"
                    : data.myResponse === "accepted"
                      ? "Accepted"
                      : "Declined"
              }
              active={data.myResponse === "accepted"}
            />
          </View>
          <View style={styles.card}>
            <View style={styles.row}>
              <Icon name="time-outline" color={colors.accent} />
              <View style={{ flex: 1 }}>
                <Text style={local.name}>{formatDate(data.startsAt)}</Text>
                <Text style={styles.body}>
                  {formatTime(data.startsAt)} – {formatTime(data.endsAt)}
                  {formatDate(data.startsAt) !== formatDate(data.endsAt)
                    ? ` · ends ${formatDate(data.endsAt)}`
                    : ""}
                </Text>
              </View>
            </View>
            <View style={styles.row}>
              <Avatar
                name={data.organizer.name}
                uri={data.organizer.avatarUrl}
                size={36}
              />
              <Text style={styles.body}>
                Organized by{" "}
                {data.organizer.id === userId ? "you" : data.organizer.name}
              </Text>
            </View>
            {!!data.note && <Text style={styles.text}>{data.note}</Text>}
          </View>
          {!!(data.myResponse === "pending") && (
            <View style={styles.row}>
              <View style={{ flex: 1 }}>
                <Button
                  title="Accept invitation"
                  loading={busy}
                  onPress={() => void respond("accepted")}
                />
              </View>
              <Button
                title="Decline"
                variant="secondary"
                disabled={busy}
                onPress={() => void respond("declined")}
              />
            </View>
          )}
          <Button
            title="Discover around here"
            icon="compass-outline"
            onPress={() => onDiscover(data.place)}
          />
          <Button
            title="Open destination"
            icon="location-outline"
            variant="secondary"
            onPress={() => onPlace(data.place)}
          />
          {!!(data.myResponse === "organizer" && data.recipients) && (
            <>
              <Section title="Private responses" />
              {data.recipients.map((item) => (
                <PersonRow
                  key={item.user.id}
                  user={item.user}
                  subtitle={
                    item.response === "accepted"
                      ? "Accepted"
                      : item.response === "declined"
                        ? "Declined"
                        : "Awaiting response"
                  }
                >
                  {item.response === "accepted" ? (
                    <Icon
                      name="checkmark-circle-outline"
                      color={colors.green}
                    />
                  ) : (
                    <Icon name="time-outline" color={colors.muted} />
                  )}
                </PersonRow>
              ))}
            </>
          )}
          {chatExpired ? (
            <View style={styles.card}>
              <Text style={local.name}>This outing's chat has closed</Text>
              <Text style={styles.body}>
                The conversation disappears 24 hours after the outing ends. Your
                invitation details stay here.
              </Text>
            </View>
          ) : data.myResponse === "accepted" ||
            (data.myResponse === "organizer" && accepted.length > 0) ? (
            <>
              {!!(data.myResponse === "organizer") && (
                <>
                  <Section title="Choose a conversation" />
                  <View style={[styles.row, { flexWrap: "wrap" }]}>
                    {accepted.map((item) => (
                      <Pill
                        key={item.user.id}
                        label={item.user.name}
                        active={activePeer === item.user.id}
                        onPress={() => setPeerId(item.user.id)}
                      />
                    ))}
                  </View>
                </>
              )}
              <ChatThread
                key={`${id}:${activePeer || "recipient"}`}
                request={request}
                invitation={data}
                userId={userId}
                peerId={
                  data.myResponse === "organizer" ? activePeer : undefined
                }
                onPlace={onPlace}
              />
            </>
          ) : (
            <Text style={styles.muted}>
              {data.myResponse === "organizer"
                ? "A separate private conversation opens with each friend who accepts."
                : "Accept the invitation to open a private conversation with the organizer."}
            </Text>
          )}
        </>
      )}
    </Screen>
  );
}

function tomorrowDate() {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function localDateTime(date: string, time: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time))
    return null;
  const parsed = new Date(`${date}T${time}:00`);
  if (!Number.isFinite(parsed.getTime())) return null;
  const normalized = `${parsed.getFullYear()}-${String(parsed.getMonth() + 1).padStart(2, "0")}-${String(parsed.getDate()).padStart(2, "0")}`;
  return normalized === date &&
    parsed.getHours() === Number(time.slice(0, 2)) &&
    parsed.getMinutes() === Number(time.slice(3))
    ? parsed
    : null;
}
export function CreateInvitationScreen({
  request,
  initialPlace,
  onCreated,
}: {
  request: Request;
  initialPlace?: SocialPlace;
  onCreated: (id: string) => void;
}) {
  const friends = useLoad(
    () => request<FriendData>("/friends"),
    [request],
    emptyFriends,
  );
  const [place, setPlace] = useState<SocialPlace | undefined>(initialPlace);
  const [query, setQuery] = useState("");
  const [places, setPlaces] = useState<SocialPlace[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [recipientIds, setRecipientIds] = useState<string[]>([]);
  const [date, setDate] = useState(tomorrowDate);
  const [endDate, setEndDate] = useState(tomorrowDate);
  const [start, setStart] = useState("19:00");
  const [end, setEnd] = useState("21:00");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);
  async function search() {
    if (query.trim().length < 2) {
      setError("Enter a place name with at least 2 letters.");
      return;
    }
    setSearching(true);
    setError("");
    try {
      setPlaces(
        await request<SocialPlace[]>(
          `/places/search?q=${encodeURIComponent(query.trim())}`,
        ),
      );
    } catch (error) {
      setError(errText(error));
    } finally {
      setSearching(false);
    }
  }
  async function create() {
    const startsAt = localDateTime(date.trim(), start.trim());
    const endsAt = localDateTime(endDate.trim(), end.trim());
    if (!place) {
      setError("Choose a real place for your outing.");
      return;
    }
    if (!recipientIds.length) {
      setError("Choose at least one mutual friend.");
      return;
    }
    if (!startsAt || !endsAt) {
      setError("Use dates as YYYY-MM-DD and 24-hour times as HH:MM.");
      return;
    }
    if (startsAt.getTime() <= Date.now() || endsAt <= startsAt) {
      setError("Choose a future start and an end after the start.");
      return;
    }
    setSending(true);
    setError("");
    try {
      const invitation = await request<Invitation>("/invitations", "POST", {
        placeId: place.id,
        startsAt: startsAt.toISOString(),
        endsAt: endsAt.toISOString(),
        recipientIds,
        note: note.trim(),
      });
      onCreated(invitation.id);
    } catch (error) {
      setError(errText(error));
    } finally {
      setSending(false);
    }
  }
  return (
    <Screen>
      <View>
        <Text style={styles.title}>Make a plan</Text>
        <Text style={styles.body}>
          One place. Your people. Something to look forward to.
        </Text>
      </View>
      <Section title="Where are we going?" />
      {place ? (
        <View style={styles.card}>
          <View style={styles.row}>
            <Icon name="location-outline" color={colors.accent} />
            <View style={{ flex: 1 }}>
              <Text style={local.name}>{place.name}</Text>
              <Text style={styles.muted}>{place.address}</Text>
            </View>
          </View>
          <Button
            title="Choose another place"
            variant="ghost"
            small
            onPress={() => setPlace(undefined)}
          />
        </View>
      ) : (
        <>
          <Field
            placeholder="Search a place or address"
            value={query}
            onChangeText={setQuery}
            returnKeyType="search"
            onSubmitEditing={() => void search()}
          />
          <Button
            title="Search places"
            icon="search-outline"
            variant="secondary"
            loading={searching}
            onPress={() => void search()}
          />
          {!!(places !== null) &&
            (places.length ? (
              places.map((item) => (
                <PlaceRow
                  key={item.id}
                  place={item}
                  onPress={() => {
                    setPlace(item);
                    setPlaces(null);
                  }}
                />
              ))
            ) : (
              <Text style={styles.body}>
                No places found. Try adding the city.
              </Text>
            ))}
        </>
      )}
      <Section title="When?" />
      <Text style={styles.muted}>Times use your device's local timezone.</Text>
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Field
            label="Start date · YYYY-MM-DD"
            value={date}
            onChangeText={setDate}
            autoCapitalize="none"
            keyboardType="numbers-and-punctuation"
          />
        </View>
        <View style={{ width: 100 }}>
          <Field
            label="Time · HH:MM"
            value={start}
            onChangeText={setStart}
            keyboardType="numbers-and-punctuation"
          />
        </View>
      </View>
      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <Field
            label="End date · YYYY-MM-DD"
            value={endDate}
            onChangeText={setEndDate}
            autoCapitalize="none"
            keyboardType="numbers-and-punctuation"
          />
        </View>
        <View style={{ width: 100 }}>
          <Field
            label="Time · HH:MM"
            value={end}
            onChangeText={setEnd}
            keyboardType="numbers-and-punctuation"
          />
        </View>
      </View>
      <Section title="Who's coming?" />
      <Text style={styles.muted}>
        Invite up to 20 mutual friends. Each responds privately.
      </Text>
      {friends.error ? (
        <ErrorBox message={friends.error} onRetry={friends.reload} />
      ) : friends.loading ? (
        <Loading />
      ) : friends.data.friends.length ? (
        friends.data.friends.map((friend) => (
          <Pressable
            accessibilityRole="checkbox"
            accessibilityState={{ checked: recipientIds.includes(friend.id) }}
            aria-checked={recipientIds.includes(friend.id)}
            accessibilityLabel={friend.name}
            key={friend.id}
            style={[
              styles.card,
              styles.row,
              recipientIds.includes(friend.id) && {
                borderColor: colors.purple,
              },
            ]}
            onPress={() =>
              setRecipientIds((current) =>
                current.includes(friend.id)
                  ? current.filter((id) => id !== friend.id)
                  : current.length < 20
                    ? [...current, friend.id]
                    : current,
              )
            }
          >
            <Avatar name={friend.name} uri={friend.avatarUrl} size={38} />
            <Text style={[local.name, { flex: 1 }]}>{friend.name}</Text>
            <Icon
              name={
                recipientIds.includes(friend.id)
                  ? "checkmark-circle"
                  : "ellipse-outline"
              }
              color={
                recipientIds.includes(friend.id) ? colors.accent : colors.muted
              }
            />
          </Pressable>
        ))
      ) : (
        <Text style={styles.body}>
          Add a friend and have them accept your request before inviting them.
        </Text>
      )}
      <Field
        label="A note for your friends · optional"
        placeholder="What's the plan?"
        multiline
        value={note}
        onChangeText={setNote}
        maxLength={1000}
      />
      {!!error && <ErrorBox message={error} />}
      <Button
        title="Send invitation"
        icon="paper-plane-outline"
        loading={sending}
        disabled={!place || !recipientIds.length}
        onPress={() => void create()}
      />
      <Text style={[styles.muted, { textAlign: "center" }]}>
        Private invitations. Separate conversations with each friend.
      </Text>
    </Screen>
  );
}

export function FriendProfileScreen({
  request,
  id,
  onPlace,
  onMap,
}: {
  request: Request;
  id: string;
  onPlace: (place: SocialPlace) => void;
  onMap?: (userId: string) => void;
}) {
  const profile = useLoad(
    () =>
      request<{
        user: User;
        friendship: "self" | "friends" | "incoming" | "outgoing" | "none";
        recentPlaces: SocialPlace[];
      }>(`/users/${id}`),
    [request, id],
    null as {
      user: User;
      friendship: "self" | "friends" | "incoming" | "outgoing" | "none";
      recentPlaces: SocialPlace[];
    } | null,
  );
  const [busy, setBusy] = useState(false);
  async function add() {
    setBusy(true);
    try {
      await request("/friends/requests", "POST", { userId: id });
      await profile.reload();
    } catch (error) {
      Alert.alert("Could not send friend request", errText(error));
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    Alert.alert(
      "Remove friend?",
      "You will no longer share friend-only videos, maps or new invitations with each other.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove",
          style: "destructive",
          onPress: async () => {
            setBusy(true);
            try {
              await request(`/friends/${id}`, "DELETE");
              await profile.reload();
            } catch (error) {
              Alert.alert("Could not remove friend", errText(error));
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );
  }
  const data = profile.data;
  return (
    <Screen refreshing={profile.loading} onRefresh={profile.reload}>
      {!!profile.error && (
        <ErrorBox message={profile.error} onRetry={profile.reload} />
      )}
      {!data ? (
        profile.loading ? (
          <Loading />
        ) : null
      ) : (
        <>
          <View style={local.profileHeader}>
            <Avatar name={data.user.name} uri={data.user.avatarUrl} size={96} />
            <Text style={styles.title}>{data.user.name}</Text>
            <Pill
              label={
                data.friendship === "friends"
                  ? "Friends"
                  : data.friendship === "outgoing"
                    ? "Request sent"
                    : data.friendship === "incoming"
                      ? "Sent you a request"
                      : data.friendship === "self"
                        ? "You"
                        : "Not connected yet"
              }
              icon={
                data.friendship === "friends"
                  ? "checkmark-circle-outline"
                  : "person-outline"
              }
              active={data.friendship === "friends"}
            />
          </View>
          {!!(data.friendship === "none") && (
            <Button
              title="Send friend request"
              icon="person-add-outline"
              loading={busy}
              onPress={() => void add()}
            />
          )}
          <Section
            title={
              data.friendship === "self"
                ? "Your Map"
                : `${data.user.name.split(" ")[0]}'s Map`
            }
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open shared map"
            disabled={!onMap || !["friends", "self"].includes(data.friendship)}
            onPress={() => onMap?.(id)}
            style={local.mapCard}
          >
            <View style={local.mapGrid}>
              <View
                style={[
                  local.mapLine,
                  { left: "25%", transform: [{ rotate: "28deg" }] },
                ]}
              />
              <View
                style={[
                  local.mapLine,
                  { left: "70%", transform: [{ rotate: "-30deg" }] },
                ]}
              />
              <View
                style={[
                  local.mapLine,
                  { width: "100%", height: 1, left: 0, top: "40%" },
                ]}
              />
              <View
                style={[
                  local.mapLine,
                  { width: "100%", height: 1, left: 0, top: "72%" },
                ]}
              />
            </View>
            <View style={local.bigIcon}>
              <Icon name="map-outline" color={colors.accent} size={32} />
            </View>
            <Text style={local.name}>Explore recorded places</Text>
            <Text style={[styles.muted, { textAlign: "center" }]}>
              {["friends", "self"].includes(data.friendship)
                ? "Open the map to see places they choose to share."
                : "Maps are shared between mutual friends, when enabled."}
            </Text>
            {!!(!!onMap && ["friends", "self"].includes(data.friendship)) && (
              <Text style={{ color: colors.accent, fontWeight: "700" }}>
                Open map →
              </Text>
            )}
          </Pressable>
          <Section title="Recent Places" />
          {data.recentPlaces.length ? (
            data.recentPlaces.map((place) => (
              <PlaceRow
                key={place.id}
                place={place}
                onPress={() => onPlace(place)}
              />
            ))
          ) : (
            <Text style={styles.body}>
              {data.friendship === "friends"
                ? "No recorded places are shared with you yet."
                : "Shared places appear here when you are friends and map sharing is enabled."}
            </Text>
          )}
          {!!(data.friendship === "friends") && (
            <Button
              title="Remove friend"
              variant="ghost"
              loading={busy}
              onPress={() => void remove()}
            />
          )}
        </>
      )}
    </Screen>
  );
}

export function NotificationsScreen({
  request,
  onInvitation,
  onFriend,
  onPlace,
  onFriends,
}: {
  request: Request;
  onInvitation: (id: string) => void;
  onFriend: (id: string) => void;
  onPlace: (place: SocialPlace) => void;
  onFriends?: () => void;
}) {
  const notifications = useLoad(
    () => request<Notification[]>("/notifications"),
    [request],
    [],
  );
  const [busy, setBusy] = useState("");
  async function open(notification: Notification) {
    setBusy(notification.id);
    try {
      if (!notification.readAt) {
        await request(`/notifications/${notification.id}/read`, "POST", {});
        notifications.setData((current) =>
          current.map((item) =>
            item.id === notification.id
              ? { ...item, readAt: new Date().toISOString() }
              : item,
          ),
        );
      }
      if (!notification.resourceId) return;
      if (notification.type.startsWith("invitation"))
        onInvitation(notification.resourceId);
      else if (notification.type === "friend_request") onFriends?.();
      else if (notification.type === "friend_accepted")
        onFriend(notification.resourceId);
      else if (
        notification.type === "friend_activity" ||
        notification.type === "signal"
      ) {
        const video = await request<{ place: SocialPlace }>(
          `/videos/${notification.resourceId}`,
        );
        onPlace(video.place);
      }
    } catch (error) {
      Alert.alert("Could not open update", errText(error));
    } finally {
      setBusy("");
    }
  }
  return (
    <Screen refreshing={notifications.loading} onRefresh={notifications.reload}>
      <View>
        <Text style={styles.title}>Notifications</Text>
        <Text style={styles.body}>The updates that bring you together.</Text>
      </View>
      {!!notifications.error && (
        <ErrorBox
          message={notifications.error}
          onRetry={notifications.reload}
        />
      )}
      {!!notifications.loading && !notifications.data.length ? (
        <Loading />
      ) : notifications.data.length ? (
        notifications.data.map((notification) => (
          <Pressable
            disabled={busy === notification.id}
            accessibilityRole="button"
            accessibilityLabel={`${notification.readAt ? "" : "Unread. "}${notification.title}. ${notification.body}`}
            key={notification.id}
            style={[
              styles.card,
              styles.row,
              !notification.readAt && { borderColor: "#623080" },
            ]}
            onPress={() => void open(notification)}
          >
            <View
              style={[
                local.placeIcon,
                {
                  backgroundColor: notification.readAt
                    ? colors.raised
                    : "#2B153B",
                },
              ]}
            >
              <Icon
                name={
                  notification.type.startsWith("invitation")
                    ? "mail-outline"
                    : notification.type.startsWith("friend")
                      ? "people-outline"
                      : "notifications-outline"
                }
                color={notification.readAt ? colors.muted : colors.accent}
              />
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={local.name}>{notification.title}</Text>
              <Text style={styles.body}>{notification.body}</Text>
              <Text style={styles.muted}>
                {timestamp(notification.createdAt)}
              </Text>
            </View>
            {!notification.readAt && <View style={local.unreadDot} />}
          </Pressable>
        ))
      ) : (
        !notifications.error && (
          <Empty
            icon="notifications-outline"
            title="A little quiet out here"
            description="Friend requests, invitations and private outing updates appear here."
          />
        )
      )}
    </Screen>
  );
}

const local = StyleSheet.create({
  person: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  name: { color: colors.text, fontSize: 15, fontWeight: "600", lineHeight: 22 },
  overline: {
    color: colors.accent,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  headerIcon: {
    height: 45,
    width: 45,
    borderRadius: 15,
    borderColor: colors.line,
    borderWidth: 1,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  placeIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: "#281337",
    alignItems: "center",
    justifyContent: "center",
  },
  segment: {
    flexDirection: "row",
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 4,
    borderRadius: 14,
    gap: 4,
  },
  segmentItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 10,
  },
  segmentActive: { backgroundColor: "#382046" },
  segmentText: { color: colors.muted, fontWeight: "600", fontSize: 14 },
  invitationHero: { alignItems: "center", gap: 14, paddingVertical: 15 },
  bigIcon: {
    width: 78,
    height: 78,
    borderRadius: 26,
    backgroundColor: "#24122F",
    borderWidth: 1,
    borderColor: "#47225C",
    justifyContent: "center",
    alignItems: "center",
  },
  profileHeader: { alignItems: "center", gap: 16, paddingVertical: 16 },
  mapCard: {
    borderRadius: 21,
    backgroundColor: "#131318",
    borderColor: colors.line,
    borderWidth: 1,
    overflow: "hidden",
    alignItems: "center",
    padding: 25,
    gap: 15,
    minHeight: 230,
  },
  mapGrid: { ...StyleSheet.absoluteFillObject, opacity: 0.6 },
  mapLine: {
    position: "absolute",
    height: "150%",
    width: 1,
    top: "-20%",
    backgroundColor: "#34303F",
  },
  bubble: {
    maxWidth: "90%",
    padding: 15,
    gap: 8,
    borderRadius: 17,
    borderWidth: 1,
  },
  myBubble: {
    alignSelf: "flex-end",
    backgroundColor: "#351647",
    borderColor: "#5C257A",
    borderBottomRightRadius: 4,
  },
  theirBubble: {
    alignSelf: "flex-start",
    backgroundColor: colors.surface,
    borderColor: colors.line,
    borderBottomLeftRadius: 4,
  },
  messageText: { color: colors.text, fontSize: 15, lineHeight: 23 },
  messageTime: { color: colors.muted, fontSize: 11, textAlign: "right" },
  unreadDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: colors.accent,
  },
});
