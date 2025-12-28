import { describe, it, expect } from "vitest";
import { simulator } from "./simulator";

import { create, type LambdaState } from "../src/lambda";

describe("Key/value state", () => {
  it("returns value 'bar' on key 'foo'", async () => {
    const λ = create();
    λ.exec(async () => {
      const kvFoo = λ.key('foo');
      const setKv = kvFoo.value('bar');
      // expect(setKv).toBeInstanceOf(LambdaState);

      const getKv = kvFoo.value();
      expect(getKv).toBe('bar');

      return λ.response().basic();
    });
    
    await simulator(λ.handler);
  });
});