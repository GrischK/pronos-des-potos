import "server-only";

import { computeBonusPoints, type BonusPodiumPick } from "@/src/domain/bonus-scoring";

export type BonusPredictionRow = {
  userId: string;
  winnerTeamId: string;
  secondTeamId: string;
  thirdTeamId: string;
};

export function buildBonusPointsByUser(
  predictions: BonusPredictionRow[],
  result: BonusPodiumPick | null,
  enabled: boolean,
) {
  const pointsByUser = new Map<string, number>();

  if (!enabled || !result) {
    return pointsByUser;
  }

  for (const prediction of predictions) {
    pointsByUser.set(
      prediction.userId,
      computeBonusPoints(
        {
          winnerTeamId: prediction.winnerTeamId,
          secondTeamId: prediction.secondTeamId,
          thirdTeamId: prediction.thirdTeamId,
        },
        result,
      ),
    );
  }

  return pointsByUser;
}
