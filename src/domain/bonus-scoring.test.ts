import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { computeBonusPoints } from "./bonus-scoring";

const result = {
  winnerTeamId: "france",
  secondTeamId: "spain",
  thirdTeamId: "brazil",
};

const championsLeagueResult = {
  winnerTeamId: "real",
  secondTeamId: "inter",
  thirdTeamId: null,
};

describe("computeBonusPoints", () => {
  it("awards 5 points per exact podium position", () => {
    assert.equal(
      computeBonusPoints(
        {
          winnerTeamId: "france",
          secondTeamId: "argentina",
          thirdTeamId: "brazil",
        },
        result,
      ),
      10,
    );
  });

  it("awards 20 points for the full podium", () => {
    assert.equal(computeBonusPoints(result, result), 20);
  });

  it("awards points for partial podiums without requiring a third place", () => {
    assert.equal(
      computeBonusPoints(
        {
          winnerTeamId: "real",
          secondTeamId: null,
          thirdTeamId: null,
        },
        championsLeagueResult,
      ),
      5,
    );
  });
});
