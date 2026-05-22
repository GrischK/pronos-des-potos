export type BonusPodiumPick = {
  winnerTeamId: string | null;
  secondTeamId: string | null;
  thirdTeamId: string | null;
};

export function computeBonusPoints(
  prediction: BonusPodiumPick,
  result: BonusPodiumPick | null,
) {
  if (!result) {
    return 0;
  }

  const slots = [
    [prediction.winnerTeamId, result.winnerTeamId],
    [prediction.secondTeamId, result.secondTeamId],
    [prediction.thirdTeamId, result.thirdTeamId],
  ] as const;
  const hits = [
    ...slots.map(([predicted, actual]) => actual !== null && predicted === actual),
  ].filter(Boolean).length;

  if (hits === 3 && slots.every(([, actual]) => actual !== null)) {
    return 20;
  }

  return hits * 5;
}
