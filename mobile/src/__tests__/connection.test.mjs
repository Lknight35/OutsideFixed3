import test from "node:test";
import assert from "node:assert/strict";
import { loadTypeScript } from "./load-typescript.mjs";
const { normalizeApiUrl, parseSession, sessionMatchesServer } =
  await loadTypeScript("../connection.ts", import.meta.url);

test("production connections require HTTPS and reject embedded secrets", () => {
  for (const url of [
    "http://outside.example.com",
    "http://localhost.evil.example",
    "https://alice:secret@outside.example.com",
    "https://outside.example.com?token=secret",
    "https://outside.example.com#token",
    "file:///etc/passwd",
    "javascript:alert(1)",
  ])
    assert.throws(() => normalizeApiUrl(url));
  assert.equal(
    normalizeApiUrl("https://outside.example.com"),
    "https://outside.example.com/api",
  );
});
test("local development connections retain private addresses and stable API paths", () => {
  for (const address of [
    "localhost",
    "127.0.0.1",
    "10.0.2.2",
    "192.168.1.34",
    "172.16.2.9",
    "[::1]",
  ])
    assert.equal(
      normalizeApiUrl(`http://${address}:8787/`),
      `http://${address}:8787/api`,
    );
  assert.equal(
    normalizeApiUrl(" https://outside.example.com/api/ "),
    "https://outside.example.com/api",
  );
  assert.throws(() =>
    normalizeApiUrl("https://outside.example.com/service/api"),
  );
  assert.throws(() => normalizeApiUrl("http://172.32.0.1"));
});
test("corrupt or incomplete stored sessions fail closed", () => {
  for (const value of [
    null,
    "",
    "not-json",
    "null",
    "[]",
    "{}",
    '{"token":"short","userId":"someone"}',
    '{"token":42,"userId":"someone"}',
    JSON.stringify({ token: "t".repeat(40), userId: "user-id" }),
    JSON.stringify({
      token: "t".repeat(40),
      userId: "user-id",
      apiUrl: "http://unsafe.example.com/api",
    }),
    JSON.stringify({ token: "t".repeat(40), userId: "" }),
  ])
    assert.equal(parseSession(value), null);
  assert.deepEqual(
    parseSession(
      JSON.stringify({
        token: "t".repeat(40),
        userId: "user-id",
        apiUrl: "https://outside.example.com/api",
        extra: "discard",
      }),
    ),
    {
      token: "t".repeat(40),
      userId: "user-id",
      apiUrl: "https://outside.example.com/api",
    },
  );
});

test("stored bearer sessions are bound to the exact selected server", () => {
  const session = {
    token: "t".repeat(40),
    userId: "user-id",
    apiUrl: "https://outside.example.com/api",
  };
  assert.equal(sessionMatchesServer(session, session.apiUrl), true);
  for (const server of [
    "https://another.example.com/api",
    "http://outside.example.com/api",
    "https://outside.example.com:8787/api",
    "",
  ])
    assert.equal(sessionMatchesServer(session, server), false);
  assert.equal(sessionMatchesServer(null, session.apiUrl), false);
});
