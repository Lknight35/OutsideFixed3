/* Start the API and Expo web first. API_URL includes /api. Optional WEB_URL,
   CHROMIUM_PATH, SMOKE_WIDTH, SMOKE_HEIGHT, and SMOKE_ARTIFACTS configure the run.
   Accounts are disposable and password-confirmed deletion runs in finally. */
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const os = require("node:os");
const crypto = require("node:crypto");
const apiUrl = (process.env.API_URL || "http://127.0.0.1:8787/api").replace(
  /\/$/,
  "",
);
const webUrl = process.env.WEB_URL || "http://127.0.0.1:8082";
const suffix = `${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
const artifacts =
  process.env.SMOKE_ARTIFACTS || path.join(os.tmpdir(), `outside-ui-${suffix}`);
const password = crypto.randomBytes(24).toString("base64url");
const accounts = [];
fs.mkdirSync(artifacts, { recursive: true });
async function run() {
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.CHROMIUM_PATH
      ? { executablePath: process.env.CHROMIUM_PATH }
      : fs.existsSync("/usr/bin/chromium")
        ? { executablePath: "/usr/bin/chromium" }
        : {}),
    args: ["--no-sandbox"],
  });
  const page = await browser.newPage({
    viewport: {
      width: Number(process.env.SMOKE_WIDTH || 393),
      height: Number(process.env.SMOKE_HEIGHT || 852),
    },
  });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => {
    if (
      message.type() === "error" &&
      !message.text().startsWith("Failed to load resource:")
    )
      errors.push(message.text());
  });
  async function call(route, method = "GET", body, token) {
    const response = await page.request.fetch(`${apiUrl}${route}`, {
      method,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      ...(body === undefined ? {} : { data: body }),
    });
    const payload = await response.json();
    if (!response.ok())
      throw new Error(
        `${method} ${route}: ${response.status()} ${payload.error?.message || ""}`,
      );
    return payload.data;
  }
  async function shot(name) {
    await page.screenshot({
      path: path.join(artifacts, `${name}.png`),
      fullPage: true,
    });
  }
  try {
    const friend = await call("/auth/register", "POST", {
      name: "Outside Smoke Friend",
      email: `smoke.friend.${suffix}@example.invalid`,
      password,
    });
    accounts.push({ ...friend, password });
    await page.goto(webUrl, { waitUntil: "networkidle" });
    await page.getByPlaceholder("https://outside.example.com").fill(apiUrl);
    await page
      .getByRole("button", { name: "Connect server", exact: true })
      .click();
    await page.getByText("Welcome back.", { exact: true }).waitFor();
    await page
      .getByRole("button", {
        name: "New to Outside? Create account",
        exact: true,
      })
      .click();
    await page
      .getByPlaceholder("What should friends call you?")
      .fill("Outside Smoke Sol");
    await page
      .getByPlaceholder("you@example.com")
      .fill(`smoke.sol.${suffix}@example.invalid`);
    await page.getByPlaceholder("At least 10 characters").fill(password);
    const registering = page.waitForResponse(
      (response) =>
        response.url() === `${apiUrl}/auth/register` &&
        response.request().method() === "POST",
    );
    await page
      .getByRole("button", { name: "Create account", exact: true })
      .click();
    const mine = (await (await registering).json()).data;
    assert.ok(mine?.token);
    accounts.push({ ...mine, password });
    await page.getByText("Find your outside.", { exact: true }).waitFor();
    await shot("home");
    console.log("PASS connection, registration, authentic empty feed");
    await page.getByRole("tab", { name: "Friends", exact: true }).click();
    await page.getByRole("tab", { name: "My friends", exact: true }).click();
    await page
      .getByPlaceholder("Name or exact email")
      .fill(`smoke.friend.${suffix}@example.invalid`);
    await page
      .getByRole("button", { name: "Find friends", exact: true })
      .click();
    await page.getByRole("button", { name: "Add", exact: true }).click();
    await page
      .getByText("Waiting for their response", { exact: true })
      .waitFor();
    const requests = await call("/friends", "GET", undefined, friend.token);
    const request = requests.incoming.find(
      (item) => item.user.id === mine.user.id,
    );
    assert.ok(request);
    await call(
      `/friends/requests/${request.id}/respond`,
      "POST",
      { response: "accepted" },
      friend.token,
    );
    console.log("PASS mutual friendship request and acceptance");
    await page.getByRole("tab", { name: "Search", exact: true }).click();
    await page
      .getByPlaceholder("Places, cities, things to do…")
      .fill("Central Park New York");
    await page
      .getByRole("button", { name: "Search places", exact: true })
      .click();
    await page
      .getByRole("button", { name: /Open Central Park/ })
      .first()
      .waitFor({ timeout: 30000 });
    await page.getByText("Matching recent updates", { exact: true }).waitFor();
    await shot("search");
    await page
      .getByRole("button", { name: "Save search", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Unsave search", exact: true })
      .waitFor();
    await page
      .getByRole("button", { name: /Open Central Park/ })
      .first()
      .click();
    await page.getByRole("button", { name: "Save", exact: true }).click();
    await page.getByRole("button", { name: "Saved", exact: true }).waitFor();
    console.log(
      "PASS real OSM place search, independent recording search, saved search/place",
    );
    await page
      .getByRole("button", { name: "Invite friends", exact: true })
      .click();
    await page
      .getByRole("checkbox", { name: "Outside Smoke Friend", exact: true })
      .click();
    const creating = page.waitForResponse(
      (response) =>
        response.url() === `${apiUrl}/invitations` &&
        response.request().method() === "POST",
    );
    await page
      .getByRole("button", { name: "Send invitation", exact: true })
      .click();
    const invitation = (await (await creating).json()).data;
    assert.ok(invitation?.id);
    await page
      .getByRole("button", { name: "Discover around here", exact: true })
      .waitFor();
    await call(
      `/invitations/${invitation.id}/respond`,
      "POST",
      { response: "accepted" },
      friend.token,
    );
    await page.getByRole("button", { name: "Go back", exact: true }).click();
    await page.getByRole("tab", { name: "Friends", exact: true }).click();
    await page
      .getByRole("button", { name: "Your invitations", exact: true })
      .click();
    await page
      .getByRole("button", { name: /Open invitation to Central Park/ })
      .first()
      .click();
    await page
      .getByPlaceholder("Message about this outing")
      .fill("Meet at the park entrance.");
    await page
      .getByRole("button", { name: "Send message", exact: true })
      .click();
    await page
      .getByText("Meet at the park entrance.", { exact: true })
      .waitFor();
    assert.ok(
      (
        await call(
          `/invitations/${invitation.id}/messages`,
          "GET",
          undefined,
          friend.token,
        )
      ).messages.some(
        (message) => message.text === "Meet at the park entrance.",
      ),
    );
    console.log(
      "PASS invitation creation, individual acceptance, private one-to-one chat",
    );
    await page
      .getByPlaceholder("Find a place to share")
      .fill("New York Public Library");
    await page
      .getByRole("button", { name: "Find a place", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Share this place", exact: true })
      .first()
      .click();
    assert.ok(
      (
        await call(
          `/invitations/${invitation.id}/messages`,
          "GET",
          undefined,
          friend.token,
        )
      ).messages.some((message) => message.place),
    );
    await shot("invitation");
    console.log("PASS Next Move private real-place sharing");
    await page
      .getByRole("button", { name: "Discover around here", exact: true })
      .click();
    const frame = page.frameLocator('iframe[title="Map of places"]');
    await frame.locator(".leaflet-marker-icon").first().click();
    await frame
      .getByRole("button", { name: /Open Central Park/ })
      .first()
      .click();
    await page
      .getByRole("button", { name: "Explore this place", exact: true })
      .waitFor();
    await shot("around");
    console.log(
      "PASS interactive destination map and authorized marker callback",
    );
    await page.getByRole("button", { name: "Go back", exact: true }).click();
    await page.getByRole("tab", { name: "Profile", exact: true }).click();
    await page
      .getByRole("button", { name: "Your earned access", exact: true })
      .click();
    await page
      .getByText("0 / 3 approved quality updates", { exact: true })
      .waitFor();
    await shot("unlock");
    await page.getByRole("button", { name: "Go back", exact: true }).click();
    await page
      .getByRole("button", { name: "Settings & privacy", exact: true })
      .click();
    const privacy = page.waitForResponse(
      (response) =>
        response.url() === `${apiUrl}/me/preferences` &&
        response.request().method() === "PATCH",
    );
    await page.getByRole("button", { name: "Only me", exact: true }).click();
    await privacy;
    await page
      .getByRole("switch", { name: "Friend activity", exact: true })
      .click();
    await page
      .getByRole("switch", { name: "Friend activity", exact: true })
      .isChecked();
    const me = await call("/me", "GET", undefined, mine.token);
    assert.equal(me.preferences.mapVisibility, "private");
    assert.equal(me.preferences.friendActivity, true);
    await shot("settings");
    console.log(
      "PASS server-earned unlock state and persisted privacy/preferences",
    );
    const choosing = page.waitForEvent("filechooser");
    await page
      .getByRole("button", { name: "Add profile photo", exact: true })
      .click();
    await (
      await choosing
    ).setFiles(path.resolve(__dirname, "../assets/icon.png"));
    await page
      .getByRole("button", { name: "Change profile photo", exact: true })
      .waitFor();
    const withAvatar = await call("/me", "GET", undefined, mine.token);
    assert.ok(withAvatar.user.avatarUrl);
    const photo = await page.request.get(
      `${new URL(apiUrl).origin}${withAvatar.user.avatarUrl}`,
      { headers: { Authorization: `Bearer ${mine.token}` } },
    );
    assert.equal(photo.status(), 200);
    assert.equal(photo.headers()["content-type"], "image/jpeg");
    await page.getByRole("button", { name: "Go back", exact: true }).click();
    await page
      .getByRole("img", {
        name: "Outside Smoke Sol's profile photo",
        exact: true,
      })
      .waitFor();
    await shot("profile");
    await page
      .getByRole("button", { name: "Settings & privacy", exact: true })
      .click();
    await page.getByRole("button", { name: "Remove", exact: true }).click();
    await page
      .getByRole("button", { name: "Add profile photo", exact: true })
      .waitFor();
    console.log(
      "PASS profile image-only picker, authenticated normalized image display, removal",
    );
    await page
      .getByRole("button", { name: "Delete account", exact: true })
      .click();
    await page.getByPlaceholder("Your current password").fill("wrong-password");
    await page
      .getByRole("button", {
        name: "Permanently delete my account",
        exact: true,
      })
      .click();
    await page
      .getByText("Password is incorrect. Your account has not been deleted.", {
        exact: true,
      })
      .waitFor();
    await page.getByPlaceholder("Your current password").fill(password);
    await page
      .getByRole("button", {
        name: "Permanently delete my account",
        exact: true,
      })
      .click();
    await page.getByText("Welcome back.", { exact: true }).waitFor();
    accounts.find((account) => account.token === mine.token).deleted = true;
    const revoked = await page.request.get(`${apiUrl}/me`, {
      headers: { Authorization: `Bearer ${mine.token}` },
    });
    assert.equal(revoked.status(), 401);
    console.log(
      "PASS deletion reauthentication, local clear, server session revocation",
    );
    assert.deepEqual(errors, [], "Unexpected browser application errors");
    console.log(
      `PASS no browser application errors; screenshots: ${artifacts}`,
    );
  } catch (error) {
    await shot("failure").catch(() => {});
    throw error;
  } finally {
    for (const account of accounts) {
      if (account.deleted) continue;
      try {
        await call(
          "/me/delete",
          "POST",
          { password: account.password },
          account.token,
        );
        account.deleted = true;
      } catch (error) {
        console.error(
          `Cleanup failed for disposable account ${account.user.id}: ${error.message}`,
        );
        process.exitCode = 1;
      }
    }
    await browser.close();
  }
}
run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
