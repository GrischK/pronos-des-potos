import assert from "node:assert/strict";
import { describe, it } from "node:test";

import { resolveBonusResult } from "@/src/domain/bonus-result";

describe("resolveBonusResult", () => {
  it("infers the podium from the final and third-place matches", () => {
    const result = resolveBonusResult(
      true,
      null,
      [
        {
          stage: "THIRD_PLACE",
          status: "FINISHED",
          homeTeamId: "croatia",
          awayTeamId: "morocco",
          homeScore: 2,
          awayScore: 1,
          penaltyHomeScore: null,
          penaltyAwayScore: null,
        },
        {
          stage: "FINAL",
          status: "FINISHED",
          homeTeamId: "france",
          awayTeamId: "argentina",
          homeScore: 3,
          awayScore: 3,
          penaltyHomeScore: 4,
          penaltyAwayScore: 2,
        },
      ],
    );

    assert.deepEqual(result, {
      winnerTeamId: "france",
      secondTeamId: "argentina",
      thirdTeamId: "croatia",
    });
  });

  it("keeps stored podium values and fills only the missing slots", () => {
    const result = resolveBonusResult(
      true,
      {
        winnerTeamId: "france",
        secondTeamId: null,
        thirdTeamId: null,
      },
      [
        {
          stage: "FINAL",
          status: "FINISHED",
          homeTeamId: "france",
          awayTeamId: "argentina",
          homeScore: 3,
          awayScore: 3,
          penaltyHomeScore: 4,
          penaltyAwayScore: 2,
        },
      ],
    );

    assert.deepEqual(result, {
      winnerTeamId: "france",
      secondTeamId: "argentina",
      thirdTeamId: null,
    });
  });
});
