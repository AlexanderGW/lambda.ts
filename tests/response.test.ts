import { describe, it, expect } from "vitest";
import { simulator } from "./simulator";

import { handler } from "./lambda/response";

describe("Response", () => {
  it("returns basic response", async () => {
    const result = await simulator(handler, {
      method: "GET",
      path: "/basic"
    });

    expect(result.statusCode).toBe(200);
    expect(result.headers).toBeUndefined();
    expect(result.body).toBe('foo');
  });

  it("returns string", async () => {
    const result = await simulator(handler, {
      method: "GET",
      path: "/string"
    });

    expect(result.statusCode).toBe(200);
    expect(result.headers!['content-type']).toBe('text/plain');
    expect(result.body).toBe('foo');
  });

  it("returns JSON object", async () => {
    const result = await simulator(handler, {
      method: "GET",
      path: "/json"
    });

    expect(result.statusCode).toBe(200);
    expect(result.headers!['content-type']).toBe('application/json');
    expect(JSON.parse(result.body!)).toStrictEqual({
      foo: 'bar',
    });
  });

  it("returns HTML string", async () => {
    const result = await simulator(handler, {
      method: "GET",
      path: "/html"
    });

    expect(result.statusCode).toBe(200);
    expect(result.headers!['content-type']).toBe('text/html');
    expect(result.body!).toBe('<html></html>');
    console.log(result.headers);
  });

  it("returns Base64 string", async () => {
    const result = await simulator(handler, {
      method: "GET",
      path: "/base64"
    });

    expect(result.statusCode).toBe(200);
    expect(result.headers!['content-type']).toBe('text/plain');
    expect(result.body!).toBe(atob('foo'));
  });
});