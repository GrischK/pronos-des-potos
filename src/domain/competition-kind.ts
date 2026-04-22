import type { CompetitionKind } from "@prisma/client";

export const competitionKindLabels = {
  WORLD_CUP: "COUPE DU MONDE",
  EURO: "EURO",
  CHAMPIONS_LEAGUE: "CL",
  OTHER: "AUTRE",
} satisfies Record<CompetitionKind, string>;

export function getCompetitionKindLabel(kind: string) {
  return competitionKindLabels[kind as CompetitionKind] ?? kind;
}
