import { useEffect, useMemo, useState } from "react";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import { Request } from "./types";
import { parseSession } from "./connection";
export { normalizeApiUrl, sessionMatchesServer } from "./connection";
import type { Session } from "./connection";
export type { Session } from "./connection";
let browserSession: Session | null = null;
export async function readSession(): Promise<Session | null> {
  try {
    if (Platform.OS === "web") return browserSession;
    const stored = await SecureStore.getItemAsync("outside.session.v1");
    return parseSession(stored);
  } catch {
    return null;
  }
}
let sessionWrites: Promise<void> = Promise.resolve();
async function writeSession(value: Session | null) {
  if (Platform.OS === "web") {
    browserSession = value;
    return;
  }
  if (value)
    await SecureStore.setItemAsync("outside.session.v1", JSON.stringify(value));
  else await SecureStore.deleteItemAsync("outside.session.v1");
}
export function saveSession(value: Session | null) {
  const write = sessionWrites
    .catch(() => undefined)
    .then(() => writeSession(value));
  sessionWrites = write;
  return write;
}
export async function readApiUrl() {
  try {
    if (Platform.OS === "web")
      return sessionStorage.getItem("outside.api") || "";
    return (await SecureStore.getItemAsync("outside.api.v1")) || "";
  } catch {
    return "";
  }
}
export async function saveApiUrl(value: string) {
  if (Platform.OS === "web") {
    sessionStorage.setItem("outside.api", value);
    return;
  }
  await SecureStore.setItemAsync("outside.api.v1", value);
}
export function createRequest(
  base: string,
  token: string | null,
  onUnauthorized?: () => void,
): Request {
  return async <T>(path: string, method = "GET", body?: unknown) => {
    if (!base)
      throw new Error("Connect an Outside server in Settings to continue.");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 25000);
    try {
      const response = await fetch(`${base}${path}`, {
        method,
        headers: {
          Accept: "application/json",
          ...(body === undefined ? {} : { "Content-Type": "application/json" }),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal,
      });
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        if (response.status === 401 && token) onUnauthorized?.();
        throw new Error(
          payload?.error?.message ||
            `The server returned ${response.status}. Please try again.`,
        );
      }
      if (!payload || !("data" in payload))
        throw new Error(
          "This server did not return an Outside API response. Check the URL.",
        );
      return payload.data as T;
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError")
        throw new Error(
          "The server took too long to respond. Check your connection and try again.",
        );
      if (error instanceof TypeError)
        throw new Error(
          "Could not reach the Outside server. Check the server URL and your connection.",
        );
      throw error;
    } finally {
      clearTimeout(timer);
    }
  };
}
export function mediaSource(path: string | null, base: string, token: string) {
  if (!path || !base) return undefined;
  try {
    const origin = new URL(base).origin;
    const url = new URL(path, origin);
    if (url.origin !== origin) return undefined;
    return {
      uri: url.toString(),
      headers: { Authorization: `Bearer ${token}` },
    };
  } catch {
    return undefined;
  }
}
/** Native media streams with authorization headers. Web uses a revocable local blob because HTML media cannot attach bearer headers. */
export function useMediaSource(
  path: string | null,
  base: string,
  token: string,
) {
  const nativeSource = useMemo(
    () => mediaSource(path, base, token),
    [path, base, token],
  );
  const [browserUrl, setBrowserUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    if (Platform.OS !== "web") return;
    setBrowserUrl(null);
    setError("");
    if (!nativeSource) return;
    let active = true;
    let localUrl: string | null = null;
    const controller = new AbortController();
    void fetch(nativeSource.uri, {
      headers: nativeSource.headers,
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.ok) throw new Error("This media is no longer available.");
        return response.blob();
      })
      .then((blob) => {
        if (active) {
          localUrl = URL.createObjectURL(blob);
          setBrowserUrl(localUrl);
        }
      })
      .catch((cause) => {
        if (active && cause.name !== "AbortError")
          setError(cause.message || "Could not load media.");
      });
    return () => {
      active = false;
      controller.abort();
      if (localUrl) URL.revokeObjectURL(localUrl);
    };
  }, [nativeSource]);
  const source = useMemo(
    () =>
      Platform.OS === "web"
        ? browserUrl
          ? { uri: browserUrl }
          : undefined
        : nativeSource,
    [browserUrl, nativeSource],
  );
  return { source, error, loading: !!nativeSource && !source };
}
