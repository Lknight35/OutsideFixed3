import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile, access } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { once } from "node:events";
import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { createApp } from "../src/app.js";
import { iso, DAY } from "../src/domain.js";

test("account deletion reauthenticates, revokes sessions, erases private data/files and leaves only anonymous shared invitation records", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "outside-deletion-"));
  const backend = createApp({ dataDirectory: directory, processMedia: false });
  const server = backend.app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const base = `http://127.0.0.1:${server.address().port}/api`;
  t.after(async () => {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    await backend.close();
    await rm(directory, { recursive: true, force: true });
  });
  async function call(path, actor, method = "GET", body) {
    const response = await fetch(base + path, {
      method,
      headers: {
        ...(actor ? { Authorization: `Bearer ${actor.token}` } : {}),
        ...(body && !(body instanceof FormData)
          ? { "Content-Type": "application/json" }
          : {}),
      },
      body:
        body instanceof FormData
          ? body
          : body
            ? JSON.stringify(body)
            : undefined,
    });
    const result = await response.json();
    return { status: response.status, ...result };
  }
  const password = "deletion-test-password";
  const owner = (
    await call("/auth/register", null, "POST", {
      name: "Erase My Identity",
      email: "erased@example.test",
      password,
    })
  ).data;
  const friend = (
    await call("/auth/register", null, "POST", {
      name: "Remaining Friend",
      email: "remaining@example.test",
      password,
    })
  ).data;
  const secondSession = (
    await call("/auth/login", null, "POST", {
      email: "erased@example.test",
      password,
    })
  ).data;
  const request = (
    await call("/friends/requests", owner, "POST", { userId: friend.user.id })
  ).data;
  await call(`/friends/requests/${request.id}/respond`, friend, "POST", {
    response: "accepted",
  });
  const placeId = "osm:node:deletion-fixture";
  backend.db
    .prepare(
      "INSERT INTO places(id,name,address,lat,lng,category,updated_at) VALUES(?,?,?,?,?,?,?)",
    )
    .run(
      placeId,
      "Test fixture place",
      "Never runtime seed",
      40,
      -73,
      "food",
      iso(),
    );
  const invitation = (
    await call("/invitations", owner, "POST", {
      placeId,
      startsAt: iso(Date.now() + 3600000),
      endsAt: iso(Date.now() + 7200000),
      recipientIds: [friend.user.id],
      note: "Personal organizer note",
    })
  ).data;
  await call(`/invitations/${invitation.id}/respond`, friend, "POST", {
    response: "accepted",
  });
  await call(`/invitations/${invitation.id}/messages`, owner, "POST", {
    peerId: friend.user.id,
    text: "Private personal message",
  });
  await call(`/invitations/${invitation.id}/messages`, friend, "POST", {
    text: "Private reply",
  });
  const image = await sharp({
    create: { width: 10, height: 10, channels: 3, background: "#7C3AED" },
  })
    .jpeg()
    .toBuffer();
  const form = new FormData();
  form.set("image", new Blob([image], { type: "image/jpeg" }), "avatar.jpg");
  assert.equal((await call("/me/avatar", owner, "POST", form)).status, 200);
  const avatarPath = backend.db
    .prepare("SELECT path FROM avatars WHERE user_id=?")
    .get(owner.user.id).path;
  const videoId = randomUUID(),
    ticketId = randomUUID(),
    rawPath = join(directory, "personal-video.mp4");
  await writeFile(rawPath, "Private test fixture video bytes");
  backend.db
    .prepare(
      "INSERT INTO capture_tickets(id,user_id,place_id,created_at,expires_at,lat,lng,accuracy,state) VALUES(?,?,?,?,?,?,?,?, 'consumed')",
    )
    .run(
      ticketId,
      owner.user.id,
      placeId,
      iso(),
      iso(Date.now() + 600000),
      40,
      -73,
      10,
    );
  backend.db
    .prepare(
      "INSERT INTO videos(id,user_id,place_id,ticket_id,caption,recorded_at,created_at,expires_at,status,visibility,raw_path,media_path,thumbnail_path,content_hash) VALUES(?,?,?,?,?,?,?,?,'pending','public',?,?,?,?)",
    )
    .run(
      videoId,
      owner.user.id,
      placeId,
      ticketId,
      "Personal caption",
      iso(),
      iso(),
      iso(Date.now() + 7 * DAY),
      rawPath,
      rawPath,
      rawPath,
      "unique-delete-fixture",
    );
  backend.domain.moderate(videoId, "approve");
  await call("/saves", friend, "POST", { kind: "video", targetId: videoId });
  await call("/saves", owner, "POST", { kind: "place", targetId: placeId });
  await call("/reports", friend, "POST", {
    videoId,
    reason: "Fixture report to ensure cleanup",
  });
  await call(`/videos/${videoId}/signal`, friend, "POST", {});
  const wrong = await call("/me/delete", owner, "POST", { password: "wrong" });
  assert.equal(wrong.status, 403);
  assert.equal((await call("/me", owner)).status, 200);
  await access(rawPath);
  const attack = await call("/me/delete", friend, "POST", {
    password: "wrong",
    userId: owner.user.id,
  });
  assert.equal(attack.status, 403);
  assert.equal((await call("/me", owner)).status, 200);
  backend.db
    .prepare("UPDATE videos SET status='processing' WHERE id=?")
    .run(videoId);
  assert.equal(
    (await call("/me/delete", owner, "POST", { password })).status,
    409,
  );
  backend.db
    .prepare("UPDATE videos SET status='approved' WHERE id=?")
    .run(videoId);
  assert.equal(
    (await call("/me/delete", owner, "POST", { password })).status,
    200,
  );
  assert.equal((await call("/me", owner)).status, 401);
  assert.equal((await call("/me", secondSession)).status, 401);
  assert.equal(
    (
      await call("/auth/login", null, "POST", {
        email: "erased@example.test",
        password,
      })
    ).status,
    401,
  );
  assert.equal((await call(`/users/${owner.user.id}`, friend)).status, 404);
  assert.equal((await call(`/users/${owner.user.id}/map`, friend)).status, 404);
  assert.deepEqual((await call("/users/search?q=Erase", friend)).data, []);
  assert.deepEqual((await call("/friends", friend)).data.friends, []);
  assert.deepEqual((await call("/saves", friend)).data.videos, []);
  assert.equal((await call(`/videos/${videoId}/media`, friend)).status, 404);
  assert.equal(
    (await call("/friends/requests", friend, "POST", { userId: owner.user.id }))
      .status,
    404,
  );
  const retained = (await call(`/invitations/${invitation.id}`, friend)).data;
  assert.equal(retained.organizer.name, "Deleted account");
  assert.equal(retained.note, "");
  assert.equal(retained.organizer.avatarUrl, null);
  assert.equal(
    (await call(`/invitations/${invitation.id}/messages`, friend)).status,
    410,
  );
  assert.equal(
    JSON.stringify((await call("/notifications", friend)).data).includes(
      "Erase My Identity",
    ),
    false,
  );
  const tombstone = backend.db
    .prepare("SELECT * FROM users WHERE id=?")
    .get(owner.user.id);
  assert.equal(tombstone.name, "Deleted account");
  assert.notEqual(tombstone.email, "erased@example.test");
  assert.equal(tombstone.password_hash, "deleted");
  for (const table of [
    "videos",
    "capture_tickets",
    "contributions",
    "entitlements",
    "sessions",
    "avatars",
    "saves",
    "hidden_places",
  ])
    assert.equal(
      backend.db
        .prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE user_id=?`)
        .get(owner.user.id).n,
      0,
      table,
    );
  assert.equal(
    backend.db.prepare("SELECT COUNT(*) AS n FROM messages").get().n,
    0,
  );
  assert.equal(
    backend.db.prepare("SELECT COUNT(*) AS n FROM file_deletions").get().n,
    0,
  );
  await assert.rejects(access(rawPath));
  await assert.rejects(access(avatarPath));
  // The erased address can be registered as a fresh account, without recovering old permissions.
  const replacement = await call("/auth/register", null, "POST", {
    name: "New Account",
    email: "erased@example.test",
    password,
  });
  assert.equal(replacement.status, 201);
  assert.notEqual(replacement.data.user.id, owner.user.id);
  assert.equal(
    (await call(`/invitations/${invitation.id}`, replacement.data)).status,
    404,
  );
});
