import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";
import { LIMEN_DATABASE_VERSION, LIMEN_REQUIRED_STORES } from "@/lib/storage/database";

test("the operational notice domain does not import or refer to OSDR research data", () => {
  const noticeEngine = readFileSync(path.resolve(process.cwd(), "src/lib/observations/notices.ts"), "utf8");
  const centre = readFileSync(path.resolve(process.cwd(), "src/components/observations/ObservationsCentre.tsx"), "utf8");
  assert.doesNotMatch(noticeEngine, /osdr|NASA/i);
  assert.doesNotMatch(centre, /OSDR_DATASETS|processed\/osdr/);
});

test("M2 does not add stores or change the existing participant database schema", () => {
  assert.equal(LIMEN_DATABASE_VERSION, 3);
  assert.deepEqual(LIMEN_REQUIRED_STORES, [
    "assessment-sessions",
    "sensorimotor-checkins",
    "mission-contexts",
    "mission-events",
    "follow-up-records",
    "mission-transitions",
  ]);
});
