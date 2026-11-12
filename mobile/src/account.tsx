import React, { useState } from "react";
import { Alert, Pressable, Switch, Text, View } from "react-native";
import { AvatarEditor } from "./avatar";
import {
  Account,
  MapData,
  Place,
  Preferences,
  Request,
  Video,
  categories,
  relativeTime,
} from "./types";
import {
  Avatar,
  Button,
  colors,
  Divider,
  Empty,
  ErrorBox,
  Field,
  Icon,
  Loading,
  Pill,
  Screen,
  Section,
  styles,
  useLoad,
} from "./ui";
export function ProfileScreen({
  request,
  account,
  onMap,
  onPlace,
  onVideo,
  onSettings,
  onInvitations,
  onUnlock,
}: {
  request: Request;
  account: Account;
  onMap: () => void;
  onPlace: (p: Place) => void;
  onVideo: (v: Video) => void;
  onSettings: () => void;
  onInvitations: () => void;
  onUnlock: () => void;
}) {
  const memories = useLoad(
    async () => {
      const [map, videos] = await Promise.all([
        request<MapData>("/map"),
        request<Video[]>("/me/videos"),
      ]);
      return { map, videos };
    },
    [request],
    { map: { places: [], visibility: "private" } as MapData, videos: [] },
  );
  return (
    <Screen refreshing={memories.loading} onRefresh={memories.reload}>
      <View style={{ alignItems: "center", gap: 13, paddingVertical: 14 }}>
        <Avatar
          name={account.user.name}
          uri={account.user.avatarUrl}
          size={88}
        />
        <Text style={styles.title}>{account.user.name}</Text>
        <Text style={styles.muted}>Your places. Your perspective.</Text>
      </View>
      <View style={styles.card}>
        <View style={[styles.row, { justifyContent: "space-between" }]}>
          <View style={styles.row}>
            <View
              style={{
                height: 42,
                width: 42,
                borderRadius: 14,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "#30143F",
              }}
            >
              <Icon name="map-outline" color={colors.accent} />
            </View>
            <View>
              <Text
                style={{ color: colors.text, fontWeight: "700", fontSize: 18 }}
              >
                Your map
              </Text>
              <Text style={styles.muted}>
                {account.preferences.mapVisibility === "private"
                  ? "Only you can see your map"
                  : "Shared with mutual friends"}
              </Text>
            </View>
          </View>
          <Icon name="chevron-forward" color={colors.muted} />
        </View>
        <Text style={styles.body}>
          A personal collection of the places you’ve recorded. Keep any location
          and its recordings hidden from other people whenever you choose.
        </Text>
        <Button
          title="Open your map"
          icon="map-outline"
          onPress={onMap}
          variant="secondary"
        />
      </View>
      <Section title="Recent places" />
      {!!memories.error && (
        <ErrorBox message={memories.error} onRetry={memories.reload} />
      )}
      {memories.loading ? (
        <Loading />
      ) : memories.data.map.places.length ? (
        memories.data.map.places.slice(0, 5).map((entry) => (
          <Pressable
            key={entry.place.id}
            accessibilityRole="button"
            onPress={() => onPlace(entry.place)}
            style={[styles.card, styles.row]}
          >
            <View
              style={{
                height: 43,
                width: 43,
                borderRadius: 13,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "#26192F",
              }}
            >
              <Icon name="location-outline" color={colors.accent} />
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ color: colors.text, fontWeight: "600" }}>
                {entry.place.name}
              </Text>
              <Text style={styles.muted} numberOfLines={1}>
                {entry.place.address}
              </Text>
            </View>
            {!!entry.hidden && (
              <Icon name="eye-off-outline" size={18} color={colors.muted} />
            )}
            <Icon name="chevron-forward" color={colors.muted} size={17} />
          </Pressable>
        ))
      ) : (
        <Empty
          icon="footsteps-outline"
          title="Make a little history"
          description="Once your recordings are approved, the places you’ve shared become part of your personal map."
        />
      )}
      <View
        style={[
          styles.card,
          { borderColor: "#4C2563", backgroundColor: "#1B1024" },
        ]}
      >
        <View style={styles.row}>
          <Icon name="sparkles-outline" color={colors.accent} />
          <Text style={{ color: colors.text, fontWeight: "700", fontSize: 18 }}>
            Earn more Outside
          </Text>
        </View>
        <Text style={styles.body}>
          {account.entitlements.active
            ? `Your advanced access is active until ${account.entitlements.advancedUntil ? new Date(account.entitlements.advancedUntil).toLocaleDateString() : "your current period ends"}.`
            : "Three approved quality updates earn 30 days of advanced access."}
        </Text>
        <View style={{ flexDirection: "row", gap: 8 }}>
          {[0, 1, 2].map((i) => (
            <View
              key={i}
              style={{
                flex: 1,
                height: 5,
                borderRadius: 5,
                backgroundColor:
                  i < account.entitlements.progress ? colors.accent : "#42284F",
              }}
            />
          ))}
        </View>
        <Text style={{ color: "#CBA4E0", fontSize: 12 }}>
          {account.entitlements.progress} of 3 quality updates toward your next
          unlock
        </Text>
        <Text style={[styles.muted, { fontSize: 11 }]}>
          Only reviewed, useful contributions count. Advanced discovery tools
          are not yet available in this local milestone.
        </Text>
        <Button
          title="Your earned access"
          icon="sparkles-outline"
          small
          variant="secondary"
          onPress={onUnlock}
        />
      </View>
      {!!(memories.data.videos.length > 0) && (
        <>
          <Section title="Your recordings" />
          {memories.data.videos.slice(0, 12).map((video) => (
            <View key={video.id} style={styles.card}>
              <Pressable
                onPress={() => onVideo(video)}
                style={[styles.row, { justifyContent: "space-between" }]}
              >
                <View style={{ flex: 1, gap: 5 }}>
                  <Text style={{ color: colors.text, fontWeight: "600" }}>
                    {video.place.name}
                  </Text>
                  <Text style={styles.muted}>
                    {relativeTime(video.recordedAt)} ·{" "}
                    {video.status === "pending"
                      ? "Awaiting review"
                      : video.status === "approved"
                        ? "Approved"
                        : video.status === "processing"
                          ? "Processing"
                          : video.status === "rejected"
                            ? "Not approved"
                            : "Processing failed"}
                  </Text>
                </View>
                <Icon
                  name={
                    video.status === "approved"
                      ? "checkmark-circle-outline"
                      : video.status === "failed"
                        ? "alert-circle-outline"
                        : "time-outline"
                  }
                  color={
                    video.status === "approved" ? colors.green : colors.accent
                  }
                />
              </Pressable>
              {!!video.failureReason && (
                <Text style={{ color: colors.red, fontSize: 12 }}>
                  {video.failureReason}
                </Text>
              )}
              {!!(video.status === "failed") && (
                <Button
                  title="Retry processing"
                  variant="secondary"
                  small
                  onPress={() => {
                    void request(`/videos/${video.id}/retry`, "POST", {})
                      .then(() => memories.reload())
                      .catch((e) => Alert.alert("Retry failed", e.message));
                  }}
                />
              )}
            </View>
          ))}
        </>
      )}
      <Button
        title="Your invitations"
        icon="calendar-outline"
        variant="secondary"
        onPress={onInvitations}
      />
      <Button
        title="Settings & privacy"
        icon="settings-outline"
        variant="secondary"
        onPress={onSettings}
      />
    </Screen>
  );
}
export function SettingsScreen({
  request,
  account,
  onAccount,
  onLogout,
  apiUrl,
  onServer,
  onDeleted,
}: {
  request: Request;
  account: Account;
  onAccount: (a: Partial<Account>) => void;
  onLogout: () => void;
  apiUrl: string;
  onServer: () => void;
  onDeleted: () => void;
}) {
  const [name, setName] = useState(account.user.name);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [password, setPassword] = useState("");
  const [deleteError, setDeleteError] = useState("");
  async function deleteAccount() {
    setDeleting(true);
    setDeleteError("");
    try {
      await request("/me/delete", "POST", { password });
      onDeleted();
    } catch (e) {
      setDeleteError(
        e instanceof Error ? e.message : "Could not delete your account.",
      );
    } finally {
      setDeleting(false);
    }
  }
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  async function preferences(partial: Partial<Preferences>) {
    setSaving(true);
    setError("");
    try {
      const result = await request<Preferences>(
        "/me/preferences",
        "PATCH",
        partial,
      );
      onAccount({ preferences: result });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update settings.");
    } finally {
      setSaving(false);
    }
  }
  async function updateName() {
    setSaving(true);
    setError("");
    try {
      const user = await request<Account["user"]>("/me", "PATCH", { name });
      onAccount({ user });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update your name.");
    } finally {
      setSaving(false);
    }
  }
  const rows: {
    key: keyof Pick<
      Preferences,
      | "friendRequests"
      | "friendActivity"
      | "outsideSignals"
      | "invitations"
      | "invitationResponses"
      | "invitationMessages"
    >;
    title: string;
    detail: string;
  }[] = [
    {
      key: "friendRequests",
      title: "Friend requests",
      detail: "When someone wants to connect.",
    },
    {
      key: "friendActivity",
      title: "Friend activity",
      detail: "Approved updates shared by mutual friends.",
    },
    {
      key: "outsideSignals",
      title: "Outside signals",
      detail: "When a mutual friend says they’re coming.",
    },
    {
      key: "invitations",
      title: "New invitations",
      detail: "Private plans sent to you.",
    },
    {
      key: "invitationResponses",
      title: "Invitation responses",
      detail: "When a friend accepts or declines.",
    },
    {
      key: "invitationMessages",
      title: "Invitation chat",
      detail: "Private messages about accepted plans.",
    },
  ];
  return (
    <Screen>
      {!!error && <ErrorBox message={error} />}
      <Section title="Your profile" />
      <AvatarEditor
        request={request}
        user={account.user}
        onUser={(user) => onAccount({ user })}
      />
      <Field label="Name" value={name} onChangeText={setName} maxLength={80} />
      <Button
        title="Save name"
        onPress={() => void updateName()}
        loading={saving}
        disabled={!name.trim() || name === account.user.name}
        variant="secondary"
      />
      <Section title="Location privacy" />
      <View style={styles.card}>
        <Text style={{ color: colors.text, fontWeight: "600" }}>
          Who can explore your map?
        </Text>
        <Text style={styles.body}>
          Hidden locations and your recordings there stay hidden from other
          people everywhere in Outside. Location is read only when you choose
          nearby discovery or record.
        </Text>
        <View style={styles.row}>
          <Pill
            label="Only me"
            active={account.preferences.mapVisibility === "private"}
            onPress={() =>
              !saving && void preferences({ mapVisibility: "private" })
            }
            icon="lock-closed-outline"
          />
          <Pill
            label="Mutual friends"
            active={account.preferences.mapVisibility === "friends"}
            onPress={() =>
              !saving && void preferences({ mapVisibility: "friends" })
            }
            icon="people-outline"
          />
        </View>
      </View>
      <Section title="Notifications" />
      <View style={styles.card}>
        {rows.map((row, i) => (
          <View key={row.key}>
            {!!(i > 0) && <Divider />}
            <View style={[styles.row, { paddingVertical: 8 }]}>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={{ color: colors.text, fontWeight: "600" }}>
                  {row.title}
                </Text>
                <Text style={[styles.muted, { fontSize: 11 }]}>
                  {row.detail}
                </Text>
              </View>
              <Switch
                accessibilityLabel={row.title}
                value={account.preferences[row.key]}
                disabled={saving}
                onValueChange={(value) =>
                  void preferences({ [row.key]: value })
                }
                trackColor={{ false: "#403B49", true: "#7925A7" }}
                thumbColor={
                  account.preferences[row.key] ? colors.accent : "#C2BBCB"
                }
              />
            </View>
          </View>
        ))}
        <Text style={[styles.muted, { fontSize: 11 }]}>
          These preferences control your private notification inbox. Device push
          delivery is not configured for this local build.
        </Text>
      </View>
      <Section title="Your interests" />
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {categories
          .filter((c) => c.id !== "coffee")
          .map((c) => (
            <Pill
              key={c.id}
              label={c.name}
              icon={c.icon}
              active={account.preferences.interests.includes(c.id)}
              onPress={() =>
                !saving &&
                void preferences({
                  interests: account.preferences.interests.includes(c.id)
                    ? account.preferences.interests.filter((i) => i !== c.id)
                    : [...account.preferences.interests, c.id],
                })
              }
            />
          ))}
      </View>
      <Section title="Connection" />
      <View style={styles.card}>
        <Text style={{ color: colors.text, fontWeight: "600" }}>
          Outside server
        </Text>
        <Text style={[styles.muted, { fontSize: 12 }]} selectable>
          {apiUrl}
        </Text>
        <Button
          title="Change server"
          icon="server-outline"
          variant="secondary"
          small
          onPress={onServer}
        />
      </View>
      <Button
        title="Sign out"
        variant="danger"
        icon="log-out-outline"
        onPress={onLogout}
      />
      <Section title="Your account" />
      {confirmDelete ? (
        <View style={[styles.card, { borderColor: "#64283B" }]}>
          <Text style={{ color: colors.text, fontWeight: "700", fontSize: 17 }}>
            Permanently delete your account?
          </Text>
          <Text style={styles.body}>
            Your personal videos, profile, saves, maps, friendships and messages
            will be deleted. Shared invitation details remain with your name
            replaced by “Deleted account”. This cannot be undone.
          </Text>
          <Field
            label="Confirm your password"
            placeholder="Your current password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            autoComplete="current-password"
          />
          {!!deleteError && <ErrorBox message={deleteError} />}
          <Button
            title="Permanently delete my account"
            variant="danger"
            loading={deleting}
            disabled={!password}
            onPress={() => void deleteAccount()}
          />
          <Button
            title="Keep my account"
            variant="ghost"
            disabled={deleting}
            onPress={() => {
              setConfirmDelete(false);
              setPassword("");
              setDeleteError("");
            }}
          />
        </View>
      ) : (
        <Button
          title="Delete account"
          variant="ghost"
          icon="trash-outline"
          onPress={() => setConfirmDelete(true)}
        />
      )}
      <Text style={[styles.muted, { textAlign: "center", fontSize: 11 }]}>
        Outside · Local development milestone
      </Text>
    </Screen>
  );
}
