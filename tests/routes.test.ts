import { describe, it, expect } from "vitest";
import { simulator } from "./simulator";

import { handler } from "./lambda/routes";

describe("Routing", () => {
  it("returns 404 when no match found", async () => {
    const result = await simulator(handler, {
      method: "GET",
      path: "/bar"
    });

    expect(result.statusCode).toBe(404);
    expect(result.body).toBeUndefined();
  });

  it("returns empty 204 on basic OPTIONS request", async () => {
    const result = await simulator(handler, {
      method: "OPTIONS",
      path: "/foo"
    });

    expect(result.statusCode).toBe(204);
    expect(result.body).toBeUndefined();
  });

  it("matches with root path", async () => {
    const result = await simulator(handler, {
      method: "GET",
      path: "/"
    });
    // console.log(`result`, result.body);

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body!)).toStrictEqual({});
  });

  it("matches with literal path", async () => {
    const result = await simulator(handler, {
      method: "GET",
      path: "/foo"
    });
    // console.log(`result`, result.body);

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body!)).toStrictEqual({});
  });

  it("matches passes query string parmeters", async () => {
    const result = await simulator(handler, {
      method: "GET",
      path: "/foo"
    });
    // console.log(`result`, result.body);

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body!)).toStrictEqual({});
  });

  // it("matches with numeric path parameter", async () => {
  //   const result = await simulator(handler, {
  //     method: "GET",
  //     path: "/foo/42"
  //   });
  //   console.log(`result`, result.body);

  //   expect(result.statusCode).toBe(200);
  //   expect(JSON.parse(result.body)).toStrictEqual({
  //     d: '42'
  //   });
  // });

  it("matches with string path parameter", async () => {
    const result = await simulator(handler, {
      method: "GET",
      path: "/foo/bar"
    });
    // console.log(`result`, result.body);

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body!)).toStrictEqual({
      s: 'bar'
    });
  });

  it("matches with multiple path parameters", async () => {
    const result = await simulator(handler, {
      method: "GET",
      path: "/foo/42/bar"
    });
    // console.log(`result`, result.body);

    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body!)).toStrictEqual({
      s1: '42',
      s2: 'bar'
    });
  });

  // it("matches with string query parameter", async () => {
  //   const result = await simulator(handler, {
  //     method: "GET",
  //     path: "/foo?s=bar"
  //   });
  //   console.log(`result`, result.body);

  //   expect(result.statusCode).toBe(200);
  //   expect(JSON.parse(result.body!)).toStrictEqual({
  //     s: 'bar'
  //   });
  // });

  // it("matches with multiple query parameter", async () => {
  //   const result = await simulator(handler, {
  //     method: "GET",
  //     path: "/foo?s1=bar&s2=qux"
  //   });
  //   console.log(`result`, result.body);

  //   expect(result.statusCode).toBe(200);
  //   expect(JSON.parse(result.body!)).toStrictEqual({
  //     s1: 'bar',
  //     s2: 'qux'
  //   });
  // });
});