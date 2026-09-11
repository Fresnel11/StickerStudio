import { test } from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { randomUUID, generateKeyPairSync, sign } from "node:crypto";
import { OAuth2Client } from "google-auth-library";
import "../src/config/env.js";
import { openDatabase } from "../src/config/database.js";
import { createApp } from "../src/app.js";
import { googleProvider } from "../src/services/google.service.js";

const config = {
  clientId: "test-client",
  clientSecret: "test-secret",
  origin: "http://127.0.0.1:5173",
  redirectUri: "http://127.0.0.1:5173/api/auth/google/callback",
};
test("Google : signature, audience, expiration, nonce et adresse vérifiée", async () => {
  const { privateKey, publicKey } = generateKeyPairSync("rsa", {
    modulusLength: 2048,
  });
  const oauth = new OAuth2Client();
  const base = {
    sub: "google-subject",
    email: "google@example.test",
    email_verified: true,
    name: "Camille",
    nonce: "expected",
    aud: config.clientId,
    iss: "https://accounts.google.com",
    iat: Math.floor(Date.now() / 1000) - 10,
    exp: Math.floor(Date.now() / 1000) + 600,
  };
  let claims = { ...base };
  let corrupt = false;
  const provider = googleProvider(config, {
    async getToken() {
      const head = Buffer.from(
        JSON.stringify({ alg: "RS256", kid: "local" }),
      ).toString("base64url");
      const payload = Buffer.from(JSON.stringify(claims)).toString("base64url");
      const content = `${head}.${payload}`;
      const signature = sign(
        "RSA-SHA256",
        Buffer.from(content),
        privateKey,
      ).toString("base64url");
      return {
        tokens: { id_token: `${content}.${corrupt ? "invalid" : signature}` },
      };
    },
    verifyIdToken({ idToken, audience }) {
      return oauth.verifySignedJwtWithCertsAsync(
        idToken,
        { local: publicKey.export({ type: "spki", format: "pem" }) },
        audience,
        ["https://accounts.google.com", "accounts.google.com"],
      );
    },
  });
  assert.equal(
    (await provider.identity("code", "verifier", "expected")).subject,
    base.sub,
  );
  for (const invalid of [
    { aud: "another-client" },
    { iss: "https://attacker.example" },
    { exp: Math.floor(Date.now() / 1000) - 1000 },
    { nonce: "wrong" },
    { email_verified: false },
  ]) {
    claims = { ...base, ...invalid };
    await assert.rejects(() =>
      provider.identity("code", "verifier", "expected"),
    );
  }
  claims = { ...base };
  corrupt = true;
  await assert.rejects(() => provider.identity("code", "verifier", "expected"));
});

test("Google : aller-retour OAuth, état à usage unique, compte existant et association explicite", async () => {
  const connectionString = process.env.TEST_DATABASE_URL;
  if (
    !connectionString ||
    !new URL(connectionString).pathname.endsWith("_test")
  )
    throw new Error("TEST_DATABASE_URL doit désigner une base _test.");
  const schema = `test_${randomUUID().replaceAll("-", "")}`;
  const db = await openDatabase({ connectionString, schema });
  let identity = {
    subject: "subject-one",
    email: "google@example.test",
    name: "Camille",
  };
  let calls = 0;
  const provider = {
    authorizationUrl({ state, nonce, challenge }) {
      const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
      url.search = new URLSearchParams({
        state,
        nonce,
        code_challenge: challenge,
      }).toString();
      return url.toString();
    },
    async identity(code, verifier, nonce) {
      calls++;
      assert.ok(verifier.length >= 43);
      assert.ok(nonce);
      if (code === "invalid") throw new Error("bad token");
      return identity;
    },
  };
  const app = await createApp({
    db,
    authLimit: 100,
    google: { config, provider },
  });
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const origin = `http://127.0.0.1:${server.address().port}`;
  async function request(path, { cookie = "", method = "GET", body } = {}) {
    const response = await fetch(origin + path, {
      method,
      redirect: "manual",
      headers: {
        Cookie: cookie,
        "Content-Type": "application/json",
        "X-Sticker-Studio": "1",
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const cookies = response.headers.getSetCookie();
    return {
      status: response.status,
      location: response.headers.get("location"),
      cookies,
      body: response.headers.get("content-type")?.includes("json")
        ? await response.json()
        : null,
    };
  }
  const sessionCookie = (result) =>
    result.cookies.find((x) => x.startsWith("studio_session="))?.split(";")[0];
  async function start(cookie = "", link = false) {
    const result = await request(`/api/auth/google${link ? "?link=1" : ""}`, {
      cookie,
    });
    assert.equal(result.status, 302);
    const url = new URL(result.location);
    return {
      state: url.searchParams.get("state"),
      cookie: result.cookies[0].split(";")[0],
      challenge: url.searchParams.get("code_challenge"),
    };
  }
  const callback = (flow, code = "ok", cookie = flow.cookie) =>
    request(`/api/auth/google/callback?state=${flow.state}&code=${code}`, {
      cookie,
    });
  try {
    assert.equal((await request("/api/auth/providers")).body.google, true);
    const flow = await start();
    assert.ok(flow.challenge);
    const wrong = await callback(flow, "ok", "studio_google=wrong");
    assert.match(wrong.location, /google=expired/);
    assert.equal(calls, 0);
    const success = await callback(flow);
    assert.equal(success.location, config.origin + "/mes-stickers");
    const cookie = sessionCookie(success);
    assert.match(cookie, /studio_session=/);
    const me = (await request("/api/auth/me", { cookie })).body.user;
    assert.equal(me.email, identity.email);
    assert.equal(
      (await db.query("SELECT password_hash FROM users WHERE id=$1", [me.id]))
        .rows[0].password_hash,
      null,
    );
    assert.match((await callback(flow)).location, /google=expired/);
    assert.equal(calls, 1);
    const repeat = await callback(await start());
    assert.equal(
      (await request("/api/auth/me", { cookie: sessionCookie(repeat) })).body
        .user.id,
      me.id,
    );
    assert.equal(
      (await db.query("SELECT count(*) FROM users")).rows[0].count,
      "1",
    );
    const cancelled = await start();
    assert.match(
      (
        await request(
          `/api/auth/google/callback?state=${cancelled.state}&error=access_denied`,
          { cookie: cancelled.cookie },
        )
      ).location,
      /google=cancelled/,
    );
    const expired = await start();
    await db.query("UPDATE oauth_requests SET expires_at=0");
    assert.match((await callback(expired)).location, /google=expired/);
    assert.match(
      (await callback(await start(), "invalid")).location,
      /google=failed/,
    );
    const registration = await request("/api/auth/register", {
      method: "POST",
      body: {
        name: "Autre",
        email: "password@example.test",
        password: "Un mot de passe solide 123!",
      },
    });
    const ownerCookie = sessionCookie(registration);
    identity = {
      subject: "subject-two",
      email: "password@example.test",
      name: "Autre",
    };
    assert.match(
      (await callback(await start())).location,
      /google=existing_account/,
    );
    assert.equal(
      (
        await db.query("SELECT google_subject FROM users WHERE email=$1", [
          identity.email,
        ])
      ).rows[0].google_subject,
      null,
    );
    const link = await start(ownerCookie, true);
    const linked = await callback(link, "ok", `${link.cookie}; ${ownerCookie}`);
    assert.equal(linked.location, config.origin + "/mes-stickers");
    assert.equal(
      (await request("/api/auth/providers", { cookie: sessionCookie(linked) }))
        .body.googleLinked,
      true,
    );
    const returning = await callback(await start());
    assert.equal(
      (await request("/api/auth/me", { cookie: sessionCookie(returning) })).body
        .user.id,
      registration.body.user.id,
    );
    // A link callback cannot proceed after the authenticated session disappeared.
    const pending = await start(sessionCookie(linked), true);
    assert.match((await callback(pending)).location, /google=signin_first/);
    // The APK keeps the verifier secret; Google runs in the system browser.
    const mobile = (await request("/api/auth/google/mobile", { method: "POST", body: {} })).body;
    const finish = (body = mobile, cookie = "") => request("/api/auth/google/mobile/finish", { method: "POST", body, cookie });
    assert.equal((await finish()).body.pending, true);
    assert.equal((await finish({ ...mobile, secret: "0".repeat(64) })).status, 410);
    const browserStart = await request(`/api/auth/google?mobile=${mobile.id}`);
    assert.equal(browserStart.status, 302);
    assert.equal((await request(`/api/auth/google?mobile=${mobile.id}`)).status, 410);
    const mobileFlow = {
      state: new URL(browserStart.location).searchParams.get("state"),
      cookie: browserStart.cookies[0].split(";")[0],
    };
    const browserDone = await callback(mobileFlow);
    assert.equal(browserDone.status, 200);
    assert.equal(sessionCookie(browserDone), undefined);
    const completed = await finish();
    assert.equal(completed.body.pending, false);
    assert.equal((await request("/api/auth/me", { cookie: sessionCookie(completed) })).body.user.id, registration.body.user.id);
    assert.equal((await finish()).status, 410);
    // Cancellation is delivered to the APK without creating a session.
    const cancellation = (await request("/api/auth/google/mobile", { method: "POST", body: {} })).body;
    const cancelStart = await request(`/api/auth/google?mobile=${cancellation.id}`);
    await request(`/api/auth/google/callback?state=${new URL(cancelStart.location).searchParams.get("state")}&error=access_denied`, { cookie: cancelStart.cookies[0].split(";")[0] });
    assert.equal((await finish(cancellation)).body.errorCode, "cancelled");
    assert.equal((await finish(cancellation)).status, 410);
    assert.equal((await request("/api/auth/google/mobile", { method: "POST", body: { link: true } })).status, 401);
  } finally {
    await new Promise((resolve) => server.close(resolve));
    await db.query(`DROP SCHEMA "${schema}" CASCADE`);
    await db.end();
  }
});
