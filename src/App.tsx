import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  Home, Search, Bookmark, BookmarkCheck, Video, X, ArrowLeft, MapPin,
  Square, RotateCcw, Plus, Check, AlertTriangle, Ban, Clock, Flag,
  Globe, ShieldAlert, Trash2, Play, Bell, ChevronRight, ChevronDown,
  Moon, Star, TreePine, ShoppingBag, Shirt, Dices, Sunset, CircleDot,
  Utensils, Car, Waves, Heart, Trophy, Download, Share2,
} from "lucide-react";

/* =========================================================================
   OUTSIDE — what's happening outside right now
   Place-first, record-only video. No profiles / followers / likes /
   comments / DMs / maps / heatmaps / camera-roll uploads. Newest first.
   ========================================================================= */

/* ----------------------------- categories ------------------------------ */
const CATEGORIES = [
  { id: "nightlife",  label: "Nightlife",    grad: ["#7C3AED", "#DB2777"] },
  { id: "events",     label: "Events",       grad: ["#E11D48", "#7C3AED"] },
  { id: "hiking",     label: "Hiking",       grad: ["#15803D", "#84CC16"] },
  { id: "malls",      label: "Malls",        grad: ["#B07A3F", "#7A4A1E"] },
  { id: "clothing",   label: "Clothing",     grad: ["#EC4899", "#8B5CF6"] },
  { id: "casinos",    label: "Casinos",      grad: ["#B91C1C", "#F59E0B"] },
  { id: "sunsets",    label: "Sunset views", grad: ["#F97316", "#EC4899"] },
  { id: "basketball", label: "Basketball",   grad: ["#2563EB", "#1E3A8A"] },
  { id: "food",       label: "Food spots",   grad: ["#DC2626", "#F59E0B"] },
  { id: "carmeets",   label: "Car meets",    grad: ["#1D4ED8", "#06B6D4"] },
  { id: "beaches",    label: "Beaches",      grad: ["#0891B2", "#14B8A6"] },
];
const catById = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));
const CAT_ICONS = {
  nightlife: Moon, events: Star, hiking: TreePine, malls: ShoppingBag,
  clothing: Shirt, casinos: Dices, sunsets: Sunset, basketball: CircleDot,
  food: Utensils, carmeets: Car, beaches: Waves,
};
function CatIcon({ id, size = 14, ...rest }) {
  const I = CAT_ICONS[id] || Star;
  return <I size={size} {...rest} />;
}

/* ------------------------------- places -------------------------------- */
const SEED_PLACES = [
  { id: "liv",         name: "LIV Nightclub",          cat: "nightlife",  city: "Miami", state: "FL", country: "USA", desc: "High-energy nightclub in the heart of Miami featuring top DJs and unforgettable nights." },
  { id: "venicebeach", name: "Venice Beach",           cat: "beaches",    city: "Los Angeles", state: "CA", country: "USA", desc: "Golden-hour boardwalk energy, palms and Pacific light." },
  { id: "fashionshow", name: "Fashion Show Mall",      cat: "malls",      city: "Las Vegas", state: "NV", country: "USA", desc: "The Strip's flagship mall with live runway shows." },
  { id: "phxcourts",   name: "Basketball Courts",      cat: "basketball", city: "Phoenix", state: "AZ", country: "USA", desc: "Night runs under the lights in the Valley." },
  { id: "atlfest",     name: "Music Festival",         cat: "events",     city: "Atlanta", state: "GA", country: "USA", desc: "Stages, lights and the whole city out for the weekend." },
  { id: "redrock",     name: "Red Rock Canyon",        cat: "hiking",     city: "Las Vegas", state: "NV", country: "USA", desc: "Sandstone trails and desert overlooks minutes from the Strip." },
  { id: "xs",          name: "XS Nightclub",           cat: "nightlife",  city: "Las Vegas", state: "NV", country: "USA", desc: "Poolside megaclub at Encore with world-class DJs." },
  { id: "omnia",       name: "Omnia",                  cat: "nightlife",  city: "Las Vegas", state: "NV", country: "USA" },
  { id: "forumshops",  name: "The Forum Shops",        cat: "malls",      city: "Las Vegas", state: "NV", country: "USA" },
  { id: "sunsetpark",  name: "Sunset Park Courts",     cat: "basketball", city: "Las Vegas", state: "NV", country: "USA" },
  { id: "bellagio",    name: "Bellagio Casino Floor",  cat: "casinos",    city: "Las Vegas", state: "NV", country: "USA" },
  { id: "fremont",     name: "Fremont Street",         cat: "events",     city: "Las Vegas", state: "NV", country: "USA", desc: "Downtown's canopy of lights, street acts and live music." },
  { id: "stripview",   name: "Strip Skyline Overlook", cat: "sunsets",    city: "Las Vegas", state: "NV", country: "USA" },
  { id: "southbeach",  name: "South Beach",            cat: "beaches",    city: "Miami Beach", state: "FL", country: "USA", desc: "Turquoise water, pastel deco and nonstop energy." },
  { id: "wynwood",     name: "Wynwood Walls",          cat: "events",     city: "Miami", state: "FL", country: "USA" },
  { id: "brickell",    name: "Brickell Car Meet",      cat: "carmeets",   city: "Miami", state: "FL", country: "USA" },
  { id: "venice",      name: "Venice Beach Courts",    cat: "basketball", city: "Los Angeles", state: "CA", country: "USA", desc: "The legendary oceanfront courts where streetball lives." },
  { id: "runyon",      name: "Runyon Canyon",          cat: "hiking",     city: "Los Angeles", state: "CA", country: "USA" },
  { id: "griffith",    name: "Griffith Observatory",   cat: "sunsets",    city: "Los Angeles", state: "CA", country: "USA", desc: "Sweeping views over LA as the city lights come up." },
  { id: "melrose",     name: "Melrose Trading Post",   cat: "clothing",   city: "Los Angeles", state: "CA", country: "USA" },
  { id: "smpier",      name: "Santa Monica Pier",      cat: "beaches",    city: "Los Angeles", state: "CA", country: "USA" },
  { id: "rucker",      name: "Rucker Park",            cat: "basketball", city: "New York", state: "NY", country: "USA", desc: "Harlem's hallowed blacktop and the soul of NYC hoops." },
  { id: "timessq",     name: "Times Square",           cat: "events",     city: "New York", state: "NY", country: "USA" },
  { id: "soho",        name: "SoHo Shops",             cat: "clothing",   city: "New York", state: "NY", country: "USA" },
  { id: "bkbridge",    name: "Brooklyn Bridge",        cat: "sunsets",    city: "New York", state: "NY", country: "USA" },
  { id: "fabric",      name: "Fabric",                 cat: "nightlife",  city: "London", state: "England", country: "UK" },
  { id: "boxpark",     name: "Boxpark Shoreditch",     cat: "food",       city: "London", state: "England", country: "UK" },
  { id: "primrose",    name: "Primrose Hill",          cat: "sunsets",    city: "London", state: "England", country: "UK" },
  { id: "shibuya",     name: "Shibuya Crossing",       cat: "events",     city: "Tokyo", state: "", country: "Japan", desc: "The world's busiest scramble, neon in every direction." },
  { id: "miyashita",   name: "Miyashita Park Court",   cat: "basketball", city: "Tokyo", state: "", country: "Japan" },
  { id: "takeshita",   name: "Takeshita Street",       cat: "clothing",   city: "Tokyo", state: "", country: "Japan" },
  { id: "manila",      name: "Barangay Court",         cat: "basketball", city: "Manila", state: "", country: "Philippines", desc: "Neighborhood hoops where the whole block shows up." },
  { id: "pacha",       name: "Pacha Ibiza",            cat: "nightlife",  city: "Ibiza", state: "", country: "Spain", desc: "The island's iconic cherry-logo temple of dance." },
  { id: "barceloneta", name: "Barceloneta Beach",      cat: "beaches",    city: "Barcelona", state: "", country: "Spain" },
];

const KNOWN_LOCATIONS = [
  ["New York", "New York", "NY", "USA", "city"], ["Los Angeles", "Los Angeles", "CA", "USA", "city"],
  ["Chicago", "Chicago", "IL", "USA", "city"], ["Miami", "Miami", "FL", "USA", "city"],
  ["Las Vegas", "Las Vegas", "NV", "USA", "city"], ["San Francisco", "San Francisco", "CA", "USA", "city"],
  ["Houston", "Houston", "TX", "USA", "city"], ["Atlanta", "Atlanta", "GA", "USA", "city"],
  ["Phoenix", "Phoenix", "AZ", "USA", "city"], ["London", "London", "England", "UK", "city"],
  ["Paris", "Paris", "", "France", "city"], ["Tokyo", "Tokyo", "", "Japan", "city"],
  ["Barcelona", "Barcelona", "", "Spain", "city"], ["Berlin", "Berlin", "", "Germany", "city"],
  ["Sydney", "Sydney", "", "Australia", "city"], ["Toronto", "Toronto", "ON", "Canada", "city"],
  ["Dubai", "Dubai", "", "UAE", "city"], ["Manila", "Manila", "", "Philippines", "city"],
  ["Ibiza", "Ibiza", "", "Spain", "city"], ["California", "", "CA", "USA", "state"],
  ["Florida", "", "FL", "USA", "state"], ["Nevada", "", "NV", "USA", "state"],
  ["Central Park", "New York", "NY", "USA", "landmark"], ["Eiffel Tower", "Paris", "", "France", "landmark"],
  ["Golden Gate Bridge", "San Francisco", "CA", "USA", "landmark"], ["Hollywood Sign", "Los Angeles", "CA", "USA", "landmark"],
];

/* ------------------------------- clips --------------------------------- */
const MIN = 60, HOUR = 3600;
const SEED_CLIPS = [
  ["liv", 60], ["venicebeach", 2 * MIN], ["fashionshow", 3 * MIN], ["phxcourts", 4 * MIN],
  ["atlfest", 5 * MIN], ["redrock", 6 * MIN], ["fremont", 7 * MIN], ["rucker", 8 * MIN],
  ["venice", 9 * MIN], ["shibuya", 10 * MIN], ["southbeach", 11 * MIN], ["xs", 12 * MIN],
  ["timessq", 13 * MIN], ["sunsetpark", 14 * MIN], ["fabric", 15 * MIN], ["manila", 16 * MIN],
  ["griffith", 17 * MIN], ["boxpark", 18 * MIN], ["brickell", 19 * MIN], ["miyashita", 20 * MIN],
  ["forumshops", 21 * MIN], ["pacha", 22 * MIN], ["runyon", 24 * MIN], ["stripview", 26 * MIN],
  ["smpier", 30 * MIN], ["liv", 9 * MIN], ["liv", 15 * MIN], ["liv", 22 * MIN], ["liv", 28 * MIN],
  ["redrock", 34 * MIN], ["takeshita", 38 * MIN], ["bkbridge", 42 * MIN], ["venice", 47 * MIN],
  ["wynwood", 52 * MIN], ["omnia", 58 * MIN], ["barceloneta", 66 * MIN], ["fashionshow", 72 * MIN],
  ["sunsetpark", 78 * MIN], ["primrose", 84 * MIN], ["phxcourts", 90 * MIN], ["melrose", 92 * MIN],
  ["bellagio", 100 * MIN], ["soho", 110 * MIN], ["manila", 2 * HOUR], ["griffith", 3 * HOUR],
  ["rucker", 4 * HOUR], ["fremont", 5 * HOUR], ["shibuya", 8 * HOUR], ["venicebeach", 26 * HOUR],
];

const MINE_SEEDS = new Set([25, 32]);
let CID = 0;
function seedClips(nowMs, placeById) {
  return SEED_CLIPS.map(([placeId, sec], i) => {
    const p = placeById[placeId];
    return {
      id: "c" + ++CID, placeId, cat: p ? p.cat : "events",
      ts: nowMs - sec * 1000, dur: 12 + ((i * 7) % 18),
      media: null, thumb: null, mine: MINE_SEEDS.has(i), status: "live", flags: 0, cleared: false,
    };
  });
}

/* ----------------------------- moderation ------------------------------ */
const SPAM_WINDOW_MS = 10 * 60 * 1000;
const SPAM_MAX = 3;
const HRMS = 60 * 60 * 1000;
const PENALTY = [
  { kind: "warning", block: 0 }, { kind: "block", block: 1 * HRMS },
  { kind: "block", block: 5 * HRMS }, { kind: "block", block: 24 * HRMS }, { kind: "ban", block: Infinity },
];
const WARNING_TEXT =
  "You've posted a lot from this same location recently. Please slow down so this place stays useful.";
const REPORT_THRESHOLD = 3;

/* ------------------------------- socials ------------------------------- */
const PLATFORMS = [
  { key: "instagram", label: "Instagram", initials: "IG", bg: "#E1306C", fg: "#fff" },
  { key: "tiktok",    label: "TikTok",    initials: "TT", bg: "#FE2C55", fg: "#fff" },
  { key: "snapchat",  label: "Snapchat",  initials: "SC", bg: "#FFFC00", fg: "#111" },
  { key: "facebook",  label: "Facebook",  initials: "f",  bg: "#1877F2", fg: "#fff" },
  { key: "x",         label: "X",         initials: "X",  bg: "#0A0A0A", fg: "#fff" },
];

/* ------------------------------- helpers ------------------------------- */
const eqLoc = (a, b) => (a || "").trim().toLowerCase() === (b || "").trim().toLowerCase();
function locLabel(p) {
  if (!p) return "";
  const tail = p.state || p.country;
  return p.city ? (tail ? `${p.city}, ${tail}` : p.city) : (tail || "");
}
function placeDesc(p) {
  return p.desc || `${catById[p.cat].label} spot in ${p.city || "town"}${p.state ? `, ${p.state}` : ""}.`;
}
function hexToRgba(hex, a) {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}
function mixWhite(hex, f) {
  const h = hex.replace("#", "");
  const n = parseInt(h.length === 3 ? h.split("").map((c) => c + c).join("") : h, 16);
  const r = Math.round(((n >> 16) & 255) + (255 - ((n >> 16) & 255)) * f);
  const g = Math.round(((n >> 8) & 255) + (255 - ((n >> 8) & 255)) * f);
  const b = Math.round((n & 255) + (255 - (n & 255)) * f);
  return `rgb(${r},${g},${b})`;
}
function inScope(place, scope) {
  if (!place || !scope || scope.type === "world") return true;
  if (scope.type === "country") return eqLoc(place.country, scope.country);
  if (scope.type === "state") return eqLoc(place.state, scope.state) && eqLoc(place.country, scope.country);
  if (scope.type === "city") return eqLoc(place.city, scope.city);
  if (scope.type === "place") return place.id === scope.placeId;
  return true;
}
function scopeLabel(scope, placeById) {
  if (!scope || scope.type === "world") return "Worldwide";
  if (scope.type === "country") return scope.country;
  if (scope.type === "state") return `${scope.state}, ${scope.country}`;
  if (scope.type === "city") return `${scope.city}${scope.state ? ", " + scope.state : ""}`;
  if (scope.type === "place") return placeById[scope.placeId]?.name || "A place";
  return "Worldwide";
}
function scopeFromPick(pick) {
  if (pick.placeId) return { type: "place", placeId: pick.placeId };
  if (pick.city) return { type: "city", city: pick.city, state: pick.state, country: pick.country };
  if (pick.state) return { type: "state", state: pick.state, country: pick.country };
  if (pick.country) return { type: "country", country: pick.country };
  return { type: "world" };
}
function timeAgo(ts, now) {
  const s = Math.max(1, Math.floor((now - ts) / 1000));
  if (s < 45) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return m + " min ago";
  const h = Math.floor(m / 60);
  if (h < 24) return h + " h ago";
  return Math.floor(h / 24) + " d ago";
}
const fmtDur = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, "0")}`;
function fmtCountdown(ms) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  const p = (n) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${p(m)}:${p(sec)}` : `${p(m)}:${p(sec)}`;
}

/* ----------------------------- visual atoms ---------------------------- */
function VibeGradient({ catId, animated, big }) {
  const c = catById[catId] || CATEGORIES[0];
  const [a, b] = c.grad;
  return (
    <div className="vibe" style={{ background: `linear-gradient(155deg, ${a}, ${b})` }}>
      <div className="vibe-glow" />
      <div className="vibe-glow2" />
      <div className="vibe-vignette" />
      {animated && <div className="vibe-sweep" />}
      <span className="vibe-icon"><CatIcon id={c.id} size={big ? 54 : 30} strokeWidth={1.6} /></span>
    </div>
  );
}
function CatPill({ catId }) {
  const c = catById[catId];
  return (
    <span className="catpill" style={{ background: hexToRgba(c.grad[0], 0.78) }}>
      <CatIcon id={catId} size={10} strokeWidth={2.5} /> {c.label}
    </span>
  );
}
function PlayRing({ small }) {
  return <span className={"play-ring" + (small ? " sm" : "")}><Play size={small ? 9 : 11} fill="#fff" strokeWidth={0} /></span>;
}
function SocialBadge({ p, size = 26 }) {
  return (
    <span className="soc-badge" style={{ width: size, height: size, background: p.bg, color: p.fg, border: p.key === "x" ? "1px solid #333" : "none" }}>
      {p.initials}
    </span>
  );
}

/* home feed card — 2-up, photo style, meta inside the card */
const FeedCard = React.memo(function FeedCard({ clipId, cat, thumb, ts, name, loc, now, onOpen, onOpenPlace, placeId }) {
  return (
    <div className="fcard-container">
      <button className="fcard press" onClick={() => onOpen(clipId)} aria-label={`${name} — ${timeAgo(ts, now)}`}>
        <span className="fcard-media">
          {thumb ? <img src={thumb} className="fcard-img" alt="" draggable={false} /> : <VibeGradient catId={cat} big />}
          <span className="fcard-shade" />
          <span className="fcard-top"><CatPill catId={cat} /><PlayRing /></span>
        </span>
      </button>
      <div className="fcard-footer">
        <button className="fcard-name-btn" onClick={() => onOpenPlace?.(placeId)} title="View place profile">{name}</button>
        <span className="fcard-foot">
          <span className="fcard-loc"><MapPin size={11} strokeWidth={2.2} /> {loc}</span>
          <span className="fcard-ago">{timeAgo(ts, now)}</span>
        </span>
      </div>
    </div>
  );
});

function FeedGrid({ clips, placeById, now, onOpen, onOpenPlace, empty }) {
  if (!clips.length) return empty || null;
  return (
    <div className="fgrid">
      {clips.map((cl) => (
        <FeedCard key={cl.id} clipId={cl.id} cat={cl.cat} thumb={cl.thumb} ts={cl.ts}
          name={placeById[cl.placeId]?.name || "Somewhere"} loc={locLabel(placeById[cl.placeId])} now={now} onOpen={onOpen}
          onOpenPlace={onOpenPlace} placeId={cl.placeId} />
      ))}
    </div>
  );
}

/* place clip tile — 3-up, duration bottom-left, time below */
const ClipTile = React.memo(function ClipTile({ clipId, cat, thumb, ts, dur, now, onOpen }) {
  return (
    <div className="ctile-wrap">
      <button className="ctile press" onClick={() => onOpen(clipId)}>
        {thumb ? <img src={thumb} className="ctile-img" alt="" draggable={false} /> : <VibeGradient catId={cat} />}
        <PlayRing small />
        {dur ? <span className="ctile-dur mono">{fmtDur(dur)}</span> : null}
      </button>
      <span className="ctile-time">{timeAgo(ts, now)}</span>
    </div>
  );
});

function Chip({ active, onClick, children }) {
  return <button className={"chip" + (active ? " chip-on" : "")} onClick={onClick}>{children}</button>;
}

/* -------------------------- location typeahead ------------------------- */
function searchLocalPool(term) {
  const t = term.toLowerCase();
  const venues = SEED_PLACES
    .filter((p) => p.name.toLowerCase().includes(t) || (p.city || "").toLowerCase().includes(t))
    .map((p) => ({ name: p.name, city: p.city, state: p.state, country: p.country, placeId: p.id, kind: "venue" }));
  const known = KNOWN_LOCATIONS
    .filter(([name, city]) => name.toLowerCase().includes(t) || (city || "").toLowerCase().includes(t))
    .map(([name, city, state, country, kind]) => ({ name, city, state, country, kind }));
  return [...venues, ...known];
}
function mapNominatim(r) {
  if (!r || !r.display_name) return null;
  const a = r.address || {};
  const city = a.city || a.town || a.village || a.hamlet || a.suburb || a.county || "";
  return {
    name: (r.name && r.name.length) ? r.name : r.display_name.split(",")[0].trim(),
    city, state: a.state || "", country: a.country || "", kind: "geo",
  };
}
function dedupePicks(list) {
  const seen = new Set(); const out = [];
  for (const p of list) {
    const k = (p.name || "").toLowerCase() + "|" + (p.city || "").toLowerCase();
    if (seen.has(k)) continue; seen.add(k); out.push(p);
  }
  return out;
}
function LocationSearch({ onPick, placeholder }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const acRef = useRef(null);
  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) { setResults([]); setLoading(false); return; }
    setLoading(true);
    const handle = setTimeout(async () => {
      const local = searchLocalPool(term);
      let geo = [];
      try {
        if (acRef.current) acRef.current.abort();
        acRef.current = new AbortController();
        const url = "https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=6&accept-language=en&q=" + encodeURIComponent(term);
        const res = await fetch(url, { signal: acRef.current.signal, headers: { Accept: "application/json" } });
        if (res.ok) geo = (await res.json()).map(mapNominatim).filter(Boolean);
      } catch { /* offline → local pool only */ }
      setResults(dedupePicks([...local, ...geo]).slice(0, 8));
      setLoading(false);
    }, 350);
    return () => clearTimeout(handle);
  }, [q]);
  return (
    <div className="loc no-swipe">
      <div className="searchbar small">
        <Search size={16} color="var(--muted)" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={placeholder || "Start typing a place…"} />
        {loading && <span className="loc-spin" aria-hidden />}
      </div>
      {results.length > 0 && (
        <div className="loc-list">
          {results.map((r, i) => (
            <button key={i} className="loc-row" onClick={() => { onPick(r); setQ(""); setResults([]); }}>
              <span className="loc-icon">{r.kind === "venue" ? <MapPin size={15} /> : <Globe size={15} />}</span>
              <span className="loc-text">
                <span className="loc-name">{r.name}</span>
                <span className="loc-sub">{[r.city, r.state, r.country].filter(Boolean).join(", ")}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------- top bars (base + hero) ----------------------- */
function TopBar({ dotColor, onSearch, onBell }) {
  return (
    <header className="topbar">
      <div className="brand">
        <span className="wordmark">outside</span>
        <span className="brand-dot" style={{ background: dotColor, boxShadow: `0 0 12px ${dotColor}` }} />
      </div>
      <div className="topbar-actions">
        <button className="icon-btn ghost" onClick={onSearch} aria-label="Search"><Search size={19} strokeWidth={2.2} /></button>
        <button className="icon-btn ghost" onClick={onBell} aria-label="Notifications"><Bell size={19} strokeWidth={2.2} /></button>
      </div>
    </header>
  );
}
/* floats over hero imagery, like the reference */
function HeroTop({ tint, onSearch, onBell }) {
  return (
    <div className="hero-top">
      <div className="brand">
        <span className="wordmark">outside</span>
        <span className="brand-dot" style={{ background: tint, boxShadow: `0 0 12px ${tint}` }} />
      </div>
      <div className="topbar-actions">
        <button className="icon-btn glass" onClick={onSearch} aria-label="Search"><Search size={18} strokeWidth={2.2} /></button>
        <button className="icon-btn glass" onClick={onBell} aria-label="Notifications"><Bell size={18} strokeWidth={2.2} /></button>
      </div>
    </div>
  );
}

/* --------------------- swipe-right-to-go-back page ---------------------- */
function SwipePage({ onBack, children }) {
  const [dx, setDx] = useState(0);
  const [anim, setAnim] = useState(true);
  const leavingRef = useRef(false);
  const g = useRef(null);
  const suppress = useRef(false);

  const down = (e) => {
    if (leavingRef.current) return;
    if (e.target.closest && e.target.closest(".no-swipe")) return;
    g.current = { x: e.clientX, y: e.clientY, lx: e.clientX, lt: Date.now(), vx: 0, locked: null };
    setAnim(false);
  };
  const move = (e) => {
    const s = g.current; if (!s || leavingRef.current) return;
    const dX = e.clientX - s.x, dY = e.clientY - s.y;
    const nt = Date.now();
    s.vx = (e.clientX - s.lx) / Math.max(1, nt - s.lt);
    s.lx = e.clientX; s.lt = nt;
    if (s.locked == null && Math.hypot(dX, dY) > 10) {
      s.locked = dX > 0 && Math.abs(dX) > Math.abs(dY) * 1.2 ? "x" : "other";
    }
    if (s.locked === "x") setDx(Math.max(0, dX));
  };
  const end = () => {
    const s = g.current; g.current = null;
    setAnim(true);
    if (!s || leavingRef.current) return;
    if (s.locked === "x" && dx > 8) suppress.current = true;
    if (s.locked === "x" && (dx > 100 || (dx > 44 && s.vx > 0.55))) {
      leavingRef.current = true;
      setDx(window.innerWidth || 480);
      setTimeout(onBack, 240);
    } else {
      setDx(0);
    }
  };
  const clickCapture = (e) => {
    if (suppress.current) { e.stopPropagation(); e.preventDefault(); suppress.current = false; }
  };

  return (
    <div className="overlay swipe-page"
      style={{
        transform: `translate3d(${dx}px,0,0)`,
        transition: anim ? "transform .34s cubic-bezier(.32,.72,0,1)" : "none",
        boxShadow: dx > 0 ? "-24px 0 60px rgba(0,0,0,.5)" : "none",
      }}
      onPointerDown={down} onPointerMove={move} onPointerUp={end} onPointerCancel={end}
      onClickCapture={clickCapture}>
      {children}
    </div>
  );
}

/* --------------------------------- home -------------------------------- */
function HomeScreen({ feed, interestCats, savedPlaces, placeById, now, onOpenClip, filter, setFilter, toggleCat, togglePlace, goSaved }) {
  const [edit, setEdit] = useState(false);
  const pressRef = useRef(null), movedRef = useRef(false), startPos = useRef({ x: 0, y: 0 });

  const chips = [
    { key: "all", label: "All" },
    ...interestCats.map((id) => ({ key: "c:" + id, cat: id, label: catById[id]?.label || id })),
    ...savedPlaces.map(({ id }) => ({ key: "p:" + id, place: id, label: placeById[id]?.name || "Place" })).filter((c) => placeById[c.place]),
  ];
  const shown = filter === "all" ? feed
    : filter.startsWith("c:") ? feed.filter((c) => c.cat === filter.slice(2) || (c.autoCats || []).includes(filter.slice(2)))
    : feed.filter((c) => c.placeId === filter.slice(2));
  const ids = shown.map((c) => c.id);

  useEffect(() => {
    if (!edit) return;
    const h = (e) => { if (!e.target.closest || !e.target.closest(".chips-row")) setEdit(false); };
    const t = setTimeout(() => document.addEventListener("click", h), 0);
    return () => { clearTimeout(t); document.removeEventListener("click", h); };
  }, [edit]);

  const startPress = (e) => {
    movedRef.current = false; startPos.current = { x: e.clientX, y: e.clientY };
    pressRef.current = setTimeout(() => setEdit(true), 450);
  };
  const onMove = (e) => {
    const dX = e.clientX - startPos.current.x, dY = e.clientY - startPos.current.y;
    if (Math.hypot(dX, dY) > 10) { movedRef.current = true; if (pressRef.current) clearTimeout(pressRef.current); }
  };
  const endPress = (key) => {
    if (pressRef.current) clearTimeout(pressRef.current);
    if (!edit && !movedRef.current) setFilter(key);
  };
  const removeChip = (c) => {
    if (filter === c.key) setFilter("all");
    if (c.cat) toggleCat(c.cat);
    if (c.place) togglePlace(c.place);
  };

  const emptyFeed = (
    <div className="empty">
      <div className="empty-emoji">🛰️</div>
      <h3>Your wall is empty</h3>
      <p>Pick a few vibes and places to fill your home. Broad vibes show the whole world; narrow them to a city or spot.</p>
      <button className="btn-amber press" onClick={goSaved}>Customize home</button>
    </div>
  );

  return (
    <div className="screen-pad">
      <div className="home-head">
        <h1 className="home-title">Live outside right now <span className="title-dot" /></h1>
        <p className="home-sub">Real places. Real moments. Right now.</p>
      </div>

      {chips.length > 1 && (
        <div className="row-scroll chips-row no-swipe">
          {chips.map((c) => {
            const removable = c.key !== "all";
            return (
              <span key={c.key} className={"chip-hold" + (edit && removable ? " jiggle" : "")}>
                <button
                  className={"chip" + (filter === c.key ? " chip-on" : "")}
                  onPointerDown={startPress}
                  onPointerMove={onMove}
                  onPointerUp={() => endPress(c.key)}
                  onPointerLeave={() => { if (pressRef.current) clearTimeout(pressRef.current); }}
                >
                  {c.cat && <CatIcon id={c.cat} size={13} strokeWidth={2.3} />}
                  {c.place && <MapPin size={13} strokeWidth={2.3} />}
                  {c.label}
                </button>
                {edit && removable && (
                  <button className="chip-del" onClick={(e) => { e.stopPropagation(); removeChip(c); }} aria-label={`Remove ${c.label}`}>
                    <X size={11} strokeWidth={3.2} />
                  </button>
                )}
              </span>
            );
          })}
          {!edit && <button className="chip chip-ghost" onClick={goSaved}><Plus size={13} /> Add</button>}
        </div>
      )}
      {edit && <p className="edit-note">hold to edit · tap ✕ to remove · tap anywhere to finish</p>}

      <FeedGrid clips={shown} placeById={placeById} now={now} onOpen={(id) => onOpenClip(id, ids)} empty={emptyFeed} />
    </div>
  );
}

/* -------------------------------- search ------------------------------- */
const SUM_POOL = ["🔥 Packed right now", "😌 Chill crowd", "⏳ 20-min line", "🎵 Live DJ tonight", "🍻 Happy hour until 7", "🚗 Parking fills fast", "👥 Mostly 20s crowd", "✅ Worth the wait", "🌅 Best around 8:30", "🎉 Busy after 9 PM"];
function smartSummary(p) {
  let h = 0; for (const ch of p.id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  const a = SUM_POOL[h % SUM_POOL.length], b = SUM_POOL[(h >> 3) % SUM_POOL.length];
  return a === b ? [a] : [a, b];
}
const QUERY_CATS = [
  [/rooftop|bar|club|dj|hip.?hop|drink|night|countdown|champagne|nightclub|lounge|cocktail|bottle service|vibe|lit/, "nightlife"],
  [/coffee|seating|pizza|taco|food|breakfast|brunch|dessert|eat|bbq|hot chocolate|cafe|restaurant|spot|bites|ramen|sushi/, "food"],
  [/basketball|court|game|hoop|ballin|pickup|streetball|hoopers|courts/, "basketball"],
  [/sunset|sunrise|golden hour|views|skyline|overlook|vista|viewpoint/, "sunsets"],
  [/beach|surf|boardwalk|ocean|water|waves|swimming|sand/, "beaches"],
  [/mall|shopping|store|retail|boutique|shop|brands|outlet/, "malls"],
  [/clothes|clothing|thrift|fashion|costume|vintage|apparel|fits|drip/, "clothing"],
  [/hike|trail|walk|nature|pumpkin|mountain|park|outdoors|canyon|peak/, "hiking"],
  [/casino|slots|poker|gaming|blackjack/, "casinos"],
  [/car meet|cars|automotive|show|gathering|meetup|parking/, "carmeets"],
  [/music|concert|live|festival|party|event|fireworks|haunted|market|lights|show|performance|dj set|rave/, "events"],
];
function parseSmartQuery(t) {
  const out = [];
  for (const [re, c] of QUERY_CATS) if (re.test(t)) out.push(c);
  return [...new Set(out)].slice(0, 3);
}
const SUGG = {
  july4: { title: "Fourth of July", items: ["🎆 Fireworks tonight", "🌭 BBQ spots", "🏖 Beaches with fireworks", "🎶 Independence Day events"] },
  halloween: { title: "Halloween", items: ["🎃 Haunted houses", "👻 Halloween parties", "🍂 Pumpkin patches", "🧙 Costume events"] },
  christmas: { title: "Christmas", items: ["🎄 Christmas lights", "🎅 Holiday markets", "☕ Hot chocolate nearby", "🎁 Christmas events"] },
  nye: { title: "New Year's Eve", items: ["🎆 Fireworks", "🍾 Rooftop countdowns", "🥂 Champagne celebrations", "🎉 NYE parties"] },
  friday: { title: "Friday night", items: ["🍸 Rooftop bars with hip-hop", "🎵 Live music tonight", "🍹 Happy hour nearby", "🌃 What's popping tonight"] },
  weekendMorning: { title: "Weekend morning", items: ["☕ Coffee shops with lots of seating", "🥞 Breakfast with outdoor seating", "🚶 Nature walks", "🌅 Best sunrise spots"] },
  tonight: { title: "Tonight", items: ["🌅 Places to watch the sunset", "🏀 Courts with games happening", "🍕 Pizza after a concert", "🎤 Live music"] },
};
function suggestionGroups(d = new Date()) {
  const m = d.getMonth() + 1, day = d.getDate(), dow = d.getDay(), h = d.getHours();
  const g = [];
  if (m === 7 && day <= 7) g.push(SUGG.july4);
  else if (m === 10 && day >= 20) g.push(SUGG.halloween);
  else if (m === 12 && day >= 15 && day <= 26) g.push(SUGG.christmas);
  else if ((m === 12 && day >= 27) || (m === 1 && day <= 1)) g.push(SUGG.nye);
  if ((dow === 5 || dow === 6) && h >= 15) g.push(SUGG.friday);
  else if ((dow === 0 || dow === 6) && h < 12) g.push(SUGG.weekendMorning);
  g.push(SUGG.tonight);
  return g.slice(0, 2);
}
function pickPlaceholder() {
  const pool = suggestionGroups().flatMap((g) => g.items).concat(["🏀 Basketball courts with games happening", "☕ Coffee shops with lots of seating"]);
  return pool[Math.floor(Math.random() * pool.length)];
}
function pickAutoCats(cat) {
  const h = new Date().getHours();
  const out = [];

  // Time-based suggestions
  if (h >= 17 || h < 5) out.push("nightlife");
  if (h >= 16 && h <= 20) out.push("sunsets");
  if (h >= 20) out.push("events");

  // Category-based suggestions
  if (cat === "basketball" || cat === "beaches") out.push("sunsets");
  if (cat === "food") out.push("events");
  if (cat === "malls" || cat === "clothing") out.push("shopping");
  if (cat === "nightlife") out.push("events");
  if (cat === "hiking" || cat === "beaches") out.push("nature");

  return [...new Set(out)].filter((x) => x !== cat).slice(0, 2);
}

function SearchScreen({ q, setQ, places, now, premium, onOpenPlace, onOpenCategory, onSaveSearch, expiredNote, clearExpired, introSeen, markIntro, goUnlock }) {
  const [intro, setIntro] = useState(false);
  const ph = useMemo(() => (premium ? pickPlaceholder() : 'Try “LIV”, “basketball”, “Fashion Show”…'), [premium]);
  const groups = useMemo(() => (premium ? suggestionGroups() : []), [premium]);
  const term = q.trim().toLowerCase();
  const smartCats = premium && term ? parseSmartQuery(term) : [];
  const matchedCats = term ? CATEGORIES.filter((c) => c.label.toLowerCase().includes(term)) : [];
  const matchedPlaces = term
    ? places.filter((p) => p.name.toLowerCase().includes(term) || (p.city || "").toLowerCase().includes(term) || catById[p.cat].label.toLowerCase().includes(term))
    : [];
  const smartPlaces = smartCats.length
    ? places.filter((p) => smartCats.includes(p.cat) && !matchedPlaces.some((m) => m.id === p.id)).slice(0, 6)
    : [];
  const done = () => { setIntro(false); markIntro(); };
  return (
    <div className="screen-pad">
      <h2 className="page-title">Search</h2>

      {expiredNote && (
        <div className="notice-card">
          <h3>✨ Premium Ended</h3>
          <p className="muted-line">Your 30-day Premium access has ended. Complete 3 approved Quality Updates to unlock another 30 days.</p>
          <button className="btn-amber press" style={{ marginTop: 10 }} onClick={clearExpired}>Keep Exploring</button>
        </div>
      )}
      {premium && !introSeen && (
        <button className="prem-banner press" onClick={() => setIntro(true)}>✨ New Search Features <ChevronRight size={15} style={{ marginLeft: "auto" }} /></button>
      )}

      <div className="searchbar">
        <Search size={18} color="var(--muted)" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={ph} aria-label="Search" />
        {q && <button className="save-q" onClick={() => onSaveSearch(q)} aria-label="Save search"><Heart size={16} /></button>}
        {q && <button className="search-clear" onClick={() => setQ("")}><X size={16} /></button>}
      </div>

      {!term && premium && groups.map((g) => (
        <div key={g.title}>
          <h4 className="sec-label">✨ {g.title}</h4>
          <div className="cat-pick">
            {g.items.map((s) => <button key={s} className="chip" onClick={() => setQ(s)}>{s}</button>)}
          </div>
        </div>
      ))}

      {!term && (
        <>
          <h4 className="sec-label">Browse by vibe</h4>
          <div className="vibe-grid">
            {CATEGORIES.map((c) => (
              <button key={c.id} className="vibe-card press" onClick={() => onOpenCategory(c.id)}>
                <VibeGradient catId={c.id} />
                <span className="vibe-card-label"><CatIcon id={c.id} size={14} /> {c.label}</span>
              </button>
            ))}
          </div>
          {!premium && (
            <button className="prem-banner press" style={{ marginTop: 18 }} onClick={goUnlock}>🏆 Unlock smarter search — earn Premium <ChevronRight size={15} style={{ marginLeft: "auto" }} /></button>
          )}
        </>
      )}

      {term && (
        <>
          {smartCats.length > 0 && (
            <>
              <p className="muted-line" style={{ marginBottom: 10 }}>✨ Looking for <b>{smartCats.map((c) => catById[c].label).join(" · ")}</b></p>
              {smartPlaces.length > 0 && (
                <div className="place-list" style={{ marginBottom: 4 }}>
                  {smartPlaces.map((p) => (
                    <button key={p.id} className="place-row press" onClick={() => onOpenPlace(p.id)}>
                      <span className="place-row-thumb"><VibeGradient catId={p.cat} /></span>
                      <span className="place-row-text">
                        <span className="place-row-name">{p.name}</span>
                        <span className="place-row-sub"><CatIcon id={p.cat} size={11} /> {catById[p.cat].label} · {locLabel(p)}</span>
                        <span className="place-row-sub">⚡ {smartSummary(p).join(" · ")}</span>
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
          {matchedCats.length > 0 && (
            <>
              <h4 className="sec-label">Vibes</h4>
              <div className="row-scroll no-swipe">
                {matchedCats.map((c) => <Chip key={c.id} onClick={() => onOpenCategory(c.id)}><CatIcon id={c.id} size={13} /> {c.label}</Chip>)}
              </div>
            </>
          )}
          <h4 className="sec-label">Places</h4>
          {matchedPlaces.length === 0 && smartPlaces.length === 0 ? (
            <p className="muted-line">No spots match “{q}”. Record one and it'll appear here.</p>
          ) : matchedPlaces.length === 0 ? (
            <p className="muted-line">Smart matches above ⬆️</p>
          ) : (
            <div className="place-list">
              {matchedPlaces.map((p) => (
                <button key={p.id} className="place-row press" onClick={() => onOpenPlace(p.id)}>
                  <span className="place-row-thumb"><VibeGradient catId={p.cat} /></span>
                  <span className="place-row-text">
                    <span className="place-row-name">{p.name}</span>
                    <span className="place-row-sub"><CatIcon id={p.cat} size={11} /> {catById[p.cat].label} · {locLabel(p)}</span>
                    {premium && <span className="place-row-sub">⚡ {smartSummary(p).join(" · ")}</span>}
                  </span>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      {intro && (
        <div className="sheet-scrim no-swipe" onClick={done}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-grab" />
            <h3 className="sheet-title">Search got smarter ✨</h3>
            <p className="muted-line" style={{ marginBottom: 10 }}>You can now search naturally.</p>
            <div className="ex-chips" style={{ marginBottom: 14 }}>
              {["🌃 Rooftop bars with hip-hop", "🌮 Tacos after a concert", "☕ Coffee shops with lots of seating", "🏀 Basketball courts with games happening", "🌅 Best sunset spots"].map((e) => <span key={e} className="ex-chip">{e}</span>)}
            </div>
            <button className="btn-amber wide press" onClick={done}>Got it</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------- category ------------------------------ */
function CategoryScreen({ cat, clips, placeById, now, onBack, onOpenClip, onSearch, onBell }) {
  const list = clips.filter((c) => c.status === "live" && (c.cat === cat.id || (c.autoCats || []).includes(cat.id))).sort((a, b) => b.ts - a.ts);
  const ids = list.map((c) => c.id);
  const tint = cat.grad[0];
  return (
    <SwipePage onBack={onBack}>
      <div className="page-scroll">
      <div className="cat-hero" style={{ background: `linear-gradient(160deg, ${cat.grad[0]}, ${cat.grad[1]})` }}>
        <div className="vibe-sweep" />
        <div className="hero-scrim" />
        <HeroTop tint="#fff" onSearch={onSearch} onBell={onBell} />
        <div className="hero-text">
          <span className="hero-kick" style={{ color: "rgba(255,255,255,.85)" }}><Globe size={13} strokeWidth={2.4} /> WORLDWIDE</span>
          <h2><CatIcon id={cat.id} size={24} strokeWidth={2.2} /> {cat.label}</h2>
          <div className="hero-meta"><span className="hero-count">{list.length} recent · newest first</span></div>
        </div>
      </div>
      <div className="place-body">
        <FeedGrid clips={list} placeById={placeById} now={now} onOpen={(id) => onOpenClip(id, ids)}
          empty={<p className="muted-line" style={{ marginTop: 24 }}>Nothing here yet — be the first.</p>} />
      </div>
      </div>
      <div className="swipe-hint">‹ swipe right to go back</div>
    </SwipePage>
  );
}

/* --------------------------------- place ------------------------------- */
function PlaceScreen({ place, clips, now, saved, onToggleSave, onBack, onOpenClip, onRecordHere, onSearch, onBell, premium }) {
  const cat = catById[place.cat];
  const list = clips.filter((c) => c.status === "live" && c.placeId === place.id).sort((a, b) => b.ts - a.ts);
  const ids = list.map((c) => c.id);
  const recent = list.filter((c) => now - c.ts < 30 * 60 * 1000).length;
  const countLabel = recent > 0 ? `${recent} clip${recent === 1 ? "" : "s"} in the last 30 min` : `${list.length} clip${list.length === 1 ? "" : "s"} · newest first`;
  const tint = cat.grad[0];
  return (
    <SwipePage onBack={onBack}>
      <div className="page-scroll">
      <div className="place-hero">
        <VibeGradient catId={place.cat} animated big />
        <div className="hero-scrim tall" />
        <HeroTop tint={mixWhite(tint, 0.35)} onSearch={onSearch} onBell={onBell} />
        <div className="hero-text">
          <span className="hero-kick mono" style={{ color: mixWhite(tint, 0.45) }}>
            <MapPin size={13} strokeWidth={2.4} /> {locLabel(place).toUpperCase()}
          </span>
          <h2 className="place-title">{place.name}</h2>
          <div className="hero-meta">
            <CatPill catId={place.cat} />
            <span className="hero-count">{countLabel}</span>
          </div>
        </div>
      </div>

      <div className="place-body">
        <button className="btn-record-here press" style={{ background: tint, boxShadow: `0 10px 30px ${hexToRgba(tint, 0.35)}` }} onClick={onRecordHere}>
          <Video size={18} strokeWidth={2.3} /> Record here
        </button>
        <button className={"place-savebar press" + (saved ? " on" : "")} onClick={onToggleSave}>
          {saved ? <BookmarkCheck size={16} /> : <Bookmark size={16} />} {saved ? "Saved to your places" : "Save this place"}
        </button>

        <div className="nav-apps-row">
          <button className="nav-app-btn" onClick={() => {
            const query = encodeURIComponent(`${place.name} ${place.city}`);
            window.open(`https://maps.google.com/maps/search/${query}`, '_blank');
          }} title="Open in Google Maps"><Globe size={16} /> Maps</button>
          <button className="nav-app-btn" onClick={() => {
            const query = encodeURIComponent(`${place.name} ${place.city}`);
            window.open(`https://waze.com/ul?q=${query}`, '_blank');
          }} title="Open in Waze"><ChevronRight size={16} /> Waze</button>
          <button className="nav-app-btn" onClick={() => {
            const query = encodeURIComponent(`${place.name} ${place.city}`);
            const mapsUrl = `maps://maps.apple.com/?q=${query}`;
            window.location.href = mapsUrl;
            setTimeout(() => { window.open(`https://maps.apple.com/?q=${query}`, '_blank'); }, 500);
          }} title="Open in Apple Maps"><MapPin size={16} /> Apple Maps</button>
        </div>

        {premium && (
          <div className="smart-line">
            {smartSummary(place).map((s) => <span key={s} className="smart-chip">{s}</span>)}
          </div>
        )}

        <div className="latest-head">
          <h3 className="latest-title">Latest clips</h3>
          <span className="latest-sort">Newest first <ChevronDown size={14} strokeWidth={2.4} /></span>
        </div>

        {list.length === 0 ? (
          <div className="empty small"><div className="empty-emoji">🎬</div><p>No clips yet. Show what it looks like right now.</p></div>
        ) : (
          <div className="cgrid">
            {list.map((c) => (
              <ClipTile key={c.id} clipId={c.id} cat={c.cat} thumb={c.thumb} ts={c.ts} dur={c.dur} now={now} onOpen={(id) => onOpenClip(id, ids)} />
            ))}
          </div>
        )}

        <div className="about-card" style={{ borderColor: hexToRgba(tint, 0.3), background: `linear-gradient(0deg, ${hexToRgba(tint, 0.08)}, ${hexToRgba(tint, 0.08)}), #101014` }}>
          <div className="about-body">
            <div className="about-head" style={{ color: mixWhite(tint, 0.4) }}><MapPin size={15} strokeWidth={2.3} /> About {place.name}</div>
            <p className="about-text">{placeDesc(place)}</p>
          </div>
          <ChevronRight size={18} className="about-chev" />
        </div>
      </div>
      </div>
    </SwipePage>
  );
}

/* ------------------------------ clip viewer ----------------------------- */
/* Full-screen pager. Finger-tracked: drag up/down pages between clips,
   drag right exits back, drag left opens the clip's place. Tap = pause. */
function ClipViewer({ clipsById, placeById, ids, startId, now, onBack, onOpenPlace, onReport }) {
  const live = useMemo(() => ids.map((id) => clipsById[id]).filter((c) => c && c.status === "live"), [ids, clipsById]);
  const [idx, setIdx] = useState(() => { const i = live.findIndex((c) => c.id === startId); return i < 0 ? 0 : i; });
  const [drag, setDrag] = useState({ x: 0, y: 0, anim: true });
  const [leaving, setLeaving] = useState(null);
  const [paused, setPaused] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [hint, setHint] = useState(true);
  const g = useRef(null);
  const suppress = useRef(false);
  const videoRef = useRef(null);
  const stageRef = useRef(null);

  useEffect(() => { if (live.length && idx > live.length - 1) setIdx(live.length - 1); }, [live.length, idx]);
  useEffect(() => { if (!live.length) onBack(); }, [live.length, onBack]);
  useEffect(() => { setPaused(false); }, [idx]);
  useEffect(() => { const t = setTimeout(() => setHint(false), 3200); return () => clearTimeout(t); }, []);

  const cur = live.length ? live[Math.min(idx, live.length - 1)] : null;

  const down = (e) => {
    if (leaving || reporting || !cur) return;
    const h = stageRef.current ? stageRef.current.getBoundingClientRect().height : 700;
    g.current = { x: e.clientX, y: e.clientY, t: Date.now(), lx: e.clientX, ly: e.clientY, lt: Date.now(), vx: 0, vy: 0, axis: null, h };
    setDrag((d) => ({ ...d, anim: false }));
  };
  const move = (e) => {
    const s = g.current; if (!s || leaving) return;
    const dX = e.clientX - s.x, dY = e.clientY - s.y;
    const nt = Date.now(), dtm = Math.max(1, nt - s.lt);
    s.vx = (e.clientX - s.lx) / dtm; s.vy = (e.clientY - s.ly) / dtm;
    s.lx = e.clientX; s.ly = e.clientY; s.lt = nt;
    if (!s.axis && Math.hypot(dX, dY) > 8) s.axis = Math.abs(dX) > Math.abs(dY) ? "x" : "y";
    if (s.axis === "x") {
      setDrag({ x: dX * (dX < 0 ? 0.85 : 0.95), y: 0, anim: false });
    } else if (s.axis === "y") {
      const atEdge = (idx === 0 && dY > 0) || (idx === live.length - 1 && dY < 0);
      setDrag({ x: 0, y: dY * (atEdge ? 0.3 : 1), anim: false });
    }
  };
  const up = (e) => {
    const s = g.current; g.current = null;
    if (!s || leaving || !cur) return;
    const dX = e.clientX - s.x, dY = e.clientY - s.y, dt = Date.now() - s.t;
    if (s.axis) suppress.current = true;
    if (!s.axis) {
      setDrag({ x: 0, y: 0, anim: true });
      const onButton = e.target.closest && e.target.closest("button");
      if (dt < 300 && !onButton) {
        const v = videoRef.current;
        if (v) { const willPause = !v.paused; if (willPause) v.pause(); else v.play().catch(() => {}); setPaused(willPause); }
        else setPaused((x) => !x);
      }
      return;
    }
    if (s.axis === "x") {
      if (dX > 90 || (dX > 40 && s.vx > 0.55)) {
        setLeaving("back");
        setDrag({ x: window.innerWidth || 480, y: 0, anim: true });
        setTimeout(onBack, 240);
      } else if (dX < -90 || (dX < -40 && s.vx < -0.55)) {
        setLeaving("place");
        setDrag({ x: -(window.innerWidth || 480) * 0.4, y: 0, anim: true });
        const pid = cur.placeId;
        setTimeout(() => onOpenPlace(pid), 210);
      } else {
        setDrag({ x: 0, y: 0, anim: true });
      }
      return;
    }
    const h = s.h || 700;
    if ((dY < -h * 0.16 || (dY < -30 && s.vy < -0.5)) && idx < live.length - 1) setIdx((i) => i + 1);
    else if ((dY > h * 0.16 || (dY > 30 && s.vy > 0.5)) && idx > 0) setIdx((i) => i - 1);
    setDrag({ x: 0, y: 0, anim: true });
  };
  const cancel = () => { if (g.current) { g.current = null; setDrag({ x: 0, y: 0, anim: true }); } };
  const clickCapture = (e) => {
    if (suppress.current) { e.stopPropagation(); e.preventDefault(); suppress.current = false; }
  };

  if (!cur) return null;
  const around = [idx - 1, idx, idx + 1].filter((i) => i >= 0 && i < live.length);
  const fade = leaving === "back" ? 0.15 : leaving === "place" ? 0.35 : 1 - Math.min(Math.abs(drag.x) / 1100, 0.25);
  const reasons = ["Inappropriate", "Not this place", "Spam", "Violence or danger", "Other"];
  const isSaved = localStorage.getItem(`saved-clip-${cur.id}`);
  const toggleSaveClip = () => {
    if (isSaved) { localStorage.removeItem(`saved-clip-${cur.id}`); }
    else { localStorage.setItem(`saved-clip-${cur.id}`, JSON.stringify(cur)); }
    if (navigator.vibrate) navigator.vibrate(12);
  };

  return (
    <div className="viewer no-swipe" onClickCapture={clickCapture}
      onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={cancel}>
      <div ref={stageRef} className="v-stage"
        style={{
          transform: `translate3d(${drag.x}px,0,0)`, opacity: fade,
          transition: drag.anim ? "transform .34s cubic-bezier(.32,.72,0,1), opacity .28s ease" : "none",
        }}>
        <div className="v-strip"
          style={{
            transform: `translate3d(0, calc(${idx * -100}% + ${drag.y}px), 0)`,
            transition: drag.anim ? "transform .4s cubic-bezier(.22,.9,.26,1)" : "none",
          }}>
          {around.map((i) => {
            const c = live[i]; const p = placeById[c.placeId]; const isCur = i === idx;
            return (
              <div key={c.id} className="v-slide" style={{ top: `${i * 100}%` }}>
                {c.media && isCur ? (
                  <video ref={videoRef} src={c.media} poster={c.thumb || undefined} className="v-media" autoPlay loop playsInline />
                ) : c.thumb ? (
                  <img src={c.thumb} className="v-media" alt="" draggable={false} />
                ) : (
                  <div className="v-media"><VibeGradient catId={c.cat} animated={isCur} big /></div>
                )}
                <div className="v-scrim" />
                <div className="v-info">
                  <span className="v-cats">
                    <span className="v-cat" style={{ background: hexToRgba(catById[c.cat].grad[0], 0.8) }}>
                      <CatIcon id={c.cat} size={12} strokeWidth={2.4} /> {catById[c.cat].label}{c.dur ? ` · ${fmtDur(c.dur)}` : ""}
                    </span>
                    {(c.autoCats || []).map((a) => catById[a] ? <span key={a} className="v-cat ai">✨ {catById[a].label}</span> : null)}
                  </span>
                  <button className="v-place" onClick={() => onOpenPlace(c.placeId)}>
                    <span className="v-name">{p?.name || "Somewhere"}</span>
                    <span className="v-sub"><MapPin size={12} strokeWidth={2.3} /> {locLabel(p)} · {timeAgo(c.ts, now)} <ChevronRight size={13} /></span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        {paused && <div className="v-pause"><Play size={46} fill="#fff" strokeWidth={0} /></div>}
      </div>

      <div className="v-chrome">
        <span className="v-counter mono">{idx + 1} / {live.length}</span>
        <div className="v-chrome-right">
          <button className={"icon-btn glass" + (isSaved ? " saved" : "")} onClick={toggleSaveClip} aria-label={isSaved ? "Saved" : "Save clip"}>
            {isSaved ? <BookmarkCheck size={17} /> : <Bookmark size={17} />}
          </button>
          <button className="icon-btn glass" onClick={() => setReporting(true)} aria-label="Report"><Flag size={17} /></button>
          <button className="icon-btn glass" onClick={onBack} aria-label="Close"><X size={19} /></button>
        </div>
      </div>
      {hint && <div className="v-hint">swipe ↑ next · swipe → back · swipe ← this place</div>}

      {reporting && (
        <div className="sheet-scrim" onClick={() => setReporting(false)}>
          <div className="sheet" onClick={(e) => e.stopPropagation()}>
            <div className="sheet-grab" />
            <h3 className="sheet-title">Report this video</h3>
            <p className="muted-line" style={{ marginBottom: 12 }}>If enough people report it, it's hidden from everyone and sent for review. It comes back only if it's cleared.</p>
            {reasons.map((r) => (
              <button key={r} className="sheet-opt" onClick={() => { onReport(cur.id, r); setReporting(false); }}>{r}</button>
            ))}
            <button className="sheet-cancel" onClick={() => setReporting(false)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------ record flow ---------------------------- */
function RecordModal({ open, onClose, presetPlaceId, placeById, onPost, blockInfo, linkedSocials }) {
  const [stage, setStage] = useState("capture");
  const [cameraOk, setCameraOk] = useState(null);
  const [recording, setRecording] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [media, setMedia] = useState(null);
  const [loc, setLoc] = useState(null);
  const [cat, setCat] = useState(null);
  const [thumb, setThumb] = useState(null);
  const [duration, setDuration] = useState(0);
  const [thumbTime, setThumbTime] = useState(0);
  const [result, setResult] = useState(null);
  const [shares, setShares] = useState({});
  const [savedClips, setSavedClips] = useState([]);
  const [videoPlaying, setVideoPlaying] = useState(false);

  const camRef = useRef(null), streamRef = useRef(null), recRef = useRef(null), chunksRef = useRef([]);
  const timerRef = useRef(null), thumbVideoRef = useRef(null), canvasRef = useRef(null), videoPreviewRef = useRef(null);
  const MAX_S = 15;
  const linkedKeys = PLATFORMS.filter((p) => linkedSocials[p.key]);

  useEffect(() => {
    if (!open) return;
    const preset = presetPlaceId ? placeById[presetPlaceId] : null;
    setStage(blockInfo.blocked ? "result" : "capture");
    setResult(blockInfo.blocked ? { kind: blockInfo.banned ? "ban" : "block", until: blockInfo.until } : null);
    setRecording(false); setElapsed(0); setMedia(null); setThumb(null); setDuration(0); setThumbTime(0);
    setLoc(preset ? { name: preset.name, city: preset.city, state: preset.state, country: preset.country, placeId: preset.id } : null);
    setCat(preset ? preset.cat : null);
    setShares(Object.fromEntries(linkedKeys.map((p) => [p.key, true])));
  }, [open]); // eslint-disable-line

  const stopStream = useCallback(() => {
    if (streamRef.current) { streamRef.current.getTracks().forEach((t) => t.stop()); streamRef.current = null; }
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function go() {
      if (!open || stage !== "capture") return;
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: true });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        if (camRef.current) { camRef.current.srcObject = stream; camRef.current.play().catch(() => {}); }
        setCameraOk(true);
      } catch { setCameraOk(false); }
    }
    go();
    return () => { cancelled = true; };
  }, [open, stage]);
  useEffect(() => () => stopStream(), [stopStream]);

  const drawThumb = useCallback(() => {
    const v = thumbVideoRef.current, cv = canvasRef.current;
    if (!v || !cv || !v.videoWidth) return;
    const w = Math.min(480, v.videoWidth), h = Math.round(w * v.videoHeight / v.videoWidth);
    cv.width = w; cv.height = h;
    try { cv.getContext("2d").drawImage(v, 0, 0, w, h); setThumb(cv.toDataURL("image/jpeg", 0.72)); } catch {}
  }, []);

  useEffect(() => {
    if (stage !== "post" || !media) return;
    const v = thumbVideoRef.current; if (!v) return;
    const onMeta = () => {
      let d = v.duration;
      if (d === Infinity || isNaN(d) || d <= 0) {
        const onTU = () => { if (v.currentTime > 0) { v.removeEventListener("timeupdate", onTU); v.currentTime = 0; setDuration(isFinite(v.duration) ? v.duration : 0); } };
        v.addEventListener("timeupdate", onTU); v.currentTime = 1e6;
      } else setDuration(d);
      v.currentTime = 0.1; setThumbTime(0.1);
    };
    const onSeeked = () => drawThumb();
    v.addEventListener("loadedmetadata", onMeta);
    v.addEventListener("seeked", onSeeked);
    if (v.readyState >= 1) onMeta();
    return () => { v.removeEventListener("loadedmetadata", onMeta); v.removeEventListener("seeked", onSeeked); };
  }, [stage, media, drawThumb]);

  function startRec() {
    setElapsed(0); setRecording(true);
    const t0 = Date.now();
    timerRef.current = setInterval(() => { const el = (Date.now() - t0) / 1000; setElapsed(el); if (el >= MAX_S) stopRec(); }, 100);
    if (cameraOk && streamRef.current && "MediaRecorder" in window) {
      try {
        chunksRef.current = [];
        const mr = new MediaRecorder(streamRef.current);
        mr.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
        mr.onstop = () => {
          const blob = new Blob(chunksRef.current, { type: chunksRef.current[0]?.type || "video/webm" });
          setMedia(URL.createObjectURL(blob)); setStage("post"); stopStream();
        };
        recRef.current = mr; mr.start();
      } catch {}
    }
  }
  function stopRec() {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    setRecording(false);
    if (recRef.current && recRef.current.state !== "inactive") recRef.current.stop();
    else { setMedia(null); setStage("post"); stopStream(); }
  }
  function close() { stopStream(); onClose(); }

  function submit() {
    const chosen = linkedKeys.filter((p) => shares[p.key]).map((p) => p.label);
    const r = onPost({ loc, cat, media, thumb, dur: duration ? Math.round(duration) : null, shares: chosen });
    if (r.status === "posted") { close(); return; }
    setResult(r.status === "warning" ? { kind: "warning" } : r.status === "banned" ? { kind: "ban" } : { kind: "block", until: r.until });
    setStage("result");
  }

  if (!open) return null;
  const canPost = !!loc && !!cat;

  return (
    <div className="rec no-swipe">
      {stage === "capture" && (
        <div className="rec-capture">
          <div className="rec-view">
            {cameraOk
              ? <video ref={camRef} muted playsInline className="rec-cam" />
              : <div className="rec-sim"><div className="vibe-sweep" /><div className="rec-sim-text">{cameraOk === false ? "camera unavailable in preview — you can still post a simulated clip" : "starting camera…"}</div></div>}
            <div className="rec-grid-lines" aria-hidden />
            <button className="icon-btn glass rec-x" onClick={close}><X size={20} /></button>
            <div className="rec-toptag"><span className="rec-recdot" /> record only · no uploads</div>
            {recording && <div className="rec-timer mono"><span className="rec-recdot pulsing" /> {elapsed.toFixed(1)}s / {MAX_S}s</div>}
          </div>
          <div className="rec-controls">
            <button className={"shutter" + (recording ? " rec-on" : "")} onClick={recording ? stopRec : startRec} aria-label={recording ? "Stop" : "Record"}>
              <span className="shutter-core">{recording ? <Square size={20} fill="currentColor" /> : null}</span>
            </button>
            <p className="rec-hint">{recording ? "tap to stop" : "tap to record what's happening here"}</p>
          </div>
        </div>
      )}

      {stage === "post" && (
        <div className="rec-post">
          <div className="rec-post-head">
            <button className="icon-btn" onClick={() => { setMedia(null); setStage("capture"); }}><ArrowLeft size={20} /></button>
            <h3>Review & Share</h3>
            <button className="icon-btn" onClick={close}><X size={20} /></button>
          </div>
          <div className="rec-post-body">
            <div className="video-preview-block">
              <div className="video-preview">
                {media ? (
                  <>
                    <video ref={videoPreviewRef} src={media} playsInline preload="metadata" className="preview-video" />
                    <button className="play-overlay-btn" onClick={() => {
                      if (videoPreviewRef.current) {
                        if (videoPlaying) { videoPreviewRef.current.pause(); }
                        else { videoPreviewRef.current.play(); }
                        setVideoPlaying(!videoPlaying);
                      }
                    }}>
                      {!videoPlaying && <Play size={28} fill="#fff" />}
                    </button>
                  </>
                ) : (
                  <VibeGradient catId={cat || "events"} animated />
                )}
                <span className="fcard-shade" />
              </div>

              {media && (
                <div className="preview-controls">
                  <div className="button-group">
                    <button className="btn-ghost sm" onClick={() => setSavedClips([...savedClips, { id: Date.now(), media, loc, cat, thumb }])}><Heart size={15} /> Save for later</button>
                    <button className="btn-ghost sm" onClick={() => { setMedia(null); setThumb(null); setStage("capture"); }}><RotateCcw size={15} /> Retake</button>
                  </div>
                </div>
              )}

              {media && duration > 0 && (
                <div className="thumb-scrub no-swipe">
                  <span className="thumb-label">pick thumbnail: {fmtDur(thumbTime)}</span>
                  <input type="range" min={0} max={duration} step={0.05} value={thumbTime}
                    onChange={(e) => { const t = parseFloat(e.target.value); setThumbTime(t); const v = thumbVideoRef.current; if (v) v.currentTime = t; }} />
                  {media && <video ref={thumbVideoRef} src={media} muted playsInline preload="metadata" style={{ display: "none" }} />}
                  <canvas ref={canvasRef} style={{ display: "none" }} />
                </div>
              )}
            </div>

            <h4 className="sec-label">📍 Where is this?</h4>
            {loc ? (
              <div className="chosen-place">
                <span className="place-row-thumb"><VibeGradient catId={cat || "events"} /></span>
                <span className="place-row-text">
                  <span className="place-row-name">{loc.name}</span>
                  <span className="place-row-sub">{[loc.city, loc.state, loc.country].filter(Boolean).join(", ") || "Location set"}</span>
                </span>
                <button className="btn-change" onClick={() => setLoc(null)}>Change</button>
              </div>
            ) : (
              <LocationSearch placeholder="Search a place or landmark…" onPick={(p) => { setLoc(p); if (p.placeId && placeById[p.placeId]) setCat((x) => x || placeById[p.placeId].cat); }} />
            )}

            <h4 className="sec-label">✨ What's the vibe?</h4>
            <div className="cat-pick">
              {CATEGORIES.map((c) => (
                <button key={c.id} className={"chip" + (cat === c.id ? " chip-on" : "")} onClick={() => { setCat(c.id); if (navigator.vibrate) navigator.vibrate(10); }}>
                  <CatIcon id={c.id} size={13} strokeWidth={2.3} /> {c.label}
                </button>
              ))}
            </div>

            <h4 className="sec-label">📱 Also share to</h4>
            {linkedKeys.length === 0 ? (
              <p className="muted-line">No accounts linked. You can optionally link Instagram, TikTok, Snapchat, Facebook, or X in your Saved section to auto-share clips.</p>
            ) : (
              <div className="share-row">
                {linkedKeys.map((p) => (
                  <button key={p.key} className={"share-toggle" + (shares[p.key] ? " on" : "")} onClick={() => { setShares((s) => ({ ...s, [p.key]: !s[p.key] })); if (navigator.vibrate) navigator.vibrate(8); }}>
                    <SocialBadge p={p} size={22} /> {p.label}
                    {shares[p.key] && <Check size={14} className="share-check" />}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="rec-post-bar">
            <button className="btn-amber wide press" disabled={!canPost} onClick={submit}>{canPost ? "Post clip" : "Add a place and vibe"}</button>
          </div>
        </div>
      )}

      {stage === "result" && result && <BlockResult result={result} onClose={close} />}
    </div>
  );
}

function BlockResult({ result, onClose }) {
  const [tick, setTick] = useState(Date.now());
  useEffect(() => { if (result.kind !== "block") return; const t = setInterval(() => setTick(Date.now()), 1000); return () => clearInterval(t); }, [result]);
  return (
    <div className="rec-result">
      <div className="result-card">
        <div className={"result-icon " + result.kind}>
          {result.kind === "warning" && <AlertTriangle size={28} />}
          {result.kind === "block" && <Clock size={28} />}
          {result.kind === "ban" && <Ban size={28} />}
        </div>
        <h3>{result.kind === "warning" ? "Slow down a sec" : result.kind === "block" ? "Posting paused" : "Posting blocked"}</h3>
        <p className="result-text">
          {result.kind === "warning" && WARNING_TEXT}
          {result.kind === "block" && "You hit the limit at this location too many times. You can post again in:"}
          {result.kind === "ban" && "You've repeatedly flooded the same locations, so posting is disabled on this account."}
        </p>
        {result.kind === "block" && result.until && <div className="countdown mono">{fmtCountdown(result.until - tick)}</div>}
        <div className="ladder">
          <span className="ladder-label">how limits escalate · same place only</span>
          <ol className="ladder-list">
            <li>Warning</li><li>1-hour pause</li><li>5-hour pause</li><li>24-hour pause</li><li>Posting off</li>
          </ol>
        </div>
        <button className="btn-amber wide press" onClick={onClose}>Got it</button>
      </div>
    </div>
  );
}

/* -------------------------------- saved -------------------------------- */
function ScopeEditor({ interest, placeById, onSet, onClose }) {
  return (
    <div className="sheet-scrim no-swipe" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-grab" />
        <h3 className="sheet-title"><CatIcon id={interest.category} size={16} /> {catById[interest.category].label} — where?</h3>
        <p className="muted-line" style={{ marginBottom: 12 }}>Worldwide shows this vibe from everywhere. Narrow it to a country, state, city, or a single spot.</p>
        <button className={"scope-world" + (interest.scope.type === "world" ? " on" : "")} onClick={() => { onSet({ type: "world" }); onClose(); }}>
          <Globe size={16} /> Worldwide
        </button>
        <LocationSearch placeholder="Narrow to a city, state or place…" onPick={(p) => { onSet(scopeFromPick(p)); onClose(); }} />
      </div>
    </div>
  );
}

function SavedScreen({ interests, savedPlaces, placeById, toggleCat, setScope, togglePlace, addPlaceFromPick, onOpenPlace, socials, toggleSocial, reviewCount, onOpenReview, onReset,
  savedSearches, onRunSaved, onRemoveSaved, myUpdates, myFilters, setMyFilters, onSaveFilter, onDownload, onShare, onDelete, onOpenClip, now }) {
  const [editing, setEditing] = useState(null);
  const [showAll, setShowAll] = useState(false);
  const activeCats = new Set(interests.map((i) => i.category));
  const rows = [
    ...interests.map((it) => ({ k: "cat", id: it.category, it })),
    ...savedPlaces.filter((sp) => placeById[sp.id]).map((sp) => ({ k: "place", id: sp.id })),
  ];
  const visible = showAll ? rows : rows.slice(0, 5);

  const f = myFilters;
  const placeOpts = ["all", ...Array.from(new Set(myUpdates.map((c) => c.placeId)))];
  const catOpts = ["all", ...Array.from(new Set(myUpdates.map((c) => c.cat)))];
  const dateOpts = ["all", "today", "week"];
  const cyc = (opts, cur) => opts[(Math.max(0, opts.indexOf(cur)) + 1) % opts.length];
  const dateOk = (c) => f.date === "all" || (now - c.ts < (f.date === "today" ? 86400000 : 7 * 86400000));
  const shownUpd = myUpdates.filter((c) =>
    (f.place === "all" || c.placeId === f.place) &&
    (f.cat === "all" || c.cat === f.cat || (c.autoCats || []).includes(f.cat)) && dateOk(c));
  const anyF = f.place !== "all" || f.cat !== "all" || f.date !== "all";

  return (
    <div className="screen-pad">
      <h2 className="page-title">Saved</h2>
      <p className="muted-line" style={{ marginTop: -4 }}>Your searches, your clips, your feed.</p>

      <h4 className="sec-label">❤️ Saved searches</h4>
      {savedSearches.length === 0 ? (
        <p className="muted-line">Save a search from the Search page and it'll live here.</p>
      ) : (
        <div className="li-list">
          {savedSearches.map((s) => (
            <div key={s.id} className="li-row">
              <button className="li-main" onClick={() => onRunSaved(s)}>
                <span className="li-icon" style={{ background: "rgba(255,176,32,.12)", color: "var(--accent)" }}><Search size={16} /></span>
                <span className="li-text">
                  <span className="li-name">{s.q}</span>
                  <span className="li-sub">{s.type === "updates" ? "My Updates filter · tap to apply" : "Tap to search again"}</span>
                </span>
              </button>
              <button className="li-x" onClick={() => onRemoveSaved(s.id)} aria-label="Remove saved search"><X size={16} /></button>
            </div>
          ))}
        </div>
      )}

      <h4 className="sec-label">🎥 My updates</h4>
      <p className="muted-line" style={{ marginBottom: 10 }}>Every video you've posted to Outside — private to you. Download, share, or delete anytime.</p>
      {myUpdates.length > 0 && (
        <div className="filters-row no-swipe">
          <button className="chip" onClick={() => setMyFilters({ ...f, place: cyc(placeOpts, f.place) })}>📍 {f.place === "all" ? "All places" : (placeById[f.place]?.name || "Place")}</button>
          <button className="chip" onClick={() => setMyFilters({ ...f, cat: cyc(catOpts, f.cat) })}>🏷 {f.cat === "all" ? "All vibes" : (catById[f.cat]?.label || "Vibe")}</button>
          <button className="chip" onClick={() => setMyFilters({ ...f, date: cyc(dateOpts, f.date) })}>📅 {f.date === "all" ? "Any date" : f.date === "today" ? "Today" : "This week"}</button>
          {anyF && <button className="chip chip-on" onClick={onSaveFilter}><Heart size={12} /> Save</button>}
        </div>
      )}
      {myUpdates.length === 0 ? (
        <div className="empty small"><div className="empty-emoji">🎬</div><p>Everything you record lives here automatically.</p></div>
      ) : shownUpd.length === 0 ? (
        <p className="muted-line">Nothing matches these filters.</p>
      ) : (
        shownUpd.map((c) => {
          const p = placeById[c.placeId];
          return (
            <div key={c.id} className="upd-card">
              <button className="upd-main" onClick={() => onOpenClip(c.id, [c.id])}>
                <span className="review-thumb">{c.thumb ? <img src={c.thumb} alt="" /> : <VibeGradient catId={c.cat} />}</span>
                <span className="review-text">
                  <span className="place-row-name">{p?.name || "Somewhere"}</span>
                  <span className="place-row-sub"><CatIcon id={c.cat} size={10} /> {catById[c.cat].label} · {timeAgo(c.ts, now)}</span>
                  {(c.autoCats || []).length > 0 && <span className="place-row-sub">✨ {c.autoCats.map((a) => catById[a]?.label).filter(Boolean).join(", ")}</span>}
                </span>
              </button>
              <span className="upd-acts">
                <button className="act-ic" onClick={() => onDownload(c)} aria-label="Download"><Download size={15} /></button>
                <button className="act-ic" onClick={() => onShare(c)} aria-label="Share"><Share2 size={15} /></button>
                <button className="act-ic danger" onClick={() => onDelete(c.id)} aria-label="Delete"><Trash2 size={15} /></button>
              </span>
            </div>
          );
        })
      )}

      <h4 className="sec-label">Vibes you're into</h4>
      <div className="li-list">
        {visible.map((r) => {
          if (r.k === "cat") {
            const c = catById[r.id];
            return (
              <div key={"c" + r.id} className="li-row">
                <button className="li-main" onClick={() => setEditing(r.it)}>
                  <span className="li-icon" style={{ background: hexToRgba(c.grad[0], 0.15), color: mixWhite(c.grad[0], 0.25) }}>
                    <CatIcon id={r.id} size={18} strokeWidth={2.2} />
                  </span>
                  <span className="li-text">
                    <span className="li-name">{c.label}</span>
                    <span className="li-sub"><MapPin size={10} /> {scopeLabel(r.it.scope, placeById)} · tap to change</span>
                  </span>
                </button>
                <button className="li-x" onClick={() => toggleCat(r.id)} aria-label={`Remove ${c.label}`}><X size={16} /></button>
              </div>
            );
          }
          const p = placeById[r.id];
          return (
            <div key={"p" + r.id} className="li-row">
              <button className="li-main" onClick={() => onOpenPlace(r.id)}>
                <span className="li-thumb"><VibeGradient catId={p.cat} /></span>
                <span className="li-text">
                  <span className="li-name">{p.name}</span>
                  <span className="li-sub"><CatIcon id={p.cat} size={10} /> {catById[p.cat].label} · {locLabel(p)}</span>
                </span>
              </button>
              <button className="li-x" onClick={() => togglePlace(r.id)} aria-label={`Remove ${p.name}`}><X size={16} /></button>
            </div>
          );
        })}
        {rows.length === 0 && <p className="muted-line">Add a vibe or a place below to get started.</p>}
      </div>
      {rows.length > 5 && (
        <button className="see-all" onClick={() => setShowAll((v) => !v)}>
          {showAll ? "Show less" : `See all (${rows.length})`}
          <ChevronDown size={15} style={{ transform: showAll ? "rotate(180deg)" : "none", transition: "transform .25s" }} />
        </button>
      )}

      <h4 className="sec-label">Add a vibe</h4>
      <div className="vibe-toggle-grid">
        {CATEGORIES.filter((c) => !activeCats.has(c.id)).map((c) => (
          <button key={c.id} className="vibe-toggle press" onClick={() => toggleCat(c.id)}>
            <span className="vibe-toggle-ic" style={{ background: hexToRgba(c.grad[0], 0.15), color: mixWhite(c.grad[0], 0.25) }}>
              <CatIcon id={c.id} size={16} strokeWidth={2.2} />
            </span>
            <span className="vibe-toggle-label">{c.label}</span>
            <span className="vibe-toggle-mark"><Plus size={14} /></span>
          </button>
        ))}
      </div>

      <h4 className="sec-label">Add a specific place</h4>
      <p className="muted-line" style={{ marginBottom: 8 }}>LIV, Rucker Park, a mall — it becomes a chip on your home.</p>
      <LocationSearch placeholder="Search a spot to follow…" onPick={addPlaceFromPick} />

      <h4 className="sec-label">Connected accounts</h4>
      <p className="muted-line" style={{ marginBottom: 10 }}>Link accounts to auto-share your clips when you post to Outside.</p>
      <div className="soc-list">
        {PLATFORMS.map((p) => (
          <div key={p.key} className="soc-row">
            <SocialBadge p={p} />
            <span className="soc-name">{p.label}</span>
            <button className={"soc-btn" + (socials[p.key] ? " on" : "")} onClick={() => toggleSocial(p.key)}>
              {socials[p.key] ? <><Check size={14} /> Linked</> : "Link"}
            </button>
          </div>
        ))}
      </div>

      <button className="review-btn press" onClick={onOpenReview}>
        <ShieldAlert size={16} /> Content under review
        {reviewCount > 0 && <span className="review-badge mono">{reviewCount}</span>}
      </button>
      <button className="reset-link" onClick={onReset}>Reset demo data</button>

      {editing && <ScopeEditor interest={editing} placeById={placeById} onSet={(scope) => setScope(editing.category, scope)} onClose={() => setEditing(null)} />}
    </div>
  );
}

/* ---------------------------- review queue ----------------------------- */
function ReviewScreen({ clips, placeById, now, onBack, onClear, onRemove }) {
  const list = clips.filter((c) => c.status === "in_review").sort((a, b) => b.ts - a.ts);
  return (
    <SwipePage onBack={onBack}>
      <div className="ov-flat">
        <button className="icon-btn" onClick={onBack}><ArrowLeft size={20} /></button>
        <div><h2 className="flat-title">Under review</h2><span className="flat-sub">{list.length} hidden from the public wall</span></div>
      </div>
      <div className="ov-body">
        <p className="muted-line" style={{ marginBottom: 12 }}>These got enough reports to be pulled. Clear one to make it viewable again, or remove it for good.</p>
        {list.length === 0 ? (
          <div className="empty small"><div className="empty-emoji">✅</div><p>Nothing waiting. The wall is clean.</p></div>
        ) : list.map((c) => {
          const p = placeById[c.placeId];
          return (
            <div key={c.id} className="review-row">
              <span className="review-thumb">{c.thumb ? <img src={c.thumb} alt="" /> : <VibeGradient catId={c.cat} />}</span>
              <span className="review-text">
                <span className="place-row-name">{p?.name || "Somewhere"}</span>
                <span className="place-row-sub">{catById[c.cat]?.label} · {p ? locLabel(p) : ""} · {timeAgo(c.ts, now)}</span>
                <span className="review-flags"><Flag size={11} /> {c.flags} reports</span>
              </span>
              <span className="review-acts">
                <button className="rev-clear" onClick={() => onClear(c.id)} aria-label="Clear"><Check size={16} /></button>
                <button className="rev-remove" onClick={() => onRemove(c.id)} aria-label="Remove"><Trash2 size={15} /></button>
              </span>
            </div>
          );
        })}
      </div>
    </SwipePage>
  );
}

/* ---------------------------- notifications ---------------------------- */
function NotifSheet({ onClose }) {
  return (
    <div className="sheet-scrim no-swipe" onClick={onClose}>
      <div className="sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-grab" />
        <h3 className="sheet-title">Notifications</h3>
        <div className="empty small"><div className="empty-emoji">🔔</div><p>You're all caught up. New clips from your saved places and vibes will show up here.</p></div>
        <button className="sheet-cancel" onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

/* -------------------------------- unlock -------------------------------- */
const PREMIUM_CARDS = [
  { icon: "🔍", title: "Find Anything", tag: "Stop searching for places. Search exactly what you're looking for.",
    ex: ["🌃 Rooftop bars with hip-hop", "☕ Coffee shops with lots of seating", "🏀 Basketball courts with games happening", "🌅 Places to watch the sunset", "🎶 Live country music tonight", "🍕 Pizza after a concert", "🍸 Rooftop bars with DJs"],
    foot: "Outside understands every video to find exactly what you want." },
  { icon: "✨", title: "Smart Suggestions", tag: "Search doesn't just understand what you type — it helps you discover new things to search.",
    ex: ["🕒 Time of day", "📅 Day of week", "🌦 Weather", "🎉 Holidays", "🎤 Local events", "🏈 Sporting events", "🌸 Seasons", "📍 Your location"],
    foot: "Discovery, not prediction — experiences you may not have thought to search for, based on what's happening around you right now." },
  { icon: "🌙", title: "Plan My Night", tag: "Build an entire night with one search.",
    ex: ["🍸 Rooftop bar", "🌮 Tacos afterwards", "🎵 Live music", "🌃 Drinks then a club", "🍦 Dessert afterwards", "🚕 Late-night food"],
    foot: "Outside builds your perfect night in seconds." },
  { icon: "⚡", title: "Smart Summaries", tag: "Every location automatically includes a Smart Summary. Know the vibe instantly.",
    ex: ["🔥 Packed", "🎵 Hip-hop all night", "⏳ 20-minute line", "👥 Mostly people in their 20s", "🚗 Parking fills quickly", "🍻 Happy hour until 7"],
    foot: "Outside summarizes recent updates so you know what's happening in seconds." },
  { icon: "🎯", title: "Find the Perfect Vibe", tag: "Find places that match exactly how you're feeling.",
    ex: ["🎵 Live DJ", "😌 Relaxing", "🍸 Upscale", "🎉 High energy", "🌅 Romantic", "☕ Quiet", "👨‍👩‍👧 Family friendly"],
    foot: "The perfect atmosphere, before you leave." },
  { icon: "⏰", title: "Best Time To Go", tag: "Know the best time before you arrive.",
    ex: ["🌅 Best sunsets around 8:30", "🎉 Busy after 9 PM", "😌 Quiet weekday mornings", "🏀 Games usually start after 6", "🍻 Happy hour ends at 7", "🎤 Live music starts at 8"],
    foot: "Arrive at the perfect time." },
  { icon: "✅", title: "Is It Worth It?", tag: "Know before you go.",
    ex: ["✅ Worth the wait", "🚗 Parking is easy", "⏳ Line moves quickly", "❌ Probably skip tonight", "🔥 Worth coming back tomorrow"],
    foot: "Decide before leaving home." },
  { icon: "🧠", title: "Beyond Search", tag: "Search however you think. Just type it and we'll figure it out.",
    ex: ["✈️ I only have 3 hours before my flight", "👵 My grandparents are visiting", "🚗 No more than 20 minutes away", "💵 We only have $40 to spend", "🌧 It just started raining", "🥵 It's way too hot outside", "🐶 I want to bring my dog", "👶 We have two little kids", "♿ Wheelchair accessible places", "🎉 It's my friend's birthday tonight", "🎓 I just moved here"],
    foot: "" },
  { icon: "⭐", title: "Keep Premium Active", tag: "Premium isn't something you pay for. It's something you earn.",
    ex: [],
    foot: "Post 3 approved Quality Updates to unlock 30 days of Premium. Keep posting quality updates and Premium stays active — every approved update helps improve Outside for everyone." },
  { icon: "💡", title: "Quality Updates", tag: "Don't just show your feet 🙄 Help us out. Show us what's really going on 🙏🏽",
    ex: [],
    foot: "Quality matters. If your update doesn't show the place, it won't count." },
];

function UnlockScreen({ qBank, premiumActive, premiumUntil, now, onSimulate }) {
  const days = premiumActive ? Math.max(1, Math.ceil((premiumUntil - now) / 86400000)) : 0;
  const squares = "🟩".repeat(Math.min(qBank, 3)) + "⬜".repeat(Math.max(0, 3 - qBank));
  const stars = "⭐".repeat(Math.min(qBank, 3)) + "☆".repeat(Math.max(0, 3 - qBank));
  return (
    <div className="screen-pad">
      <h2 className="page-title">Unlock</h2>
      {!premiumActive ? (
        <div className="prem-pin">
          <div className="prem-pin-head"><Trophy size={16} /> Unlock Every Feature</div>
          <div className="prog-sq">{squares}</div>
          <div className="prem-count">{qBank} of 3 Quality Updates</div>
          <p className="muted-line">Post 3 approved Quality Updates to unlock Premium for 30 days. Only approved Quality Updates count.</p>
        </div>
      ) : (
        <div className="prem-pin active">
          <div className="prem-pin-head">⭐ Premium Active</div>
          <div className="prog-sq">🟩🟩🟩</div>
          <div className="prem-count">{days} day{days === 1 ? "" : "s"} remaining</div>
          <h4 className="sec-label" style={{ margin: "12px 0 2px" }}>Next renewal</h4>
          <div className="prog-sq">{stars}</div>
          <div className="prem-count">{qBank} of 3 Quality Updates</div>
          {qBank === 2 && <p className="muted-line">One more Quality Update unlocks another 30 days.</p>}
          {qBank >= 3 && <p className="muted-line">✅ Your next 30 days are already banked — they unlock automatically when this period ends.</p>}
        </div>
      )}

      <h4 className="sec-label">How Premium works</h4>
      <p className="muted-line">Premium is earned, not bought. Post 3 approved Quality Updates and Premium unlocks for 30 days — the whole app gets more powerful, starting with Search. Approved updates are never wasted: while Premium is active, each one banks toward your next renewal (up to 3), and three banked updates renew you automatically when the current period ends. You're never starting over — you're always working toward your next month.</p>

      <h4 className="sec-label">What you unlock</h4>
      {PREMIUM_CARDS.map((c) => (
        <div key={c.title} className="prem-card">
          <div className="prem-card-head"><span className="prem-ic">{c.icon}</span> {c.title}</div>
          <p className="prem-tag">{c.tag}</p>
          {c.ex.length > 0 && <div className="ex-chips">{c.ex.map((e) => <span key={e} className="ex-chip">{e}</span>)}</div>}
          {c.foot ? <p className="muted-line" style={{ marginTop: 8 }}>{c.foot}</p> : null}
        </div>
      ))}
      <button className="reset-link" onClick={onSimulate}>demo: simulate an approved Quality Update</button>
    </div>
  );
}

function PremiumRenewedFlash({ onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 4200); return () => clearTimeout(t); }, [onDone]);
  return (
    <div className="flash-wrap" onClick={onDone}>
      <div className="result-card">
        <div className="result-icon warning" style={{ fontSize: 26 }}>✅</div>
        <h3>Premium Renewed</h3>
        <p className="result-text">Your next 30 days of Premium are already unlocked. Thanks for helping improve Outside.</p>
      </div>
    </div>
  );
}

/* ------------------------------- bottom nav ---------------------------- */
function BottomNav({ screen, setScreen, onRecord, accent, tinted }) {
  const recStyle = tinted
    ? { background: accent, color: "#fff", boxShadow: `0 12px 32px ${hexToRgba(accent, 0.5)}, 0 0 0 6px var(--bg)` }
    : { background: "#101318", color: accent, boxShadow: `inset 0 0 0 2px ${accent}, 0 10px 26px ${hexToRgba(accent, 0.22)}, 0 0 0 6px var(--bg)` };
  const item = (id, Icon, label) => (
    <button className={"nav-btn" + (screen === id ? " on" : "")} style={screen === id ? { color: accent } : undefined} onClick={() => setScreen(id)}>
      <Icon size={21} strokeWidth={2.1} /><span className="nav-lab">{label}</span>
    </button>
  );
  return (
    <nav className="nav">
      {item("home", Home, "Home")}
      {item("search", Search, "Search")}
      <button className="nav-rec press" style={recStyle} onClick={onRecord} aria-label="Record">
        <Video size={23} strokeWidth={2.1} />
      </button>
      {item("saved", Heart, "Saved")}
      {item("unlock", Trophy, "Unlock")}
    </nav>
  );
}

/* ---------------------------------- app -------------------------------- */
const DEFAULT_INTERESTS = [
  { category: "nightlife", scope: { type: "world" } },
  { category: "beaches", scope: { type: "world" } },
  { category: "malls", scope: { type: "world" } },
  { category: "basketball", scope: { type: "world" } },
  { category: "events", scope: { type: "world" } },
  { category: "hiking", scope: { type: "city", city: "Las Vegas", state: "NV", country: "USA" } },
  { category: "sunsets", scope: { type: "world" } },
];
const DEFAULT_SAVED = [
  { id: "liv", savedAt: 4 }, { id: "rucker", savedAt: 3 }, { id: "venice", savedAt: 2 }, { id: "redrock", savedAt: 1 },
];
const SEED_SEARCHES = [
  { id: "s1", type: "query", q: "Rooftop bars with hip-hop" },
  { id: "s2", type: "query", q: "Basketball courts with games happening" },
  { id: "s3", type: "query", q: "LIV" },
];

export default function App() {
  const startRef = useRef(Date.now());
  const buildPlaceById = (arr) => Object.fromEntries(arr.map((p) => [p.id, p]));

  const [now, setNow] = useState(Date.now());
  const [places, setPlaces] = useState(SEED_PLACES);
  const [clips, setClips] = useState(() => seedClips(startRef.current, buildPlaceById(SEED_PLACES)));

  const [interests, setInterests] = useState(() => DEFAULT_INTERESTS.map((i) => ({ ...i })));
  const [savedPlaces, setSavedPlaces] = useState(() => DEFAULT_SAVED.map((s) => ({ ...s })));
  const [socials, setSocials] = useState({ instagram: true, tiktok: true, snapchat: false, facebook: false, x: false });

  /* premium + saved searches (Updates 2-4) */
  const [qBank, setQBank] = useState(2);
  const [premiumUntil, setPremiumUntil] = useState(0);
  const premiumUntilRef = useRef(0);
  const [renewedFlash, setRenewedFlash] = useState(false);
  const [premExpiredNote, setPremExpiredNote] = useState(false);
  const [premIntroSeen, setPremIntroSeen] = useState(false);
  const [savedSearches, setSavedSearches] = useState(() => SEED_SEARCHES.map((s) => ({ ...s })));
  const [searchQ, setSearchQ] = useState("");
  const [myFilters, setMyFilters] = useState({ place: "all", cat: "all", date: "all" });

  const [screen, setScreen] = useState("home");
  const [placeId, setPlaceId] = useState(null);
  const [catId, setCatId] = useState(null);
  const [clipId, setClipId] = useState(null);
  const [viewerIds, setViewerIds] = useState([]);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [bellOpen, setBellOpen] = useState(false);
  const [homeFilter, setHomeFilter] = useState("all");
  const [recOpen, setRecOpen] = useState(false);
  const [recPreset, setRecPreset] = useState(null);
  const [toast, setToast] = useState(null);

  const [postHistory, setPostHistory] = useState({});
  const [strikes, setStrikes] = useState(0);
  const [blockedUntil, setBlockedUntil] = useState(0);
  const [banned, setBanned] = useState(false);

  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 30000); return () => clearInterval(t); }, []);
  useEffect(() => {
    if (document.getElementById("ojs-font")) return;
    const l = document.createElement("link");
    l.id = "ojs-font"; l.rel = "stylesheet";
    l.href = "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap";
    document.head.appendChild(l);
  }, []);

  const placeById = useMemo(() => buildPlaceById(places), [places]);
  const clipsById = useMemo(() => Object.fromEntries(clips.map((c) => [c.id, c])), [clips]);
  const savedIds = useMemo(() => new Set(savedPlaces.map((s) => s.id)), [savedPlaces]);
  const interestCats = useMemo(() => [...new Set(interests.map((i) => i.category))], [interests]);

  const feed = useMemo(() => clips
    .filter((c) => c.status === "live")
    .filter((c) => {
      const p = placeById[c.placeId]; if (!p) return false;
      const cc = [c.cat, ...(c.autoCats || [])];
      return interests.some((it) => cc.includes(it.category) && inScope(p, it.scope)) || savedIds.has(p.id);
    })
    .sort((a, b) => b.ts - a.ts), [clips, interests, savedIds, placeById]);

  const reviewCount = useMemo(() => clips.filter((c) => c.status === "in_review").length, [clips]);
  const showToast = (m) => { setToast(m); setTimeout(() => setToast(null), 2200); };

  /* premium lifecycle: unlock, bank, auto-renew, expire */
  const premiumActive = premiumUntil > now;
  useEffect(() => { premiumUntilRef.current = premiumUntil; }, [premiumUntil]);
  useEffect(() => {
    if (!premiumUntil || now < premiumUntil) return;
    if (qBank >= 3) { setPremiumUntil(premiumUntil + 30 * 86400000); setQBank(0); showToast("⭐ Premium renewed — 30 more days"); }
    else { setPremiumUntil(0); setPremExpiredNote(true); }
  }, [now, premiumUntil, qBank]); // eslint-disable-line
  const approveQuality = () => {
    const active = premiumUntilRef.current > Date.now();
    setQBank((b) => {
      const nb = Math.min(b + 1, 3);
      if (nb >= 3) {
        if (!active) { setPremiumUntil(Date.now() + 30 * 86400000); showToast("🏆 Premium unlocked — 30 days"); return 0; }
        setRenewedFlash(true); return 3;
      }
      showToast(`✅ Quality Update approved · ${nb} of 3`);
      return nb;
    });
  };

  /* my updates + saved searches */
  const myUpdates = useMemo(() => clips.filter((c) => c.mine && c.status !== "removed").sort((a, b) => b.ts - a.ts), [clips]);
  const saveSearch = (raw) => {
    const t = raw.trim(); if (!t) return;
    setSavedSearches((s) => s.some((x) => x.type === "query" && eqLoc(x.q, t)) ? s : [{ id: "s" + Date.now(), type: "query", q: t }, ...s]);
    showToast("❤️ Search saved");
  };
  const saveFilterSearch = () => {
    const parts = [myFilters.place !== "all" ? (placeById[myFilters.place]?.name || "") : "", myFilters.cat !== "all" ? (catById[myFilters.cat]?.label || "") : "", myFilters.date !== "all" ? myFilters.date : ""].filter(Boolean);
    setSavedSearches((s) => [{ id: "s" + Date.now(), type: "updates", q: "My Updates · " + (parts.join(" · ") || "all"), filters: { ...myFilters } }, ...s]);
    showToast("❤️ Filtered search saved");
  };
  const runSavedSearch = (s) => {
    if (s.type === "updates") { setMyFilters(s.filters || { place: "all", cat: "all", date: "all" }); gotoScreen("saved"); }
    else { setSearchQ(s.q); gotoScreen("search"); }
  };
  const removeSavedSearch = (id) => setSavedSearches((s) => s.filter((x) => x.id !== id));
  const deleteMine = (id) => { setClips((prev) => prev.filter((c) => c.id !== id)); showToast("Deleted from Outside"); };
  const downloadClip = (c) => {
    if (!c.media) { showToast("Demo clip — record one to download real video"); return; }
    const a = document.createElement("a"); a.href = c.media; a.download = "outside-" + c.id + ".webm";
    document.body.appendChild(a); a.click(); a.remove(); showToast("⬇️ Saving to your device");
  };
  const shareClip = (c) => {
    const p = placeById[c.placeId];
    const text = `${p ? p.name : "A spot"} on Outside — what it looks like right now`;
    if (navigator.share) { navigator.share({ title: "Outside", text }).catch(() => {}); }
    else { try { navigator.clipboard.writeText(text); showToast("Copied — paste anywhere"); } catch { showToast(text); } }
  };

  const toggleCat = (id) => setInterests((s) => s.some((i) => i.category === id) ? s.filter((i) => i.category !== id) : [...s, { category: id, scope: { type: "world" } }]);
  const setScope = (id, scope) => setInterests((s) => s.map((i) => i.category === id ? { ...i, scope } : i));
  const togglePlace = (id) => setSavedPlaces((s) => s.some((x) => x.id === id) ? s.filter((x) => x.id !== id) : [{ id, savedAt: Date.now() }, ...s]);
  const toggleSocial = (k) => setSocials((s) => ({ ...s, [k]: !s[k] }));

  const addPlaceFromPick = (pick) => {
    let pid = pick.placeId;
    if (!pid) {
      const ex = places.find((x) => eqLoc(x.name, pick.name) && eqLoc(x.city, pick.city));
      if (ex) pid = ex.id;
    }
    if (!pid) {
      const np = { id: "p" + Date.now(), name: pick.name, cat: "events", city: pick.city || "", state: pick.state || "", country: pick.country || "" };
      setPlaces((prev) => [np, ...prev]);
      pid = np.id;
    }
    setSavedPlaces((s) => s.some((x) => x.id === pid) ? s : [{ id: pid, savedAt: Date.now() }, ...s]);
    showToast("Added to your places");
  };

  const openPlace = (id) => { setClipId(null); setCatId(null); setPlaceId(id); };
  const openCategory = (id) => { setClipId(null); setPlaceId(null); setCatId(id); };
  const openClip = (id, ids) => { setViewerIds(ids && ids.length ? ids : [id]); setClipId(id); };
  const gotoScreen = (s) => { setScreen(s); setPlaceId(null); setCatId(null); setClipId(null); setReviewOpen(false); setBellOpen(false); };
  const openSearch = () => gotoScreen("search");
  const openBell = () => setBellOpen(true);
  const openRecord = (preset = null) => { setRecPreset(preset); setRecOpen(true); };

  const blockInfo = useMemo(() => {
    if (banned) return { blocked: true, banned: true, until: Infinity };
    if (blockedUntil && now < blockedUntil) return { blocked: true, banned: false, until: blockedUntil };
    return { blocked: false, banned: false, until: 0 };
  }, [banned, blockedUntil, now]);

  const postClip = ({ loc, cat, media, thumb, dur, shares }) => {
    const t = Date.now();
    let pid = loc.placeId;
    if (!pid) { const ex = places.find((p) => eqLoc(p.name, loc.name) && eqLoc(p.city, loc.city)); if (ex) pid = ex.id; }
    let created = null;
    if (!pid) { created = { id: "p" + t, name: loc.name, cat, city: loc.city || "", state: loc.state || "", country: loc.country || "" }; pid = created.id; }

    if (banned) return { status: "banned" };
    if (blockedUntil && t < blockedUntil) return { status: "blocked", until: blockedUntil };

    const recent = (postHistory[pid] || []).filter((x) => t - x < SPAM_WINDOW_MS);
    if (recent.length >= SPAM_MAX) {
      const strike = Math.min(strikes + 1, PENALTY.length);
      setStrikes(strike);
      const rule = PENALTY[strike - 1];
      setPostHistory((prev) => ({ ...prev, [pid]: [...(prev[pid] || []), t] }));
      if (rule.kind === "warning") return { status: "warning" };
      if (rule.kind === "ban") { setBanned(true); return { status: "banned" }; }
      const until = t + rule.block; setBlockedUntil(until);
      return { status: "blocked", until };
    }

    if (created) setPlaces((prev) => [created, ...prev]);
    const clip = { id: "u" + t, placeId: pid, cat, ts: t, dur: dur || null, media, thumb, mine: true, status: "live", flags: 0, cleared: false };
    setClips((prev) => [clip, ...prev]);
    setPostHistory((prev) => ({ ...prev, [pid]: [...(prev[pid] || []), t] }));
    const extras = pickAutoCats(cat);
    if (extras.length) setTimeout(() => {
      setClips((prev) => prev.map((x) => x.id === clip.id ? { ...x, autoCats: extras } : x));
      showToast("✨ AI added " + extras.map((e) => catById[e].label).join(", "));
    }, 4500);
    setTimeout(approveQuality, 7000);
    showToast(shares && shares.length ? `Posted · shared to ${shares.join(", ")}` : "Posted");
    return { status: "posted" };
  };

  const reportClip = (id) => {
    setClips((prev) => prev.map((c) => {
      if (c.id !== id) return c;
      const flags = c.flags + 1;
      const status = (!c.cleared && flags >= REPORT_THRESHOLD) ? "in_review" : c.status;
      return { ...c, flags, status };
    }));
    showToast("Reported — thanks");
  };
  const clearClip = (id) => setClips((prev) => prev.map((c) => c.id === id ? { ...c, status: "live", flags: 0, cleared: true } : c));
  const removeClip = (id) => setClips((prev) => prev.map((c) => c.id === id ? { ...c, status: "removed" } : c));

  const resetDemo = () => {
    const base = Date.now(); startRef.current = base; CID = 0;
    setPlaces(SEED_PLACES); setClips(seedClips(base, buildPlaceById(SEED_PLACES)));
    setInterests(DEFAULT_INTERESTS.map((i) => ({ ...i })));
    setSavedPlaces(DEFAULT_SAVED.map((s) => ({ ...s })));
    setSocials({ instagram: true, tiktok: true, snapchat: false, facebook: false, x: false });
    setPostHistory({}); setStrikes(0); setBlockedUntil(0); setBanned(false);
    setQBank(2); setPremiumUntil(0); setRenewedFlash(false); setPremExpiredNote(false); setPremIntroSeen(false);
    setSavedSearches(SEED_SEARCHES.map((s) => ({ ...s }))); setSearchQ(""); setMyFilters({ place: "all", cat: "all", date: "all" });
    setHomeFilter("all"); setPlaceId(null); setCatId(null); setClipId(null); setReviewOpen(false); setBellOpen(false);
    showToast("Demo reset");
  };

  /* base-screen swipe-right → home (overlays handle their own) */
  const gStart = useRef(null);
  const phoneSuppress = useRef(false);
  const overlayOpen = !!(placeId || catId || clipId || reviewOpen || recOpen || bellOpen);
  const onPhoneDown = (e) => {
    if (overlayOpen || (e.target.closest && e.target.closest(".no-swipe"))) { gStart.current = null; return; }
    gStart.current = { x: e.clientX, y: e.clientY, t: Date.now() };
  };
  const onPhoneUp = (e) => {
    const s = gStart.current; gStart.current = null;
    if (!s || overlayOpen) return;
    const dX = e.clientX - s.x, dY = e.clientY - s.y, dt = Date.now() - s.t;
    if (Math.abs(dX) > 24 && Math.abs(dX) > Math.abs(dY)) phoneSuppress.current = true;
    if (dt < 600 && dX > 70 && Math.abs(dX) > Math.abs(dY) * 1.4 && screen !== "home") setScreen("home");
  };
  const onPhoneClickCapture = (e) => {
    if (phoneSuppress.current) { e.stopPropagation(); e.preventDefault(); phoneSuppress.current = false; }
  };

  const activePlace = placeId ? placeById[placeId] : null;
  const activeCat = catId ? catById[catId] : null;
  const FALLBACK = "#FFB020";
  const accent = activePlace ? catById[activePlace.cat].grad[0] : (activeCat ? activeCat.grad[0] : FALLBACK);
  const tinted = accent !== FALLBACK;

  return (
    <div className="outside">
      <style>{CSS}</style>
      <div className="phone" onPointerDown={onPhoneDown} onPointerUp={onPhoneUp} onClickCapture={onPhoneClickCapture}>
        <TopBar dotColor={FALLBACK} onSearch={openSearch} onBell={openBell} />

        <main className="content">
          {screen === "home" && (
            <HomeScreen feed={feed} interestCats={interestCats} savedPlaces={savedPlaces} placeById={placeById} now={now}
              onOpenClip={openClip} filter={homeFilter} setFilter={setHomeFilter}
              toggleCat={toggleCat} togglePlace={togglePlace} goSaved={() => gotoScreen("saved")} />
          )}
          {screen === "search" && (
            <SearchScreen q={searchQ} setQ={setSearchQ} places={places} now={now} premium={premiumActive}
              onOpenPlace={openPlace} onOpenCategory={openCategory} onSaveSearch={saveSearch}
              expiredNote={premExpiredNote} clearExpired={() => setPremExpiredNote(false)}
              introSeen={premIntroSeen} markIntro={() => setPremIntroSeen(true)} goUnlock={() => gotoScreen("unlock")} />
          )}
          {screen === "saved" && (
            <SavedScreen interests={interests} savedPlaces={savedPlaces} placeById={placeById}
              toggleCat={toggleCat} setScope={setScope} togglePlace={togglePlace} addPlaceFromPick={addPlaceFromPick}
              onOpenPlace={openPlace} socials={socials} toggleSocial={toggleSocial}
              reviewCount={reviewCount} onOpenReview={() => setReviewOpen(true)} onReset={resetDemo}
              savedSearches={savedSearches} onRunSaved={runSavedSearch} onRemoveSaved={removeSavedSearch}
              myUpdates={myUpdates} myFilters={myFilters} setMyFilters={setMyFilters} onSaveFilter={saveFilterSearch}
              onDownload={downloadClip} onShare={shareClip} onDelete={deleteMine} onOpenClip={openClip} now={now} />
          )}
          {screen === "unlock" && (
            <UnlockScreen qBank={qBank} premiumActive={premiumActive} premiumUntil={premiumUntil} now={now} onSimulate={approveQuality} />
          )}
        </main>

        {reviewOpen && <ReviewScreen clips={clips} placeById={placeById} now={now} onBack={() => setReviewOpen(false)} onClear={clearClip} onRemove={removeClip} />}
        {activeCat && !clipId && (
          <CategoryScreen cat={activeCat} clips={clips} placeById={placeById} now={now}
            onBack={() => setCatId(null)} onOpenClip={openClip} onSearch={openSearch} onBell={openBell} />
        )}
        {activePlace && !clipId && (
          <PlaceScreen place={activePlace} clips={clips} now={now} saved={savedIds.has(activePlace.id)}
            onToggleSave={() => togglePlace(activePlace.id)} onBack={() => setPlaceId(null)}
            onOpenClip={openClip} onRecordHere={() => openRecord(activePlace.id)}
            onSearch={openSearch} onBell={openBell} premium={premiumActive} />
        )}
        {clipId && (
          <ClipViewer clipsById={clipsById} placeById={placeById} ids={viewerIds} startId={clipId} now={now}
            onBack={() => setClipId(null)} onOpenPlace={openPlace} onReport={reportClip} />
        )}

        <RecordModal open={recOpen} onClose={() => setRecOpen(false)} presetPlaceId={recPreset} placeById={placeById}
          onPost={postClip} blockInfo={blockInfo} linkedSocials={socials} />

        {bellOpen && <NotifSheet onClose={() => setBellOpen(false)} />}

        {renewedFlash && <PremiumRenewedFlash onDone={() => setRenewedFlash(false)} />}

        <BottomNav screen={screen} accent={accent} tinted={tinted} setScreen={gotoScreen} onRecord={() => openRecord(null)} />

        {toast && <div className="toast">{toast}</div>}
      </div>
    </div>
  );
}

/* ---------------------------------- css -------------------------------- */
const CSS = `
/* Plus Jakarta Sans loads at runtime via <link> in App (static @import gets stripped) */
.outside{
  --bg:#0A0B0D; --surface:#14161A; --raised:#1C1F25; --line:#262A31;
  --text:#F5F6F8; --muted:#8B93A0; --soft:#C6CDD6; --accent:#FFB020;
  --font:'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;
  --ease:cubic-bezier(.32,.72,0,1);
  font-family:var(--font); color:var(--text); background:#000; width:100%; height:100dvh; min-height:0; overflow:hidden;
  display:flex; align-items:center; justify-content:center; -webkit-font-smoothing:antialiased;
}
.outside *{box-sizing:border-box; margin:0; padding:0; -webkit-tap-highlight-color:transparent;}
.outside button{font-family:inherit; cursor:pointer; border:none; background:none; color:inherit; font-size:inherit;}
.outside input{font-family:inherit;}
.outside img{-webkit-user-drag:none; user-drag:none;}
.mono{font-variant-numeric:tabular-nums; letter-spacing:.01em;}
.press{transition:transform .34s var(--ease);}
.press:active{transform:scale(.965);}
.no-swipe{}

.phone{position:relative; width:100%; max-width:430px; height:100%; max-height:none; background:var(--bg);
  overflow:hidden; display:flex; flex-direction:column; touch-action:pan-y; user-select:none; -webkit-user-select:none;}
.phone input, .phone textarea{user-select:text; -webkit-user-select:text;}
@supports not (height:100dvh){.outside{height:-webkit-fill-available;}.phone{height:100%;}}
@media (min-width:480px){.outside{min-height:100dvh;}.phone{height:min(94dvh,920px); max-height:920px; border:1px solid var(--line); border-radius:34px; box-shadow:0 40px 120px rgba(0,0,0,.65);}}

/* ------------------------------ top bars ------------------------------- */
.topbar{display:flex; align-items:center; justify-content:space-between; padding:14px 16px 8px; flex:0 0 auto; background:var(--bg);}
.brand{display:flex; align-items:baseline; gap:5px;}
.wordmark{font-weight:800; font-size:22px; letter-spacing:-.045em; line-height:1;}
.brand-dot{width:7px; height:7px; border-radius:50%; transform:translateY(-1px);}
.topbar-actions{display:flex; gap:8px;}
.icon-btn{display:flex; align-items:center; justify-content:center; width:40px; height:40px; border-radius:50%; color:var(--text); transition:transform .3s var(--ease), background .2s;}
.icon-btn:active{transform:scale(.9);}
.icon-btn.ghost{background:transparent; color:var(--text);}
.icon-btn.glass{background:rgba(12,13,16,.4); backdrop-filter:blur(12px); -webkit-backdrop-filter:blur(12px); color:#fff;}
.hero-top{position:absolute; top:0; left:0; right:0; z-index:8; display:flex; align-items:center; justify-content:space-between; padding:16px 16px 0;}
.hero-top .wordmark{color:#fff; text-shadow:0 2px 14px rgba(0,0,0,.45);}

/* ------------------------------- scrolling ------------------------------ */
.content{flex:1; min-height:0; overflow-y:auto; overflow-x:hidden; -webkit-overflow-scrolling:touch; overscroll-behavior:contain; scroll-behavior:smooth;}
.content::-webkit-scrollbar{width:0;}
.screen-pad{padding:8px 16px calc(80px + env(safe-area-inset-bottom));}
.page-title{font-size:22px; font-weight:800; letter-spacing:-.03em; margin-bottom:12px;}

/* --------------------------------- home -------------------------------- */
.home-head{margin:6px 0 14px;}
.home-title{font-size:22px; font-weight:800; letter-spacing:-.03em; line-height:1.14; display:flex; align-items:center; gap:8px;}
.title-dot{width:8px; height:8px; border-radius:50%; background:var(--accent); box-shadow:0 0 12px var(--accent); flex:0 0 auto;}
.home-sub{font-size:13.5px; color:var(--muted); margin-top:5px; font-weight:500;}

.row-scroll{display:flex; gap:8px; overflow-x:auto; padding:2px 2px 12px; margin:0 -2px 4px; touch-action:pan-x;}
.row-scroll::-webkit-scrollbar{display:none;}
.chips-row{align-items:center;}
.chip-hold{position:relative; flex:0 0 auto; display:inline-flex;}
.chip{flex:0 0 auto; display:inline-flex; align-items:center; gap:6px; padding:7px 13px; border-radius:999px;
  background:var(--surface); border:1px solid var(--line); color:var(--text); font-size:12.5px; font-weight:600;
  white-space:nowrap; transition:background .2s, border-color .2s, color .2s, transform .3s var(--ease); touch-action:pan-x;}
.chip:active{transform:scale(.95);}
.chip-on{background:var(--accent); color:#1A1300; border-color:var(--accent); font-weight:700;}
.chip-ghost{background:transparent; border-style:dashed; color:var(--muted);}
.chip-del{position:absolute; top:-6px; right:-6px; z-index:3; width:20px; height:20px; border-radius:50%;
  background:#E5484D; color:#fff; display:flex; align-items:center; justify-content:center; box-shadow:0 2px 8px rgba(0,0,0,.5);}
.jiggle{animation:jiggle .32s ease-in-out infinite;}
.edit-note{font-size:11px; color:var(--muted); margin:0 2px 12px; font-weight:500;}

/* home feed cards — 2-up, photo style */
.fgrid{display:grid; grid-template-columns:1fr 1fr; gap:10px;}
.fcard{display:flex; flex-direction:column; border-radius:14px; overflow:hidden; background:#0E0F12; border:1px solid rgba(255,255,255,.06); text-align:left; isolation:isolate;}
.fcard-media{position:relative; width:100%; aspect-ratio:1.03; overflow:hidden; display:block;}
.fcard-img{position:absolute; inset:0; width:100%; height:100%; object-fit:cover;}
.fcard-media .vibe{position:absolute; inset:0;}
.fcard-shade{position:absolute; inset:0; z-index:1; background:linear-gradient(to top, rgba(0,0,0,.62) 0%, rgba(0,0,0,.1) 30%, rgba(0,0,0,0) 46%);}
.fcard-top{position:absolute; top:8px; left:8px; right:8px; z-index:2; display:flex; align-items:flex-start; justify-content:space-between; gap:8px;}
.fcard-name{position:absolute; left:11px; right:11px; bottom:9px; z-index:2; font-size:14px; font-weight:700; letter-spacing:-.015em; color:#fff; line-height:1.16; text-shadow:0 1px 8px rgba(0,0,0,.4); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;}
.fcard-foot{display:flex; flex-direction:column; gap:3px; padding:9px 12px 11px;}
.fcard-loc{display:flex; align-items:center; gap:4px; font-size:11.5px; font-weight:500; color:#B9C1CB;}
.fcard-ago{font-size:11px; font-weight:500; color:#7E8794;}

.catpill{display:inline-flex; align-items:center; gap:4px; padding:4px 8px 4px 7px; border-radius:999px;
  color:#fff; font-size:10.5px; font-weight:600; backdrop-filter:blur(10px) saturate(1.3); -webkit-backdrop-filter:blur(10px) saturate(1.3);
  box-shadow:0 2px 10px rgba(0,0,0,.25);}
.play-ring{display:inline-flex; align-items:center; justify-content:center; width:26px; height:26px; border-radius:50%;
  border:1.5px solid rgba(255,255,255,.9); background:rgba(0,0,0,.24); backdrop-filter:blur(6px); -webkit-backdrop-filter:blur(6px);
  color:#fff; flex:0 0 auto;}
.play-ring.sm{width:22px; height:22px; border-width:1.2px;}
.play-ring svg{transform:translateX(1px);}

/* --------------------------------- empty -------------------------------- */
.empty{display:flex; flex-direction:column; align-items:center; text-align:center; gap:10px; padding:52px 26px;}
.empty.small{padding:30px 20px;}
.empty-emoji{font-size:40px;}
.empty h3{font-size:17px; font-weight:800; letter-spacing:-.02em;}
.empty p{font-size:13.5px; color:var(--muted); line-height:1.55; max-width:280px;}

/* -------------------------------- search -------------------------------- */
.searchbar{display:flex; align-items:center; gap:10px; padding:12px 15px; border-radius:13px; background:var(--surface); border:1px solid var(--line); margin-bottom:16px;}
.searchbar.small{padding:11px 14px; border-radius:13px; margin-bottom:0;}
.searchbar input{flex:1; background:none; border:none; outline:none; color:var(--text); font-size:14px; font-weight:500;}
.searchbar input::placeholder{color:var(--muted);}
.search-clear{color:var(--muted); display:flex;}
.sec-label{font-size:11px; font-weight:700; letter-spacing:.09em; text-transform:uppercase; color:var(--muted); margin:22px 0 10px;}
.vibe-grid{display:grid; grid-template-columns:1fr 1fr; gap:12px;}
.vibe-card{position:relative; aspect-ratio:2.1; border-radius:12px; overflow:hidden;}
.vibe-card-label{position:absolute; left:11px; bottom:9px; z-index:2; display:flex; align-items:center; gap:6px; font-size:13px; font-weight:700; color:#fff; text-shadow:0 1px 6px rgba(0,0,0,.4);}
.muted-line{font-size:13px; color:var(--muted); line-height:1.55;}
.place-list{display:flex; flex-direction:column; gap:9px;}
.place-row{display:flex; align-items:center; gap:12px; padding:9px; border-radius:13px; background:var(--surface); border:1px solid var(--line); text-align:left; width:100%;}
.place-row-thumb{position:relative; width:42px; height:42px; border-radius:11px; overflow:hidden; flex:0 0 auto; display:block;}
.place-row-text{flex:1; display:flex; flex-direction:column; gap:3px; min-width:0; text-align:left;}
.place-row-name{font-size:14px; font-weight:700; letter-spacing:-.01em; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;}
.place-row-sub{display:flex; align-items:center; gap:4px; font-size:11.5px; color:var(--muted); font-weight:500;}

/* --------------------------- location typeahead -------------------------- */
.loc{display:flex; flex-direction:column; gap:8px;}
.loc-list{display:flex; flex-direction:column; gap:2px; padding:5px; border-radius:12px; background:var(--raised); border:1px solid var(--line); max-height:260px; overflow-y:auto;}
.loc-row{display:flex; align-items:center; gap:11px; padding:9px 9px; border-radius:10px; text-align:left; transition:background .15s;}
.loc-row:active{background:var(--surface);}
.loc-icon{width:32px; height:32px; border-radius:10px; background:var(--surface); border:1px solid var(--line); display:flex; align-items:center; justify-content:center; color:var(--soft); flex:0 0 auto;}
.loc-text{flex:1; display:flex; flex-direction:column; gap:2px; min-width:0;}
.loc-name{font-size:14px; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;}
.loc-sub{font-size:11.5px; color:var(--muted); font-weight:500; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;}
.loc-spin{width:14px; height:14px; border-radius:50%; border:2px solid var(--line); border-top-color:var(--accent); animation:spin .7s linear infinite; flex:0 0 auto;}

/* ------------------------------- gradients ------------------------------ */
.vibe{position:absolute; inset:0; overflow:hidden;}
.vibe-glow{position:absolute; width:70%; height:70%; left:-12%; top:-14%; border-radius:50%; background:rgba(255,255,255,.16); filter:blur(30px);}
.vibe-glow2{position:absolute; width:60%; height:60%; right:-10%; bottom:-14%; border-radius:50%; background:rgba(0,0,0,.22); filter:blur(28px);}
.vibe-vignette{position:absolute; inset:0; box-shadow:inset 0 0 60px rgba(0,0,0,.35);}
.vibe-icon{position:absolute; inset:0; display:flex; align-items:center; justify-content:center; color:rgba(255,255,255,.4);}
.vibe-sweep{position:absolute; top:-50%; left:-60%; width:55%; height:200%; transform:rotate(18deg);
  background:linear-gradient(90deg,transparent,rgba(255,255,255,.15),transparent); animation:sweep 6.5s linear infinite;}

/* --------------------------- overlays & heroes -------------------------- */
.overlay{position:absolute; inset:0; z-index:30; background:var(--bg); display:flex; flex-direction:column; animation:slideIn .3s var(--ease);}
.swipe-page{touch-action:pan-y; will-change:transform;}
.ov-body{flex:1; overflow-y:auto; -webkit-overflow-scrolling:touch; overscroll-behavior:contain; padding:16px 16px 128px;}
.ov-body::-webkit-scrollbar{width:0;}
.swipe-hint{position:absolute; bottom:96px; left:50%; transform:translateX(-50%); z-index:5; font-size:11px; font-weight:600; color:rgba(255,255,255,.45); pointer-events:none;}

.cat-hero{position:relative; height:200px; flex:none; overflow:hidden;}
.place-hero{position:relative; height:320px; flex:none; overflow:hidden;}
.place-hero .vibe-icon svg{opacity:.85;}
.hero-scrim{position:absolute; inset:0; z-index:1; pointer-events:none; background:linear-gradient(to top, rgba(10,11,13,.78) 0%, rgba(10,11,13,.15) 42%, rgba(0,0,0,.3) 100%);}
.hero-scrim.tall{background:linear-gradient(to top, var(--bg) 2%, rgba(10,11,13,.28) 44%, rgba(0,0,0,.34) 100%);}
.hero-text{position:absolute; left:16px; right:16px; bottom:16px; z-index:4;}
.hero-kick{display:inline-flex; align-items:center; gap:6px; font-size:10.5px; font-weight:700; letter-spacing:.14em;}
.hero-text h2{display:flex; align-items:center; gap:8px; font-size:22px; font-weight:800; letter-spacing:-.03em; color:#fff; margin:7px 0 8px; text-shadow:0 2px 10px rgba(0,0,0,.4);}
.place-title{font-size:28px !important; font-weight:800 !important; letter-spacing:-.04em !important; line-height:1.02;}
.hero-meta{display:flex; align-items:center; gap:11px; flex-wrap:wrap;}
.hero-count{font-size:12.5px; font-weight:500; color:#CBD1D9;}

.page-scroll{flex:1; min-height:0; overflow-y:auto; -webkit-overflow-scrolling:touch; overscroll-behavior:contain;}
.page-scroll::-webkit-scrollbar{width:0;}
.place-body{padding:16px 16px 128px;}
.btn-record-here{display:flex; align-items:center; justify-content:center; gap:10px; width:100%; height:48px;
  border-radius:999px; color:#fff; font-size:15px; font-weight:700; letter-spacing:-.01em;}
.place-savebar{display:flex; align-items:center; justify-content:center; gap:8px; width:100%; padding:12px;
  border-radius:999px; background:var(--surface); border:1px solid var(--line); color:var(--soft); font-size:13px; font-weight:600; margin-top:10px;}
.place-savebar.on{color:var(--accent); border-color:rgba(255,176,32,.35); background:rgba(255,176,32,.07);}
.latest-head{display:flex; align-items:baseline; justify-content:space-between; margin:24px 0 12px;}
.latest-title{font-size:16.5px; font-weight:800; letter-spacing:-.025em;}
.latest-sort{display:inline-flex; align-items:center; gap:4px; font-size:12px; font-weight:500; color:var(--muted);}

.cgrid{display:grid; grid-template-columns:1fr 1fr 1fr; gap:9px;}
.ctile-wrap{display:flex; flex-direction:column; gap:7px;}
.ctile{position:relative; aspect-ratio:0.88; border-radius:10px; overflow:hidden; background:var(--surface); isolation:isolate;}
.ctile-img{position:absolute; inset:0; width:100%; height:100%; object-fit:cover;}
.ctile .vibe{position:absolute; inset:0;}
.ctile .play-ring{position:absolute; top:8px; right:8px; z-index:2;}
.ctile-dur{position:absolute; left:8px; bottom:8px; z-index:2; padding:2px 6px; border-radius:6px; background:rgba(0,0,0,.55);
  backdrop-filter:blur(6px); -webkit-backdrop-filter:blur(6px); color:#fff; font-size:10px; font-weight:600;}
.ctile-time{font-size:11px; font-weight:500; color:var(--muted); padding-left:2px;}

.about-card{display:flex; align-items:center; gap:10px; margin-top:22px; padding:14px; border-radius:14px;
  background:var(--surface); border:1px solid var(--line);}
.about-body{flex:1; min-width:0;}
.about-head{display:flex; align-items:center; gap:6px; font-size:13.5px; font-weight:700; margin-bottom:6px;}
.about-text{font-size:12.5px; line-height:1.55; color:#B7BFC9;}
.about-chev{color:var(--muted); flex:0 0 auto;}

/* ------------------------------ clip viewer ----------------------------- */
.viewer{position:absolute; inset:0; z-index:45; background:#000; animation:fadeIn .2s ease; touch-action:none; overflow:hidden;}
.v-stage{position:absolute; inset:0; will-change:transform, opacity;}
.v-strip{position:absolute; inset:0; will-change:transform;}
.v-slide{position:absolute; left:0; right:0; height:100%; overflow:hidden; background:#000;}
.v-media{position:absolute; inset:0; width:100%; height:100%; object-fit:cover;}
.v-scrim{position:absolute; inset:0; z-index:1; pointer-events:none;
  background:linear-gradient(to top, rgba(0,0,0,.72) 0%, rgba(0,0,0,0) 34%), linear-gradient(to bottom, rgba(0,0,0,.42) 0%, rgba(0,0,0,0) 18%);}
.v-info{position:absolute; left:16px; right:80px; bottom:26px; z-index:3; display:flex; flex-direction:column; align-items:flex-start; gap:9px;}
.v-cat{display:inline-flex; align-items:center; gap:5px; padding:6px 11px 6px 9px; border-radius:999px; color:#fff; font-size:11px; font-weight:600; backdrop-filter:blur(10px); -webkit-backdrop-filter:blur(10px);}
.v-place{display:flex; flex-direction:column; align-items:flex-start; gap:3px; text-align:left;}
.v-name{font-size:19px; font-weight:800; letter-spacing:-.025em; color:#fff; text-shadow:0 1px 10px rgba(0,0,0,.4);}
.v-sub{display:flex; align-items:center; gap:4px; font-size:12.5px; font-weight:500; color:#D3D9E0;}
.v-pause{position:absolute; inset:0; z-index:4; display:flex; align-items:center; justify-content:center; pointer-events:none; filter:drop-shadow(0 4px 14px rgba(0,0,0,.55)); animation:fadeIn .15s ease;}
.v-chrome{position:absolute; top:0; left:0; right:0; z-index:6; display:flex; align-items:center; justify-content:space-between; padding:16px; pointer-events:none;}
.v-chrome button{pointer-events:auto;}
.v-counter{padding:6px 11px; border-radius:999px; background:rgba(0,0,0,.35); backdrop-filter:blur(8px); -webkit-backdrop-filter:blur(8px); color:#fff; font-size:12px; font-weight:600;}
.v-chrome-right{display:flex; gap:8px;}
.v-hint{position:absolute; bottom:112px; left:50%; transform:translateX(-50%); z-index:6; padding:8px 14px; border-radius:999px;
  background:rgba(0,0,0,.45); backdrop-filter:blur(8px); -webkit-backdrop-filter:blur(8px); color:rgba(255,255,255,.85);
  font-size:11.5px; font-weight:600; white-space:nowrap; pointer-events:none; animation:fadeIn .3s ease;}

/* --------------------------------- sheets -------------------------------- */
.sheet-scrim{position:absolute; inset:0; z-index:60; background:rgba(0,0,0,.55); display:flex; align-items:flex-end; animation:fadeIn .18s ease; touch-action:pan-y;}
.sheet{width:100%; background:var(--raised); border-radius:20px 20px 0 0; padding:12px 18px calc(20px + env(safe-area-inset-bottom));
  animation:sheetUp .34s var(--ease); max-height:78%; overflow-y:auto;}
.sheet-grab{width:38px; height:4.5px; border-radius:3px; background:var(--line); margin:2px auto 14px;}
.sheet-title{display:flex; align-items:center; gap:8px; font-size:17px; font-weight:800; letter-spacing:-.02em; margin-bottom:8px;}
.sheet-opt{display:block; width:100%; text-align:left; padding:13px 14px; border-radius:11px; background:var(--surface); border:1px solid var(--line); font-size:14px; font-weight:600; margin-bottom:8px;}
.sheet-cancel{display:block; width:100%; text-align:center; padding:13px; color:var(--muted); font-size:14px; font-weight:600;}
.scope-world{display:flex; align-items:center; gap:9px; width:100%; padding:13px; border-radius:11px; background:var(--surface); border:1px solid var(--line); font-size:14.5px; font-weight:600; margin-bottom:10px;}
.scope-world.on{border-color:var(--accent); color:var(--accent); background:rgba(255,176,32,.07);}

/* ------------------------------ record flow ----------------------------- */
.rec{position:absolute; inset:0; z-index:50; background:#000; display:flex; flex-direction:column; animation:fadeIn .18s ease;}
.rec-capture{display:flex; flex-direction:column; height:100%;}
.rec-view{position:relative; flex:1; overflow:hidden; background:#0B0D10;}
.rec-cam{position:absolute; inset:0; width:100%; height:100%; object-fit:cover;}
.rec-sim{position:absolute; inset:0; background:linear-gradient(160deg,#15181d,#0b0d10); overflow:hidden; display:flex; align-items:center; justify-content:center;}
.rec-sim-text{max-width:230px; text-align:center; font-size:12.5px; font-weight:500; color:var(--muted); line-height:1.6;}
.rec-grid-lines{position:absolute; inset:0; background-image:linear-gradient(rgba(255,255,255,.05) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.05) 1px,transparent 1px); background-size:33.34% 33.34%; pointer-events:none;}
.rec-x{position:absolute; top:14px; right:14px; z-index:3;}
.rec-toptag{position:absolute; top:22px; left:16px; z-index:3; display:flex; align-items:center; gap:7px; padding:7px 12px; border-radius:999px; background:rgba(0,0,0,.45); backdrop-filter:blur(8px); font-size:11.5px; font-weight:600; color:#fff;}
.rec-recdot{width:7px; height:7px; border-radius:50%; background:#FF4545;}
.rec-recdot.pulsing{animation:pulse 1s ease infinite;}
.rec-timer{position:absolute; top:70px; left:16px; z-index:3; display:flex; align-items:center; gap:7px; padding:7px 12px; border-radius:999px; background:rgba(229,72,77,.22); border:1px solid rgba(229,72,77,.5); color:#FFD9DA; font-size:12px; font-weight:600;}
.rec-controls{flex:0 0 auto; display:flex; flex-direction:column; align-items:center; gap:12px; padding:20px 0 calc(26px + env(safe-area-inset-bottom)); background:#000;}
.shutter{position:relative; width:76px; height:76px; border-radius:50%; border:4px solid rgba(255,255,255,.9); display:flex; align-items:center; justify-content:center; transition:transform .3s var(--ease);}
.shutter:active{transform:scale(.92);}
.shutter-core{width:58px; height:58px; border-radius:50%; background:#FF3B30; display:flex; align-items:center; justify-content:center; color:#fff; transition:border-radius .25s, background .25s, transform .25s;}
.shutter.rec-on .shutter-core{border-radius:16px; transform:scale(.75);}
.rec-hint{font-size:12px; font-weight:500; color:var(--muted);}

.rec-post{display:flex; flex-direction:column; height:100%; background:var(--bg);}
.rec-post-head{display:flex; align-items:center; justify-content:space-between; padding:12px 12px 8px;}
.rec-post-head h3{font-size:17px; font-weight:800; letter-spacing:-.02em;}
.rec-post-body{flex:1; overflow-y:auto; -webkit-overflow-scrolling:touch; padding:6px 18px 20px;}
.rec-post-bar{flex:0 0 auto; padding:12px 18px calc(16px + env(safe-area-inset-bottom)); border-top:1px solid var(--line); background:var(--bg);}
.thumb-block{display:flex; flex-direction:column; gap:11px; align-items:flex-start;}
.thumb-preview{position:relative; width:150px; aspect-ratio:0.75; border-radius:13px; overflow:hidden; background:var(--surface); box-shadow:0 8px 26px rgba(0,0,0,.4);}
.thumb-preview img{width:100%; height:100%; object-fit:cover;}
.thumb-scrub{width:100%; display:flex; flex-direction:column; gap:7px;}
.thumb-label{font-size:11px; font-weight:600; letter-spacing:.05em; text-transform:uppercase; color:var(--muted);}
.thumb-scrub input[type='range']{width:100%; accent-color:var(--accent);}
.btn-ghost{display:inline-flex; align-items:center; gap:7px; padding:10px 14px; border-radius:10px; background:var(--surface); border:1px solid var(--line); color:var(--soft); font-size:12.5px; font-weight:600;}
.btn-ghost.sm{padding:8px 13px; font-size:12.5px;}
.chosen-place{display:flex; align-items:center; gap:12px; padding:9px; border-radius:13px; background:var(--surface); border:1px solid var(--line);}
.btn-change{color:var(--accent); font-size:13px; font-weight:700; padding:8px;}
.cat-pick{display:flex; flex-wrap:wrap; gap:8px;}
.share-row{display:flex; flex-wrap:wrap; gap:8px;}
.share-toggle{display:inline-flex; align-items:center; gap:8px; padding:9px 13px; border-radius:999px; background:var(--surface); border:1px solid var(--line); font-size:13px; font-weight:600; color:var(--muted); transition:border-color .2s, color .2s, background .2s;}
.share-toggle.on{color:var(--text); border-color:rgba(255,176,32,.45); background:rgba(255,176,32,.08);}
.share-check{color:var(--accent);}
.btn-amber{display:inline-flex; align-items:center; justify-content:center; gap:8px; padding:13px 20px; border-radius:999px; background:var(--accent); color:#1A1300; font-size:14.5px; font-weight:700;}
.btn-amber.wide{width:100%;}
.btn-amber:disabled{opacity:.4; pointer-events:none;}

.rec-result{position:absolute; inset:0; display:flex; align-items:center; justify-content:center; padding:26px; background:rgba(0,0,0,.6); backdrop-filter:blur(8px);}
.result-card{width:100%; max-width:340px; background:var(--raised); border:1px solid var(--line); border-radius:20px; padding:26px 22px; display:flex; flex-direction:column; align-items:center; text-align:center; gap:12px; animation:popIn .3s var(--ease);}
.result-icon{width:58px; height:58px; border-radius:50%; display:flex; align-items:center; justify-content:center;}
.result-icon.warning{background:rgba(255,176,32,.14); color:var(--accent);}
.result-icon.block{background:rgba(96,165,250,.14); color:#60A5FA;}
.result-icon.ban{background:rgba(229,72,77,.14); color:#E5484D;}
.result-card h3{font-size:20px; font-weight:800; letter-spacing:-.02em;}
.result-text{font-size:14px; color:var(--soft); line-height:1.6;}
.countdown{font-size:32px; font-weight:800; letter-spacing:.01em; color:#fff;}
.ladder{width:100%; padding:12px 14px; border-radius:12px; background:var(--surface); border:1px solid var(--line); text-align:left;}
.ladder-label{display:block; font-size:10.5px; font-weight:700; letter-spacing:.09em; text-transform:uppercase; color:var(--muted); margin-bottom:8px;}
.ladder-list{margin-left:18px; font-size:12.5px; font-weight:500; color:var(--soft); display:flex; flex-direction:column; gap:4px;}

/* --------------------------------- saved -------------------------------- */
.li-list{display:flex; flex-direction:column; gap:9px;}
.li-row{display:flex; align-items:center; gap:6px; padding:8px 9px; border-radius:13px; background:var(--surface); border:1px solid var(--line);}
.li-main{flex:1; display:flex; align-items:center; gap:12px; min-width:0; text-align:left;}
.li-icon{width:40px; height:40px; border-radius:11px; display:flex; align-items:center; justify-content:center; flex:0 0 auto;}
.li-thumb{position:relative; width:40px; height:40px; border-radius:11px; overflow:hidden; flex:0 0 auto;}
.li-text{flex:1; display:flex; flex-direction:column; gap:3px; min-width:0;}
.li-name{font-size:14px; font-weight:700; letter-spacing:-.01em; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;}
.li-sub{display:flex; align-items:center; gap:4px; font-size:11.5px; font-weight:500; color:var(--muted);}
.li-x{width:36px; height:36px; border-radius:50%; display:flex; align-items:center; justify-content:center; color:var(--muted); flex:0 0 auto;}
.see-all{display:flex; align-items:center; justify-content:center; gap:6px; width:100%; margin-top:10px; padding:11px; border-radius:11px; background:var(--surface); border:1px solid var(--line); color:var(--soft); font-size:13px; font-weight:600;}
.vibe-toggle-grid{display:grid; grid-template-columns:1fr 1fr; gap:9px;}
.vibe-toggle{display:flex; align-items:center; gap:10px; padding:9px 10px; border-radius:12px; background:var(--surface); border:1px solid var(--line); text-align:left;}
.vibe-toggle-ic{width:32px; height:32px; border-radius:9px; display:flex; align-items:center; justify-content:center; flex:0 0 auto;}
.vibe-toggle-label{flex:1; font-size:12.5px; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;}
.vibe-toggle-mark{color:var(--muted); display:flex;}
.soc-list{display:flex; flex-direction:column; gap:9px;}
.soc-row{display:flex; align-items:center; gap:12px; padding:10px 11px; border-radius:12px; background:var(--surface); border:1px solid var(--line);}
.soc-badge{display:inline-flex; align-items:center; justify-content:center; border-radius:9px; font-size:11px; font-weight:800; flex:0 0 auto;}
.soc-name{flex:1; font-size:14px; font-weight:600;}
.soc-btn{padding:9px 15px; border-radius:999px; background:var(--raised); border:1px solid var(--line); font-size:12.5px; font-weight:700; color:var(--soft); display:inline-flex; align-items:center; gap:6px; transition:border-color .2s, color .2s, background .2s;}
.soc-btn.on{color:var(--accent); border-color:rgba(255,176,32,.4); background:rgba(255,176,32,.08);}
.review-btn{position:relative; display:flex; align-items:center; gap:9px; width:100%; margin-top:24px; padding:14px 15px; border-radius:12px; background:var(--surface); border:1px solid var(--line); font-size:13.5px; font-weight:700;}
.review-badge{margin-left:auto; padding:3px 9px; border-radius:999px; background:#E5484D; color:#fff; font-size:11.5px; font-weight:700;}
.reset-link{display:block; margin:20px auto 0; color:var(--muted); font-size:12.5px; font-weight:600; text-decoration:underline; text-underline-offset:3px;}

/* ---------------------------- review queue ------------------------------ */
.ov-flat{display:flex; align-items:center; gap:10px; padding:14px 14px 8px; flex:0 0 auto;}
.flat-title{font-size:19px; font-weight:800; letter-spacing:-.025em;}
.flat-sub{font-size:12px; font-weight:500; color:var(--muted);}
.review-row{display:flex; align-items:center; gap:12px; padding:9px; border-radius:13px; background:var(--surface); border:1px solid var(--line); margin-bottom:9px;}
.review-thumb{position:relative; width:52px; height:64px; border-radius:11px; overflow:hidden; flex:0 0 auto;}
.review-thumb img{width:100%; height:100%; object-fit:cover;}
.review-text{flex:1; display:flex; flex-direction:column; gap:3px; min-width:0;}
.review-flags{display:flex; align-items:center; gap:4px; font-size:11.5px; font-weight:600; color:#F2A9AB;}
.review-acts{display:flex; gap:7px;}
.rev-clear{width:38px; height:38px; border-radius:50%; background:rgba(48,164,108,.15); color:#4ADE80; display:flex; align-items:center; justify-content:center;}
.rev-remove{width:38px; height:38px; border-radius:50%; background:rgba(229,72,77,.14); color:#E5484D; display:flex; align-items:center; justify-content:center;}

/* -------------------------------- bottom nav ----------------------------- */
.nav{flex:0 0 auto; display:flex; align-items:center; padding:9px 8px calc(10px + env(safe-area-inset-bottom));
  background:rgba(10,11,13,.88); backdrop-filter:blur(20px); -webkit-backdrop-filter:blur(20px); border-top:1px solid rgba(38,42,49,.7);}
.nav-btn{flex:1; display:flex; flex-direction:column; align-items:center; gap:3px; padding:5px 0; color:var(--muted); transition:color .2s, transform .3s var(--ease);}
.nav-btn:active{transform:scale(.92);}
.nav-btn.on{color:var(--accent);}
.nav-lab{font-size:10px; font-weight:600; letter-spacing:.01em;}
.nav-rec{flex:0 0 auto; width:56px; height:56px; border-radius:50%; display:flex; align-items:center; justify-content:center; margin:-13px 2px 0; transition:transform .32s var(--ease), box-shadow .3s, background .3s;}

/* ------------------------- premium, saved, unlock ------------------------ */
.prem-pin{padding:16px 15px; border-radius:14px; background:linear-gradient(160deg, rgba(255,176,32,.13), rgba(255,176,32,.03)); border:1px solid rgba(255,176,32,.35); margin-bottom:4px;}
.prem-pin.active{background:linear-gradient(160deg, rgba(74,222,128,.11), rgba(255,176,32,.05)); border-color:rgba(74,222,128,.3);}
.prem-pin-head{display:flex; align-items:center; gap:8px; font-size:15px; font-weight:800; letter-spacing:-.01em; color:var(--accent); margin-bottom:8px;}
.prem-pin.active .prem-pin-head{color:#4ADE80;}
.prog-sq{font-size:17px; letter-spacing:2px; margin:2px 0; line-height:1.3;}
.prem-count{font-size:12.5px; font-weight:700; color:var(--soft); margin:2px 0 5px;}
.prem-card{padding:14px; border-radius:14px; background:var(--surface); border:1px solid var(--line); margin-bottom:10px;}
.prem-card-head{display:flex; align-items:center; gap:8px; font-size:14.5px; font-weight:800; letter-spacing:-.01em; margin-bottom:6px;}
.prem-ic{font-size:16px;}
.prem-tag{font-size:12.5px; color:var(--soft); line-height:1.5; margin-bottom:9px;}
.ex-chips{display:flex; flex-wrap:wrap; gap:6px;}
.ex-chip{padding:6px 10px; border-radius:999px; background:var(--raised); border:1px solid var(--line); font-size:11.5px; font-weight:600; color:var(--soft);}
.prem-banner{display:flex; align-items:center; gap:8px; width:100%; padding:12px 14px; border-radius:12px; background:linear-gradient(120deg, rgba(255,176,32,.14), rgba(124,58,237,.14)); border:1px solid rgba(255,176,32,.35); font-size:13px; font-weight:700; margin-bottom:12px; text-align:left;}
.notice-card{padding:15px; border-radius:14px; background:var(--surface); border:1px solid var(--line); margin-bottom:14px;}
.notice-card h3{font-size:15.5px; font-weight:800; letter-spacing:-.01em; margin-bottom:6px;}
.flash-wrap{position:absolute; inset:0; z-index:75; display:flex; align-items:center; justify-content:center; padding:26px; background:rgba(0,0,0,.55); backdrop-filter:blur(6px); -webkit-backdrop-filter:blur(6px); animation:fadeIn .2s ease;}
.smart-line{display:flex; flex-wrap:wrap; gap:6px; margin:0 0 14px;}
.smart-chip{padding:5px 10px; border-radius:999px; background:var(--surface); border:1px solid var(--line); font-size:11px; font-weight:600; color:var(--soft);}
.save-q{color:var(--accent); display:flex;}
.v-cats{display:flex; flex-wrap:wrap; gap:6px; align-items:center;}
.v-cat.ai{background:rgba(255,255,255,.16);}
.upd-card{display:flex; align-items:center; gap:8px; padding:9px; border-radius:13px; background:var(--surface); border:1px solid var(--line); margin-bottom:8px;}
.upd-main{flex:1; display:flex; align-items:center; gap:11px; min-width:0; text-align:left;}
.upd-acts{display:flex; gap:6px; flex:0 0 auto;}
.act-ic{width:33px; height:33px; border-radius:50%; background:var(--raised); border:1px solid var(--line); color:var(--soft); display:flex; align-items:center; justify-content:center;}
.act-ic.danger{color:#E5484D; border-color:rgba(229,72,77,.3); background:rgba(229,72,77,.08);}
.filters-row{display:flex; gap:7px; flex-wrap:wrap; margin-bottom:10px;}

/* ---------------------------------- toast -------------------------------- */
.toast{position:absolute; bottom:104px; left:50%; transform:translateX(-50%); z-index:70; background:#F5F6F8; color:#0A0B0D;
  padding:11px 19px; border-radius:999px; font-size:13px; font-weight:600; box-shadow:0 10px 30px rgba(0,0,0,.45); animation:toastIn .3s var(--ease); max-width:86%; text-align:center;}

/* --------------------------------- motion -------------------------------- */
@keyframes sweep{from{transform:rotate(18deg) translateX(-140%);}to{transform:rotate(18deg) translateX(500%);}}
@keyframes jiggle{0%,100%{transform:rotate(-1.7deg);}50%{transform:rotate(1.7deg);}}
@keyframes slideIn{from{transform:translate3d(56px,0,0); opacity:.3;}to{transform:translate3d(0,0,0); opacity:1;}}
@keyframes fadeIn{from{opacity:0;}to{opacity:1;}}
@keyframes sheetUp{from{transform:translateY(60%);}to{transform:translateY(0);}}
@keyframes popIn{from{transform:scale(.92); opacity:0;}to{transform:scale(1); opacity:1;}}
@keyframes toastIn{from{opacity:0; transform:translate(-50%,10px);}to{opacity:1; transform:translate(-50%,0);}}
@keyframes spin{to{transform:rotate(360deg);}}
@keyframes pulse{0%,100%{opacity:1;}50%{opacity:.35;}}
@media (prefers-reduced-motion: reduce){
  .outside *{animation:none !important; transition:none !important;}
}
`;
