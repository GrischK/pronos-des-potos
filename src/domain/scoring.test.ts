import assert from "node:assert/strict";
import test from "node:test";

import { computePredictionPoints } from "./scoring";

test("returns 0 when the result outcome is wrong", () => {
  assert.equal(
    computePredictionPoints({
      prediction: { homeScore: 2, awayScore: 1 },
      result: { homeScore: 0, awayScore: 1 },
      exactScorePredictionCount: 0,
    }),
    0,
  );
});

test("returns 1 when the outcome is right but the exact score is wrong", () => {
  assert.equal(
    computePredictionPoints({
      prediction: { homeScore: 2, awayScore: 1 },
      result: { homeScore: 3, awayScore: 1 },
      exactScorePredictionCount: 0,
    }),
    1,
  );
});

test("returns 3 when the exact score is shared", () => {
  assert.equal(
    computePredictionPoints({
      prediction: { homeScore: 2, awayScore: 1 },
      result: { homeScore: 2, awayScore: 1 },
      exactScorePredictionCount: 2,
    }),
    3,
  );
});

test("returns 4 when the exact score is unique", () => {
  assert.equal(
    computePredictionPoints({
      prediction: { homeScore: 2, awayScore: 1 },
      result: { homeScore: 2, awayScore: 1 },
      exactScorePredictionCount: 1,
    }),
    4,
  );
});
