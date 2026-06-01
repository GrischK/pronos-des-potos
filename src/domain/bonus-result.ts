import type { BonusPodiumPick } from "@/src/domain/bonus-scoring";

export type BonusResultMatch = {
  stage: string;
  status: string;
  homeTeamId: string | null;
  awayTeamId: string | null;
  homeScore: number | null;
  awayScore: number | null;
  penaltyHomeScore: number | null;
  penaltyAwayScore: number | null;
};

function getWinnerTeamId(match: BonusResultMatch) {
  if (
    match.homeTeamId === null ||
    match.awayTeamId === null ||
    match.homeScore === null ||
    match.awayScore === null
  ) {
    return null;
  }

  if (match.homeScore > match.awayScore) {
    return match.homeTeamId;
  }

  if (match.homeScore < match.awayScore) {
    return match.awayTeamId;
  }

  if (
    match.penaltyHomeScore !== null &&
    match.penaltyAwayScore !== null &&
    match.penaltyHomeScore !== match.penaltyAwayScore
  ) {
    return match.penaltyHomeScore > match.penaltyAwayScore
      ? match.homeTeamId
      : match.awayTeamId;
  }

  return null;
}

function getBonusResultFromMatches(matches: BonusResultMatch[]) {
  const finalMatch = matches.find(
    (match) =>
      match.stage === "FINAL" &&
      match.status === "FINISHED" &&
      match.homeTeamId !== null &&
      match.awayTeamId !== null,
  );

  if (!finalMatch) {
    return null;
  }

  const winnerTeamId = getWinnerTeamId(finalMatch);

  if (!winnerTeamId) {
    return null;
  }

  const secondTeamId =
    winnerTeamId === finalMatch.homeTeamId
      ? finalMatch.awayTeamId
      : finalMatch.homeTeamId;

  const thirdPlaceMatch = matches.find(
    (match) =>
      match.stage === "THIRD_PLACE" &&
      match.status === "FINISHED" &&
      match.homeTeamId !== null &&
      match.awayTeamId !== null,
  );
  const thirdTeamId = thirdPlaceMatch ? getWinnerTeamId(thirdPlaceMatch) : null;

  return {
    winnerTeamId,
    secondTeamId,
    thirdTeamId,
  } satisfies BonusPodiumPick;
}

export function resolveBonusResult(
  enabled: boolean,
  storedResult: BonusPodiumPick | null,
  matches: BonusResultMatch[],
) {
  if (!enabled) {
    return null;
  }

  const inferredResult = getBonusResultFromMatches(matches);

  if (!storedResult) {
    return inferredResult;
  }

  if (!inferredResult) {
    return storedResult;
  }

  return {
    winnerTeamId: storedResult.winnerTeamId ?? inferredResult.winnerTeamId,
    secondTeamId: storedResult.secondTeamId ?? inferredResult.secondTeamId,
    thirdTeamId: storedResult.thirdTeamId ?? inferredResult.thirdTeamId,
  };
}
