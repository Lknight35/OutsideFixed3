export type Session = { token: string; userId: string; apiUrl: string };
export function normalizeApiUrl(raw: string) {
  const url = new URL(raw.trim());
  if (url.username || url.password || url.search || url.hash)
    throw new Error(
      "Use a server URL without credentials, query parameters, or a fragment.",
    );
  if (!["", "/", "/api", "/api/"].includes(url.pathname))
    throw new Error(
      "Use the server origin, with an optional /api suffix. Path-prefix deployments are not supported.",
    );
  const local =
    /^(localhost|\[::1\]|127\.0\.0\.1|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)$/.test(
      url.hostname,
    );
  if (url.protocol !== "https:" && !(url.protocol === "http:" && local))
    throw new Error(
      "Use HTTPS for your server. HTTP is supported only for a local development network.",
    );
  return `${url.origin}${url.pathname.replace(/\/$/, "").replace(/\/api$/, "")}/api`;
}
export function parseSession(stored: string | null): Session | null {
  if (!stored) return null;
  try {
    const value = JSON.parse(stored);
    if (
      !value ||
      typeof value !== "object" ||
      typeof value.token !== "string" ||
      value.token.length < 20 ||
      value.token.length > 4096 ||
      typeof value.userId !== "string" ||
      !value.userId.length ||
      value.userId.length > 256
    )
      return null;
    if (
      typeof value.apiUrl !== "string" ||
      normalizeApiUrl(value.apiUrl) !== value.apiUrl
    )
      return null;
    return { token: value.token, userId: value.userId, apiUrl: value.apiUrl };
  } catch {
    return null;
  }
}

export function sessionMatchesServer(session: Session | null, apiUrl: string) {
  return !!session && session.apiUrl === apiUrl;
}
