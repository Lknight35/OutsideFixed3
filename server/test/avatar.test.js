import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { once } from "node:events";
import sharp from "sharp";
import { createApp } from "../src/app.js";

test("profile photos require a session, validate actual image bytes, strip metadata, resize and revoke replaced files", async (t) => {
  const directory = await mkdtemp(join(tmpdir(), "outside-avatar-"));
  const backend = createApp({ dataDirectory: directory, processMedia: false });
  const server = backend.app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const base = `http://127.0.0.1:${server.address().port}`;
  t.after(async () => {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
    await backend.close();
    await rm(directory, { recursive: true, force: true });
  });
  async function register(name) {
    return (
      await (
        await fetch(`${base}/api/auth/register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name,
            email: `${name}@example.test`,
            password: "avatar-test-password",
          }),
        })
      ).json()
    ).data;
  }
  const owner = await register("owner"),
    viewer = await register("viewer");
  const headers = { Authorization: `Bearer ${owner.token}` };
  const source = await sharp({
    create: { width: 1000, height: 800, channels: 3, background: "#7C3AED" },
  })
    .jpeg()
    .withMetadata({ exif: { IFD0: { Artist: "Metadata should not survive" } } })
    .toBuffer();
  function form(bytes, type = "image/jpeg") {
    const data = new FormData();
    data.set("image", new Blob([bytes], { type }), "photo.jpg");
    return data;
  }
  assert.equal(
    (
      await fetch(`${base}/api/me/avatar`, {
        method: "POST",
        body: form(source),
      })
    ).status,
    401,
  );
  const uploaded = await fetch(`${base}/api/me/avatar`, {
    method: "POST",
    headers,
    body: form(source),
  });
  assert.equal(uploaded.status, 200);
  const user = (await uploaded.json()).data;
  assert.match(user.avatarUrl, /^\/api\/users\/.+\/avatar\?v=/);
  assert.equal((await fetch(base + user.avatarUrl)).status, 401);
  const image = await fetch(base + user.avatarUrl, {
    headers: { Authorization: `Bearer ${viewer.token}` },
  });
  assert.equal(image.status, 200);
  const metadata = await sharp(
    Buffer.from(await image.arrayBuffer()),
  ).metadata();
  assert.equal(metadata.width, 256);
  assert.equal(metadata.height, 256);
  assert.equal(metadata.format, "jpeg");
  assert.equal(metadata.exif, undefined);
  for (const bytes of [
    Buffer.from("not a real image"),
    Buffer.from(
      '<svg xmlns="http://www.w3.org/2000/svg" width="2" height="2"><rect width="2" height="2"/></svg>',
    ),
  ]) {
    assert.equal(
      (
        await fetch(`${base}/api/me/avatar`, {
          method: "POST",
          headers,
          body: form(bytes),
        })
      ).status,
      400,
    );
    assert.equal((await fetch(base + user.avatarUrl, { headers })).status, 200);
  }
  const removed = await fetch(`${base}/api/me/avatar`, {
    method: "DELETE",
    headers,
  });
  assert.equal(removed.status, 200);
  assert.equal((await removed.json()).data.avatarUrl, null);
  assert.equal((await fetch(base + user.avatarUrl, { headers })).status, 404);
});
