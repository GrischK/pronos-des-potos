import Link from "next/link";
import { notFound } from "next/navigation";

import { PageHeader } from "@/components/PageHeader";
import { PlayerProfileAvatar } from "@/components/player/PlayerProfileAvatar";
import { getCompetitionKindLabel } from "@/src/domain/competition-kind";
import { getPlayerProfileData } from "@/src/server/player-profile";
import type { PlayerProfileMatch } from "@/src/server/player-profile";

type PlayerPageProps = {
  params: Promise<{
    slug: string;
    userId: string;
  }>;
};

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Europe/Paris",
});

function formatKickoffAt(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date à confirmer";
  }

  return dateFormatter.format(date);
}

function getTeamName(match: PlayerProfileMatch, side: "home" | "away") {
  const team = side === "home" ? match.homeTeam : match.awayTeam;
  const placeholder = side === "home" ? match.homePlaceholder : match.awayPlaceholder;

  return team?.name ?? placeholder ?? "À déterminer";
}

function renderScore(homeScore: number | null, awayScore: number | null) {
  if (homeScore === null || awayScore === null) {
    return "- · -";
  }

  return `${homeScore} · ${awayScore}`;
}

function getPointsLabel(points: number | null) {
  if (points === null) {
    return "À venir";
  }

  return `${points} pt${points > 1 ? "s" : ""}`;
}

function getPointsToneClass(points: number | null) {
  if (points === null || points === 0) {
    return "player-points-neutral";
  }

  if (points === 1) {
    return "player-points-outcome";
  }

  if (points === 3) {
    return "player-points-exact";
  }

  if (points === 4) {
    return "player-points-unique";
  }

  return "player-points-neutral";
}

function PlayerMatchRow({ match }: { match: PlayerProfileMatch }) {
  const points = match.prediction?.points ?? null;

  return (
    <article className="player-match-row">
      <div>
        <span>{formatKickoffAt(match.kickoffAt)}</span>
        <strong>
          {getTeamName(match, "home")} - {getTeamName(match, "away")}
        </strong>
      </div>
      <span className="player-score-cell">
        <span className="player-score-label">Résultat match</span>
        <strong>{renderScore(match.homeScore, match.awayScore)}</strong>
      </span>
      <span className="player-score-cell">
        <span className="player-score-label">Prono</span>
        <strong>
          {match.canRevealPrediction
            ? match.prediction
              ? renderScore(match.prediction.homeScore, match.prediction.awayScore)
              : "Pas de prono"
            : "Visible au coup d'envoi"}
        </strong>
      </span>
      <strong className={`player-points-cell ${getPointsToneClass(points)}`}>
        <span className="player-score-label">Points</span>
        <span className="player-points-badge">{getPointsLabel(points)}</span>
      </strong>
    </article>
  );
}

export default async function PlayerPage({ params }: PlayerPageProps) {
  const { slug, userId } = await params;
  const profile = await getPlayerProfileData(slug, userId);

  if (!profile) {
    notFound();
  }

  const statCards = [
    {
      label: "Points live",
      value: profile.stats.points,
    },
    {
      label: "Rang officiel",
      value: profile.stats.officialRank ? `#${profile.stats.officialRank}` : "-",
    },
    {
      label: "Rang live",
      value: profile.stats.liveRank ? `#${profile.stats.liveRank}` : "-",
    },
    {
      label: "Participation",
      value: `${profile.stats.participationRate}%`,
    },
    {
      label: "Pronos",
      value: `${profile.stats.predictedMatches}/${profile.stats.availableMatches}`,
    },
    {
      label: "Exact unique",
      value: profile.stats.exactUnique,
    },
    {
      label: "Exact",
      value: profile.stats.exactShared,
    },
    {
      label: "Résultat",
      value: profile.stats.correctOutcome,
    },
    {
      label: "Ratés",
      value: profile.stats.missed,
    },
  ];

  return (
    <main className="page-shell">
      <PageHeader
        eyebrow={getCompetitionKindLabel(profile.competition.kind)}
        emblemUrl={profile.competition.emblemUrl}
        title={profile.player.name}
        className="competition-subpage-header"
        description={`Fiche joueur pour ${profile.competition.name}.`}
      />

      <section className="page-section">
        <div className="actions">
          <Link
            className="btn btn-secondary"
            href={`/competitions/${profile.competition.slug}/classement`}
          >
            Retour au classement
          </Link>
        </div>
      </section>

      <section className="page-section">
        <div className="player-profile-header">
          <PlayerProfileAvatar
            image={profile.player.image}
            name={profile.player.name}
          />
          <div>
            <p className="badge badge-live">Participant</p>
            <h2>{profile.player.name}</h2>
            <p>{profile.player.email}</p>
          </div>
        </div>

        <div className="player-stat-grid">
          {statCards.map((stat) => (
            <div className="player-stat-card" key={stat.label}>
              <span>{stat.label}</span>
              <strong>{stat.value}</strong>
            </div>
          ))}
        </div>
      </section>

      <section className="page-section">
        <div className="section-heading">
          <div>
            <p className="badge badge-warning mb-2">Pronos du tournoi</p>
          </div>
        </div>

        {profile.matches.length === 0 ? (
          <p className="readonly-notice">
            Aucun prono enregistré pour ce joueur dans cette compétition.
          </p>
        ) : (
          <div className="player-match-list">
            <div className="player-match-row player-match-row-header">
              <span>Match</span>
              <span>Résultat match</span>
              <span>Prono</span>
              <span>Pts</span>
            </div>
            {profile.matches.map((match) => (
              <PlayerMatchRow key={match.id} match={match} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
