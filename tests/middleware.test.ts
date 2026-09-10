import { describe, it, expect } from "vitest";
import { simulator } from "./simulator";

import { create } from "../src/lambda";

describe("Middleware", () => {
  it("runs before and after the handler in registration order", async () => {
    const order: string[] = [];
    const λ = create();

    λ.use(async (_ctx, next) => {
      order.push("mw1-in");
      const result = await next();
      order.push("mw1-out");
      return result;
    });

    λ.use(async (_ctx, next) => {
      order.push("mw2-in");
      const result = await next();
      order.push("mw2-out");
      return result;
    });

    λ.route("/").get(() => {
      order.push("handler");
      return λ.response("ok").basic();
    });

    const result = await simulator(λ.handler, {
      method: "GET",
      path: "/",
    });

    expect(result.statusCode).toBe(200);
    expect(result.body).toBe("ok");
    expect(order).toEqual(["mw1-in", "mw2-in", "handler", "mw2-out", "mw1-out"]);
  });

  it("can short-circuit without calling next", async () => {
    const λ = create();
    let handlerCalled = false;

    λ.use(async () => λ.response("blocked").code(401).text());
    λ.route("/").get(() => {
      handlerCalled = true;
      return λ.response("ok").basic();
    });

    const result = await simulator(λ.handler, {
      method: "GET",
      path: "/",
    });

    expect(handlerCalled).toBe(false);
    expect(result.statusCode).toBe(401);
    expect(result.body).toBe("blocked");
  });

  it("still runs through the stack on 404", async () => {
    const λ = create();

    λ.use(async (_ctx, next) => {
      const result = await next();
      return {
        ...result,
        headers: {
          ...result.headers,
          "x-mw": "1",
        },
      };
    });

    λ.route("/foo").get(() => λ.response("ok").basic());

    const result = await simulator(λ.handler, {
      method: "GET",
      path: "/bar",
    });

    expect(result.statusCode).toBe(404);
    expect(result.headers!["x-mw"]).toBe("1");
  });

  it("exposes matched path data after next()", async () => {
    const λ = create();
    let seen: string | undefined;

    λ.use(async (ctx, next) => {
      const result = await next();
      seen = ctx.pathData.s;
      return result;
    });

    λ.route("/foo/[s:%s]").get((Δ) => λ.response(Δ.pathData).json());

    const result = await simulator(λ.handler, {
      method: "GET",
      path: "/foo/bar",
    });

    expect(result.statusCode).toBe(200);
    expect(seen).toBe("bar");
  });
});
