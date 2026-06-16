import assert from "node:assert/strict";
import test from "node:test";

import { isLiveScoreCandidateMatch } from "@/src/server/live-score-sync-window";

test("keeps recently started scheduled matches in the live sync window", () => {
  const now = new Date("2026-06-16T03:30:00.000Z");

  assert.equal(
    isLiveScoreCandidateMatch(
      "SCHEDULED",
      new Date("2026-06-16T01:45:00.000Z"),
      now,
    ),
    true,
  );
});

test("ignores scheduled matches that have not started yet", () => {
  const now = new Date("2026-06-16T03:30:00.000Z");

  assert.equal(
    isLiveScoreCandidateMatch(
      "SCHEDULED",
      new Date("2026-06-16T04:00:00.000Z"),
      now,
    ),
    false,
  );
});

test("ignores matches that are older than the live tracking window", () => {
  const now = new Date("2026-06-16T05:00:00.000Z");

  assert.equal(
    isLiveScoreCandidateMatch(
      "SCHEDULED",
      new Date("2026-06-16T00:30:00.000Z"),
      now,
    ),
    false,
  );
});
