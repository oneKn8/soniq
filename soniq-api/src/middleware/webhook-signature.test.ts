import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { Hono } from "hono";
import twilio from "twilio";
import { verifyTelephonyWebhook } from "./webhook-signature.js";

const SIGNING_KEY = "test-signing-key-1234567890";
const BACKEND_URL = "https://api.example.com";
const PATH = "/voice/incoming";

// Build a Hono app that runs the middleware then a trivial handler.
function makeApp() {
  const app = new Hono();
  app.post(PATH, verifyTelephonyWebhook(), (c) => c.json({ ok: true }));
  return app;
}

// Craft a request with a form body and (optionally) a valid Twilio signature.
function signedRequest(
  params: Record<string, string>,
  opts: { header?: string; signParams?: Record<string, string> } = {},
) {
  const url = BACKEND_URL + PATH;
  const signature =
    opts.header !== undefined
      ? opts.header
      : twilio.getExpectedTwilioSignature(
          SIGNING_KEY,
          url,
          opts.signParams ?? params,
        );

  const body = new URLSearchParams(params).toString();
  const headers: Record<string, string> = {
    "content-type": "application/x-www-form-urlencoded",
  };
  if (signature !== null) headers["X-Twilio-Signature"] = signature;

  return new Request("http://localhost" + PATH, {
    method: "POST",
    headers,
    body,
  });
}

const params = {
  From: "+14155552671",
  To: "+14155559999",
  CallSid: "CA1234567890",
};

let saved: Record<string, string | undefined>;

beforeEach(() => {
  saved = {
    SIGNALWIRE_SIGNING_KEY: process.env.SIGNALWIRE_SIGNING_KEY,
    SIGNALWIRE_WEBHOOK_SECRET: process.env.SIGNALWIRE_WEBHOOK_SECRET,
    BACKEND_URL: process.env.BACKEND_URL,
    NODE_ENV: process.env.NODE_ENV,
  };
  process.env.SIGNALWIRE_SIGNING_KEY = SIGNING_KEY;
  delete process.env.SIGNALWIRE_WEBHOOK_SECRET;
  process.env.BACKEND_URL = BACKEND_URL;
  process.env.NODE_ENV = "test";
  vi.spyOn(console, "warn").mockImplementation(() => {});
});

afterEach(() => {
  for (const [k, v] of Object.entries(saved)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
  vi.restoreAllMocks();
});

describe("verifyTelephonyWebhook", () => {
  it("calls next (200) for a request with a valid Twilio-compatible signature", async () => {
    const res = await makeApp().fetch(signedRequest(params));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it("accepts the SignalWire header name as well", async () => {
    const app = makeApp();
    const url = BACKEND_URL + PATH;
    const sig = twilio.getExpectedTwilioSignature(SIGNING_KEY, url, params);
    const req = new Request("http://localhost" + PATH, {
      method: "POST",
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        "x-signalwire-signature": sig,
      },
      body: new URLSearchParams(params).toString(),
    });
    const res = await app.fetch(req);
    expect(res.status).toBe(200);
  });

  it("rejects (401) when the signature header is missing", async () => {
    const res = await makeApp().fetch(signedRequest(params, { header: "" }));
    expect(res.status).toBe(401);
  });

  it("rejects (401) when the signature is tampered", async () => {
    const res = await makeApp().fetch(
      signedRequest(params, { header: "totally-wrong-signature" }),
    );
    expect(res.status).toBe(401);
  });

  it("rejects (401) when the body params are tampered after signing", async () => {
    // Sign for the original params, but send a mutated body.
    const res = await makeApp().fetch(
      signedRequest(
        { ...params, From: "+19998887777" },
        { signParams: params },
      ),
    );
    expect(res.status).toBe(401);
  });

  it("rejects (401) in production when no signing key is configured (fail closed)", async () => {
    delete process.env.SIGNALWIRE_SIGNING_KEY;
    delete process.env.SIGNALWIRE_WEBHOOK_SECRET;
    process.env.NODE_ENV = "production";
    const res = await makeApp().fetch(signedRequest(params, { header: "x" }));
    expect(res.status).toBe(401);
  });

  it("bypasses verification (200) only in non-production when no key is set", async () => {
    delete process.env.SIGNALWIRE_SIGNING_KEY;
    delete process.env.SIGNALWIRE_WEBHOOK_SECRET;
    process.env.NODE_ENV = "development";
    const res = await makeApp().fetch(signedRequest(params, { header: "" }));
    expect(res.status).toBe(200);
  });
});
