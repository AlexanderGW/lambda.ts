import { describe, expect, it, vi } from "vitest";
import { simulator } from "./simulator";

import { LambdaObject, create } from "../src/lambda";

const getMockLambdaObject = (value?: string | boolean | null) => {
  const mockObject: LambdaObject = {
    acl: vi.fn().mockReturnValue(true),
    meta: vi.fn().mockReturnValue(null),
    value: vi.fn().mockReturnValue(value),
    // value: vi.fn().mockImplementation(async () => {
    //   await new Promise((r) => {
    //     setTimeout(() => {
    //       r(value);
    //     }, 3000);
    //   });
    // }),
  };

  return mockObject;
};

describe("Objects", () => {
  it("returns object value", async () => {
    const λ = create();

    const value = {
      bar: 'baz'
    };

    vi.spyOn(λ, "object").mockResolvedValue(
      getMockLambdaObject(
        JSON.stringify(value)));

    λ.route('/foo').get(async (Δ) => {
      const fooObj = await λ.object('/foo');
      const setObj = fooObj?.value(JSON.stringify({
        foo: 'bar',
      }));
      const getObj = await fooObj?.value();

      return λ.response(JSON.parse(String(getObj))).json();
    });

    const result = await simulator(λ.handler, {
      method: "GET",
      path: "/foo"
    });

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body!)).toStrictEqual(value);
  });
});