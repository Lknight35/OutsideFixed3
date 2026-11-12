/* Regression: delayed responses from a signed-out account must neither replace
   the next account's private state nor sign it out on a late 401. */
const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const crypto = require("node:crypto");
const apiUrl = (process.env.API_URL || "http://127.0.0.1:8787/api").replace(
  /\/$/,
  "",
);
const webUrl = process.env.WEB_URL || "http://127.0.0.1:8082";
const suffix = `${Date.now()}-${crypto.randomBytes(3).toString("hex")}`;
const password = crypto.randomBytes(24).toString("base64url");
(async () => {
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.CHROMIUM_PATH
      ? { executablePath: process.env.CHROMIUM_PATH }
      : fs.existsSync("/usr/bin/chromium")
        ? { executablePath: "/usr/bin/chromium" }
        : {}),
    args: ["--no-sandbox"],
  });
  const page = await browser.newPage({ viewport: { width: 393, height: 852 } });
  const accounts = [];
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  async function call(route, method = "GET", body, token) {
    const response = await page.request.fetch(`${apiUrl}${route}`, {
      method,
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      ...(body === undefined ? {} : { data: body }),
    });
    const json = await response.json();
    assert.ok(response.ok(), `${route} returned ${response.status()}`);
    return json.data;
  }
  async function login(email) {
    await page.getByPlaceholder("you@example.com").fill(email);
    await page.getByPlaceholder("Your password").fill(password);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();
    await page.getByText("Find your outside.", { exact: true }).waitFor();
  }
  try {
    for (const label of ["A", "B"]) {
      const email = `race.${label.toLowerCase()}.${suffix}@example.invalid`;
      const result = await call("/auth/register", "POST", {
        name: `Session Smoke ${label}`,
        email,
        password,
      });
      accounts.push({ ...result, email });
    }
    await page.goto(webUrl, { waitUntil: "networkidle" });
    await page.getByPlaceholder("https://outside.example.com").fill(apiUrl);
    await page
      .getByRole("button", { name: "Connect server", exact: true })
      .click();
    await page.getByText("Welcome back.", { exact: true }).waitFor();
    await login(accounts[0].email);
    let release;
    const gate = new Promise((resolve) => {
      release = resolve;
    });
    let firstReady;
    const first = new Promise((resolve) => {
      firstReady = resolve;
    });
    let secondReady;
    const second = new Promise((resolve) => {
      secondReady = resolve;
    });
    let finished;
    const allFinished = new Promise((resolve) => {
      finished = resolve;
    });
    let started = 0,
      completed = 0;
    const statuses = [];
    const handler = async (route) => {
      const index = started++;
      if (index >= 2) {
        await route.continue();
        return;
      }
      try {
        let response;
        if (index === 0) {
          response = await route.fetch();
          firstReady();
          await gate;
        } else {
          secondReady();
          await gate;
          response = await route.fetch();
        }
        statuses[index] = response.status();
        await route.fulfill({ response });
      } catch (error) {
        errors.push(`Interception failed: ${error.message}`);
      } finally {
        if (++completed === 2) finished();
      }
    };
    await page.route(`${apiUrl}/me`, handler);
    await page.getByRole("tab", { name: "Profile", exact: true }).click();
    await first;
    await page.getByRole("tab", { name: "Home", exact: true }).click();
    await page.getByRole("tab", { name: "Profile", exact: true }).click();
    await second;
    await page
      .getByRole("button", { name: "Settings & privacy", exact: true })
      .click();
    await page.getByRole("button", { name: "Sign out", exact: true }).click();
    await page.getByText("Welcome back.", { exact: true }).waitFor();
    await login(accounts[1].email);
    release();
    await allFinished;
    await page.unroute(`${apiUrl}/me`, handler);
    assert.deepEqual(statuses, [200, 401]);
    await page.getByRole("tab", { name: "Profile", exact: true }).click();
    await page.getByText("Session Smoke B", { exact: true }).waitFor();
    assert.equal(
      await page.getByText("Session Smoke A", { exact: true }).count(),
      0,
    );
    assert.deepEqual(errors, []);
    console.log(
      "PASS delayed prior-account success cannot replace new private state; delayed prior-account 401 cannot sign out new session",
    );
  } finally {
    for (const account of accounts) {
      try {
        const login = await call("/auth/login", "POST", {
          email: account.email,
          password,
        });
        await call("/me/delete", "POST", { password }, login.token);
      } catch (error) {
        console.error(
          `Could not clean disposable account ${account.user.id}: ${error.message}`,
        );
        process.exitCode = 1;
      }
    }
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
