import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

export const defaultPreferences = {
  friendRequests: true,
  friendActivity: false,
  invitations: true,
  invitationResponses: true,
  invitationMessages: true,
  outsideSignals: true,
  mapVisibility: "friends",
  interests: [],
};

export function openDatabase(directory) {
  mkdirSync(directory, { recursive: true, mode: 0o700 });
  const db = new DatabaseSync(join(directory, "outside.sqlite"));
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
    password_hash TEXT NOT NULL, created_at TEXT NOT NULL, preferences TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS sessions (
    token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS avatars (
    user_id TEXT PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE, path TEXT NOT NULL, version TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS deleted_accounts (
    user_id TEXT PRIMARY KEY REFERENCES users(id), deleted_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS file_deletions (
    path TEXT PRIMARY KEY
  );
  CREATE TABLE IF NOT EXISTS places (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, address TEXT NOT NULL, lat REAL NOT NULL,
    lng REAL NOT NULL, category TEXT NOT NULL, source TEXT NOT NULL DEFAULT 'openstreetmap', updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS place_searches (
    query TEXT PRIMARY KEY, place_ids TEXT NOT NULL, created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS friendships (
    id TEXT PRIMARY KEY, requester_id TEXT NOT NULL REFERENCES users(id), recipient_id TEXT NOT NULL REFERENCES users(id),
    pair_key TEXT NOT NULL UNIQUE, status TEXT NOT NULL CHECK(status IN ('pending','accepted','declined')),
    created_at TEXT NOT NULL, CHECK(requester_id <> recipient_id)
  );
  CREATE TABLE IF NOT EXISTS hidden_places (
    user_id TEXT NOT NULL REFERENCES users(id), place_id TEXT NOT NULL REFERENCES places(id), PRIMARY KEY(user_id,place_id)
  );
  CREATE TABLE IF NOT EXISTS capture_tickets (
    id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), place_id TEXT NOT NULL REFERENCES places(id),
    created_at TEXT NOT NULL, expires_at TEXT NOT NULL, lat REAL NOT NULL, lng REAL NOT NULL, accuracy REAL NOT NULL,
    state TEXT NOT NULL DEFAULT 'open' CHECK(state IN ('open','uploading','consumed'))
  );
  CREATE TABLE IF NOT EXISTS videos (
    id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), place_id TEXT NOT NULL REFERENCES places(id),
    ticket_id TEXT NOT NULL UNIQUE REFERENCES capture_tickets(id), caption TEXT NOT NULL DEFAULT '',
    recorded_at TEXT NOT NULL, created_at TEXT NOT NULL, expires_at TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('processing','pending','approved','rejected','failed')),
    visibility TEXT NOT NULL CHECK(visibility IN ('public','friends','private')),
    duration_seconds REAL, raw_path TEXT, media_path TEXT, thumbnail_path TEXT, content_hash TEXT,
    failure_reason TEXT, approved_at TEXT, quality_credit INTEGER NOT NULL DEFAULT 0
  );
  CREATE INDEX IF NOT EXISTS videos_place_recorded ON videos(place_id,recorded_at DESC);
  CREATE INDEX IF NOT EXISTS videos_user ON videos(user_id);
  CREATE TABLE IF NOT EXISTS contributions (
    video_id TEXT PRIMARY KEY REFERENCES videos(id), user_id TEXT NOT NULL REFERENCES users(id),
    place_day TEXT NOT NULL, approved_at TEXT NOT NULL, UNIQUE(user_id,place_day)
  );
  CREATE TABLE IF NOT EXISTS entitlements (
    user_id TEXT PRIMARY KEY REFERENCES users(id), advanced_until TEXT NOT NULL, credited_batches INTEGER NOT NULL DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS invitations (
    id TEXT PRIMARY KEY, organizer_id TEXT NOT NULL REFERENCES users(id), place_id TEXT NOT NULL REFERENCES places(id),
    starts_at TEXT NOT NULL, ends_at TEXT NOT NULL, note TEXT NOT NULL, created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS invitation_recipients (
    invitation_id TEXT NOT NULL REFERENCES invitations(id), user_id TEXT NOT NULL REFERENCES users(id),
    response TEXT NOT NULL DEFAULT 'pending' CHECK(response IN ('pending','accepted','declined')),
    PRIMARY KEY(invitation_id,user_id)
  );
  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY, invitation_id TEXT NOT NULL REFERENCES invitations(id), recipient_id TEXT NOT NULL REFERENCES users(id),
    sender_id TEXT NOT NULL REFERENCES users(id), text TEXT NOT NULL, place_id TEXT REFERENCES places(id), created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS messages_thread ON messages(invitation_id,recipient_id,created_at);
  CREATE TABLE IF NOT EXISTS saves (
    user_id TEXT NOT NULL REFERENCES users(id), kind TEXT NOT NULL CHECK(kind IN ('place','video','search')),
    target TEXT NOT NULL, created_at TEXT NOT NULL, PRIMARY KEY(user_id,kind,target)
  );
  CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), type TEXT NOT NULL,
    title TEXT NOT NULL, body TEXT NOT NULL, resource_id TEXT, read_at TEXT, created_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS signals (
    video_id TEXT NOT NULL REFERENCES videos(id), user_id TEXT NOT NULL REFERENCES users(id), created_at TEXT NOT NULL,
    PRIMARY KEY(video_id,user_id)
  );
  CREATE TABLE IF NOT EXISTS reports (
    id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), video_id TEXT NOT NULL REFERENCES videos(id),
    reason TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'open', created_at TEXT NOT NULL, UNIQUE(user_id,video_id)
  );
  CREATE TABLE IF NOT EXISTS moderation_log (
    id TEXT PRIMARY KEY, video_id TEXT NOT NULL REFERENCES videos(id), action TEXT NOT NULL, reason TEXT, created_at TEXT NOT NULL
  );`);
  return db;
}

export function transaction(db, fn) {
  db.exec("BEGIN IMMEDIATE");
  try {
    const result = fn();
    db.exec("COMMIT");
    return result;
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}
