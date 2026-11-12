import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { once } from "node:events";
import { createApp } from "../src/app.js";

test("place search persists provider coordinates, caches explicit searches, and reports outages without fabricated fallback", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "outside-places-"));
  let calls = 0;
  const backend = createApp({
    dataDirectory: directory,
    processMedia: false,
    providerFetch: async (url, options) => {
      calls++;
      assert.equal(new URL(url).origin, "https://nominatim.openstreetmap.org");
      assert.ok(options.headers["User-Agent"]);
      if (new URL(url).searchParams.get("q") === "Provider down")
        throw new Error("Unavailable fixture provider");
      return {
        ok: true,
        json: async () => [
          {
            osm_type: "node",
            osm_id: 123,
            name: "Provider fixture café",
            display_name: "Provider fixture address",
            lat: "51.51",
            lon: "-0.12",
            class: "amenity",
            type: "cafe",
          },
        ],
      };
    },
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
  const registered = await (
    await fetch(`${base}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Search",
        email: "search@example.test",
        password: "search-test-password",
      }),
    })
  ).json();
  const headers = { Authorization: `Bearer ${registered.data.token}` };
  const result = await fetch(`${base}/places/search?q=Fixture%20Cafe`, {
    headers,
  });
  assert.equal(result.status, 200);
  const places = (await result.json()).data;
  assert.equal(places.length, 1);
  assert.equal(places[0].id, "osm:node:123");
  assert.equal(places[0].lat, 51.51);
  assert.equal(places[0].lng, -0.12);
  assert.equal(places[0].category, "food");
  assert.match(places[0].attribution, /OpenStreetMap/);
  assert.deepEqual(
    (
      await (
        await fetch(`${base}/places/search?q=Fixture%20Cafe`, { headers })
      ).json()
    ).data,
    places,
  );
  assert.equal(calls, 1);
  const detail = (
    await (
      await fetch(`${base}/places/${encodeURIComponent(places[0].id)}`, {
        headers,
      })
    ).json()
  ).data;
  assert.deepEqual(detail.videos, []);
  assert.equal(
    (await fetch(`${base}/places/search?q=x`, { headers })).status,
    400,
  );
  assert.equal(calls, 1);
  const outage = await fetch(`${base}/places/search?q=Provider%20down`, {
    headers,
  });
  assert.equal(outage.status, 503);
  assert.equal((await outage.json()).error.code, "PLACES_UNAVAILABLE");
  assert.equal(
    backend.db.prepare("SELECT COUNT(*) AS n FROM places").get().n,
    1,
  );
});
