import { describe, it, expect } from "vitest";
import { simulator } from "./simulator";

import { create } from "../src/lambda";

describe("Objects", () => {
  it("returns object contents", async () => {
    const λ = create();
    λ.route('/foo').get(async (Δ) => {
      const fooObj = await λ.object('/foo');
      const setObj = fooObj?.value(JSON.stringify({
        foo: 'bar',
      }));
      const getObj = fooObj?.value();

      return λ.response(getObj).json();
    });

    const result = await simulator(λ.handler, {
      method: "GET",
      path: "/foo"
    });

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body!)).toBe(true);
  });
});