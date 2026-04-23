import type { CompetitionKind } from "@prisma/client";

export const competitionStageLabels: Record<string, string> = {
  GROUP_STAGE: "Phase de groupes",
  LEAGUE_STAGE: "Phase de ligue",
  PLAYOFFS: "Barrages",
  LAST_32: "16es de finale",
  LAST_16: "8es de finale",
  QUARTER_FINALS: "Quarts de finale",
  SEMI_FINALS: "Demi-finales",
  THIRD_PLACE: "Match pour la 3e place",
  FINAL: "Finale",
};

export const competitionStageOrder = [
  "GROUP_STAGE",
  "LEAGUE_STAGE",
  "PLAYOFFS",
  "LAST_32",
  "LAST_16",
  "QUARTER_FINALS",
  "SEMI_FINALS",
  "THIRD_PLACE",
  "FINAL",
];

export const twoLeggedCompetitionStages = new Set([
  "PLAYOFFS",
  "LAST_32",
  "LAST_16",
  "QUARTER_FINALS",
  "SEMI_FINALS",
]);

export function isTwoLeggedCompetitionStage(
  kind: CompetitionKind | string,
  stage: string,
) {
  if (!twoLeggedCompetitionStages.has(stage)) {
    return false;
  }

  return kind === "CHAMPIONS_LEAGUE" || kind === "OTHER";
}

export function getCompetitionStageLabel(stage: string) {
  const label = competitionStageLabels[stage];

  if (label) {
    return label;
  }

  if (!stage.includes("_")) {
    return stage;
  }

  const words = stage.replace(/_/g, " ").toLowerCase();

  return words.charAt(0).toUpperCase() + words.slice(1);
}
