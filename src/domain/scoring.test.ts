import assert from "node:assert/strict";
import test from "node:test";

import {
  computePredictionPoints,
  formatMatchScoreText,
  getMatchResultForPoints,
} from "./scoring";

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

test("prefers regular time over full time when both are available", () => {
  assert.deepEqual(
    getMatchResultForPoints({
      homeScore: 2,
      awayScore: 1,
      regularHomeScore: 1,
      regularAwayScore: 1,
    }),
    { homeScore: 1, awayScore: 1 },
  );
});

test("formats score details for extra time and penalties", () => {
  assert.equal(
    formatMatchScoreText({
      homeScore: 5,
      awayScore: 4,
      regularHomeScore: 1,
      regularAwayScore: 1,
      extraTimeHomeScore: 0,
      extraTimeAwayScore: 0,
      penaltyHomeScore: 4,
      penaltyAwayScore: 3,
    }),
    "90' : 1 · 1\nProlongs : 1 · 1\nTAB : 4 · 3",
  );
});
