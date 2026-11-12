import { EnvHttpProxyAgent, fetch } from "undici";
import { ApiError, iso, distance } from "./domain.js";

const dispatcher = new EnvHttpProxyAgent();
function category(raw) {
  const value = `${raw.class || ""} ${raw.type || ""}`;
  if (/bar|pub|nightclub/.test(value)) return "nightlife";
  if (/restaurant|cafe|food|bakery/.test(value)) return "food";
  if (/sport|pitch|stadium|fitness/.test(value)) return "sports";
  if (/beach/.test(value)) return "beaches";
  if (/shop|mall|retail/.test(value)) return "shopping";
  if (/park|nature|forest|peak|garden/.test(value)) return "outdoors";
  return "places";
}
export function createPlaces(
  db,
  domain,
  { now = Date.now, providerFetch = fetch } = {},
) {
  let lastRequest = 0;
  let pending = Promise.resolve();
  const inFlight = new Map();
  function nearby(origin) {
    return db
      .prepare(
        "SELECT * FROM places WHERE id<>? AND lat BETWEEN ? AND ? AND lng BETWEEN ? AND ? LIMIT 300",
      )
      .all(
        origin.id,
        origin.lat - 0.2,
        origin.lat + 0.2,
        origin.lng - 0.3,
        origin.lng + 0.3,
      )
      .map((row) => ({
        ...domain.place(row),
        distanceMeters: Math.round(distance(origin, row)),
      }))
      .filter((p) => p.distanceMeters < 20000)
      .sort((a, b) => a.distanceMeters - b.distanceMeters)
      .slice(0, 20);
  }
  async function search(query, coordinates) {
    const normalized = query.trim().toLowerCase();
    const cacheKey =
      normalized +
      (coordinates
        ? `:${coordinates.lat.toFixed(2)},${coordinates.lng.toFixed(2)}`
        : "");
    const cached = db
      .prepare("SELECT * FROM place_searches WHERE query=?")
      .get(cacheKey);
    if (cached && now() - new Date(cached.created_at).getTime() < 86400000)
      return JSON.parse(cached.place_ids)
        .map(domain.getPlace)
        .filter(Boolean)
        .map(domain.place);
    if (inFlight.has(cacheKey)) return inFlight.get(cacheKey);
    const task = pending
      .catch(() => {})
      .then(async () => {
        // Public Nominatim permits at most one request/second and forbids autocomplete.
        const wait = Math.max(0, 1100 - (now() - lastRequest));
        if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
        lastRequest = now();
        const params = new URLSearchParams({
          q: query,
          format: "jsonv2",
          addressdetails: "1",
          limit: "20",
        });
        if (coordinates)
          params.set(
            "viewbox",
            `${coordinates.lng - 0.15},${coordinates.lat + 0.15},${coordinates.lng + 0.15},${coordinates.lat - 0.15}`,
          );
        let rows;
        try {
          const response = await providerFetch(
            `https://nominatim.openstreetmap.org/search?${params}`,
            {
              dispatcher,
              headers: {
                "User-Agent":
                  process.env.OSM_USER_AGENT ||
                  "OutsideDevelopment/0.1 (place-discovery prototype)",
                Accept: "application/json",
              },
              signal: AbortSignal.timeout(12000),
            },
          );
          if (!response.ok) throw new Error(`provider HTTP ${response.status}`);
          rows = await response.json();
          if (!Array.isArray(rows)) throw new Error("provider response");
        } catch {
          throw new ApiError(
            503,
            "PLACES_UNAVAILABLE",
            "Place search is temporarily unavailable. Please try again shortly.",
          );
        }
        const places = [];
        for (const raw of rows) {
          const lat = Number(raw.lat),
            lng = Number(raw.lon);
          if (
            !Number.isFinite(lat) ||
            !Number.isFinite(lng) ||
            !raw.osm_type ||
            !raw.osm_id
          )
            continue;
          const placeId = `osm:${raw.osm_type}:${raw.osm_id}`;
          const name = String(
            raw.name || raw.display_name?.split(",")[0] || "",
          ).slice(0, 200);
          if (!name) continue;
          db.prepare(
            `INSERT INTO places(id,name,address,lat,lng,category,updated_at) VALUES(?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,address=excluded.address,lat=excluded.lat,lng=excluded.lng,category=excluded.category,updated_at=excluded.updated_at`,
          ).run(
            placeId,
            name,
            String(raw.display_name || "").slice(0, 800),
            lat,
            lng,
            category(raw),
            iso(now()),
          );
          places.push(domain.place(domain.getPlace(placeId)));
        }
        db.prepare(
          "INSERT INTO place_searches VALUES(?,?,?) ON CONFLICT(query) DO UPDATE SET place_ids=excluded.place_ids,created_at=excluded.created_at",
        ).run(cacheKey, JSON.stringify(places.map((p) => p.id)), iso(now()));
        return places;
      });
    pending = task;
    inFlight.set(cacheKey, task);
    try {
      return await task;
    } finally {
      inFlight.delete(cacheKey);
    }
  }
  return { search, nearby };
}
