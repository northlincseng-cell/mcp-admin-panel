import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";

const BASE = process.env.TEST_BASE_URL || "http://localhost:5000";

let cookie = "";

async function api(method: string, path: string, body?: any) {
  const opts: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
    },
    redirect: "manual",
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(`${BASE}${path}`, opts);
  const setCookie = res.headers.get("set-cookie");
  if (setCookie) cookie = setCookie.split(";")[0];
  const text = await res.text();
  let json: any;
  try { json = JSON.parse(text); } catch { json = text; }
  return { status: res.status, json };
}

// ─── unauthenticated access ────────────────────────

describe("unauthenticated", () => {
  it("rejects unauthenticated requests", async () => {
    cookie = "";
    const { status, json } = await api("GET", "/api/dashboard");
    assert.equal(status, 401);
    assert.equal(json.error, "authentication required");
  });
});

// ─── authentication ────────────────────────────────

describe("auth", () => {
  it("rejects invalid login", async () => {
    cookie = "";
    const { status, json } = await api("POST", "/api/auth/login", {
      username: "nonexistent",
      password: "wrongpassword",
    });
    assert.equal(status, 401);
    assert.ok(json.error);
  });

  it("logs in with valid credentials", async () => {
    cookie = "";
    const { status, json } = await api("POST", "/api/auth/login", {
      username: "admin",
      password: "M4r1shk465!",
    });
    assert.equal(status, 200);
    assert.ok(json.user);
    assert.equal(json.user.username, "admin");
  });
});

// ─── authenticated api routes ──────────────────────

describe("dashboard", () => {
  it("returns dashboard stats", async () => {
    const { status, json } = await api("GET", "/api/dashboard");
    assert.equal(status, 200);
    assert.ok(typeof json === "object");
  });
});

describe("retailers", () => {
  let retailerId: number;

  it("lists retailers", async () => {
    const { status, json } = await api("GET", "/api/retailers");
    assert.equal(status, 200);
    assert.ok(Array.isArray(json));
  });

  it("creates a retailer", async () => {
    const { status, json } = await api("POST", "/api/retailers", {
      name: "test retailer",
      code: "TEST01",
      country: "UK",
      status: "prospect",
    });
    assert.equal(status, 201);
    assert.ok(json.id);
    retailerId = json.id;
  });

  it("updates a retailer", async () => {
    const { status, json } = await api("PUT", `/api/retailers/${retailerId}`, {
      name: "test retailer updated",
    });
    assert.equal(status, 200);
    assert.equal(json.name, "test retailer updated");
  });

  it("deletes a retailer", async () => {
    const { status, json } = await api("DELETE", `/api/retailers/${retailerId}`);
    assert.equal(status, 200);
    assert.ok(json.success);
  });
});

describe("products", () => {
  it("lists products", async () => {
    const { status, json } = await api("GET", "/api/products");
    assert.equal(status, 200);
    assert.ok(Array.isArray(json));
  });
});

describe("deals", () => {
  it("lists deals", async () => {
    const { status, json } = await api("GET", "/api/deals");
    assert.equal(status, 200);
    assert.ok(Array.isArray(json));
  });
});

describe("pricing", () => {
  it("lists gs pricing", async () => {
    const { status, json } = await api("GET", "/api/pricing");
    assert.equal(status, 200);
    assert.ok(Array.isArray(json));
  });

  it("gets base price", async () => {
    const { status, json } = await api("GET", "/api/pricing/base");
    assert.equal(status, 200);
    assert.ok(typeof json === "object");
  });
});

describe("users", () => {
  it("lists users", async () => {
    const { status, json } = await api("GET", "/api/users");
    assert.equal(status, 200);
    assert.ok(Array.isArray(json));
  });
});

describe("offers", () => {
  it("lists offers", async () => {
    const { status, json } = await api("GET", "/api/offers");
    assert.equal(status, 200);
    assert.ok(Array.isArray(json));
  });
});

describe("changelog", () => {
  it("lists changelog", async () => {
    const { status, json } = await api("GET", "/api/changelog");
    assert.equal(status, 200);
    assert.ok(Array.isArray(json));
  });
});

// ─── logout ────────────────────────────────────────

describe("logout", () => {
  it("logs out successfully", async () => {
    const { status, json } = await api("POST", "/api/auth/logout");
    assert.equal(status, 200);
    assert.ok(json.success);
  });

  it("rejects requests after logout", async () => {
    cookie = "";
    const { status } = await api("GET", "/api/dashboard");
    assert.equal(status, 401);
  });
});
