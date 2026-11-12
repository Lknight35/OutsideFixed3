import express from "express";
import multer from "multer";
import sharp from "sharp";
import { z } from "zod";
import {
  scrypt as scryptCallback,
  timingSafeEqual,
  randomBytes,
} from "node:crypto";
import { promisify } from "node:util";
import { mkdirSync } from "node:fs";
import { rm, writeFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { openDatabase, defaultPreferences, transaction } from "./db.js";
import {
  createDomain,
  ApiError,
  fail,
  id,
  iso,
  hash,
  distance,
  DAY,
  matchesEvidenceQuery,
} from "./domain.js";
import { createPlaces } from "./places.js";
import { createMediaProcessor } from "./media.js";

const scrypt = promisify(scryptCallback);
const stringId = z.string().min(1).max(200);
const coordinates = {
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
};
const gps = z.object({
  ...coordinates,
  accuracyMeters: z.coerce.number().positive().max(100),
  locationTimestamp: z.iso.datetime(),
  mocked: z.boolean().optional(),
});
const credentials = z.object({
  email: z
    .email()
    .max(254)
    .transform((v) => v.toLowerCase()),
  password: z.string().min(10).max(128),
});
const preferencesSchema = z.object({
  friendRequests: z.boolean().optional(),
  friendActivity: z.boolean().optional(),
  invitations: z.boolean().optional(),
  invitationResponses: z.boolean().optional(),
  invitationMessages: z.boolean().optional(),
  outsideSignals: z.boolean().optional(),
  mapVisibility: z.enum(["friends", "private"]).optional(),
  interests: z
    .array(
      z.enum([
        "nightlife",
        "food",
        "sports",
        "beaches",
        "events",
        "shopping",
        "outdoors",
      ]),
    )
    .max(7)
    .optional(),
});
const cleanText = (max) => z.string().trim().min(1).max(max);
const send = (res, data, status = 200) => res.status(status).json({ data });
function parse(schema, input) {
  const result = schema.safeParse(input);
  if (!result.success)
    fail(
      400,
      "VALIDATION",
      result.error.issues
        .map((i) => `${i.path.join(".") || "Request"}: ${i.message}`)
        .join("; "),
    );
  return result.data;
}

export function createApp({
  dataDirectory = process.env.DATA_DIR || resolve("data"),
  now = Date.now,
  providerFetch,
  processMedia = true,
} = {}) {
  const db = openDatabase(dataDirectory),
    domain = createDomain(db, now),
    places = createPlaces(db, domain, { now, providerFetch });
  const media = createMediaProcessor(db, dataDirectory);
  const uploads = join(dataDirectory, "uploads");
  mkdirSync(uploads, { recursive: true, mode: 0o700 });
  if (processMedia) media.recover();
  const app = express();
  app.disable("x-powered-by");
  const allowedOrigins = new Set(
    (
      process.env.CORS_ORIGINS ||
      "http://localhost:8081,http://127.0.0.1:8081,http://localhost:8082,http://127.0.0.1:8082"
    ).split(","),
  );
  app.use((req, res, next) => {
    res.set({
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      "Cache-Control": "no-store",
    });
    const origin = req.headers.origin;
    if (origin && allowedOrigins.has(origin))
      res.set({
        "Access-Control-Allow-Origin": origin,
        Vary: "Origin",
        "Access-Control-Allow-Headers": "Authorization,Content-Type",
        "Access-Control-Allow-Methods": "GET,POST,PATCH,PUT,DELETE,OPTIONS",
      });
    if (req.method === "OPTIONS")
      return res.sendStatus(origin && !allowedOrigins.has(origin) ? 403 : 204);
    next();
  });
  app.use(express.json({ limit: "64kb" }));
  const buckets = new Map();
  function limit(key, max, windowMs) {
    const entry = buckets.get(key);
    if (!entry || entry.until <= now())
      buckets.set(key, { count: 1, until: now() + windowMs });
    else if (++entry.count > max)
      fail(429, "RATE_LIMIT", "Too many requests. Please try again later.");
    if (buckets.size > 10000)
      for (const [k, v] of buckets) if (v.until <= now()) buckets.delete(k);
  }
  app.use("/api", (req, res, next) => {
    try {
      limit(`ip:${req.ip}`, 300, 60000);
      next();
    } catch (e) {
      next(e);
    }
  });
  app.get(["/healthz", "/api/health"], (req, res) => {
    db.prepare("SELECT 1").get();
    send(res, { status: "ok", service: "outside-api", serverTime: iso(now()) });
  });
  async function passwordHash(
    password,
    salt = randomBytes(16).toString("hex"),
  ) {
    return `${salt}:${Buffer.from(await scrypt(password, salt, 64)).toString("hex")}`;
  }
  async function passwordMatches(password, stored) {
    const salt = stored?.split(":")[0] || "00000000000000000000000000000000";
    const actual = await passwordHash(password, salt);
    return Boolean(
      stored &&
        Buffer.byteLength(stored) === Buffer.byteLength(actual) &&
        timingSafeEqual(Buffer.from(stored), Buffer.from(actual)),
    );
  }
  function issueSession(userId) {
    if (domain.isDeleted(userId))
      fail(401, "INVALID_CREDENTIALS", "Email or password is incorrect.");
    const token = randomBytes(32).toString("base64url");
    db.prepare("INSERT INTO sessions VALUES(?,?,?)").run(
      hash(token),
      userId,
      iso(now() + 30 * DAY),
    );
    return token;
  }
  app.post("/api/auth/register", async (req, res) => {
    limit(`auth:${req.ip}`, 20, 15 * 60000);
    const body = parse(credentials.extend({ name: cleanText(80) }), req.body);
    const password = await passwordHash(body.password);
    const userId = id();
    try {
      db.prepare("INSERT INTO users VALUES(?,?,?,?,?,?)").run(
        userId,
        body.email,
        body.name,
        password,
        iso(now()),
        JSON.stringify(defaultPreferences),
      );
    } catch (error) {
      if (
        error.code?.startsWith("ERR_SQLITE_CONSTRAINT") ||
        error.errcode === 2067
      )
        fail(
          409,
          "ACCOUNT_EXISTS",
          "An account with that email already exists.",
        );
      throw error;
    }
    send(
      res,
      {
        token: issueSession(userId),
        user: domain.user(domain.getUser(userId)),
      },
      201,
    );
  });
  app.post("/api/auth/login", async (req, res) => {
    limit(`auth:${req.ip}`, 20, 15 * 60000);
    const body = parse(credentials, req.body);
    limit(`account:${hash(body.email)}`, 10, 15 * 60000);
    const user = db
      .prepare("SELECT * FROM users WHERE email=?")
      .get(body.email);
    if (!(await passwordMatches(body.password, user?.password_hash)))
      fail(401, "INVALID_CREDENTIALS", "Email or password is incorrect.");
    send(res, { token: issueSession(user.id), user: domain.user(user) });
  });
  app.use("/api", (req, res, next) => {
    try {
      const token = req.headers.authorization?.match(
        /^Bearer ([A-Za-z0-9_-]{43})$/,
      )?.[1];
      const session =
        token &&
        db
          .prepare("SELECT * FROM sessions WHERE token_hash=? AND expires_at>?")
          .get(hash(token), iso(now()));
      if (!session || domain.isDeleted(session.user_id))
        fail(401, "UNAUTHENTICATED", "Sign in to continue.");
      req.userId = session.user_id;
      req.tokenHash = hash(token);
      next();
    } catch (error) {
      next(error);
    }
  });
  app.post("/api/auth/logout", (req, res) => {
    db.prepare("DELETE FROM sessions WHERE token_hash=?").run(req.tokenHash);
    send(res, { ok: true });
  });
  let fileCleanup = Promise.resolve();
  function drainDeletedFiles() {
    fileCleanup = fileCleanup.then(async () => {
      for (const row of db
        .prepare("SELECT path FROM file_deletions LIMIT 1000")
        .all()) {
        try {
          await rm(row.path, { force: true });
          db.prepare("DELETE FROM file_deletions WHERE path=?").run(row.path);
        } catch {
          console.warn(
            JSON.stringify({ event: "account_file_cleanup_pending" }),
          );
        }
      }
    });
    return fileCleanup;
  }
  app.post("/api/me/delete", async (req, res) => {
    limit(`delete:${req.userId}`, 5, 3600000);
    const { password } = parse(
      z.object({ password: z.string().min(1).max(128) }),
      req.body,
    );
    if (
      !(await passwordMatches(
        password,
        domain.getUser(req.userId).password_hash,
      ))
    )
      fail(
        403,
        "INVALID_CREDENTIALS",
        "Password is incorrect. Your account has not been deleted.",
      );
    if (domain.isDeleted(req.userId)) return send(res, { ok: true });
    // Do not race a transcoder reading files that are about to be removed.
    if (
      db
        .prepare("SELECT 1 FROM videos WHERE user_id=? AND status='processing'")
        .get(req.userId) ||
      db
        .prepare(
          "SELECT 1 FROM capture_tickets WHERE user_id=? AND state='uploading'",
        )
        .get(req.userId)
    )
      fail(
        409,
        "PROCESSING_ACTIVE",
        "Wait for your current upload to finish processing, then delete your account.",
      );
    transaction(db, () => {
      const userId = req.userId;
      const queue = db.prepare(
        "INSERT OR IGNORE INTO file_deletions VALUES(?)",
      );
      for (const video of db
        .prepare("SELECT * FROM videos WHERE user_id=?")
        .all(userId))
        for (const path of [
          video.raw_path,
          video.media_path,
          video.thumbnail_path,
        ])
          if (path) queue.run(path);
      const avatar = db
        .prepare("SELECT path FROM avatars WHERE user_id=?")
        .get(userId);
      if (avatar) queue.run(avatar.path);
      db.prepare(
        `DELETE FROM notifications WHERE user_id=? OR resource_id IN (SELECT id FROM videos WHERE user_id=?) OR resource_id IN (SELECT id FROM friendships WHERE requester_id=? OR recipient_id=?) OR resource_id IN (SELECT id FROM invitations WHERE organizer_id=?) OR resource_id IN (SELECT invitation_id FROM invitation_recipients WHERE user_id=?) OR (type='signal' AND resource_id IN (SELECT video_id FROM signals WHERE user_id=?))`,
      ).run(userId, userId, userId, userId, userId, userId, userId);
      db.prepare(
        "DELETE FROM saves WHERE user_id=? OR (kind='video' AND target IN (SELECT id FROM videos WHERE user_id=?))",
      ).run(userId, userId);
      db.prepare(
        "DELETE FROM signals WHERE user_id=? OR video_id IN (SELECT id FROM videos WHERE user_id=?)",
      ).run(userId, userId);
      db.prepare(
        "DELETE FROM reports WHERE user_id=? OR video_id IN (SELECT id FROM videos WHERE user_id=?)",
      ).run(userId, userId);
      db.prepare(
        "DELETE FROM moderation_log WHERE video_id IN (SELECT id FROM videos WHERE user_id=?)",
      ).run(userId);
      db.prepare("DELETE FROM contributions WHERE user_id=?").run(userId);
      db.prepare("DELETE FROM entitlements WHERE user_id=?").run(userId);
      db.prepare("DELETE FROM videos WHERE user_id=?").run(userId);
      db.prepare("DELETE FROM capture_tickets WHERE user_id=?").run(userId);
      db.prepare("DELETE FROM hidden_places WHERE user_id=?").run(userId);
      db.prepare(
        "DELETE FROM friendships WHERE requester_id=? OR recipient_id=?",
      ).run(userId, userId);
      db.prepare(
        "DELETE FROM messages WHERE sender_id=? OR recipient_id=? OR invitation_id IN (SELECT id FROM invitations WHERE organizer_id=?)",
      ).run(userId, userId, userId);
      db.prepare("UPDATE invitations SET note='' WHERE organizer_id=?").run(
        userId,
      );
      db.prepare(
        "UPDATE invitation_recipients SET response='declined' WHERE user_id=?",
      ).run(userId);
      db.prepare("DELETE FROM avatars WHERE user_id=?").run(userId);
      db.prepare("DELETE FROM sessions WHERE user_id=?").run(userId);
      db.prepare(
        "UPDATE users SET name='Deleted account',email=?,password_hash='deleted',preferences=? WHERE id=?",
      ).run(
        `deleted-${userId}@deleted.invalid`,
        JSON.stringify({
          ...defaultPreferences,
          friendRequests: false,
          friendActivity: false,
          invitations: false,
          invitationResponses: false,
          invitationMessages: false,
          outsideSignals: false,
          mapVisibility: "private",
        }),
        userId,
      );
      db.prepare("INSERT INTO deleted_accounts VALUES(?,?)").run(
        userId,
        iso(now()),
      );
    });
    await drainDeletedFiles();
    send(res, { ok: true });
  });
  app.get("/api/me", (req, res) =>
    send(res, {
      user: domain.user(domain.getUser(req.userId)),
      preferences: domain.preferences(req.userId),
      entitlements: domain.entitlements(req.userId),
    }),
  );
  app.patch("/api/me", (req, res) => {
    const body = parse(z.object({ name: cleanText(80) }), req.body);
    db.prepare("UPDATE users SET name=? WHERE id=?").run(body.name, req.userId);
    send(res, domain.user(domain.getUser(req.userId)));
  });
  const avatarDirectory = join(dataDirectory, "avatars");
  mkdirSync(avatarDirectory, { recursive: true, mode: 0o700 });
  const avatarUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 0 },
    fileFilter: (req, file, cb) =>
      cb(
        null,
        ["image/jpeg", "image/png", "image/webp"].includes(file.mimetype),
      ),
  }).single("image");
  app.post(
    "/api/me/avatar",
    (req, res, next) => {
      try {
        limit(`avatar:${req.userId}`, 10, 3600000);
        next();
      } catch (error) {
        next(error);
      }
    },
    avatarUpload,
    async (req, res) => {
      if (!req.file)
        fail(400, "INVALID_IMAGE", "Choose a JPEG, PNG or WebP profile image.");
      const bytes = req.file.buffer;
      const jpeg =
        bytes.length >= 3 &&
        bytes[0] === 0xff &&
        bytes[1] === 0xd8 &&
        bytes[2] === 0xff;
      const png =
        bytes.length >= 8 &&
        bytes
          .subarray(0, 8)
          .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
      const webp =
        bytes.length >= 12 &&
        bytes.subarray(0, 4).toString() === "RIFF" &&
        bytes.subarray(8, 12).toString() === "WEBP";
      if (!jpeg && !png && !webp)
        fail(400, "INVALID_IMAGE", "Choose a JPEG, PNG or WebP profile image.");
      let output;
      try {
        const pipeline = sharp(req.file.buffer, {
          limitInputPixels: 16000000,
          pages: 1,
        });
        const metadata = await pipeline.metadata();
        if (
          !["jpeg", "png", "webp"].includes(metadata.format) ||
          metadata.pages > 1
        )
          fail(400, "INVALID_IMAGE", "Choose a still JPEG, PNG or WebP image.");
        output = await pipeline
          .rotate()
          .resize(256, 256, { fit: "cover" })
          .jpeg({ quality: 82 })
          .toBuffer();
      } catch {
        fail(
          400,
          "INVALID_IMAGE",
          "This image could not be read. Choose a still image under 5 MB and 16 megapixels.",
        );
      }
      const version = id(),
        path = join(avatarDirectory, `${version}.jpg`),
        previous = db
          .prepare("SELECT path FROM avatars WHERE user_id=?")
          .get(req.userId);
      await writeFile(path, output, { mode: 0o600 });
      try {
        db.prepare(
          "INSERT INTO avatars VALUES(?,?,?) ON CONFLICT(user_id) DO UPDATE SET path=excluded.path,version=excluded.version",
        ).run(req.userId, path, version);
      } catch (error) {
        await rm(path, { force: true });
        throw error;
      }
      if (previous) await rm(previous.path, { force: true });
      send(res, domain.user(domain.getUser(req.userId)));
    },
  );
  app.delete("/api/me/avatar", async (req, res) => {
    const previous = db
      .prepare("SELECT path FROM avatars WHERE user_id=?")
      .get(req.userId);
    db.prepare("DELETE FROM avatars WHERE user_id=?").run(req.userId);
    if (previous) await rm(previous.path, { force: true });
    send(res, domain.user(domain.getUser(req.userId)));
  });
  app.get("/api/users/:id/avatar", (req, res, next) => {
    const avatar = db
      .prepare("SELECT path FROM avatars WHERE user_id=?")
      .get(req.params.id);
    if (!avatar) fail(404, "NOT_FOUND", "Profile image not found.");
    res
      .type("image/jpeg")
      .sendFile(resolve(avatar.path), { cacheControl: false }, (error) => {
        if (error) next(error);
      });
  });
  app.patch("/api/me/preferences", (req, res) => {
    const body = parse(preferencesSchema, req.body),
      preferences = { ...domain.preferences(req.userId), ...body };
    db.prepare("UPDATE users SET preferences=? WHERE id=?").run(
      JSON.stringify(preferences),
      req.userId,
    );
    send(res, preferences);
  });
  app.get("/api/users/search", (req, res) => {
    limit(`usersearch:${req.userId}`, 30, 60000);
    const { q } = parse(z.object({ q: cleanText(254).min(3) }), req.query);
    const rows = db
      .prepare(
        "SELECT * FROM users WHERE id<>? AND id NOT IN (SELECT user_id FROM deleted_accounts) AND (email=? OR name LIKE ? ESCAPE '\\') LIMIT 20",
      )
      .all(req.userId, q.toLowerCase(), `${q.replace(/[\\%_]/g, "\\$&")}%`);
    send(res, rows.map(domain.user));
  });
  function mapFor(owner, viewer) {
    const ownerUser = domain.getUser(owner);
    if (!ownerUser || domain.isDeleted(owner))
      fail(404, "NOT_FOUND", "Profile not found.");
    const preferences = domain.preferences(owner),
      own = owner === viewer;
    if (
      !own &&
      (!domain.areFriends(owner, viewer) ||
        preferences.mapVisibility !== "friends")
    )
      fail(403, "MAP_PRIVATE", "This map is private.");
    const rows = db
      .prepare(
        "SELECT * FROM videos WHERE user_id=? AND status='approved' ORDER BY recorded_at DESC",
      )
      .all(owner);
    const groups = new Map();
    for (const row of rows) {
      const hidden = domain.hidden(owner, row.place_id);
      if (!own && (hidden || row.visibility === "private")) continue;
      if (!groups.has(row.place_id))
        groups.set(row.place_id, {
          place: domain.place(domain.getPlace(row.place_id)),
          videos: [],
          hidden,
        });
      groups.get(row.place_id).videos.push(domain.video(row));
    }
    return {
      places: [...groups.values()],
      visibility: preferences.mapVisibility,
    };
  }
  app.get("/api/users/:id", (req, res) => {
    const user = domain.getUser(req.params.id);
    if (!user || domain.isDeleted(user.id))
      fail(404, "NOT_FOUND", "Profile not found.");
    const friendship = db
      .prepare("SELECT * FROM friendships WHERE pair_key=?")
      .get([req.userId, user.id].sort().join(":"));
    const state =
      user.id === req.userId
        ? "self"
        : friendship?.status === "accepted"
          ? "friends"
          : friendship?.status === "pending"
            ? friendship.requester_id === req.userId
              ? "outgoing"
              : "incoming"
            : "none";
    let recentPlaces = [];
    if (
      state === "self" ||
      (state === "friends" &&
        domain.preferences(user.id).mapVisibility === "friends")
    )
      recentPlaces = mapFor(user.id, req.userId)
        .places.slice(0, 6)
        .map((p) => p.place);
    send(res, { user: domain.user(user), friendship: state, recentPlaces });
  });
  app.get("/api/map", (req, res) => send(res, mapFor(req.userId, req.userId)));
  app.get("/api/users/:id/map", (req, res) =>
    send(res, mapFor(req.params.id, req.userId)),
  );
  app.put("/api/map/places/:placeId/privacy", (req, res) => {
    domain.requirePlace(req.params.placeId);
    const body = parse(z.object({ hidden: z.boolean() }), req.body);
    if (body.hidden)
      db.prepare("INSERT OR IGNORE INTO hidden_places VALUES(?,?)").run(
        req.userId,
        req.params.placeId,
      );
    else
      db.prepare(
        "DELETE FROM hidden_places WHERE user_id=? AND place_id=?",
      ).run(req.userId, req.params.placeId);
    send(res, { ok: true });
  });
  app.get("/api/places/search", async (req, res) => {
    limit(`places:${req.userId}`, 20, 60000);
    const body = parse(
      z.object({
        q: cleanText(200).min(2),
        lat: coordinates.lat.optional(),
        lng: coordinates.lng.optional(),
      }),
      req.query,
    );
    send(
      res,
      await places.search(
        body.q,
        body.lat !== undefined && body.lng !== undefined ? body : undefined,
      ),
    );
  });
  const recentVideos = (viewer, where = "", args = []) =>
    db
      .prepare(
        `SELECT * FROM videos WHERE status='approved' AND expires_at>? ${where} ORDER BY recorded_at DESC LIMIT 500`,
      )
      .all(iso(now()), ...args)
      .filter((row) => domain.canViewVideo(row, viewer, true));
  app.get("/api/places/:id", (req, res) => {
    const place = domain.requirePlace(req.params.id);
    send(res, {
      place: domain.place(place),
      videos: recentVideos(req.userId, "AND place_id=?", [place.id])
        .slice(0, 50)
        .map(domain.video),
      nearby: places.nearby(place),
    });
  });
  app.get("/api/places/:id/nearby", (req, res) =>
    send(res, places.nearby(domain.requirePlace(req.params.id))),
  );
  app.get("/api/feed", (req, res) => {
    const query = parse(
      z.object({
        q: z.string().trim().min(1).max(200).optional(),
        category: z.string().max(40).optional(),
        friends: z.enum(["true", "false"]).optional(),
        lat: coordinates.lat.optional(),
        lng: coordinates.lng.optional(),
      }),
      req.query,
    );
    let rows = recentVideos(req.userId);
    if (query.q)
      rows = rows.filter((v) =>
        matchesEvidenceQuery(query.q, v.caption, domain.getPlace(v.place_id)),
      );
    if (query.friends === "true")
      rows = rows.filter((v) => domain.areFriends(v.user_id, req.userId));
    if (query.category && query.category !== "all")
      rows = rows.filter(
        (v) => domain.getPlace(v.place_id).category === query.category,
      );
    if (query.lat !== undefined && query.lng !== undefined)
      rows = rows.filter(
        (v) => distance(query, domain.getPlace(v.place_id)) <= 50000,
      );
    // Interests select genuine recordings; never infer current crowds or atmosphere.
    if (!query.category) {
      const interests = domain.preferences(req.userId).interests;
      if (interests.length)
        rows.sort(
          (a, b) =>
            Number(interests.includes(domain.getPlace(b.place_id).category)) -
            Number(interests.includes(domain.getPlace(a.place_id).category)),
        );
    }
    send(res, rows.slice(0, 50).map(domain.video));
  });
  app.get("/api/me/videos", (req, res) =>
    send(
      res,
      db
        .prepare(
          "SELECT * FROM videos WHERE user_id=? ORDER BY created_at DESC LIMIT 200",
        )
        .all(req.userId)
        .map(domain.video),
    ),
  );
  app.get("/api/videos/:id", (req, res) =>
    send(res, domain.video(domain.visibleVideo(req.params.id, req.userId))),
  );
  for (const [route, column, type] of [
    ["media", "media_path", "video/mp4"],
    ["thumbnail", "thumbnail_path", "image/jpeg"],
  ])
    app.get(`/api/videos/:id/${route}`, (req, res, next) => {
      const row = domain.visibleVideo(req.params.id, req.userId);
      if (!row[column]) fail(404, "NOT_READY", "Media is still processing.");
      res.type(type);
      res.sendFile(resolve(row[column]), { cacheControl: false }, (error) => {
        if (error) next(error);
      });
    });
  app.get("/api/friends", (req, res) => {
    const rows = db
      .prepare(
        "SELECT * FROM friendships WHERE (requester_id=? OR recipient_id=?) AND status<>'declined' ORDER BY created_at DESC",
      )
      .all(req.userId, req.userId);
    const friends = [],
      incoming = [],
      outgoing = [];
    for (const row of rows) {
      const other = domain.user(
        domain.getUser(
          row.requester_id === req.userId ? row.recipient_id : row.requester_id,
        ),
      );
      if (row.status === "accepted") friends.push(other);
      else
        (row.recipient_id === req.userId ? incoming : outgoing).push({
          id: row.id,
          user: other,
          createdAt: row.created_at,
        });
    }
    send(res, { friends, incoming, outgoing });
  });
  app.post("/api/friends/requests", (req, res) => {
    limit(`friendrequest:${req.userId}`, 30, 3600000);
    const { userId } = parse(z.object({ userId: stringId }), req.body);
    if (userId === req.userId)
      fail(400, "SELF_REQUEST", "Choose another person.");
    if (!domain.getUser(userId) || domain.isDeleted(userId))
      fail(404, "NOT_FOUND", "Person not found.");
    const pair = [req.userId, userId].sort().join(":"),
      existing = db
        .prepare("SELECT * FROM friendships WHERE pair_key=?")
        .get(pair);
    if (existing && existing.status !== "declined")
      fail(409, "ALREADY_CONNECTED", "A connection or request already exists.");
    const requestId = existing?.id || id();
    db.prepare(
      "INSERT INTO friendships VALUES(?,?,?,?,'pending',?) ON CONFLICT(pair_key) DO UPDATE SET requester_id=excluded.requester_id,recipient_id=excluded.recipient_id,status='pending',created_at=excluded.created_at",
    ).run(requestId, req.userId, userId, pair, iso(now()));
    domain.notify(
      userId,
      "friend_request",
      "New friend request",
      `${domain.getUser(req.userId).name} wants to connect.`,
      requestId,
    );
    send(res, { id: requestId, status: "pending" }, 201);
  });
  app.post("/api/friends/requests/:id/respond", (req, res) => {
    const { response } = parse(
      z.object({ response: z.enum(["accepted", "declined"]) }),
      req.body,
    );
    const row = db
      .prepare("SELECT * FROM friendships WHERE id=? AND recipient_id=?")
      .get(req.params.id, req.userId);
    if (!row) fail(404, "NOT_FOUND", "Request not found.");
    if (row.status !== "pending")
      fail(409, "ALREADY_RESPONDED", "This request was already answered.");
    db.prepare("UPDATE friendships SET status=? WHERE id=?").run(
      response,
      row.id,
    );
    send(res, { ok: true });
  });
  app.delete("/api/friends/:userId", (req, res) => {
    db.prepare("DELETE FROM friendships WHERE pair_key=?").run(
      [req.userId, req.params.userId].sort().join(":"),
    );
    send(res, { ok: true });
  });
  app.get("/api/invitations", (req, res) =>
    send(
      res,
      db
        .prepare(
          "SELECT DISTINCT i.* FROM invitations i LEFT JOIN invitation_recipients r ON r.invitation_id=i.id WHERE i.organizer_id=? OR r.user_id=? ORDER BY i.starts_at DESC LIMIT 200",
        )
        .all(req.userId, req.userId)
        .map((row) => domain.invitation(row, req.userId)),
    ),
  );
  app.post("/api/invitations", (req, res) => {
    limit(`invitations:${req.userId}`, 30, 3600000);
    const body = parse(
      z.object({
        placeId: stringId,
        startsAt: z.iso.datetime(),
        endsAt: z.iso.datetime(),
        recipientIds: z.array(stringId).min(1).max(20),
        note: z.string().trim().max(500).default(""),
      }),
      req.body,
    );
    domain.requirePlace(body.placeId);
    const start = new Date(body.startsAt).getTime(),
      end = new Date(body.endsAt).getTime();
    if (
      start <= now() ||
      end <= start ||
      end - start > 7 * DAY ||
      start > now() + 365 * DAY
    )
      fail(
        400,
        "INVALID_TIME",
        "Choose a future outing lasting no more than seven days.",
      );
    const recipients = [...new Set(body.recipientIds)];
    if (recipients.some((userId) => !domain.areFriends(req.userId, userId)))
      fail(403, "FRIENDS_ONLY", "Invite mutual friends only.");
    const invitationId = id();
    transaction(db, () => {
      db.prepare("INSERT INTO invitations VALUES(?,?,?,?,?,?,?)").run(
        invitationId,
        req.userId,
        body.placeId,
        iso(start),
        iso(end),
        body.note,
        iso(now()),
      );
      for (const userId of recipients) {
        db.prepare(
          "INSERT INTO invitation_recipients(invitation_id,user_id) VALUES(?,?)",
        ).run(invitationId, userId);
        domain.notify(
          userId,
          "invitation",
          "You’re invited",
          `${domain.getUser(req.userId).name} invited you to an outing.`,
          invitationId,
        );
      }
    });
    send(
      res,
      domain.invitation(
        domain.requireInvitation(invitationId, req.userId),
        req.userId,
      ),
      201,
    );
  });
  app.get("/api/invitations/:id", (req, res) =>
    send(
      res,
      domain.invitation(
        domain.requireInvitation(req.params.id, req.userId),
        req.userId,
      ),
    ),
  );
  app.post("/api/invitations/:id/respond", (req, res) => {
    limit(`responses:${req.userId}`, 30, 60000);
    const { response } = parse(
      z.object({ response: z.enum(["accepted", "declined"]) }),
      req.body,
    );
    const row = domain.requireInvitation(req.params.id, req.userId);
    if (row.organizer_id === req.userId)
      fail(403, "ORGANIZER", "The organizer cannot respond as a guest.");
    if (new Date(row.ends_at).getTime() <= now())
      fail(409, "OUTING_ENDED", "This outing has ended.");
    const previous = db
      .prepare(
        "SELECT response FROM invitation_recipients WHERE invitation_id=? AND user_id=?",
      )
      .get(row.id, req.userId);
    if (previous.response === response)
      return send(res, domain.invitation(row, req.userId));
    db.prepare(
      "UPDATE invitation_recipients SET response=? WHERE invitation_id=? AND user_id=?",
    ).run(response, row.id, req.userId);
    domain.notify(
      row.organizer_id,
      "invitation_response",
      "Invitation response",
      `${domain.getUser(req.userId).name} ${response} your invitation.`,
      row.id,
    );
    send(res, domain.invitation(row, req.userId));
  });
  app.get("/api/invitations/:id/messages", (req, res) => {
    const { peerId } = parse(
      z.object({ peerId: stringId.optional() }),
      req.query,
    );
    const chat = domain.chat(req.params.id, req.userId, peerId);
    const messages = db
      .prepare(
        "SELECT * FROM messages WHERE invitation_id=? AND recipient_id=? ORDER BY created_at ASC LIMIT 500",
      )
      .all(req.params.id, chat.recipient)
      .map(domain.message);
    send(res, { messages, expiresAt: chat.expiresAt });
  });
  app.post("/api/invitations/:id/messages", (req, res) => {
    limit(`messages:${req.userId}`, 60, 60000);
    const body = parse(
      z.object({
        peerId: stringId.optional(),
        text: z.string().trim().max(2000).default(""),
        placeId: stringId.optional(),
      }),
      req.body,
    );
    if (!body.text && !body.placeId)
      fail(400, "EMPTY_MESSAGE", "Add a message or share a place.");
    const chat = domain.chat(req.params.id, req.userId, body.peerId);
    if (body.placeId) domain.requirePlace(body.placeId);
    const messageId = id();
    db.prepare("INSERT INTO messages VALUES(?,?,?,?,?,?,?)").run(
      messageId,
      req.params.id,
      chat.recipient,
      req.userId,
      body.text,
      body.placeId || null,
      iso(now()),
    );
    const recipient =
      req.userId === chat.invitation.organizer_id
        ? chat.recipient
        : chat.invitation.organizer_id;
    domain.notify(
      recipient,
      "invitation_message",
      "Outing update",
      "You have a private outing message.",
      req.params.id,
    );
    send(
      res,
      domain.message(
        db.prepare("SELECT * FROM messages WHERE id=?").get(messageId),
      ),
      201,
    );
  });
  const saveSchema = z.object({
    kind: z.enum(["place", "video", "search"]),
    targetId: stringId.optional(),
    query: cleanText(200).optional(),
  });
  app.get("/api/saves", (req, res) => {
    const saved = { places: [], videos: [], searches: [] };
    for (const row of db
      .prepare(
        "SELECT * FROM saves WHERE user_id=? ORDER BY created_at DESC LIMIT 500",
      )
      .all(req.userId)) {
      if (row.kind === "place") {
        const place = domain.getPlace(row.target);
        if (place) saved.places.push(domain.place(place));
      } else if (row.kind === "video") {
        const video = db
          .prepare("SELECT * FROM videos WHERE id=?")
          .get(row.target);
        if (domain.canViewVideo(video, req.userId))
          saved.videos.push(domain.video(video));
      } else
        saved.searches.push({
          id: row.target,
          query: row.target,
          createdAt: row.created_at,
        });
    }
    send(res, saved);
  });
  app.post("/api/saves", (req, res) => {
    const body = parse(saveSchema, req.body),
      target = body.kind === "search" ? body.query : body.targetId;
    if (!target) fail(400, "VALIDATION", "Provide a targetId or search query.");
    if (body.kind === "place") domain.requirePlace(target);
    if (body.kind === "video") domain.visibleVideo(target, req.userId);
    db.prepare("INSERT OR IGNORE INTO saves VALUES(?,?,?,?)").run(
      req.userId,
      body.kind,
      target,
      iso(now()),
    );
    send(res, { ok: true });
  });
  app.delete("/api/saves", (req, res) => {
    const body = parse(saveSchema, req.body),
      target = body.kind === "search" ? body.query : body.targetId;
    if (!target) fail(400, "VALIDATION", "Provide a targetId or search query.");
    db.prepare("DELETE FROM saves WHERE user_id=? AND kind=? AND target=?").run(
      req.userId,
      body.kind,
      target,
    );
    send(res, { ok: true });
  });
  app.get("/api/notifications", (req, res) => {
    const rows = db
      .prepare(
        "SELECT * FROM notifications WHERE user_id=? ORDER BY created_at DESC LIMIT 100",
      )
      .all(req.userId);
    send(
      res,
      rows
        .filter((row) => {
          if (!["friend_activity", "signal"].includes(row.type)) return true;
          const video = db
            .prepare("SELECT * FROM videos WHERE id=?")
            .get(row.resource_id);
          return domain.canViewVideo(video, req.userId);
        })
        .map((row) => ({
          id: row.id,
          type: row.type,
          title: row.title,
          body: row.body,
          resourceId: row.resource_id,
          readAt: row.read_at,
          createdAt: row.created_at,
        })),
    );
  });
  app.post("/api/notifications/:id/read", (req, res) => {
    const result = db
      .prepare("UPDATE notifications SET read_at=? WHERE id=? AND user_id=?")
      .run(iso(now()), req.params.id, req.userId);
    if (!result.changes) fail(404, "NOT_FOUND", "Notification not found.");
    send(res, { ok: true });
  });
  app.post("/api/videos/:id/signal", (req, res) => {
    const row = domain.visibleVideo(req.params.id, req.userId);
    if (!domain.areFriends(row.user_id, req.userId))
      fail(403, "FRIENDS_ONLY", "Outside Signal is for mutual friends.");
    const result = db
      .prepare("INSERT OR IGNORE INTO signals VALUES(?,?,?)")
      .run(row.id, req.userId, iso(now()));
    if (result.changes)
      domain.notify(
        row.user_id,
        "signal",
        "I’m coming",
        `${domain.getUser(req.userId).name} plans to join you.`,
        row.id,
      );
    send(res, { ok: true });
  });
  app.get("/api/videos/:id/signals", (req, res) => {
    const video = db
      .prepare("SELECT * FROM videos WHERE id=? AND user_id=?")
      .get(req.params.id, req.userId);
    if (!video) fail(404, "NOT_FOUND", "Video not found.");
    send(
      res,
      db
        .prepare(
          "SELECT * FROM signals WHERE video_id=? ORDER BY created_at DESC",
        )
        .all(video.id)
        .filter((row) => domain.areFriends(row.user_id, req.userId))
        .map((row) => ({
          user: domain.user(domain.getUser(row.user_id)),
          createdAt: row.created_at,
        })),
    );
  });
  app.post("/api/reports", (req, res) => {
    limit(`reports:${req.userId}`, 20, 3600000);
    const body = parse(
      z.object({ videoId: stringId, reason: cleanText(1000).min(5) }),
      req.body,
    );
    domain.visibleVideo(body.videoId, req.userId);
    const reportId = id();
    db.prepare(
      "INSERT INTO reports(id,user_id,video_id,reason,created_at) VALUES(?,?,?,?,?) ON CONFLICT(user_id,video_id) DO UPDATE SET reason=excluded.reason",
    ).run(reportId, req.userId, body.videoId, body.reason, iso(now()));
    send(
      res,
      {
        id: db
          .prepare("SELECT id FROM reports WHERE user_id=? AND video_id=?")
          .get(req.userId, body.videoId).id,
      },
      201,
    );
  });
  function checkGps(evidence, place, receivedAt = now()) {
    if (evidence.mocked)
      fail(
        403,
        "LOCATION_REJECTED",
        "Mock locations cannot be used for verified posting.",
      );
    if (
      Math.abs(receivedAt - new Date(evidence.locationTimestamp).getTime()) >
      30000
    )
      fail(400, "STALE_LOCATION", "Get a fresh location fix and try again.");
    if (distance(evidence, place) > 250)
      fail(
        403,
        "TOO_FAR",
        "You must be within 250 metres of this place to record.",
      );
  }
  app.post("/api/capture/tickets", (req, res) => {
    limit(`capture:${req.userId}`, 15, 3600000);
    const body = parse(gps.extend({ placeId: stringId }), req.body),
      place = domain.requirePlace(body.placeId);
    checkGps(body, place);
    const ticketId = id(),
      createdAt = iso(now()),
      expiresAt = iso(now() + 10 * 60000);
    db.prepare(
      "INSERT INTO capture_tickets(id,user_id,place_id,created_at,expires_at,lat,lng,accuracy) VALUES(?,?,?,?,?,?,?,?)",
    ).run(
      ticketId,
      req.userId,
      place.id,
      createdAt,
      expiresAt,
      body.lat,
      body.lng,
      body.accuracyMeters,
    );
    send(
      res,
      {
        id: ticketId,
        serverTime: createdAt,
        expiresAt,
        uploadUrl: `/api/capture/tickets/${ticketId}/upload`,
        maxDurationSeconds: 60,
        maxBytes: 41943040,
      },
      201,
    );
  });
  const upload = multer({
    dest: uploads,
    limits: { fileSize: 41943040, files: 1, fields: 12, fieldSize: 4000 },
    fileFilter: (req, file, cb) =>
      cb(
        null,
        [
          "video/mp4",
          "video/quicktime",
          "video/webm",
          "application/octet-stream",
        ].includes(file.mimetype),
      ),
  }).single("video");
  app.post(
    "/api/capture/tickets/:id/upload",
    (req, res, next) => {
      try {
        const ticket = db
          .prepare("SELECT * FROM capture_tickets WHERE id=? AND user_id=?")
          .get(req.params.id, req.userId);
        if (!ticket) fail(404, "NOT_FOUND", "Capture ticket not found.");
        // A lost mobile response can be retried without creating another contribution.
        if (ticket.state === "consumed") {
          const existing = db
            .prepare("SELECT * FROM videos WHERE ticket_id=? AND user_id=?")
            .get(ticket.id, req.userId);
          if (existing) return send(res, domain.video(existing));
        }
        if (ticket.expires_at <= iso(now()))
          fail(410, "CAPTURE_EXPIRED", "Capture expired. Record a fresh clip.");
        const claim = db
          .prepare(
            "UPDATE capture_tickets SET state='uploading' WHERE id=? AND state='open'",
          )
          .run(ticket.id);
        if (!claim.changes)
          fail(409, "CAPTURE_USED", "This capture has already been uploaded.");
        req.captureTicket = ticket;
        req.uploadReceivedAt = now();
        upload(req, res, (error) => {
          if (error) {
            db.prepare(
              "UPDATE capture_tickets SET state='open' WHERE id=? AND state='uploading'",
            ).run(ticket.id);
            return next(error);
          }
          next();
        });
      } catch (error) {
        next(error);
      }
    },
    async (req, res) => {
      try {
        if (!req.file)
          fail(400, "INVALID_MEDIA", "Choose an in-app camera video.");
        const body = parse(
          gps.extend({
            caption: z.string().trim().max(500).default(""),
            visibility: z
              .enum(["public", "friends", "private"])
              .default("public"),
            cameraFacing: z.literal("back"),
          }),
          req.body,
        );
        checkGps(
          body,
          domain.requirePlace(req.captureTicket.place_id),
          req.uploadReceivedAt,
        );
        const videoId = id();
        transaction(db, () => {
          db.prepare(
            "INSERT INTO videos(id,user_id,place_id,ticket_id,caption,recorded_at,created_at,expires_at,status,visibility,raw_path) VALUES(?,?,?,?,?,?,?,?,'processing',?,?)",
          ).run(
            videoId,
            req.userId,
            req.captureTicket.place_id,
            req.captureTicket.id,
            body.caption,
            req.captureTicket.created_at,
            iso(now()),
            iso(new Date(req.captureTicket.created_at).getTime() + 7 * DAY),
            body.visibility,
            req.file.path,
          );
          db.prepare(
            "UPDATE capture_tickets SET state='consumed' WHERE id=?",
          ).run(req.captureTicket.id);
        });
        if (processMedia) media.enqueue(videoId);
        send(
          res,
          domain.video(
            db.prepare("SELECT * FROM videos WHERE id=?").get(videoId),
          ),
          202,
        );
      } catch (error) {
        if (req.file) await rm(req.file.path, { force: true });
        db.prepare(
          "UPDATE capture_tickets SET state='open' WHERE id=? AND state='uploading'",
        ).run(req.captureTicket.id);
        throw error;
      }
    },
  );
  app.post("/api/videos/:id/retry", (req, res) => {
    limit(`retry:${req.userId}`, 10, 3600000);
    const row = db
      .prepare("SELECT * FROM videos WHERE id=? AND user_id=?")
      .get(req.params.id, req.userId);
    if (!row) fail(404, "NOT_FOUND", "Video not found.");
    if (row.status !== "failed")
      fail(409, "NOT_FAILED", "Only failed processing can be retried.");
    db.prepare(
      "UPDATE videos SET status='processing',failure_reason=NULL WHERE id=?",
    ).run(row.id);
    if (processMedia) media.enqueue(row.id);
    send(
      res,
      domain.video(db.prepare("SELECT * FROM videos WHERE id=?").get(row.id)),
      202,
    );
  });
  app.use((req, res) =>
    res
      .status(404)
      .json({ error: { code: "NOT_FOUND", message: "Route not found." } }),
  );
  app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);
    let status = error.status || 500,
      code = error.code || "INTERNAL",
      message = error.message;
    if (error instanceof multer.MulterError) {
      status = 400;
      code = "INVALID_UPLOAD";
      message =
        error.code === "LIMIT_FILE_SIZE"
          ? req.path === "/api/me/avatar"
            ? "Profile image exceeds the 5 MB limit."
            : "Video exceeds the 40 MB limit."
          : "Invalid upload. Include one supported file.";
    }
    if (status >= 500) {
      console.error(
        JSON.stringify({
          event: "request_failed",
          method: req.method,
          path: req.path,
          code,
        }),
      );
      if (!(error instanceof ApiError)) {
        message = "Something went wrong. Please try again.";
        code = "INTERNAL";
      }
    }
    res.status(status).json({ error: { code, message } });
  });
  const cleanup = setInterval(() => {
    db.prepare("DELETE FROM sessions WHERE expires_at<=?").run(iso(now()));
    // Messages disappear at end +24h; routine safety retention is 30 further days.
    db.prepare(
      "DELETE FROM messages WHERE invitation_id IN (SELECT id FROM invitations WHERE ends_at<?)",
    ).run(iso(now() - 31 * DAY));
    void drainDeletedFiles();
  }, 3600000);
  cleanup.unref();
  void drainDeletedFiles();
  return {
    app,
    db,
    domain,
    media,
    close: async () => {
      clearInterval(cleanup);
      await media.close();
      await fileCleanup;
      db.close();
    },
  };
}
