import React, {
  createContext,
  useContext,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  AppState,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TextInputProps,
  View,
  ViewStyle,
} from "react-native";
import Ionicons from "@expo/vector-icons/Ionicons";
import { useMediaSource } from "./api";
export const MediaContext = createContext({ apiUrl: "", token: "" });
export const colors = {
  bg: "#08080B",
  surface: "#141419",
  raised: "#1C1B23",
  line: "#2B2833",
  text: "#F8F6FC",
  muted: "#A7A1B3",
  purple: "#A000FF",
  accent: "#BC4CFF",
  green: "#5CE0A0",
  red: "#FF838D",
};
export type IconName = React.ComponentProps<typeof Ionicons>["name"];
export function Icon({
  name,
  size = 21,
  color = colors.text,
}: {
  name: IconName;
  size?: number;
  color?: string;
}) {
  return (
    <Ionicons
      accessible={false}
      aria-hidden
      name={name}
      size={size}
      color={color}
    />
  );
}
export function Button({
  title,
  onPress,
  icon,
  variant = "primary",
  loading = false,
  disabled = false,
  small = false,
}: {
  title: string;
  onPress: () => void;
  icon?: IconName;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  loading?: boolean;
  disabled?: boolean;
  small?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        s.button,
        variant === "primary"
          ? s.primary
          : variant === "secondary"
            ? s.secondary
            : variant === "danger"
              ? s.danger
              : s.ghost,
        small && { paddingVertical: 10, paddingHorizontal: 14, minHeight: 44 },
        (disabled || loading) && { opacity: 0.45 },
        pressed && { opacity: 0.75 },
      ]}
    >
      {loading ? (
        <ActivityIndicator color="white" />
      ) : icon ? (
        <Icon name={icon} size={18} />
      ) : null}
      <Text style={s.buttonText}>{title}</Text>
    </Pressable>
  );
}
export function Field({
  label,
  ...props
}: TextInputProps & { label?: string }) {
  return (
    <View style={{ gap: 8 }}>
      {!!label && <Text style={s.label}>{label}</Text>}
      <TextInput
        placeholderTextColor="#706A7E"
        selectionColor={colors.accent}
        {...props}
        style={[
          s.input,
          props.multiline && { minHeight: 100, textAlignVertical: "top" },
          props.style,
        ]}
      />
    </View>
  );
}
export function Empty({
  icon = "compass-outline",
  title,
  description,
  action,
  onAction,
}: {
  icon?: IconName;
  title: string;
  description: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <View style={s.empty}>
      <View style={s.emptyIcon}>
        <Icon name={icon} size={30} color={colors.accent} />
      </View>
      <Text style={s.emptyTitle}>{title}</Text>
      <Text style={[s.body, { textAlign: "center", maxWidth: 300 }]}>
        {description}
      </Text>
      {!!(!!action && onAction) && (
        <Button title={action} onPress={onAction} small />
      )}
    </View>
  );
}
export function Section({
  title,
  right,
  onPress,
}: {
  title: string;
  right?: string;
  onPress?: () => void;
}) {
  return (
    <View
      style={[
        s.row,
        { justifyContent: "space-between", marginTop: 8, marginBottom: 4 },
      ]}
    >
      <Text style={s.section}>{title}</Text>
      {!!right && (
        <Pressable onPress={onPress} hitSlop={12} accessibilityRole="button">
          <Text
            style={{ color: colors.accent, fontSize: 13, fontWeight: "600" }}
          >
            {right}
          </Text>
        </Pressable>
      )}
    </View>
  );
}
export function Screen({
  children,
  refreshing,
  onRefresh,
  scroll = true,
}: {
  children: React.ReactNode;
  refreshing?: boolean;
  onRefresh?: () => void;
  scroll?: boolean;
}) {
  return scroll ? (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={s.screen}
      keyboardShouldPersistTaps="handled"
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={!!refreshing}
            onRefresh={onRefresh}
            tintColor={colors.accent}
          />
        ) : undefined
      }
    >
      {children}
    </ScrollView>
  ) : (
    <View style={[s.screen, { flex: 1 }]}>{children}</View>
  );
}
export function ErrorBox({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <View style={[s.card, { borderColor: "#64283B", gap: 10 }]}>
      <Text style={{ color: colors.red, lineHeight: 21 }}>{message}</Text>
      {!!onRetry && (
        <Button title="Try again" onPress={onRetry} variant="secondary" small />
      )}
    </View>
  );
}
export function Avatar({
  name,
  uri,
  size = 48,
}: {
  name: string;
  uri?: string | null;
  size?: number;
}) {
  const media = useContext(MediaContext);
  const { source } = useMediaSource(uri || null, media.apiUrl, media.token);
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [uri]);
  return source && !failed ? (
    <Image
      source={source}
      onError={() => setFailed(true)}
      accessibilityLabel={`${name}'s profile photo`}
      style={{ height: size, width: size, borderRadius: size / 2 }}
    />
  ) : (
    <View
      style={{
        height: size,
        width: size,
        borderRadius: size / 2,
        backgroundColor: "#382045",
        alignItems: "center",
        justifyContent: "center",
        borderWidth: 1,
        borderColor: "#603577",
      }}
    >
      <Text
        style={{ fontSize: size * 0.37, fontWeight: "700", color: "#E1B4FF" }}
      >
        {name?.trim().slice(0, 1).toUpperCase() || "O"}
      </Text>
    </View>
  );
}
export function Pill({
  label,
  active,
  onPress,
  icon,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
  icon?: IconName;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: !!active }}
      aria-pressed={!!active}
      onPress={onPress}
      style={[
        s.pill,
        active && { backgroundColor: "#361749", borderColor: colors.purple },
      ]}
    >
      {!!icon && (
        <Icon name={icon} size={15} color={active ? "#E4B6FF" : colors.muted} />
      )}
      <Text
        style={{
          fontSize: 12,
          fontWeight: "600",
          color: active ? "#E4B6FF" : colors.muted,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
export function useLoad<T>(
  loader: () => Promise<T>,
  deps: React.DependencyList,
  initial: T,
) {
  const [data, setData] = useState(initial);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const generation = useRef(0);
  const initialValue = useRef(initial);
  initialValue.current = initial;
  const current = useRef(loader);
  current.current = loader;
  const reload = useCallback(async () => {
    const id = ++generation.current;
    setLoading(true);
    setError("");
    try {
      const result = await current.current();
      if (id === generation.current) setData(result);
    } catch (e) {
      if (id === generation.current) {
        setData(initialValue.current);
        setError(
          e instanceof Error
            ? e.message
            : "Something went wrong. Please try again.",
        );
      }
    } finally {
      if (id === generation.current) setLoading(false);
    }
  }, deps);
  useEffect(() => {
    setData(initialValue.current);
    void reload();
    return () => {
      generation.current++;
    };
  }, [reload]);
  return { data, setData, loading, error, reload };
}
export function Loading() {
  return <ActivityIndicator style={{ padding: 24 }} color={colors.accent} />;
}
export function Divider() {
  return (
    <View
      style={{ height: 1, backgroundColor: colors.line, marginVertical: 4 }}
    />
  );
}
export const styles = StyleSheet.create({
  screen: {
    padding: 20,
    paddingBottom: 32,
    gap: 18,
    width: "100%",
    maxWidth: 720,
    alignSelf: "center",
  },
  text: { color: colors.text },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: colors.text,
    letterSpacing: -0.8,
  },
  body: { fontSize: 14, lineHeight: 22, color: colors.muted },
  muted: { color: colors.muted, fontSize: 13, lineHeight: 20 },
  card: {
    backgroundColor: colors.surface,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 18,
    gap: 12,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  label: { color: colors.text, fontSize: 13, fontWeight: "600" },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 13,
    padding: 15,
    color: colors.text,
    backgroundColor: colors.surface,
    fontSize: 15,
    minHeight: 50,
  },
  section: {
    fontSize: 19,
    fontWeight: "700",
    color: colors.text,
    letterSpacing: -0.4,
  },
  button: {
    paddingHorizontal: 19,
    paddingVertical: 15,
    minHeight: 50,
    borderRadius: 13,
    flexDirection: "row",
    gap: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  primary: { backgroundColor: colors.purple },
  secondary: {
    backgroundColor: colors.raised,
    borderWidth: 1,
    borderColor: colors.line,
  },
  ghost: { backgroundColor: "transparent" },
  danger: { backgroundColor: "#55202D" },
  buttonText: { color: colors.text, fontWeight: "700", fontSize: 14 },
  empty: { alignItems: "center", paddingVertical: 30, gap: 14 },
  emptyIcon: {
    backgroundColor: "#20102D",
    borderColor: "#46235E",
    borderWidth: 1,
    borderRadius: 23,
    height: 68,
    width: 68,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 3,
  },
  emptyTitle: {
    fontSize: 19,
    fontWeight: "700",
    color: colors.text,
    textAlign: "center",
  },
  pill: {
    minHeight: 44,
    justifyContent: "center",
    paddingHorizontal: 13,
    paddingVertical: 9,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.surface,
    borderRadius: 30,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
});
const s = styles;

export function useNow(interval = 60000) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const timer = setInterval(() => {
      if (AppState.currentState === "active") setNow(Date.now());
    }, interval);
    const state = AppState.addEventListener("change", (value) => {
      if (value === "active") setNow(Date.now());
    });
    return () => {
      clearInterval(timer);
      state.remove();
    };
  }, [interval]);
  return now;
}
export function useExpired(iso?: string) {
  const [expired, setExpired] = useState(false);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    function refresh() {
      if (timer) clearTimeout(timer);
      if (!iso) {
        setExpired(false);
        return;
      }
      const remaining = new Date(iso).getTime() - Date.now();
      setExpired(!Number.isFinite(remaining) || remaining <= 0);
      if (remaining > 0)
        timer = setTimeout(refresh, Math.min(remaining + 20, 2147483647));
    }
    refresh();
    const state = AppState.addEventListener("change", (value) => {
      if (value === "active") refresh();
    });
    return () => {
      if (timer) clearTimeout(timer);
      state.remove();
    };
  }, [iso]);
  return expired;
}
