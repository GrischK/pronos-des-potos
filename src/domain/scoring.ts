export type MatchResult = {
  homeScore: number;
  awayScore: number;
};

export type PredictionScoreInput = {
  prediction: MatchResult;
  result: MatchResult;
  exactScorePredictionCount: number;
};

export type MatchScoreInput = {
  homeScore: number | null;
  awayScore: number | null;
  regularHomeScore: number | null;
  regularAwayScore: number | null;
  extraTimeHomeScore?: number | null;
  extraTimeAwayScore?: number | null;
  penaltyHomeScore?: number | null;
  penaltyAwayScore?: number | null;
};

export type MatchScoreDisplayInput = MatchScoreInput;

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

export function getMatchResultForPoints(
  match: MatchScoreInput,
): MatchResult | null {
  if (match.homeScore == null || match.awayScore == null) {
    return null;
  }

  if (match.regularHomeScore != null && match.regularAwayScore != null) {
    return {
      homeScore: match.regularHomeScore,
      awayScore: match.regularAwayScore,
    };
  }

  return {
    homeScore: match.homeScore,
    awayScore: match.awayScore,
  };
}

function formatScorePair(homeScore: number, awayScore: number) {
  return `${homeScore} · ${awayScore}`;
}

export function formatMatchScoreText(match: MatchScoreDisplayInput) {
  if (match.homeScore == null || match.awayScore == null) {
    return "- · -";
  }

  const hasExtraDetail =
    match.extraTimeHomeScore != null ||
    match.extraTimeAwayScore != null ||
    match.penaltyHomeScore != null ||
    match.penaltyAwayScore != null;

  const lines: string[] = [];

  if (!hasExtraDetail) {
    lines.push(formatScorePair(match.homeScore, match.awayScore));
    return lines[0];
  }

  if (
    hasExtraDetail &&
    match.regularHomeScore != null &&
    match.regularAwayScore != null
  ) {
    lines.push(`90' : ${formatScorePair(match.regularHomeScore, match.regularAwayScore)}`);
  }

  if (
    match.extraTimeHomeScore != null &&
    match.extraTimeAwayScore != null &&
    match.regularHomeScore != null &&
    match.regularAwayScore != null
  ) {
    lines.push(
      `Prolongs : ${formatScorePair(
        match.regularHomeScore + match.extraTimeHomeScore,
        match.regularAwayScore + match.extraTimeAwayScore,
      )}`,
    );
  }

  if (match.penaltyHomeScore != null && match.penaltyAwayScore != null) {
    lines.push(`TAB : ${formatScorePair(match.penaltyHomeScore, match.penaltyAwayScore)}`);
  }

  return lines.join("\n");
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
