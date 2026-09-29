import assert from "node:assert/strict";
import test from "node:test";
import { Request } from "express";
import { hashSessionToken, readSessionToken } from "./auth.cookie";

test("reads the opaque session cookie without exposing unrelated cookies", () => {
  const request = {
    headers: { cookie: "theme=dark; delimuu_session=secret%20token; locale=es" },
  } as Request;

  assert.equal(readSessionToken(request), "secret token");
});

test("hashes session tokens deterministically without storing raw values", () => {
  const hash = hashSessionToken("secret-token");
  assert.equal(hash.length, 64);
  assert.equal(hash, hashSessionToken("secret-token"));
  assert.notEqual(hash, "secret-token");
});

