import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Alert,
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Constants from "expo-constants";
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Account, Place, Saved, User, Video } from "./src/types";
import {
  createRequest,
  normalizeApiUrl,
  readApiUrl,
  readSession,
  saveApiUrl,
  saveSession,
  sessionMatchesServer,
  Session,
} from "./src/api";
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
  MediaContext,
  Screen,
  styles,
} from "./src/ui";
import {
  DiscoveryProps,
  HomeScreen,
  PlaceScreen,
  SearchScreen,
  VideoScreen,
} from "./src/discovery";
import { ProfileScreen, SettingsScreen } from "./src/account";
import {
  FriendsScreen,
  FriendProfileScreen,
  InvitationsScreen,
  InviteDetailScreen,
  CreateInvitationScreen,
  NotificationsScreen,
} from "./src/social";
import { PlacesMapScreen, DiscoverAroundScreen } from "./src/maps";
import { RecordScreen } from "./src/recording";
import { UnlockScreen } from "./src/unlock";
import { BrandMark } from "./src/BrandMark";
type Tab = "home" | "search" | "friends" | "profile";
type Route =
  | { name: "place"; place: Place }
  | { name: "video"; video: Video }
  | { name: "record"; place?: Place }
  | { name: "chooseRecordPlace" }
  | { name: "friend"; id: string }
  | { name: "invitations" }
  | { name: "invitation"; id: string }
  | { name: "createInvitation"; place?: Place }
  | { name: "notifications" }
  | { name: "map"; userId?: string }
  | { name: "around"; place: Place }
  | { name: "unlock" }
  | { name: "settings" }
  | { name: "server" }
  | { name: "search"; query?: string };
const initialSaved: Saved = { places: [], videos: [], searches: [] };
const routeTitles: Record<Route["name"], string> = {
  place: "The place",
  video: "A perspective",
  record: "Record outside",
  chooseRecordPlace: "Choose your place",
  friend: "Friend profile",
  invitations: "Invitations",
  invitation: "Your plan",
  createInvitation: "Make a plan",
  notifications: "Notifications",
  map: "Your places",
  around: "Discover around",
  unlock: "Earn more Outside",
  settings: "Settings & privacy",
  server: "Server connection",
  search: "Discover",
};
function ConnectionScreen({
  initial,
  onConnected,
  onBack,
}: {
  initial: string;
  onConnected: (url: string) => Promise<void>;
  onBack?: () => void;
}) {
  const [url, setUrl] = useState(initial);
  const active = useRef(true);
  const busy = useRef(false);
  useEffect(
    () => () => {
      active.current = false;
    },
    [],
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  async function connect() {
    if (busy.current) return;
    busy.current = true;
    setLoading(true);
    setError("");
    try {
      const normalized = normalizeApiUrl(url);
      await createRequest(normalized, null)("/health");
      if (active.current) await onConnected(normalized);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Could not connect to this server.",
      );
    } finally {
      busy.current = false;
      if (active.current) setLoading(false);
    }
  }
  return (
    <Screen>
      <LinearGradient colors={["#2F143F", "#141019"]} style={a.welcomeArt}>
        <View style={a.logoLarge}>
          <BrandMark size={50} color="#D9AAFF" />
        </View>
        <Text style={[styles.title, { fontSize: 35, textAlign: "center" }]}>
          A little more outside.
        </Text>
        <Text style={[styles.body, { textAlign: "center", maxWidth: 290 }]}>
          Find real places. See fresh perspectives. Make a plan with your
          people.
        </Text>
      </LinearGradient>
      <Text style={{ color: colors.text, fontWeight: "700", fontSize: 22 }}>
        Connect to Outside
      </Text>
      <Text style={styles.body}>
        This local build connects to your own Outside server. Enter its HTTPS
        address or a local network development address.
      </Text>
      <Field
        label="Server address"
        placeholder="https://outside.example.com"
        value={url}
        onChangeText={setUrl}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        returnKeyType="go"
        onSubmitEditing={() => void connect()}
      />
      {!!error && <ErrorBox message={error} />}
      <Button
        title="Connect server"
        icon="arrow-forward-outline"
        loading={loading}
        disabled={!url.trim()}
        onPress={() => void connect()}
      />
      {!!onBack && <Button title="Back" variant="ghost" onPress={onBack} />}
      <View style={styles.card}>
        <Text style={{ color: colors.text, fontWeight: "600" }}>
          Running the server on your computer?
        </Text>
        <Text style={[styles.muted, { fontSize: 12 }]}>
          Use http://YOUR-LAN-IP:8787 on a physical phone, or
          http://10.0.2.2:8787 in the Android emulator. Your phone and computer
          must be on the same network. Changing servers signs you out.
        </Text>
      </View>
    </Screen>
  );
}
function AuthScreen({
  apiUrl,
  onAuthenticated,
  onServer,
}: {
  apiUrl: string;
  onAuthenticated: (session: Session) => Promise<void>;
  onServer: () => void;
}) {
  const [register, setRegister] = useState(false);
  const active = useRef(true);
  const busy = useRef(false);
  useEffect(
    () => () => {
      active.current = false;
    },
    [],
  );
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  async function submit() {
    if (busy.current) return;
    busy.current = true;
    setLoading(true);
    setError("");
    try {
      const result = await createRequest(apiUrl, null)<{
        token: string;
        user: User;
      }>(register ? "/auth/register" : "/auth/login", "POST", {
        email: email.trim(),
        password,
        ...(register ? { name: name.trim() } : {}),
      });
      const session = { token: result.token, userId: result.user.id, apiUrl };
      if (active.current) await onAuthenticated(session);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not sign in.");
    } finally {
      busy.current = false;
      if (active.current) setLoading(false);
    }
  }
  return (
    <Screen>
      <LinearGradient
        colors={["#2A1539", "#121016"]}
        style={[a.welcomeArt, { minHeight: 250 }]}
      >
        <View style={a.logoLarge}>
          <BrandMark size={50} color="#D9AAFF" />
        </View>
        <Text style={[styles.title, { fontSize: 38 }]}>
          outside<Text style={{ color: colors.accent }}>.</Text>
        </Text>
        <Text style={[styles.body, { textAlign: "center" }]}>
          Your next good story starts out there.
        </Text>
      </LinearGradient>
      <View style={{ gap: 6 }}>
        <Text style={styles.title}>
          {register ? "Make room for more." : "Welcome back."}
        </Text>
        <Text style={styles.body}>
          {register
            ? "Create your account and find somewhere worth going."
            : "Good places. Real perspectives. Your people."}
        </Text>
      </View>
      {!!register && (
        <Field
          label="Your name"
          placeholder="What should friends call you?"
          value={name}
          onChangeText={setName}
          maxLength={80}
          autoComplete="name"
        />
      )}
      <Field
        label="Email"
        placeholder="you@example.com"
        value={email}
        onChangeText={setEmail}
        keyboardType="email-address"
        autoCapitalize="none"
        autoCorrect={false}
        autoComplete="email"
      />
      <Field
        label="Password"
        placeholder={register ? "At least 10 characters" : "Your password"}
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        autoCapitalize="none"
        autoComplete={register ? "new-password" : "current-password"}
        onSubmitEditing={() => void submit()}
        returnKeyType="go"
      />
      {!!error && <ErrorBox message={error} />}
      <Button
        title={register ? "Create account" : "Sign in"}
        loading={loading}
        disabled={
          !email.trim() ||
          !password ||
          (register && (!name.trim() || password.length < 10))
        }
        icon="arrow-forward-outline"
        onPress={() => void submit()}
      />
      <Button
        title={
          register
            ? "Already have an account? Sign in"
            : "New to Outside? Create account"
        }
        variant="ghost"
        onPress={() => {
          setRegister(!register);
          setError("");
        }}
      />
      <Pressable onPress={onServer} accessibilityRole="button">
        <Text style={[styles.muted, { textAlign: "center", fontSize: 11 }]}>
          Connected to {apiUrl.replace(/\/api$/, "")} · Change
        </Text>
      </Pressable>
    </Screen>
  );
}
function AppContent() {
  const insets = useSafeAreaInsets();
  const authGeneration = useRef(0);
  const generation = authGeneration.current;
  const [booting, setBooting] = useState(true);
  const [apiUrl, setApiUrl] = useState("");
  const [session, setSession] = useState<Session | null>(null);
  const [account, setAccount] = useState<Account | null>(null);
  const [accountError, setAccountError] = useState("");
  const [tab, setTab] = useState<Tab>("home");
  const [routes, setRoutes] = useState<Route[]>([]);
  const [saved, setSaved] = useState<Saved>(initialSaved);
  const [savedError, setSavedError] = useState("");
  const [unread, setUnread] = useState(false);
  const [showConnection, setShowConnection] = useState(false);
  const [accountLoading, setAccountLoading] = useState(false);
  const clearSession = useCallback(() => {
    authGeneration.current++;
    void saveSession(null).catch(() =>
      Alert.alert(
        "Session storage",
        "Your local session could not be removed. Try signing out again before closing the app.",
      ),
    );
    setSession(null);
    setAccount(null);
    setSaved(initialSaved);
    setSavedError("");
    setUnread(false);
    setRoutes([]);
    setTab("home");
  }, []);
  const request = useMemo(
    () =>
      createRequest(apiUrl, session?.token || null, () => {
        if (generation === authGeneration.current) clearSession();
      }),
    [apiUrl, session?.token, clearSession, generation],
  );
  useEffect(() => {
    let active = true;
    void Promise.all([readApiUrl(), readSession()])
      .then(async ([storedUrl, storedSession]) => {
        if (!active || authGeneration.current !== 0) return;
        const configured =
          storedUrl || Constants.expoConfig?.extra?.apiUrl || "";
        let normalized = "";
        try {
          if (configured) normalized = normalizeApiUrl(configured);
        } catch {}
        setApiUrl(normalized);
        if (sessionMatchesServer(storedSession, normalized))
          setSession(storedSession);
        else if (storedSession) await saveSession(null).catch(() => undefined);
      })
      .finally(() => {
        if (active) setBooting(false);
      });
    return () => {
      active = false;
    };
  }, []);
  const reloadAccount = useCallback(async () => {
    if (!session || !apiUrl || generation !== authGeneration.current) return;
    setAccountLoading(true);
    setAccountError("");
    try {
      const result = await request<Account>("/me");
      if (generation === authGeneration.current) setAccount(result);
    } catch (e) {
      if (generation === authGeneration.current)
        setAccountError(
          e instanceof Error ? e.message : "Could not load your account.",
        );
    } finally {
      if (generation === authGeneration.current) setAccountLoading(false);
    }
  }, [request, session?.userId, apiUrl, generation]);
  const reloadSaved = useCallback(async () => {
    if (!session || !apiUrl || generation !== authGeneration.current) return;
    try {
      const result = await request<Saved>("/saves");
      if (generation === authGeneration.current) {
        setSaved(result);
        setSavedError("");
      }
    } catch (e) {
      if (generation === authGeneration.current) {
        setSaved(initialSaved);
        setSavedError(
          e instanceof Error ? e.message : "Saved items could not be loaded.",
        );
      }
    }
  }, [request, session?.userId, apiUrl, generation]);
  const reloadNotifications = useCallback(async () => {
    if (!session || !apiUrl || generation !== authGeneration.current) return;
    try {
      const list = await request<{ readAt: string | null }[]>("/notifications");
      if (generation === authGeneration.current)
        setUnread(list.some((n) => !n.readAt));
    } catch {}
  }, [request, session?.userId, apiUrl, generation]);
  useEffect(() => {
    void reloadAccount();
    void reloadSaved();
    void reloadNotifications();
  }, [reloadAccount, reloadSaved, reloadNotifications]);
  async function authenticatedSession(next: Session) {
    if (generation !== authGeneration.current || next.apiUrl !== apiUrl) return;
    await saveSession(next);
    if (generation !== authGeneration.current) return;
    authGeneration.current++;
    setAccount(null);
    setSaved(initialSaved);
    setSession(next);
    setRoutes([]);
    setTab("home");
  }
  const route = routes[routes.length - 1];
  const back = useCallback(() => setRoutes((value) => value.slice(0, -1)), []);
  useEffect(() => {
    if (Platform.OS === "web") return;
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      if (routes.length) {
        back();
        return true;
      }
      if (tab !== "home") {
        setTab("home");
        return true;
      }
      return false;
    });
    return () => sub.remove();
  }, [routes.length, tab, back]);
  function push(next: Route) {
    if (generation === authGeneration.current)
      setRoutes((value) => [...value, next]);
  }
  function changeTab(next: Tab) {
    if (generation !== authGeneration.current) return;
    setTab(next);
    setRoutes([]);
    if (next === "profile") void reloadAccount();
    void reloadSaved();
    void reloadNotifications();
  }
  async function save(
    kind: "place" | "video" | "search",
    targetId: string,
    remove = false,
  ) {
    if (generation !== authGeneration.current) return;
    try {
      await request(
        "/saves",
        remove ? "DELETE" : "POST",
        kind === "search" ? { kind, query: targetId } : { kind, targetId },
      );
      if (generation === authGeneration.current) await reloadSaved();
    } catch (e) {
      if (generation === authGeneration.current)
        Alert.alert(
          remove ? "Could not remove saved item" : "Could not save",
          e instanceof Error ? e.message : "Please try again.",
        );
    }
  }
  async function logout() {
    try {
      await request("/auth/logout", "POST", {});
    } catch {}
    if (generation === authGeneration.current) clearSession();
  }
  async function connected(url: string) {
    if (generation !== authGeneration.current) return;
    if (url !== apiUrl) {
      const nextGeneration = ++authGeneration.current;
      setSession(null);
      setAccount(null);
      setSaved(initialSaved);
      setUnread(false);
      setRoutes([]);
      setTab("home");
      await saveSession(null);
      await saveApiUrl(url);
      if (nextGeneration !== authGeneration.current) return;
      setApiUrl(url);
    }
    setShowConnection(false);
    setRoutes([]);
  }
  const onPlace = (place: Place) => push({ name: "place", place });
  const onVideo = (video: Video) => push({ name: "video", video });
  const discovery: DiscoveryProps = {
    request,
    apiUrl,
    token: session?.token || "",
    onPlace,
    onVideo,
    onRecord: (place) => push({ name: "record", place }),
    onInvite: (place) => push({ name: "createInvitation", place }),
    onDiscover: (place) =>
      place ? push({ name: "around", place }) : changeTab("search"),
    saved,
    onSave: save,
  };
  let content: React.ReactNode;
  if (booting)
    content = (
      <View style={a.center}>
        <BrandMark size={55} />
        <Loading />
      </View>
    );
  else if (!apiUrl || showConnection)
    content = (
      <ConnectionScreen
        initial={apiUrl}
        onConnected={connected}
        onBack={apiUrl ? () => setShowConnection(false) : undefined}
      />
    );
  else if (!session)
    content = (
      <AuthScreen
        apiUrl={apiUrl}
        onAuthenticated={authenticatedSession}
        onServer={() => setShowConnection(true)}
      />
    );
  else if (!account)
    content = (
      <Screen>
        <Empty
          icon="cloud-outline"
          title={accountLoading ? "Opening your Outside…" : "Let’s reconnect"}
          description={
            accountLoading
              ? "Loading your private account."
              : accountError || "Your account could not be loaded."
          }
        />
        {!accountLoading && (
          <>
            <Button title="Try again" onPress={() => void reloadAccount()} />
            <Button
              title="Change server"
              variant="secondary"
              onPress={() => setShowConnection(true)}
            />
            <Button title="Sign out" variant="ghost" onPress={clearSession} />
          </>
        )}
      </Screen>
    );
  else if (route) {
    switch (route.name) {
      case "place":
        content = <PlaceScreen {...discovery} place={route.place} />;
        break;
      case "video":
        content = (
          <VideoScreen
            {...discovery}
            video={route.video}
            userId={session.userId}
          />
        );
        break;
      case "record":
        content = (
          <RecordScreen
            request={request}
            apiUrl={apiUrl}
            token={session.token}
            place={route.place}
            onSelectPlace={() => push({ name: "chooseRecordPlace" })}
            onUploaded={() => {
              setRoutes([]);
              setTab("profile");
              void reloadAccount();
              Alert.alert(
                "Recording received",
                "Your update is processing. A quality review is required before it appears in discovery or earns advanced access.",
              );
            }}
          />
        );
        break;
      case "chooseRecordPlace":
        content = (
          <SearchScreen
            {...discovery}
            onPlace={(place) =>
              setRoutes((value) => [
                ...value.slice(0, -2),
                { name: "record", place },
              ])
            }
          />
        );
        break;
      case "friend":
        content = (
          <FriendProfileScreen
            request={request}
            id={route.id}
            onPlace={onPlace}
            onMap={(userId) => push({ name: "map", userId })}
          />
        );
        break;
      case "invitations":
        content = (
          <InvitationsScreen
            request={request}
            userId={session.userId}
            onInvitation={(id) => push({ name: "invitation", id })}
            onCreate={() => push({ name: "createInvitation" })}
          />
        );
        break;
      case "invitation":
        content = (
          <InviteDetailScreen
            request={request}
            id={route.id}
            userId={session.userId}
            onPlace={onPlace}
            onDiscover={(place) => push({ name: "around", place })}
          />
        );
        break;
      case "createInvitation":
        content = (
          <CreateInvitationScreen
            request={request}
            initialPlace={route.place}
            onCreated={(id) => {
              if (generation === authGeneration.current)
                setRoutes((value) => [
                  ...value.slice(0, -1),
                  { name: "invitation", id },
                ]);
            }}
          />
        );
        break;
      case "notifications":
        content = (
          <NotificationsScreen
            request={request}
            onPlace={onPlace}
            onFriend={(id) => push({ name: "friend", id })}
            onInvitation={(id) => push({ name: "invitation", id })}
            onFriends={() => changeTab("friends")}
          />
        );
        break;
      case "map":
        content = (
          <PlacesMapScreen
            request={request}
            userId={route.userId}
            own={!route.userId || route.userId === session.userId}
            onPlace={onPlace}
            onVideo={onVideo}
          />
        );
        break;
      case "around":
        content = (
          <DiscoverAroundScreen
            request={request}
            place={route.place}
            onPlace={onPlace}
            onInvite={discovery.onInvite}
          />
        );
        break;
      case "unlock":
        content = (
          <UnlockScreen
            request={request}
            initial={account}
            onRecord={() => push({ name: "record" })}
          />
        );
        break;
      case "settings":
        content = (
          <SettingsScreen
            request={request}
            account={account}
            onAccount={(next) => {
              if (generation === authGeneration.current)
                setAccount((current) =>
                  current ? { ...current, ...next } : current,
                );
            }}
            onLogout={() => void logout()}
            apiUrl={apiUrl}
            onServer={() => push({ name: "server" })}
            onDeleted={() => {
              if (generation === authGeneration.current) clearSession();
            }}
          />
        );
        break;
      case "server":
        content = (
          <ConnectionScreen
            initial={apiUrl}
            onConnected={connected}
            onBack={back}
          />
        );
        break;
      case "search":
        content = <SearchScreen {...discovery} initialQuery={route.query} />;
        break;
    }
  } else
    switch (tab) {
      case "home":
        content = (
          <HomeScreen {...discovery} onSearch={() => changeTab("search")} />
        );
        break;
      case "search":
        content = <SearchScreen {...discovery} />;
        break;
      case "friends":
        content = (
          <FriendsScreen
            request={request}
            onFriend={(id) => push({ name: "friend", id })}
            onPlace={onPlace}
            onInvitations={() => push({ name: "invitations" })}
            onCreateInvite={() => push({ name: "createInvitation" })}
          />
        );
        break;
      case "profile":
        content = (
          <ProfileScreen
            request={request}
            account={account}
            onMap={() => push({ name: "map" })}
            onPlace={onPlace}
            onVideo={onVideo}
            onSettings={() => push({ name: "settings" })}
            onInvitations={() => push({ name: "invitations" })}
            onUnlock={() => push({ name: "unlock" })}
          />
        );
        break;
    }
  const authenticated = !!session && !!account && !showConnection;
  return (
    <MediaContext.Provider value={{ apiUrl, token: session?.token || "" }}>
      <View style={[a.app, { paddingTop: insets.top }]}>
        <StatusBar barStyle="light-content" backgroundColor={colors.bg} />
        <View style={a.header}>
          {!!authenticated && route ? (
            <>
              <Pressable
                onPress={back}
                accessibilityRole="button"
                accessibilityLabel="Go back"
                style={a.headerAction}
              >
                <Icon name="arrow-back-outline" />
              </Pressable>
              <Text style={a.headerTitle} numberOfLines={1}>
                {routeTitles[route.name]}
              </Text>
              <View style={a.headerAction} />
            </>
          ) : (
            <>
              <View style={[styles.row, { gap: 6 }]}>
                <BrandMark size={28} />
                <Text style={a.wordmark}>
                  outside<Text style={{ color: colors.accent }}>.</Text>
                </Text>
              </View>
              {!!authenticated && (
                <View style={[styles.row, { gap: 8 }]}>
                  <Pressable
                    onPress={() => push({ name: "map" })}
                    style={a.headerAction}
                    accessibilityRole="button"
                    accessibilityLabel="Open your map"
                  >
                    <Icon name="map-outline" size={21} />
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      setUnread(false);
                      push({ name: "notifications" });
                    }}
                    style={a.headerAction}
                    accessibilityRole="button"
                    accessibilityLabel={
                      unread ? "Notifications, unread items" : "Notifications"
                    }
                  >
                    <Icon name="notifications-outline" size={22} />
                    {!!unread && <View style={a.unread} />}
                  </Pressable>
                </View>
              )}
            </>
          )}
        </View>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          {!!(!!authenticated && savedError) && (
            <Pressable
              onPress={() => void reloadSaved()}
              style={{
                paddingHorizontal: 20,
                paddingVertical: 7,
                backgroundColor: "#331C28",
              }}
            >
              <Text style={{ color: colors.red, fontSize: 11 }}>
                Saved items unavailable. Tap to retry.
              </Text>
            </Pressable>
          )}
          {content}
        </KeyboardAvoidingView>
        {!!(!!authenticated && route?.name !== "record") && (
          <View
            style={[a.tabs, { paddingBottom: Math.max(insets.bottom, 10) }]}
          >
            {(
              [
                {
                  id: "home",
                  label: "Home",
                  icon: "home-outline",
                  active: "home",
                },
                {
                  id: "search",
                  label: "Search",
                  icon: "search-outline",
                  active: "search",
                },
                { id: "record", label: "Record", icon: "add", active: "add" },
                {
                  id: "friends",
                  label: "Friends",
                  icon: "people-outline",
                  active: "people",
                },
                {
                  id: "profile",
                  label: "Profile",
                  icon: "person-outline",
                  active: "person",
                },
              ] as {
                id: Tab | "record";
                label: string;
                icon: IconName;
                active: IconName;
              }[]
            ).map((item) => (
              <Pressable
                key={item.id}
                accessibilityRole="tab"
                accessibilityLabel={item.label}
                accessibilityState={{ selected: !route && tab === item.id }}
                onPress={() =>
                  item.id === "record"
                    ? push({ name: "record" })
                    : changeTab(item.id)
                }
                style={a.tab}
              >
                {item.id === "record" ? (
                  <View style={a.recordButton}>
                    <Icon name="add" size={29} />
                  </View>
                ) : (
                  <Icon
                    name={!route && tab === item.id ? item.active : item.icon}
                    color={
                      !route && tab === item.id ? colors.accent : "#837A90"
                    }
                    size={23}
                  />
                )}
                <Text
                  style={[
                    a.tabLabel,
                    {
                      color:
                        !route && tab === item.id ? colors.accent : "#8F859B",
                    },
                  ]}
                >
                  {item.label}
                </Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>
    </MediaContext.Provider>
  );
}
export default function App() {
  return (
    <SafeAreaProvider>
      <AppContent />
    </SafeAreaProvider>
  );
}
const a = StyleSheet.create({
  app: { flex: 1, backgroundColor: colors.bg },
  header: {
    height: 63,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#211C29",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  wordmark: {
    color: colors.text,
    fontSize: 26,
    letterSpacing: -1.3,
    fontWeight: "800",
  },
  headerAction: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    color: colors.text,
    fontWeight: "600",
    fontSize: 15,
    flex: 1,
    textAlign: "center",
  },
  unread: {
    height: 6,
    width: 6,
    borderRadius: 3,
    backgroundColor: colors.accent,
    position: "absolute",
    right: 6,
    top: 4,
  },
  tabs: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderColor: "#292131",
    backgroundColor: "#0D0A11",
    paddingTop: 11,
    paddingHorizontal: 10,
  },
  tab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 6,
    minHeight: 48,
  },
  tabLabel: { fontSize: 10, fontWeight: "500" },
  recordButton: {
    height: 45,
    width: 45,
    borderRadius: 15,
    backgroundColor: colors.purple,
    alignItems: "center",
    justifyContent: "center",
    marginTop: -7,
  },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  welcomeArt: {
    minHeight: 280,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: "#42214F",
    marginBottom: 6,
  },
  logoLarge: {
    width: 78,
    height: 78,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 26,
    backgroundColor: "#5D257C55",
    borderWidth: 1,
    borderColor: "#8951A755",
  },
});
