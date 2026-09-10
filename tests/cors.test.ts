import { describe, it, expect } from "vitest";
import { simulator } from "./simulator";

import { create, cors } from "../src/lambda";

describe("CORS", () => {
  it("does not set CORS headers when disabled", async () => {
    const λ = create();
    λ.route("/").get(() => λ.response("ok").basic());

    const result = await simulator(λ.handler, {
      method: "GET",
      path: "/",
      headers: { origin: "https://example.com" },
    });

    expect(result.statusCode).toBe(200);
    expect(result.headers).toBeUndefined();
  });

  it("handles OPTIONS preflight without a route", async () => {
    const λ = create({ cors: true });
    λ.route("/foo").get(() => λ.response("ok").basic());

    const result = await simulator(λ.handler, {
      method: "OPTIONS",
      path: "/foo",
      headers: {
        origin: "https://example.com",
        "access-control-request-method": "GET",
        "access-control-request-headers": "content-type",
      },
    });

    expect(result.statusCode).toBe(204);
    expect(result.headers!["access-control-allow-origin"]).toBe("*");
    expect(result.headers!["access-control-allow-methods"]).toContain("GET");
    expect(result.headers!["access-control-allow-headers"]).toBe("content-type");
  });

  it("merges CORS headers onto a successful GET", async () => {
    const λ = create({ cors: true });
    λ.route("/json").get(() => λ.response({ ok: true }).json());

    const result = await simulator(λ.handler, {
      method: "GET",
      path: "/json",
      headers: { origin: "https://example.com" },
    });

    expect(result.statusCode).toBe(200);
    expect(result.headers!["content-type"]).toBe("application/json");
    expect(result.headers!["access-control-allow-origin"]).toBe("*");
  });

  it("merges CORS headers onto 404 responses", async () => {
    const λ = create({ cors: true });
    λ.route("/foo").get(() => λ.response("ok").basic());

    const result = await simulator(λ.handler, {
      method: "GET",
      path: "/missing",
      headers: { origin: "https://example.com" },
    });

    expect(result.statusCode).toBe(404);
    expect(result.headers!["access-control-allow-origin"]).toBe("*");
  });

  it("merges CORS headers onto 500 responses", async () => {
    const λ = create({ cors: true });
    λ.route("/").get(() => {
      throw new Error("boom");
    });

    const result = await simulator(λ.handler, {
      method: "GET",
      path: "/",
      headers: { origin: "https://example.com" },
    });

    expect(result.statusCode).toBe(500);
    expect(result.headers!["access-control-allow-origin"]).toBe("*");
    expect(result.headers!["content-type"]).toBe("application/json");
  });

  it("reflects Origin when credentials are enabled", async () => {
    const λ = create({
      cors: {
        origin: "*",
        credentials: true,
      },
    });
    λ.route("/").get(() => λ.response("ok").basic());

    const result = await simulator(λ.handler, {
      method: "GET",
      path: "/",
      headers: { origin: "https://example.com" },
    });

    expect(result.statusCode).toBe(200);
    expect(result.headers!["access-control-allow-origin"]).toBe("https://example.com");
    expect(result.headers!["access-control-allow-credentials"]).toBe("true");
    expect(result.headers!["vary"]).toBe("Origin");
  });

  it("can be registered with λ.use(cors())", async () => {
    const λ = create();
    λ.use(cors({ origin: "https://app.example.com" }));
    λ.route("/").get(() => λ.response("ok").basic());

    const result = await simulator(λ.handler, {
      method: "GET",
      path: "/",
      headers: { origin: "https://app.example.com" },
    });

    expect(result.statusCode).toBe(200);
    expect(result.headers!["access-control-allow-origin"]).toBe("https://app.example.com");
  });

  it("preserves handler headers set via response.headers()", async () => {
    const λ = create({ cors: true });
    λ.route("/").get(() =>
      λ.response("ok").headers({ "x-custom": "1" }).text()
    );

    const result = await simulator(λ.handler, {
      method: "GET",
      path: "/",
    });

    expect(result.statusCode).toBe(200);
    expect(result.headers!["content-type"]).toBe("text/plain");
    expect(result.headers!["x-custom"]).toBe("1");
    expect(result.headers!["access-control-allow-origin"]).toBe("*");
  });
});
