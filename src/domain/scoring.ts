export type MatchResult = {
  homeScore: number;
  awayScore: number;
};

export type PredictionScoreInput = {
  prediction: MatchResult;
  result: MatchResult;
  exactScorePredictionCount: number;
};

type Outcome = "HOME_WIN" | "DRAW" | "AWAY_WIN";

export function getOutcome(score: MatchResult): Outcome {
  if (score.homeScore > score.awayScore) {
    return "HOME_WIN";
  }

  if (score.homeScore < score.awayScore) {
    return "AWAY_WIN";
  }

  return "DRAW";
}

export function isExactScore(
  prediction: MatchResult,
  result: MatchResult,
): boolean {
  return (
    prediction.homeScore === result.homeScore &&
    prediction.awayScore === result.awayScore
  );
}

export function computePredictionPoints({
  prediction,
  result,
  exactScorePredictionCount,
}: PredictionScoreInput): number {
  if (!isExactScore(prediction, result)) {
    return getOutcome(prediction) === getOutcome(result) ? 1 : 0;
  }

  return exactScorePredictionCount === 1 ? 4 : 3;
}
