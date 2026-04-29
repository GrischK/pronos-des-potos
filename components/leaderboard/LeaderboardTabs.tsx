"use client";

import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { useRef, useState } from "react";

import { getCompetitionStageLabel } from "@/src/domain/competition-stage";
import type { LeaderboardData, LeaderboardSnapshot } from "@/src/server/leaderboard";
import { useDismissibleLayer } from "@/src/lib/use-dismissible-layer";

type LeaderboardMode = "official" | "live";

type LeaderboardTabsProps = {
  initialMode?: LeaderboardMode;
  leaderboard: LeaderboardData;
};

function getInitial(name: string) {
  return name.trim().slice(0, 1).toUpperCase();
}

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

function getTeamName(
  match: LeaderboardData["liveMatches"][number],
  side: "home" | "away",
) {
  const team = side === "home" ? match.homeTeam : match.awayTeam;
  const placeholder = side === "home" ? match.homePlaceholder : match.awayPlaceholder;

  return team?.name ?? placeholder ?? "À déterminer";
}

function getTeamFlag(
  match: LeaderboardData["liveMatches"][number],
  side: "home" | "away",
) {
  const team = side === "home" ? match.homeTeam : match.awayTeam;

  return team?.flagUrl ?? null;
}

function renderScore(homeScore: number | null, awayScore: number | null) {
  if (homeScore === null || awayScore === null) {
    return "- · -";
  }

  return `${homeScore} · ${awayScore}`;
}

function renderStatus(status: string, liveMinute: number | null) {
  if (status !== "LIVE") {
    return status;
  }

  return (
    <>
      <span>LIVE</span>
      <span className="live-minute">
        {liveMinute === 45 ? "Mi-temps" : liveMinute !== null ? `${liveMinute}'` : ""}
      </span>
    </>
  );
}

function PlayerAvatar({
  image,
  name,
}: {
  image: string | null;
  name: string;
}) {
  return (
    <span className="leaderboard-player-avatar">
      {image ? <img alt="" loading="lazy" src={image} /> : getInitial(name)}
    </span>
  );
}

function LeaderboardTable({
  slug,
  snapshot,
}: {
  slug: string;
  snapshot: LeaderboardSnapshot;
}) {
  if (snapshot.rows.length === 0) {
    return (
      <p className="readonly-notice">
        Aucun classement pour le moment. Les points apparaîtront après les
        premiers matchs pris en compte.
      </p>
    );
  }

  return (
    <div className="leaderboard-table-wrap">
      <table className="leaderboard-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Joueur</th>
            <th>Pts</th>
            <th>Pronos</th>
            <th>Exact unique</th>
            <th>Exact</th>
            <th>Résultat</th>
            <th>Ratés</th>
          </tr>
        </thead>
        <tbody>
          {snapshot.rows.map((row, index) => (
            <tr key={row.userId}>
              <td>{index + 1}</td>
              <td>
                <Link
                  className="leaderboard-player"
                  href={`/competitions/${slug}/joueurs/${row.userId}`}
                >
                  <PlayerAvatar image={row.image} name={row.name} />
                  <strong>{row.name}</strong>
                </Link>
              </td>
              <td>
                <strong>{row.points}</strong>
              </td>
              <td>{row.predictedMatches}</td>
              <td>{row.exactUnique}</td>
              <td>{row.exactShared}</td>
              <td>{row.correctOutcome}</td>
              <td>{row.missed}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LeaderboardRulesCard({ isLive }: { isLive: boolean }) {
  const infoButtonRef = useRef<HTMLButtonElement>(null);
  const infoPopoverRef = useRef<HTMLDivElement>(null);
  const [isInfoOpen, setIsInfoOpen] = useState(false);
  const rules = [
    { points: "1 pt", label: "Bon résultat" },
    { points: "3 pts", label: "Score exact" },
    { points: "4 pts", label: "Score exact unique" },
  ];

  useDismissibleLayer({
    active: isInfoOpen,
    ignoreRefs: [infoButtonRef],
    layerRef: infoPopoverRef,
    onDismiss: () => {
      setIsInfoOpen(false);
    },
  });

  return (
    <div className="leaderboard-rules" aria-label="Barème des points">
      <div>
        <div className="leaderboard-rules-header">
          <strong>Barème</strong>
          <button
            aria-expanded={isInfoOpen}
            aria-label="Afficher les règles du classement"
            className="leaderboard-info-button"
            onClick={() => {
              setIsInfoOpen((current) => !current);
            }}
            ref={infoButtonRef}
            type="button"
          >
            ?
          </button>
        </div>
        {isInfoOpen ? (
          <div className="leaderboard-info-popover" ref={infoPopoverRef}>
            <strong>Règles</strong>
            <p>
              1 pt pour le bon résultat, 3 pts pour le score exact, 4 pts si le
              score exact est unique.
            </p>
            <p>
              Le classement est trié par points, puis exact unique, score
              exact, bon résultat, nombre de pronos joués et enfin ordre
              alphabétique.
            </p>
            <p>
              {isLive
                ? "Le live prend aussi en compte les matchs en cours."
                : "L'officiel ne prend en compte que les matchs terminés."}
            </p>
          </div>
        ) : null}
      </div>
      {rules.map((rule) => (
        <div className="leaderboard-rule" key={rule.label}>
          <strong>{rule.points}</strong>
          <span>{rule.label}</span>
        </div>
      ))}
    </div>
  );
}

function LiveMatchesPanel({
  matches,
}: {
  matches: LeaderboardData["liveMatches"];
}) {
  if (matches.length === 0) {
    return null;
  }

  return (
    <section className="page-section">
      <div className="section-heading">
        <div>
          <p className="badge badge-warning">En direct</p>
          <h2>Matchs en cours</h2>
        </div>
        <p>Les scores live qui alimentent le classement provisoire.</p>
      </div>

      <div className="match-list">
        {matches.map((match) => (
          <article className="match-row" key={match.id}>
            <div className="match-meta">
              <span>{formatKickoffAt(match.kickoffAt)}</span>
              <span>{getCompetitionStageLabel(match.stage)}</span>
            </div>

            <div className="match-teams">
              <span className="match-team">
                {getTeamFlag(match, "home") ? (
                  <img
                    alt=""
                    className="team-flag"
                    loading="lazy"
                    src={getTeamFlag(match, "home") ?? undefined}
                  />
                ) : null}
                <span>{getTeamName(match, "home")}</span>
              </span>

              <span className="match-score">
                {renderScore(match.homeScore, match.awayScore)}
              </span>

              <span className="match-team match-team-away">
                <span>{getTeamName(match, "away")}</span>
                {getTeamFlag(match, "away") ? (
                  <img
                    alt=""
                    className="team-flag"
                    loading="lazy"
                    src={getTeamFlag(match, "away") ?? undefined}
                  />
                ) : null}
              </span>
            </div>

            <span className="match-status match-live-status">
              {renderStatus(match.status, match.liveMinute)}
            </span>

            <details className="live-match-predictions-panel">
              <summary>
                <span>
                  <span className="badge badge-warning">Pronos</span>
                  <strong>
                    {match.predictions.length} participant
                    {match.predictions.length > 1 ? "s" : ""}
                  </strong>
                </span>
                <span
                  aria-hidden="true"
                  className="pending-predictions-summary-action"
                >
                  <ChevronDown size={18} strokeWidth={3} />
                </span>
              </summary>

              <div className="public-predictions">
                {match.predictions.length === 0 ? (
                  <p>Aucun prono enregistré pour ce match.</p>
                ) : (
                  match.predictions.map((prediction) => (
                    <div className="public-prediction-row" key={prediction.id}>
                      <strong>{prediction.user.name}</strong>
                      <span>
                        {prediction.homeScore} · {prediction.awayScore}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </details>
          </article>
        ))}
      </div>
    </section>
  );
}

export function LeaderboardTabs({
  initialMode = "official",
  leaderboard,
}: LeaderboardTabsProps) {
  const [mode, setMode] = useState<LeaderboardMode>(initialMode);
  const snapshot = leaderboard[mode];
  const isLive = mode === "live";
  const leader = snapshot.rows[0] ?? null;

  return (
    <>
      <section className="page-section">
        <div className="schedule-view-switch" aria-label="Type de classement">
          <button
            aria-pressed={mode === "official"}
            onClick={() => setMode("official")}
            type="button"
          >
            Officiel
          </button>
          <button
            aria-pressed={mode === "live"}
            onClick={() => setMode("live")}
            type="button"
          >
            Live
          </button>
        </div>
      </section>

      <section className="page-section">
        <div className="leaderboard-summary">
          <div>
            <span>{isLive ? "Leader live" : "Leader"}</span>
            {leader ? (
              <span className="leaderboard-leader">
                <PlayerAvatar image={leader.image} name={leader.name} />
                <strong>{leader.name}</strong>
              </span>
            ) : (
              <strong>Aucun prono scoré</strong>
            )}
          </div>
          <div>
            <span>{isLive ? "Matchs comptés" : "Matchs terminés"}</span>
            <strong>{snapshot.matchCount}</strong>
          </div>
          <div>
            <span>{isLive ? "Matchs en cours" : "Participants"}</span>
            <strong>
              {isLive ? snapshot.liveMatchCount : leaderboard.participantCount}
            </strong>
          </div>
        </div>
      </section>

      {isLive ? <LiveMatchesPanel matches={leaderboard.liveMatches} /> : null}

      <section className="page-section">
        <div className="section-heading">
          <div>
            <p className={isLive ? "badge badge-warning" : "badge badge-live"}>
              {isLive ? "Live provisoire" : "Officiel"}
            </p>
            {/*<h2>{isLive ? "Classement live" : "Classement officiel"}</h2>*/}
          </div>
          <p>
            {isLive
              ? "Basé sur les matchs terminés et les scores live en cours."
              : "Basé uniquement sur les matchs terminés."}
          </p>
        </div>

        <LeaderboardRulesCard isLive={isLive} />

        <LeaderboardTable slug={leaderboard.slug} snapshot={snapshot} />
      </section>
    </>
  );
}
