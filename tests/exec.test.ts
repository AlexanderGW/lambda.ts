import { describe, it, expect } from "vitest";
import { simulator } from "./simulator";

import { create } from "../src/lambda";

describe("Executor", () => {
  it("returns default content, when no routes or exec defined", async () => {
    const λ = create();
    const result = await simulator(λ.handler);

    expect(result.statusCode).toBe(404);
    expect(result.body).toBeUndefined();
  });

  it("returns defined content, when no routes defined", async () => {
    const λ = create();
    λ.exec(async () => λ.response('foo').basic());
    const result = await simulator(λ.handler);

    expect(result.statusCode).toBe(200);
    expect(result.body).toBe('foo');
  });
});