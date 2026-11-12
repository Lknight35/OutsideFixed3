import { randomUUID, createHash } from "node:crypto";
import { transaction, defaultPreferences } from "./db.js";

export const DAY = 86400000;
export const id = () => randomUUID();
export const iso = (time = Date.now()) => new Date(time).toISOString();
export const hash = (value) => createHash("sha256").update(value).digest("hex");
const searchFillers = new Set([
  "nearby",
  "happening",
  "show",
  "me",
  "find",
  "places",
  "place",
  "where",
  "is",
  "are",
  "the",
  "a",
  "an",
  "at",
  "in",
  "to",
  "for",
  "and",
  "with",
]);
const words = (value) =>
  String(value)
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .match(/[\p{L}\p{N}]+/gu) || [];
export function matchesEvidenceQuery(query, caption, place) {
  const terms = [
    ...new Set(words(query).filter((word) => !searchFillers.has(word))),
  ];
  if (!terms.length) return true;
  const evidence = new Set(
    words([caption, place.name, place.address, place.category].join(" ")),
  );
  return terms.every((term) => evidence.has(term));
}
export class ApiError extends Error {
  constructor(status, code, message) {
    super(message);
    this.status = status;
    this.code = code;
  }
}
export const fail = (status, code, message) => {
  throw new ApiError(status, code, message);
};
export function distance(a, b) {
  const rad = (n) => (n * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat),
    dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(Math.max(0, 1 - h)));
}
export function createDomain(db, now = Date.now) {
  const getUser = (userId) =>
    db.prepare("SELECT * FROM users WHERE id=?").get(userId);
  const isDeleted = (userId) =>
    Boolean(
      db.prepare("SELECT 1 FROM deleted_accounts WHERE user_id=?").get(userId),
    );
  const user = (row) => {
    if (!row) return null;
    const avatar = db
      .prepare("SELECT version FROM avatars WHERE user_id=?")
      .get(row.id);
    return {
      id: row.id,
      name: row.name,
      avatarUrl: avatar
        ? `/api/users/${row.id}/avatar?v=${avatar.version}`
        : null,
      createdAt: row.created_at,
    };
  };
  const place = (row) =>
    row
      ? {
          id: row.id,
          name: row.name,
          address: row.address,
          lat: row.lat,
          lng: row.lng,
          category: row.category,
          source: row.source,
          attribution: "© OpenStreetMap contributors",
        }
      : null;
  const getPlace = (placeId) =>
    db.prepare("SELECT * FROM places WHERE id=?").get(placeId);
  const requirePlace = (placeId) =>
    getPlace(placeId) ||
    fail(404, "NOT_FOUND", "Place not found. Search for a real place first.");
  const areFriends = (a, b) =>
    Boolean(
      db
        .prepare(
          "SELECT 1 FROM friendships WHERE pair_key=? AND status='accepted'",
        )
        .get([a, b].sort().join(":")),
    );
  const hidden = (owner, placeId) =>
    Boolean(
      db
        .prepare("SELECT 1 FROM hidden_places WHERE user_id=? AND place_id=?")
        .get(owner, placeId),
    );
  const preferences = (userId) => ({
    ...defaultPreferences,
    ...JSON.parse(getUser(userId).preferences),
  });
  function canViewVideo(row, viewer, discovery = false) {
    if (!row) return false;
    if (row.user_id === viewer && !discovery) return true;
    if (row.status !== "approved") return false;
    if (hidden(row.user_id, row.place_id)) return false;
    const friend = areFriends(row.user_id, viewer);
    // Discovery expires; shared map memories remain available to permitted friends.
    if (
      new Date(row.expires_at).getTime() <= now() &&
      (discovery ||
        !friend ||
        preferences(row.user_id).mapVisibility !== "friends")
    )
      return false;
    return (
      row.visibility === "public" || (row.visibility === "friends" && friend)
    );
  }
  function video(row) {
    return {
      id: row.id,
      user: user(getUser(row.user_id)),
      place: place(getPlace(row.place_id)),
      caption: row.caption,
      recordedAt: row.recorded_at,
      createdAt: row.created_at,
      durationSeconds: row.duration_seconds,
      status: row.status,
      visibility: row.visibility,
      verification: "location_checked",
      mediaUrl: row.media_path ? `/api/videos/${row.id}/media` : null,
      thumbnailUrl: row.thumbnail_path
        ? `/api/videos/${row.id}/thumbnail`
        : null,
      expiresAt: row.expires_at,
      failureReason: row.failure_reason,
    };
  }
  function visibleVideo(videoId, viewer) {
    const row = db.prepare("SELECT * FROM videos WHERE id=?").get(videoId);
    if (!canViewVideo(row, viewer)) fail(404, "NOT_FOUND", "Video not found.");
    return row;
  }
  function notify(userId, type, title, body, resourceId = null) {
    const pref = preferences(userId);
    const key = {
      friend_request: "friendRequests",
      friend_activity: "friendActivity",
      invitation: "invitations",
      invitation_response: "invitationResponses",
      invitation_message: "invitationMessages",
      signal: "outsideSignals",
    }[type];
    if (key && !pref[key]) return;
    db.prepare("INSERT INTO notifications VALUES(?,?,?,?,?,?,NULL,?)").run(
      id(),
      userId,
      type,
      title,
      body,
      resourceId,
      iso(now()),
    );
  }
  function invitation(row, viewer) {
    const own = row.organizer_id === viewer;
    const recipients = db
      .prepare("SELECT * FROM invitation_recipients WHERE invitation_id=?")
      .all(row.id);
    const mine = recipients.find((r) => r.user_id === viewer);
    if (!own && !mine) fail(404, "NOT_FOUND", "Invitation not found.");
    return {
      id: row.id,
      organizer: user(getUser(row.organizer_id)),
      place: place(getPlace(row.place_id)),
      startsAt: row.starts_at,
      endsAt: row.ends_at,
      note: row.note,
      createdAt: row.created_at,
      myResponse: own ? "organizer" : mine.response,
      ...(own
        ? {
            recipients: recipients.map((r) => ({
              user: user(getUser(r.user_id)),
              response: r.response,
            })),
          }
        : {}),
      chatExpiresAt: iso(new Date(row.ends_at).getTime() + DAY),
    };
  }
  function requireInvitation(invitationId, viewer) {
    const row = db
      .prepare("SELECT * FROM invitations WHERE id=?")
      .get(invitationId);
    if (!row) fail(404, "NOT_FOUND", "Invitation not found.");
    invitation(row, viewer);
    return row;
  }
  function chat(invitationId, viewer, peerId) {
    const row = requireInvitation(invitationId, viewer);
    const recipient = row.organizer_id === viewer ? peerId : viewer;
    if (
      !recipient ||
      (viewer !== row.organizer_id && peerId && peerId !== viewer)
    )
      fail(403, "FORBIDDEN", "This conversation is private.");
    if (isDeleted(row.organizer_id) || isDeleted(recipient))
      fail(410, "ACCOUNT_DELETED", "This conversation is no longer available.");
    const rec = db
      .prepare(
        "SELECT * FROM invitation_recipients WHERE invitation_id=? AND user_id=?",
      )
      .get(invitationId, recipient);
    if (!rec || rec.response !== "accepted")
      fail(403, "CHAT_UNAVAILABLE", "Chat opens after this recipient accepts.");
    const expiresAt = iso(new Date(row.ends_at).getTime() + DAY);
    if (expiresAt <= iso(now()))
      fail(410, "CHAT_EXPIRED", "This outing conversation has expired.");
    return { invitation: row, recipient, expiresAt };
  }
  function message(row) {
    return {
      id: row.id,
      senderId: row.sender_id,
      text: row.text,
      place: row.place_id ? place(getPlace(row.place_id)) : null,
      createdAt: row.created_at,
    };
  }
  function entitlements(userId) {
    const approvedContributions = db
      .prepare("SELECT COUNT(*) AS n FROM contributions WHERE user_id=?")
      .get(userId).n;
    const grant = db
      .prepare("SELECT * FROM entitlements WHERE user_id=?")
      .get(userId);
    return {
      advancedUntil: grant?.advanced_until || null,
      active: Boolean(grant && grant.advanced_until > iso(now())),
      approvedContributions,
      progress: approvedContributions % 3,
      required: 3,
    };
  }
  function moderate(videoId, action, reason = "") {
    return transaction(db, () => {
      const row = db.prepare("SELECT * FROM videos WHERE id=?").get(videoId);
      if (!row) fail(404, "NOT_FOUND", "Video not found.");
      if (!["approve", "reject"].includes(action))
        fail(400, "BAD_ACTION", "Use approve or reject.");
      if (action === "approve") {
        if (!["pending", "approved"].includes(row.status) || !row.media_path)
          fail(409, "NOT_READY", "Only processed videos can be approved.");
        if (row.status === "approved") return video(row);
        const duplicate = db
          .prepare(
            "SELECT id FROM videos WHERE content_hash=? AND id<>? AND status='approved'",
          )
          .get(row.content_hash, row.id);
        db.prepare(
          "UPDATE videos SET status='approved',approved_at=?,failure_reason=NULL WHERE id=?",
        ).run(iso(now()), row.id);
        if (!duplicate) {
          const credit = db
            .prepare("INSERT OR IGNORE INTO contributions VALUES(?,?,?,?)")
            .run(
              row.id,
              row.user_id,
              `${row.place_id}:${row.recorded_at.slice(0, 10)}`,
              iso(now()),
            );
          if (credit.changes)
            db.prepare("UPDATE videos SET quality_credit=1 WHERE id=?").run(
              row.id,
            );
          const count = db
            .prepare("SELECT COUNT(*) AS n FROM contributions WHERE user_id=?")
            .get(row.user_id).n;
          const batches = Math.floor(count / 3),
            prev = db
              .prepare("SELECT * FROM entitlements WHERE user_id=?")
              .get(row.user_id);
          if (batches > (prev?.credited_batches || 0)) {
            const until = iso(
              Math.max(
                now(),
                prev ? new Date(prev.advanced_until).getTime() : 0,
              ) +
                (batches - (prev?.credited_batches || 0)) * 30 * DAY,
            );
            db.prepare(
              "INSERT INTO entitlements VALUES(?,?,?) ON CONFLICT(user_id) DO UPDATE SET advanced_until=excluded.advanced_until,credited_batches=excluded.credited_batches",
            ).run(row.user_id, until, batches);
          }
        }
        if (
          !hidden(row.user_id, row.place_id) &&
          row.visibility !== "private"
        ) {
          for (const friend of db
            .prepare(
              "SELECT * FROM friendships WHERE status='accepted' AND (requester_id=? OR recipient_id=?)",
            )
            .all(row.user_id, row.user_id)) {
            const target =
              friend.requester_id === row.user_id
                ? friend.recipient_id
                : friend.requester_id;
            notify(
              target,
              "friend_activity",
              "A friend shared an update",
              `${getUser(row.user_id).name} shared a place update.`,
              row.id,
            );
          }
        }
      } else {
        db.prepare(
          "UPDATE videos SET status='rejected',failure_reason=?,quality_credit=0 WHERE id=?",
        ).run(reason || "Removed by moderation.", row.id);
        db.prepare("DELETE FROM contributions WHERE video_id=?").run(row.id);
        // Revocation removes advanced access; subsequent approved batches can earn it again.
        const batches = Math.floor(
          db
            .prepare("SELECT COUNT(*) AS n FROM contributions WHERE user_id=?")
            .get(row.user_id).n / 3,
        );
        const grant = db
          .prepare("SELECT * FROM entitlements WHERE user_id=?")
          .get(row.user_id);
        if (grant && batches < grant.credited_batches)
          db.prepare(
            "UPDATE entitlements SET advanced_until=?,credited_batches=? WHERE user_id=?",
          ).run(iso(now()), batches, row.user_id);
      }
      db.prepare("INSERT INTO moderation_log VALUES(?,?,?,?,?)").run(
        id(),
        row.id,
        action,
        reason,
        iso(now()),
      );
      db.prepare("UPDATE reports SET status='reviewed' WHERE video_id=?").run(
        row.id,
      );
      return video(db.prepare("SELECT * FROM videos WHERE id=?").get(row.id));
    });
  }
  return {
    getUser,
    isDeleted,
    user,
    place,
    getPlace,
    requirePlace,
    areFriends,
    hidden,
    preferences,
    canViewVideo,
    video,
    visibleVideo,
    notify,
    invitation,
    requireInvitation,
    chat,
    message,
    entitlements,
    moderate,
  };
}
