import { test } from "node:test";
import assert from "node:assert/strict";
import { emailDomain, normalizeEmail } from "../../lib/email.ts";

test("normalizes case and whitespace", () => {
  assert.equal(normalizeEmail("  JDoe@Crimson.UA.edu "), "jdoe@crimson.ua.edu");
});

test("keeps the exact domain, including look-alikes, so the allowlist can reject them", () => {
  assert.equal(emailDomain(normalizeEmail("a@crimson.ua.edu.evil.com")), "crimson.ua.edu.evil.com");
  assert.equal(emailDomain(normalizeEmail("a@x.crimson.ua.edu")), "x.crimson.ua.edu");
});

test("rejects malformed and tricky addresses", () => {
  for (const bad of [
    "",
    "no-at-sign",
    "a@b@crimson.ua.edu",
    "a@crimson",
    ".a@crimson.ua.edu",
    "a..b@crimson.ua.edu",
    "a@-crimson.ua.edu",
    "a@crimson.ua.edu.",
    "jdoe@crimsоn.ua.edu", // Cyrillic "о"
    "j doe@crimson.ua.edu",
    `${"a".repeat(65)}@crimson.ua.edu`,
  ]) {
    assert.equal(normalizeEmail(bad), null, bad);
  }
});

test("accepts ordinary school addresses", () => {
  for (const good of ["jdoe@crimson.ua.edu", "j.doe+rush@ua.edu", "abc123@go.olemiss.edu"]) {
    assert.equal(normalizeEmail(good), good);
  }
});
