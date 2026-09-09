import { test } from "node:test";
import assert from "node:assert/strict";
import { once } from "node:events";
import { randomUUID } from "node:crypto";
import "../src/config/env.js";
import sharp from "sharp";
import { openDatabase } from "../src/config/database.js";
import { createApp } from "../src/app.js";

async function fixture(db, options = {}) {
  const app = await createApp({ db, authLimit: 100, ...options });
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const base = `http://127.0.0.1:${server.address().port}`;
  async function request(
    path,
    { method = "GET", body, cookie, headers = {} } = {},
  ) {
    const response = await fetch(base + "/api" + path, {
      method,
      headers: {
        "Content-Type": "application/json",
        "X-Sticker-Studio": "1",
        ...(cookie ? { Cookie: cookie } : {}),
        ...headers,
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    return {
      status: response.status,
      body: response.status === 204 ? null : await response.json(),
      cookie: response.headers.get("set-cookie"),
      headers: response.headers,
    };
  }
  return {
    request,
    close: () => new Promise((resolve) => server.close(resolve)),
  };
}
const credentials = {
  name: "Camille",
  email: "camille@example.test",
  password: "Une phrase de passe 42!",
};
function testConfig() {
  const connectionString = process.env.TEST_DATABASE_URL;
  if (
    !connectionString ||
    !new URL(connectionString).pathname.endsWith("_test")
  )
    throw new Error(
      "TEST_DATABASE_URL doit désigner une base PostgreSQL dédiée avec un nom terminé par _test.",
    );
  return {
    connectionString,
    schema: `test_${randomUUID().replaceAll("-", "")}`,
  };
}
async function cleanDatabase(db, schema) {
  if (!/^test_[a-f0-9]{32}$/.test(schema))
    throw new Error("Schéma de test invalide");
  await db.query(`DROP SCHEMA "${schema}" CASCADE`);
  await db.end();
}
async function sticker(color = "#7959e9") {
  const image = await sharp({
    create: { width: 512, height: 512, channels: 4, background: color },
  })
    .webp()
    .toBuffer();
  return `data:image/webp;base64,${image.toString("base64")}`;
}

test("comptes, sessions, isolation, validation et conservation après redémarrage", async () => {
  const config = testConfig();
  let db = await openDatabase(config);
  let server = await fixture(db);
  try {
    const { request } = server;
    assert.equal((await request("/library")).status, 401);
    assert.equal(
      (
        await request("/auth/register", {
          method: "POST",
          body: { ...credentials, password: "short" },
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await request("/auth/register", {
          method: "POST",
          body: credentials,
          headers: { "X-Sticker-Studio": "" },
        })
      ).status,
      403,
    );
    const registered = await request("/auth/register", {
      method: "POST",
      body: credentials,
    });
    assert.equal(registered.status, 201);
    assert.match(registered.cookie, /HttpOnly/);
    assert.match(registered.cookie, /SameSite=Lax/);
    const cookie = registered.cookie.split(";")[0];
    assert.equal(
      (await request("/auth/me", { cookie })).body.user.name,
      "Camille",
    );
    const hash = (await db.query("SELECT password_hash FROM users")).rows[0]
      .password_hash;
    assert.ok(!hash.includes(credentials.password));
    assert.match(hash, /^[a-f0-9]+:[a-f0-9]+$/);
    assert.equal(
      (await request("/auth/register", { method: "POST", body: credentials }))
        .status,
      409,
    );
    assert.equal(
      (
        await request("/auth/login", {
          method: "POST",
          body: { ...credentials, password: "mauvais-mot-de-passe" },
        })
      ).status,
      401,
    );
    const other = await request("/auth/register", {
      method: "POST",
      body: { ...credentials, email: "autre@example.test" },
    });
    const otherCookie = other.cookie.split(";")[0];
    const data = await sticker();
    const saved = await request("/stickers", {
      method: "POST",
      body: { data },
      cookie,
    });
    assert.equal(saved.status, 201);
    const id = saved.body.sticker.id;
    assert.equal(
      (await request("/library", { cookie: otherCookie })).body.stickers.length,
      0,
    );
    assert.equal(
      (
        await request(`/stickers/${id}`, {
          method: "DELETE",
          cookie: otherCookie,
        })
      ).status,
      404,
    );
    assert.equal(
      (
        await request("/stickers", {
          method: "POST",
          body: { data: "data:image/webp;base64,ZmFrZQ==" },
          cookie,
        })
      ).status,
      400,
    );
    const tiny = await sharp({
      create: { width: 12, height: 12, channels: 4, background: "red" },
    })
      .webp()
      .toBuffer();
    assert.equal(
      (
        await request("/stickers", {
          method: "POST",
          body: { data: `data:image/webp;base64,${tiny.toString("base64")}` },
          cookie,
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await request("/stickers/import", {
          method: "POST",
          body: { stickers: [{ data: await sticker("red") }, { data: "bad" }] },
          cookie,
        })
      ).status,
      400,
    );
    assert.equal(
      (await request("/library", { cookie })).body.stickers.length,
      1,
    );
    await request("/stickers/import", {
      method: "POST",
      body: { stickers: [{ data }, { data }] },
      cookie,
    });
    assert.equal(
      (await request("/library", { cookie })).body.stickers.length,
      1,
    );
    assert.equal(
      (
        await request("/library", {
          method: "PATCH",
          body: { name: "Mes réactions" },
          cookie,
        })
      ).status,
      200,
    );
    await server.close();
    await db.end();
    db = await openDatabase(config);
    server = await fixture(db);
    const restored = await server.request("/library", { cookie });
    assert.equal(restored.body.name, "Mes réactions");
    assert.equal(restored.body.stickers[0].data, data);
    const login = await server.request("/auth/login", {
      method: "POST",
      body: { ...credentials, email: " CAMILLE@example.test " },
    });
    assert.equal(login.status, 200);
    const newCookie = login.cookie.split(";")[0];
    assert.equal(
      (await server.request("/library", { cookie: newCookie })).body.stickers
        .length,
      1,
    );
    await server.request("/auth/logout", { method: "POST", cookie: newCookie });
    assert.equal(
      (await server.request("/library", { cookie: newCookie })).status,
      401,
    );
    assert.equal(
      (await server.request(`/stickers/${id}`, { method: "DELETE", cookie }))
        .status,
      204,
    );
  } finally {
    await server.close();
    await cleanDatabase(db, config.schema);
  }
});

test("limite du pack et import atomique", async () => {
  const config = testConfig();
  const db = await openDatabase(config);
  const server = await fixture(db);
  try {
    const account = await server.request("/auth/register", {
      method: "POST",
      body: credentials,
    });
    const cookie = account.cookie.split(";")[0];
    const items = [];
    for (let i = 0; i < 5; i++)
      items.push({
        data: await sticker({ r: i * 8, g: 80, b: 150, alpha: 1 }),
      });
    assert.equal(
      (
        await server.request("/stickers/import", {
          method: "POST",
          body: { stickers: items },
          cookie,
        })
      ).status,
      201,
    );
    const extra = [
      { data: await sticker("yellow") },
      { data: await sticker("green") },
    ];
    assert.equal(
      (
        await server.request("/stickers/import", {
          method: "POST",
          body: { stickers: extra },
          cookie,
        })
      ).status,
      409,
    );
    assert.equal(
      (await server.request("/library", { cookie })).body.stickers.length,
      5,
    );
    const simultaneous = await Promise.all(
      extra.map((body) =>
        server.request("/stickers", { method: "POST", body, cookie }),
      ),
    );
    assert.deepEqual(
      simultaneous.map((result) => result.status).sort(),
      [201, 409],
    );
    assert.equal(
      (await server.request("/library", { cookie })).body.stickers.length,
      6,
    );
  } finally {
    await server.close();
    await cleanDatabase(db, config.schema);
  }
});

test("limitation des tentatives et cookie sécurisé en production", async () => {
  const config = testConfig();
  const db = await openDatabase(config);
  const server = await fixture(db, { authLimit: 2, secure: true });
  try {
    const first = await server.request("/auth/register", {
      method: "POST",
      body: credentials,
    });
    assert.match(first.cookie, /Secure/);
    await server.request("/auth/login", { method: "POST", body: credentials });
    assert.equal(
      (
        await server.request("/auth/login", {
          method: "POST",
          body: credentials,
        })
      ).status,
      429,
    );
  } finally {
    await server.close();
    await cleanDatabase(db, config.schema);
  }
});
