import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { once } from "node:events";
import { randomBytes, randomUUID } from "node:crypto";
import { createApp } from "../src/app.js";
import { defaultPreferences } from "../src/db.js";
import { DAY, hash, iso } from "../src/domain.js";

// Fixtures exist only in a fresh, disposable test database. Production starts empty.
async function fixture(t) {
  const directory = await mkdtemp(join(tmpdir(), "outside-security-"));
  let clock = Date.parse("2026-11-12T12:00:00.000Z");
  const backend = createApp({
    dataDirectory: directory,
    now: () => clock,
    processMedia: false,
    providerFetch: async () => ({ ok: true, json: async () => [] }),
  });
  const server = backend.app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const base = `http://127.0.0.1:${server.address().port}/api`;
  t.after(async () => {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    await backend.close();
    await rm(directory, { recursive: true, force: true });
  });
  async function request(
    path,
    actor = null,
    method = "GET",
    body,
    headers = {},
  ) {
    const response = await fetch(`${base}${path}`, {
      method,
      headers: {
        ...(actor ? { Authorization: `Bearer ${actor.token}` } : {}),
        ...(body && !(body instanceof FormData)
          ? { "Content-Type": "application/json" }
          : {}),
        ...headers,
      },
      body:
        body instanceof FormData
          ? body
          : body === undefined
            ? undefined
            : JSON.stringify(body),
    });
    const text = await response.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
    return {
      status: response.status,
      data: json?.data,
      error: json?.error,
      text,
      headers: response.headers,
    };
  }
  function user(name, preferences = {}) {
    const id = randomUUID(),
      token = randomBytes(32).toString("base64url");
    backend.db
      .prepare("INSERT INTO users VALUES(?,?,?,?,?,?)")
      .run(
        id,
        `${name.toLowerCase()}@example.test`,
        name,
        "test-only-unusable-password-hash",
        iso(clock),
        JSON.stringify({ ...defaultPreferences, ...preferences }),
      );
    backend.db
      .prepare("INSERT INTO sessions VALUES(?,?,?)")
      .run(hash(token), id, iso(clock + 90 * DAY));
    return { id, token, name };
  }
  function place(label = "Test place") {
    const id = `osm:node:${randomUUID()}`;
    backend.db
      .prepare(
        "INSERT INTO places(id,name,address,lat,lng,category,updated_at) VALUES(?,?,?,?,?,?,?)",
      )
      .run(
        id,
        label,
        "Test fixture address",
        40.73,
        -73.99,
        "food",
        iso(clock),
      );
    return { id, lat: 40.73, lng: -73.99 };
  }
  function friends(a, b) {
    backend.db
      .prepare("INSERT INTO friendships VALUES(?,?,?,?,?,?)")
      .run(
        randomUUID(),
        a.id,
        b.id,
        [a.id, b.id].sort().join(":"),
        "accepted",
        iso(clock),
      );
  }
  async function video(
    owner,
    p,
    {
      status = "approved",
      visibility = "public",
      recordedAt = iso(clock),
      contentHash = randomUUID(),
    } = {},
  ) {
    const id = randomUUID(),
      ticket = randomUUID(),
      path = join(directory, `${id}.mp4`);
    await writeFile(path, "test-media-authorized-access-only");
    backend.db
      .prepare(
        "INSERT INTO capture_tickets(id,user_id,place_id,created_at,expires_at,lat,lng,accuracy,state) VALUES(?,?,?,?,?,?,?,?, 'consumed')",
      )
      .run(
        ticket,
        owner.id,
        p.id,
        recordedAt,
        iso(clock + 600000),
        p.lat,
        p.lng,
        10,
      );
    backend.db
      .prepare(
        "INSERT INTO videos(id,user_id,place_id,ticket_id,caption,recorded_at,created_at,expires_at,status,visibility,duration_seconds,media_path,thumbnail_path,content_hash) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
      )
      .run(
        id,
        owner.id,
        p.id,
        ticket,
        "Test fixture only",
        recordedAt,
        iso(clock),
        iso(new Date(recordedAt).getTime() + 7 * DAY),
        status,
        visibility,
        5,
        path,
        path,
        contentHash,
      );
    return { id, ticket, path };
  }
  async function invitation(owner, recipients, p) {
    const response = await request("/invitations", owner, "POST", {
      placeId: p.id,
      startsAt: iso(clock + 3600000),
      endsAt: iso(clock + 7200000),
      recipientIds: recipients.map((r) => r.id),
      note: "Private fixture outing",
    });
    assert.equal(response.status, 201, JSON.stringify(response.error));
    return response.data;
  }
  const gps = (p) => ({
    placeId: p.id,
    lat: p.lat,
    lng: p.lng,
    accuracyMeters: 10,
    locationTimestamp: iso(clock),
  });
  return {
    ...backend,
    request,
    user,
    place,
    friends,
    video,
    invitation,
    gps,
    now: () => clock,
    advance: (ms) => {
      clock += ms;
    },
  };
}

test("password auth stores salted hashes and hashed opaque sessions; logout and expiry revoke access", async (t) => {
  const f = await fixture(t);
  const register = await f.request("/auth/register", null, "POST", {
    email: "Owner@example.test",
    name: "Owner",
    password: "safe password 1234",
  });
  assert.equal(register.status, 201);
  assert.match(register.data.token, /^[A-Za-z0-9_-]{43}$/);
  const stored = f.db
    .prepare("SELECT * FROM users WHERE id=?")
    .get(register.data.user.id);
  assert.equal(stored.email, "owner@example.test");
  assert.notEqual(stored.password_hash, "safe password 1234");
  assert.match(stored.password_hash, /^[a-f0-9]{32}:[a-f0-9]{128}$/);
  assert.equal(
    f.db
      .prepare("SELECT token_hash FROM sessions WHERE user_id=?")
      .get(stored.id).token_hash,
    hash(register.data.token),
  );
  assert.equal(JSON.stringify(register.data.user).includes("email"), false);
  const owner = { id: stored.id, token: register.data.token };
  assert.equal((await f.request("/me", owner)).status, 200);
  assert.equal(
    (await f.request("/me", { token: randomBytes(32).toString("base64url") }))
      .status,
    401,
  );
  assert.equal(
    (
      await f.request("/auth/login", null, "POST", {
        email: "owner@example.test",
        password: "wrong password",
      })
    ).status,
    401,
  );
  assert.equal(
    (await f.request("/auth/logout", owner, "POST", {})).status,
    200,
  );
  assert.equal((await f.request("/me", owner)).status, 401);
  const login = await f.request("/auth/login", null, "POST", {
    email: "owner@example.test",
    password: "safe password 1234",
  });
  assert.equal(login.status, 200);
  assert.notEqual(login.data.token, owner.token);
  f.advance(31 * DAY);
  assert.equal(
    (await f.request("/me", { token: login.data.token })).status,
    401,
  );
});

test("hiding a recorded location removes its association across feed, profile, map, saves, notifications and direct media", async (t) => {
  const f = await fixture(t),
    owner = f.user("Owner"),
    friend = f.user("Friend", { friendActivity: true }),
    stranger = f.user("Stranger"),
    p = f.place("Sensitive fixture");
  f.friends(owner, friend);
  const clip = await f.video(owner, p);
  assert.equal(
    (await f.request(`/videos/${clip.id}/media`, friend)).status,
    200,
  );
  assert.equal(
    (
      await f.request("/saves", friend, "POST", {
        kind: "video",
        targetId: clip.id,
      })
    ).status,
    200,
  );
  f.domain.notify(
    friend.id,
    "friend_activity",
    "An update",
    "A friend shared an update.",
    clip.id,
  );
  assert.equal(
    (await f.request(`/users/${owner.id}/map`, friend)).data.places.length,
    1,
  );
  assert.equal(
    (
      await f.request(
        `/map/places/${encodeURIComponent(p.id)}/privacy`,
        owner,
        "PUT",
        { hidden: true },
      )
    ).status,
    200,
  );
  for (const actor of [friend, stranger]) {
    assert.deepEqual((await f.request("/feed", actor)).data, []);
    assert.deepEqual(
      (await f.request(`/places/${encodeURIComponent(p.id)}`, actor)).data
        .videos,
      [],
    );
    for (const suffix of ["", "/media", "/thumbnail"])
      assert.equal(
        (await f.request(`/videos/${clip.id}${suffix}`, actor)).status,
        404,
      );
    assert.equal(
      (
        await f.request("/saves", actor, "POST", {
          kind: "video",
          targetId: clip.id,
        })
      ).status,
      404,
    );
    assert.equal(
      (await f.request(`/videos/${clip.id}/signal`, actor, "POST", {})).status,
      404,
    );
    assert.equal(
      (
        await f.request("/reports", actor, "POST", {
          videoId: clip.id,
          reason: "Report hidden media",
        })
      ).status,
      404,
    );
    const profile = (await f.request(`/users/${owner.id}`, actor)).data;
    assert.deepEqual(profile.recentPlaces, []);
    assert.equal(JSON.stringify(profile).includes(p.id), false);
    const search = (await f.request("/users/search?q=Own", actor)).data;
    assert.equal(JSON.stringify(search).includes(p.id), false);
    assert.equal(JSON.stringify(search).includes("email"), false);
  }
  assert.deepEqual(
    (await f.request(`/users/${owner.id}/map`, friend)).data.places,
    [],
  );
  assert.equal(
    (await f.request(`/users/${owner.id}/map`, stranger)).status,
    403,
  );
  assert.deepEqual((await f.request("/saves", friend)).data.videos, []);
  assert.deepEqual((await f.request("/notifications", friend)).data, []);
  assert.equal((await f.request("/map", owner)).data.places[0].hidden, true);
  assert.equal(
    (await f.request(`/videos/${clip.id}/media`, owner)).status,
    200,
  );
  // A public place still exists; its geographic record does not disclose who visited.
  const detail = (
    await f.request(`/places/${encodeURIComponent(p.id)}`, friend)
  ).data;
  assert.equal(detail.place.id, p.id);
  assert.equal(JSON.stringify(detail).includes(owner.id), false);
});

test("friendship acceptance is recipient-only and map/private video permissions revoke immediately", async (t) => {
  const f = await fixture(t),
    a = f.user("Alice"),
    b = f.user("Bob"),
    c = f.user("Carol"),
    p = f.place();
  const clip = await f.video(a, p, { visibility: "friends" });
  const pending = await f.request("/friends/requests", a, "POST", {
    userId: b.id,
  });
  assert.equal(pending.status, 201);
  assert.equal(
    (
      await f.request(
        `/friends/requests/${pending.data.id}/respond`,
        a,
        "POST",
        { response: "accepted" },
      )
    ).status,
    404,
  );
  assert.equal(
    (
      await f.request(
        `/friends/requests/${pending.data.id}/respond`,
        c,
        "POST",
        { response: "accepted" },
      )
    ).status,
    404,
  );
  assert.equal((await f.request(`/users/${a.id}/map`, b)).status, 403);
  assert.equal((await f.request(`/videos/${clip.id}`, b)).status, 404);
  assert.equal(
    (
      await f.request(
        `/friends/requests/${pending.data.id}/respond`,
        b,
        "POST",
        { response: "accepted" },
      )
    ).status,
    200,
  );
  assert.equal((await f.request(`/videos/${clip.id}`, b)).status, 200);
  assert.equal((await f.request(`/users/${a.id}/map`, b)).status, 200);
  await f.request("/me/preferences", a, "PATCH", { mapVisibility: "private" });
  assert.equal((await f.request(`/users/${a.id}/map`, b)).status, 403);
  assert.deepEqual(
    (await f.request(`/users/${a.id}`, b)).data.recentPlaces,
    [],
  );
  await f.request(`/friends/${a.id}`, b, "DELETE");
  assert.equal((await f.request(`/videos/${clip.id}/media`, b)).status, 404);
  assert.deepEqual((await f.request("/friends", a)).data.friends, []);
});

test("invitations keep guest lists and accepted one-to-one threads private and expire chat at end plus 24h", async (t) => {
  const f = await fixture(t),
    host = f.user("Host"),
    a = f.user("Alice"),
    b = f.user("Bob"),
    outsider = f.user("Outsider"),
    p = f.place();
  f.friends(host, a);
  f.friends(host, b);
  const inv = await f.invitation(host, [a, b], p),
    path = `/invitations/${inv.id}`;
  assert.equal(inv.recipients.length, 2);
  for (const actor of [a, b]) {
    const detail = await f.request(path, actor);
    assert.equal(detail.status, 200);
    assert.equal("recipients" in detail.data, false);
  }
  assert.equal((await f.request(path, outsider)).status, 404);
  assert.deepEqual((await f.request("/invitations", outsider)).data, []);
  assert.equal((await f.request(`${path}/messages`, a)).status, 403);
  assert.equal(
    (
      await f.request(`${path}/respond`, outsider, "POST", {
        response: "accepted",
      })
    ).status,
    404,
  );
  assert.equal(
    (await f.request(`${path}/respond`, host, "POST", { response: "accepted" }))
      .status,
    403,
  );
  await f.request(`${path}/respond`, a, "POST", { response: "accepted" });
  await f.request(`${path}/respond`, b, "POST", { response: "declined" });
  const statuses = (await f.request(path, host)).data.recipients;
  assert.equal(statuses.find((r) => r.user.id === a.id).response, "accepted");
  assert.equal(statuses.find((r) => r.user.id === b.id).response, "declined");
  assert.equal(
    (
      await f.request(`${path}/messages`, host, "POST", {
        peerId: a.id,
        text: "Only Alice sees this",
      })
    ).status,
    201,
  );
  assert.equal((await f.request(`${path}/messages`, b)).status, 403);
  await f.request(`${path}/respond`, b, "POST", { response: "accepted" });
  assert.deepEqual((await f.request(`${path}/messages`, b)).data.messages, []);
  assert.equal(
    (await f.request(`${path}/messages?peerId=${a.id}`, b)).status,
    403,
  );
  assert.equal(
    (
      await f.request(`${path}/messages`, b, "POST", {
        peerId: a.id,
        text: "Attempted intrusion",
      })
    ).status,
    403,
  );
  assert.equal(
    (await f.request(`${path}/messages?peerId=${outsider.id}`, host)).status,
    403,
  );
  assert.equal((await f.request(`${path}/messages`, host)).status, 403);
  const thread = (await f.request(`${path}/messages`, a)).data;
  assert.equal(thread.messages.length, 1);
  assert.equal(thread.messages[0].text, "Only Alice sees this");
  assert.equal(
    (await f.request(`${path}/messages`, a, "POST", { placeId: p.id })).status,
    201,
  );
  f.advance(26 * 3600000);
  for (const actor of [a, b]) {
    assert.equal((await f.request(`${path}/messages`, actor)).status, 410);
    assert.equal(
      (
        await f.request(`${path}/messages`, actor, "POST", {
          text: "Late message",
        })
      ).status,
      410,
    );
    assert.equal((await f.request(path, actor)).status, 200);
  }
  assert.equal(
    (await f.request(`${path}/messages?peerId=${a.id}`, host)).status,
    410,
  );
});

test("notification preferences are enforced server-side and another user cannot mark private notifications read", async (t) => {
  const f = await fixture(t),
    a = f.user("Alice"),
    b = f.user("Bob", {
      friendRequests: false,
      invitations: false,
      invitationMessages: false,
      invitationResponses: false,
      friendActivity: false,
    }),
    p = f.place();
  const request = await f.request("/friends/requests", a, "POST", {
    userId: b.id,
  });
  assert.equal(request.status, 201);
  assert.deepEqual((await f.request("/notifications", b)).data, []);
  await f.request(`/friends/requests/${request.data.id}/respond`, b, "POST", {
    response: "accepted",
  });
  const inv = await f.invitation(a, [b], p);
  assert.deepEqual((await f.request("/notifications", b)).data, []);
  await f.request(`/invitations/${inv.id}/respond`, b, "POST", {
    response: "accepted",
  });
  await f.request(`/invitations/${inv.id}/messages`, a, "POST", {
    peerId: b.id,
    text: "Private text should not leak into inbox payload",
  });
  assert.deepEqual((await f.request("/notifications", b)).data, []);
  const aliceNotes = (await f.request("/notifications", a)).data;
  assert.equal(aliceNotes.length, 1);
  assert.equal(
    (await f.request(`/notifications/${aliceNotes[0].id}/read`, b, "POST", {}))
      .status,
    404,
  );
  assert.equal(
    (await f.request(`/notifications/${aliceNotes[0].id}/read`, a, "POST", {}))
      .status,
    200,
  );
  assert.ok((await f.request("/notifications", a)).data[0].readAt);
});

test("capture tickets reject stale, distant, inaccurate and mocked evidence and bind uploaded clip to owner and place", async (t) => {
  const f = await fixture(t),
    owner = f.user("Owner"),
    attacker = f.user("Attacker"),
    p = f.place();
  assert.equal(
    (
      await f.request("/capture/tickets", owner, "POST", {
        ...f.gps(p),
        locationTimestamp: iso(f.now() - 31000),
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await f.request("/capture/tickets", owner, "POST", {
        ...f.gps(p),
        lat: p.lat + 1,
      })
    ).status,
    403,
  );
  assert.equal(
    (
      await f.request("/capture/tickets", owner, "POST", {
        ...f.gps(p),
        accuracyMeters: 101,
      })
    ).status,
    400,
  );
  assert.equal(
    (
      await f.request("/capture/tickets", owner, "POST", {
        ...f.gps(p),
        mocked: true,
      })
    ).status,
    403,
  );
  const ticket = await f.request("/capture/tickets", owner, "POST", f.gps(p));
  assert.equal(ticket.status, 201);
  const uploadPath = `/capture/tickets/${ticket.data.id}/upload`;
  assert.equal((await f.request(uploadPath, attacker, "POST", {})).status, 404);
  assert.equal(
    f.db
      .prepare("SELECT state FROM capture_tickets WHERE id=?")
      .get(ticket.data.id).state,
    "open",
  );
  function clipForm(cameraFacing = "back") {
    const form = new FormData();
    for (const [key, value] of Object.entries({
      ...f.gps(p),
      cameraFacing,
      visibility: "public",
    }))
      form.set(key, String(value));
    form.set(
      "video",
      new Blob(
        ["test fixture bytes; processor disabled for this access-control test"],
        { type: "video/mp4" },
      ),
      "camera.mp4",
    );
    return form;
  }
  assert.equal(
    (await f.request(uploadPath, owner, "POST", clipForm("front"))).status,
    400,
  );
  assert.equal(
    f.db
      .prepare("SELECT state FROM capture_tickets WHERE id=?")
      .get(ticket.data.id).state,
    "open",
  );
  f.advance(5000);
  const uploaded = await f.request(uploadPath, owner, "POST", clipForm());
  assert.equal(uploaded.status, 202, JSON.stringify(uploaded.error));
  assert.equal(uploaded.data.place.id, p.id);
  assert.equal(uploaded.data.user.id, owner.id);
  assert.equal(uploaded.data.recordedAt, ticket.data.serverTime);
  assert.equal(uploaded.data.status, "processing");
  assert.equal(
    (await f.request(`/videos/${uploaded.data.id}`, attacker)).status,
    404,
  );
  const replay = await f.request(uploadPath, owner, "POST", clipForm());
  assert.equal(replay.status, 200);
  assert.equal(replay.data.id, uploaded.data.id);
  assert.equal(
    f.db
      .prepare("SELECT COUNT(*) AS n FROM videos WHERE ticket_id=?")
      .get(ticket.data.id).n,
    1,
  );
  const expired = await f.request("/capture/tickets", owner, "POST", f.gps(p));
  f.advance(600001);
  assert.equal(
    (
      await f.request(
        `/capture/tickets/${expired.data.id}/upload`,
        owner,
        "POST",
        clipForm(),
      )
    ).status,
    410,
  );
});

test("only operator-approved unique quality contributions grant premium; duplicate place/day and content do not count", async (t) => {
  const f = await fixture(t),
    owner = f.user("Owner"),
    viewer = f.user("Viewer"),
    p = f.place("One"),
    q = f.place("Two"),
    r = f.place("Three"),
    s = f.place("Four");
  const one = await f.video(owner, p, {
      status: "pending",
      contentHash: "content-one",
    }),
    sameDay = await f.video(owner, p, { status: "pending" }),
    sameContent = await f.video(owner, q, {
      status: "pending",
      contentHash: "content-one",
    }),
    two = await f.video(owner, q, { status: "pending" }),
    three = await f.video(owner, r, { status: "pending" });
  assert.equal(
    (await f.request(`/videos/${one.id}/approve`, owner, "POST", {})).status,
    404,
  );
  await f.request("/me/preferences", owner, "PATCH", {
    advancedUntil: iso(f.now() + 365 * DAY),
    approvedContributions: 99,
  });
  assert.equal((await f.request("/me", owner)).data.entitlements.active, false);
  assert.equal(
    (
      await f.request("/reports", viewer, "POST", {
        videoId: one.id,
        reason: "Try to approve hidden clip",
        status: "approved",
      })
    ).status,
    404,
  );
  f.domain.moderate(one.id, "approve");
  f.domain.moderate(one.id, "approve");
  f.domain.moderate(sameDay.id, "approve");
  f.domain.moderate(sameContent.id, "approve");
  assert.equal(f.domain.entitlements(owner.id).approvedContributions, 1);
  assert.equal(f.domain.entitlements(owner.id).active, false);
  f.domain.moderate(two.id, "approve");
  assert.equal(f.domain.entitlements(owner.id).active, false);
  f.domain.moderate(three.id, "approve");
  const granted = f.domain.entitlements(owner.id);
  assert.equal(granted.approvedContributions, 3);
  assert.equal(granted.active, true);
  assert.equal(granted.advancedUntil, iso(f.now() + 30 * DAY));
  const report = await f.request("/reports", viewer, "POST", {
    videoId: one.id,
    reason: "This approved clip needs review",
  });
  assert.equal(report.status, 201);
  f.domain.moderate(three.id, "reject", "Invalid contribution");
  assert.equal(f.domain.entitlements(owner.id).active, false);
  assert.equal(f.domain.entitlements(owner.id).approvedContributions, 2);
  const fourth = await f.video(owner, s, { status: "pending" });
  f.domain.moderate(fourth.id, "approve");
  assert.equal(f.domain.entitlements(owner.id).active, true);
  f.advance(30 * DAY);
  assert.equal(f.domain.entitlements(owner.id).active, false);
});

test("old and unreviewed recordings never appear as current activity, while owner memories remain available", async (t) => {
  const f = await fixture(t),
    owner = f.user("Owner"),
    viewer = f.user("Viewer"),
    p = f.place();
  const old = await f.video(owner, p, { recordedAt: iso(f.now() - 8 * DAY) }),
    pending = await f.video(owner, p, { status: "pending" });
  assert.deepEqual((await f.request("/feed", viewer)).data, []);
  assert.deepEqual((await f.request("/feed", owner)).data, []);
  assert.deepEqual(
    (await f.request(`/places/${encodeURIComponent(p.id)}`, viewer)).data
      .videos,
    [],
  );
  assert.equal((await f.request(`/videos/${old.id}`, viewer)).status, 404);
  assert.equal((await f.request(`/videos/${pending.id}`, viewer)).status, 404);
  assert.equal((await f.request(`/videos/${old.id}/media`, owner)).status, 200);
  assert.equal(
    (await f.request("/map", owner)).data.places[0].videos[0].id,
    old.id,
  );
});

test("expired shared memories require current friendship and map-sharing permission, while discovery stays empty", async (t) => {
  const f = await fixture(t),
    owner = f.user("Owner"),
    friend = f.user("Friend"),
    p = f.place();
  f.friends(owner, friend);
  const old = await f.video(owner, p, { recordedAt: iso(f.now() - 8 * DAY) });
  assert.equal(
    (await f.request(`/users/${owner.id}/map`, friend)).data.places[0].videos[0]
      .id,
    old.id,
  );
  assert.equal(
    (await f.request(`/videos/${old.id}/media`, friend)).status,
    200,
  );
  assert.deepEqual((await f.request("/feed", friend)).data, []);
  await f.request("/me/preferences", owner, "PATCH", {
    mapVisibility: "private",
  });
  assert.equal(
    (await f.request(`/videos/${old.id}/media`, friend)).status,
    404,
  );
  await f.request("/me/preferences", owner, "PATCH", {
    mapVisibility: "friends",
  });
  assert.equal(
    (await f.request(`/videos/${old.id}/media`, friend)).status,
    200,
  );
  await f.request(`/friends/${friend.id}`, owner, "DELETE");
  assert.equal(
    (await f.request(`/videos/${old.id}/media`, friend)).status,
    404,
  );
});

test("Outside Signal notifies by default, is idempotent, and its participant list is private to the poster", async (t) => {
  const f = await fixture(t),
    owner = f.user("Owner"),
    friend = f.user("Friend"),
    outsider = f.user("Outsider"),
    p = f.place();
  f.friends(owner, friend);
  // Simulate a persisted account created before the outsideSignals preference existed.
  const legacyPreferences = JSON.parse(
    f.db.prepare("SELECT preferences FROM users WHERE id=?").get(owner.id)
      .preferences,
  );
  delete legacyPreferences.outsideSignals;
  f.db
    .prepare("UPDATE users SET preferences=? WHERE id=?")
    .run(JSON.stringify(legacyPreferences), owner.id);
  const legacyMe = (await f.request("/me", owner)).data;
  assert.equal(legacyMe.preferences.outsideSignals, true);
  assert.equal(legacyMe.preferences.friendActivity, false);
  const video = await f.video(owner, p);
  assert.equal(
    (await f.request(`/videos/${video.id}/signal`, outsider, "POST", {}))
      .status,
    403,
  );
  assert.equal(
    (await f.request(`/videos/${video.id}/signal`, friend, "POST", {})).status,
    200,
  );
  assert.equal(
    (await f.request(`/videos/${video.id}/signal`, friend, "POST", {})).status,
    200,
  );
  const notes = (await f.request("/notifications", owner)).data;
  assert.equal(notes.length, 1);
  assert.equal(notes[0].type, "signal");
  assert.equal(
    (await f.request(`/videos/${video.id}/signals`, friend)).status,
    404,
  );
  assert.equal(
    (await f.request(`/videos/${video.id}/signals`, outsider)).status,
    404,
  );
  const signals = (await f.request(`/videos/${video.id}/signals`, owner)).data;
  assert.equal(signals.length, 1);
  assert.equal(signals[0].user.id, friend.id);
  await f.request("/me/preferences", owner, "PATCH", { outsideSignals: false });
  assert.equal(
    (await f.request("/me", owner)).data.preferences.outsideSignals,
    false,
  );
  const another = await f.video(owner, p);
  await f.request(`/videos/${another.id}/signal`, friend, "POST", {});
  assert.equal((await f.request("/notifications", owner)).data.length, 1);
  assert.equal(
    (await f.request(`/videos/${another.id}/signals`, owner)).data.length,
    1,
  );
  await f.request(`/friends/${friend.id}`, owner, "DELETE");
  assert.deepEqual(
    (await f.request(`/videos/${video.id}/signals`, owner)).data,
    [],
  );
});

test("activity search matches actual words only after moderation, expiry and privacy authorization", async (t) => {
  const f = await fixture(t),
    owner = f.user("Owner"),
    friend = f.user("Friend"),
    stranger = f.user("Stranger"),
    p = f.place("Riverside café");
  f.friends(owner, friend);
  const publicClip = await f.video(owner, p),
    privateClip = await f.video(owner, p, { visibility: "private" }),
    friendClip = await f.video(owner, p, { visibility: "friends" }),
    hiddenPlace = f.place("Hidden fixture café"),
    hiddenClip = await f.video(owner, hiddenPlace),
    expired = await f.video(owner, p, { recordedAt: iso(f.now() - 8 * DAY) }),
    pending = await f.video(owner, p, { status: "pending" });
  f.db
    .prepare(
      "UPDATE videos SET caption='Quiet coffee and live music' WHERE id IN (?,?,?,?,?,?)",
    )
    .run(
      publicClip.id,
      privateClip.id,
      friendClip.id,
      hiddenClip.id,
      expired.id,
      pending.id,
    );
  f.db
    .prepare("INSERT INTO hidden_places VALUES(?,?)")
    .run(owner.id, hiddenPlace.id);
  const search = async (actor, q) =>
    (await f.request(`/feed?q=${encodeURIComponent(q)}`, actor)).data
      .map((v) => v.id)
      .sort();
  assert.deepEqual(
    await search(stranger, "Show me quiet coffee happening nearby"),
    [publicClip.id],
  );
  assert.deepEqual(
    await search(friend, "quiet coffee"),
    [publicClip.id, friendClip.id].sort(),
  );
  assert.deepEqual(await search(stranger, "quiet cafe"), [publicClip.id]);
  assert.deepEqual(await search(stranger, "quiet basketball"), []);
  assert.deepEqual(await search(stranger, "live music tonight"), []); // Never infer “tonight” from recent footage.
  assert.deepEqual(await search(stranger, "cof"), []); // Whole words, not accidental partial-word matches.
  assert.equal(
    (await f.request(`/feed?q=${"x".repeat(201)}`, stranger)).status,
    400,
  );
  await f.request(
    `/map/places/${encodeURIComponent(p.id)}/privacy`,
    owner,
    "PUT",
    { hidden: true },
  );
  assert.deepEqual(await search(friend, "quiet coffee"), []);
});
