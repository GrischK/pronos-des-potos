export type BonusPodiumPick = {
  winnerTeamId: string;
  secondTeamId: string;
  thirdTeamId: string;
};

export function computeBonusPoints(
  prediction: BonusPodiumPick,
  result: BonusPodiumPick | null,
) {
  if (!result) {
    return 0;
  }

  const hits = [
    prediction.winnerTeamId === result.winnerTeamId,
    prediction.secondTeamId === result.secondTeamId,
    prediction.thirdTeamId === result.thirdTeamId,
  ].filter(Boolean).length;

  if (hits === 3) {
    return 20;
  }

  return hits * 5;
}
