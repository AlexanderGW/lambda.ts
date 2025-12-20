import { describe, it, expect } from "vitest";
import { simulator } from "./simulator";

import { handler } from "./lambda/objects";

describe("Objects", () => {
  it("returns object contents", async () => {
    const result = await simulator(handler, {
      method: "GET",
      path: "/foo"
    });

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body!)).toBe(true);
  });
});