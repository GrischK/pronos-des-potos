"use server";

import { updateTag } from "next/cache";
import { Prisma } from "@prisma/client";
import type { ExternalDataProvider } from "@prisma/client";
import { z } from "zod";

import { getCurrentAdmin } from "@/src/auth/current-user";
import { prisma } from "@/src/db/prisma";
import {
  importExternalCompetitionData,
  type ImportedMatch,
} from "@/src/server/football-data-providers";

export type AdminActionState = {
  error?: string;
  success?: string;
};

const competitionSchema = z.object({
  name: z.string().trim().min(3, "Nom de compétition trop court."),
  slug: z.string().trim().optional(),
  kind: z.enum(["WORLD_CUP", "EURO", "CHAMPIONS_LEAGUE", "OTHER"]),
  externalProvider: z.literal("FOOTBALL_DATA"),
  externalCompetitionId: z.string().trim().min(1, "ID de compétition externe requis."),
  externalSeason: z.string().trim().min(4, "Saison externe requise."),
  importNow: z.enum(["on"]).optional(),
});

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function upsertImportedTeam(
  competitionId: string,
  team: NonNullable<ImportedMatch["homeTeam"]>,
) {
  return prisma.team.upsert({
    where: {
      competitionId_externalTeamId: {
        competitionId,
        externalTeamId: team.externalId,
      },
    },
    create: {
      competitionId,
      externalTeamId: team.externalId,
      name: team.name,
      shortName: team.shortName,
      code: team.code,
      flagUrl: team.logoUrl,
    },
    update: {
      name: team.name,
      shortName: team.shortName,
      code: team.code,
      flagUrl: team.logoUrl,
    },
  });
}

async function importCompetitionData(
  competitionId: string,
  provider: ExternalDataProvider,
  externalCompetitionId: string,
  externalSeason: string,
) {
  const { teams, matches } = await importExternalCompetitionData(
    provider,
    externalCompetitionId,
    externalSeason,
  );

  for (const team of teams) {
    await prisma.team.upsert({
      where: {
        competitionId_externalTeamId: {
          competitionId,
          externalTeamId: team.externalId,
        },
      },
      create: {
        competitionId,
        externalTeamId: team.externalId,
        name: team.name,
        shortName: team.shortName,
        code: team.code,
        flagUrl: team.logoUrl,
      },
      update: {
        name: team.name,
        shortName: team.shortName,
        code: team.code,
        flagUrl: team.logoUrl,
      },
    });
  }

  const kickoffDates: Date[] = [];

  for (const match of matches) {
    const homeTeam = match.homeTeam
      ? await upsertImportedTeam(competitionId, match.homeTeam)
      : null;
    const awayTeam = match.awayTeam
      ? await upsertImportedTeam(competitionId, match.awayTeam)
      : null;

    kickoffDates.push(match.kickoffAt);

    await prisma.match.upsert({
      where: {
        competitionId_externalMatchId: {
          competitionId,
          externalMatchId: match.externalId,
        },
      },
      create: {
        competitionId,
        externalMatchId: match.externalId,
        homeTeamId: homeTeam?.id,
        awayTeamId: awayTeam?.id,
        homePlaceholder: match.homePlaceholder,
        awayPlaceholder: match.awayPlaceholder,
        kickoffAt: match.kickoffAt,
        stage: match.stage,
        status: match.status,
        homeScore: match.homeScore,
        awayScore: match.awayScore,
      },
      update: {
        homeTeamId: homeTeam?.id,
        awayTeamId: awayTeam?.id,
        homePlaceholder: match.homePlaceholder,
        awayPlaceholder: match.awayPlaceholder,
        kickoffAt: match.kickoffAt,
        stage: match.stage,
        status: match.status,
        homeScore: match.homeScore,
        awayScore: match.awayScore,
      },
    });
  }

  await prisma.competition.update({
    where: { id: competitionId },
    data: {
      externalLastSyncAt: new Date(),
      startsAt:
        kickoffDates.length > 0
          ? new Date(Math.min(...kickoffDates.map((date) => date.getTime())))
          : undefined,
      endsAt:
        kickoffDates.length > 0
          ? new Date(Math.max(...kickoffDates.map((date) => date.getTime())))
          : undefined,
    },
  });

  return {
    teamCount: teams.length,
    fixtureCount: matches.length,
  };
}

export async function createCompetitionAction(
  _state: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  const admin = await getCurrentAdmin();

  if (!admin) {
    return { error: "Accès réservé aux admins." };
  }

  const parsed = competitionSchema.safeParse(Object.fromEntries(formData));

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Compétition invalide.",
    };
  }

  const slug = slugify(parsed.data.slug || parsed.data.name);

  if (!slug) {
    return { error: "Slug invalide." };
  }

  try {
    const competition = await prisma.competition.create({
      data: {
        name: parsed.data.name,
        slug,
        kind: parsed.data.kind,
        externalProvider: parsed.data.externalProvider,
        externalCompetitionId: parsed.data.externalCompetitionId,
        externalSeason: parsed.data.externalSeason,
      },
      select: {
        id: true,
        name: true,
      },
    });

    let importSummary = "";

    if (parsed.data.importNow === "on") {
      const result = await importCompetitionData(
        competition.id,
        parsed.data.externalProvider,
        parsed.data.externalCompetitionId,
        parsed.data.externalSeason,
      );

      if (result.teamCount === 0 && result.fixtureCount === 0) {
        await prisma.competition.delete({
          where: {
            id: competition.id,
          },
        });

        return {
          error:
            "Import vide depuis football-data.org. Vérifie le code compétition et la saison (ex: Champions League 2025/26 => code CL, saison 2025).",
        };
      }

      importSummary = ` ${result.teamCount} équipes et ${result.fixtureCount} matchs importés.`;
    }

    updateTag("competitions");
    updateTag("admin-competitions");

    return {
      success: `${competition.name} créée.${importSummary}`,
    };
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { error: "Slug déjà utilisé. Choisis un slug unique." };
    }

    if (error instanceof Error) {
      return { error: error.message };
    }

    return { error: "Création impossible pour le moment." };
  }
}

export async function syncCompetitionAction(formData: FormData) {
  const admin = await getCurrentAdmin();

  if (!admin) {
    throw new Error("Accès réservé aux admins.");
  }

  const competitionId = z.string().min(1).parse(formData.get("competitionId"));
  const competition = await prisma.competition.findUnique({
    where: {
      id: competitionId,
    },
    select: {
      id: true,
      externalProvider: true,
      externalCompetitionId: true,
      externalSeason: true,
      slug: true,
    },
  });

  if (!competition) {
    throw new Error("Compétition introuvable.");
  }

  let provider = competition.externalProvider;
  let externalCompetitionId = competition.externalCompetitionId;
  let externalSeason = competition.externalSeason;

  if (!provider || !externalCompetitionId || !externalSeason) {
    throw new Error("Source de données externe manquante pour cette compétition.");
  }

  if (provider !== "FOOTBALL_DATA") {
    throw new Error("football-data.org est la seule source active.");
  }

  await importCompetitionData(
    competition.id,
    provider,
    externalCompetitionId,
    externalSeason,
  );

  updateTag("competitions");
  updateTag("admin-competitions");
  updateTag(`competition:${competition.slug}`);
}

export async function toggleCompetitionOpenAction(formData: FormData) {
  const admin = await getCurrentAdmin();

  if (!admin) {
    throw new Error("Accès réservé aux admins.");
  }

  const competitionId = z.string().min(1).parse(formData.get("competitionId"));
  const competition = await prisma.competition.findUnique({
    where: {
      id: competitionId,
    },
    select: {
      id: true,
      slug: true,
      status: true,
    },
  });

  if (!competition) {
    throw new Error("Compétition introuvable.");
  }

  await prisma.competition.update({
    where: {
      id: competition.id,
    },
    data: {
      status: competition.status === "OPEN" ? "DRAFT" : "OPEN",
    },
  });

  updateTag("competitions");
  updateTag("admin-competitions");
  updateTag(`competition:${competition.slug}`);
}

export async function deleteCompetitionAction(formData: FormData) {
  const admin = await getCurrentAdmin();

  if (!admin) {
    throw new Error("Accès réservé aux admins.");
  }

  const competitionId = z.string().min(1).parse(formData.get("competitionId"));
  const competition = await prisma.competition.findUnique({
    where: {
      id: competitionId,
    },
    select: {
      id: true,
      slug: true,
    },
  });

  if (!competition) {
    throw new Error("Compétition introuvable.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.prediction.deleteMany({
      where: {
        match: {
          competitionId,
        },
      },
    });

    await tx.competitionPlayer.deleteMany({
      where: {
        competitionId,
      },
    });

    await tx.match.deleteMany({
      where: {
        competitionId,
      },
    });

    await tx.team.deleteMany({
      where: {
        competitionId,
      },
    });

    await tx.competition.delete({
      where: {
        id: competitionId,
      },
    });
  });

  updateTag("competitions");
  updateTag("admin-competitions");
  updateTag(`competition:${competition.slug}`);
}
