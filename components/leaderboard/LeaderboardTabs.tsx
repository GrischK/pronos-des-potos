"use client";

import Link from "next/link";
import { ArrowDown, ArrowUp, ChartLine, ChevronDown } from "lucide-react";
import { useRef, useState } from "react";

import { CompetitionActionCard } from "@/components/competitions/CompetitionActionCard";
import { LeaderboardLiveMatchesPanel } from "@/components/leaderboard/LeaderboardLiveMatchesPanel";
import { PlayerPointsBadge } from "@/components/player/PlayerPointsBadge";
import { getCompetitionStageLabel } from "@/src/domain/competition-stage";
import { formatMatchScoreText } from "@/src/domain/scoring";
import { getLiveMatchStatusLabel, getMatchStatusLabel } from "@/src/domain/match-status";
import type {
  LeaderboardData,
  LeaderboardSnapshot,
  LeaderboardTournamentStat,
} from "@/src/server/leaderboard";
import { useDismissibleLayer } from "@/src/lib/use-dismissible-layer";

type LeaderboardMode = "official" | "live";
type RankTrend = "up" | "down" | "same";

type LeaderboardTabsProps = {
  initialMode?: LeaderboardMode;
  leaderboard: LeaderboardData;
};

function getInitial(name: string) {
  return name.trim().slice(0, 1).toUpperCase();
}

function formatRankLabel(rank: number) {
  return String(rank);
}

function getRankTrend(
  liveRank: number,
  officialRank: number | undefined,
): RankTrend | null {
  if (officialRank === undefined) {
    return null;
  }

  if (liveRank < officialRank) {
    return "up";
  }

  if (liveRank > officialRank) {
    return "down";
  }

  return "same";
}

function getRankTrendLabel(trend: RankTrend) {
  if (trend === "up") {
    return "Places gagnées";
  }

  if (trend === "down") {
    return "Places perdues";
  }

  return "Position stable";
}

function RankTrendIndicator({ trend }: { trend: RankTrend }) {
  if (trend === "up") {
    return (
      <span
        aria-label={getRankTrendLabel(trend)}
        className="leaderboard-rank-trend-wrap"
      >
        <ArrowUp
          aria-hidden="true"
          className="leaderboard-rank-trend leaderboard-rank-trend-up"
          size={14}
          strokeWidth={2.8}
        />
      </span>
    );
  }

  if (trend === "down") {
    return (
      <span
        aria-label={getRankTrendLabel(trend)}
        className="leaderboard-rank-trend-wrap"
      >
        <ArrowDown
          aria-hidden="true"
          className="leaderboard-rank-trend leaderboard-rank-trend-down"
          size={14}
          strokeWidth={2.8}
        />
      </span>
    );
  }

  return (
    <span
      aria-label={getRankTrendLabel(trend)}
      className="leaderboard-rank-trend-wrap"
    >
      <span
        aria-hidden="true"
        className="leaderboard-rank-trend leaderboard-rank-trend-same"
      >
        =
      </span>
    </span>
  );
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

function renderStatus(status: string, liveMinute: number | null) {
  if (status !== "LIVE") {
    return getMatchStatusLabel(status);
  }

  return (
    <>
      <span>{getMatchStatusLabel(status)}</span>
      {liveMinute !== null ? (
        <span className="live-minute">{getLiveMatchStatusLabel(liveMinute)}</span>
      ) : null}
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
  previousSnapshot,
  showRankTrends,
  showBonusPoints,
  selectedUserId,
  onSelectUser,
}: {
  slug: string;
  snapshot: LeaderboardSnapshot;
  previousSnapshot?: LeaderboardSnapshot;
  showRankTrends: boolean;
  showBonusPoints: boolean;
  selectedUserId: string | null;
  onSelectUser: (userId: string) => void;
}) {
  const previousRankByUserId = new Map(
    previousSnapshot?.rows.map((row) => [row.userId, row.rank] as const) ?? [],
  );

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
            <th>Rang</th>
            <th>Joueur</th>
            <th>Pts</th>
            {showBonusPoints ? <th>Bonus</th> : null}
            <th>Pronos</th>
            <th>Exact unique</th>
            <th>Exact</th>
            <th>Résultat</th>
            <th>Ratés</th>
          </tr>
        </thead>
        <tbody>
          {snapshot.rows.map((row) => {
            const trend = previousSnapshot
              ? getRankTrend(row.rank, previousRankByUserId.get(row.userId))
              : null;

            return (
              <tr
                aria-selected={selectedUserId === row.userId}
                className="leaderboard-table-row"
                data-selected={selectedUserId === row.userId}
                key={row.userId}
                onClick={() => {
                  onSelectUser(row.userId);
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelectUser(row.userId);
                  }
                }}
                tabIndex={0}
              >
                <td>
                  <span className="leaderboard-rank-cell">
                    <span>{formatRankLabel(row.rank)}</span>
                    {showRankTrends && trend ? <RankTrendIndicator trend={trend} /> : null}
                  </span>
                </td>
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
                {showBonusPoints ? <td>{row.bonusPoints}</td> : null}
                <td>{row.predictedMatches}</td>
                <td>{row.exactUnique}</td>
                <td>{row.exactShared}</td>
                <td>{row.correctOutcome}</td>
                <td>{row.missed}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function LeaderboardRulesCard({
  isLive,
  bonusEnabled,
}: {
  isLive: boolean;
  bonusEnabled: boolean;
}) {
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
              exact, bon résultat et nombre de pronos joués. À égalité
              parfaite sur ces critères, les joueurs restent ex aequo.
            </p>
            {bonusEnabled ? (
              <p>
                Le bonus podium rapporte 5 pts par bonne place, et 20 pts si
                le podium complet est exact.
              </p>
            ) : null}
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

function LeaderboardStatTooltip({
  title,
  content,
}: {
  title: string;
  content: string;
}) {
  const infoButtonRef = useRef<HTMLButtonElement>(null);
  const infoPopoverRef = useRef<HTMLDivElement>(null);
  const [isInfoOpen, setIsInfoOpen] = useState(false);

  useDismissibleLayer({
    active: isInfoOpen,
    ignoreRefs: [infoButtonRef],
    layerRef: infoPopoverRef,
    onDismiss: () => {
      setIsInfoOpen(false);
    },
  });

  return (
    <span className="leaderboard-stat-tooltip">
      <button
        aria-expanded={isInfoOpen}
        aria-label={`Afficher l'aide pour ${title}`}
        className="leaderboard-info-button leaderboard-stat-info-button"
        onClick={() => {
          setIsInfoOpen((current) => !current);
        }}
        ref={infoButtonRef}
        type="button"
      >
        ?
      </button>
      {isInfoOpen ? (
        <div className="leaderboard-info-popover leaderboard-stat-popover" ref={infoPopoverRef}>
          <strong>{title}</strong>
          <p>{content}</p>
        </div>
      ) : null}
    </span>
  );
}

function LeaderboardStatLeaders({
  slug,
  leaders,
}: {
  slug: string;
  leaders: LeaderboardTournamentStat["leaders"];
}) {
  if (leaders.length === 0) {
    return <span className="leaderboard-stat-meta">Aucun joueur</span>;
  }

  return (
    <span className="leaderboard-stat-meta">
      {leaders.map((leader, index) => (
        <span key={leader.userId}>
          {index > 0 ? ", " : ""}
          <Link href={`/competitions/${slug}/joueurs/${leader.userId}`}>
            {leader.name}
          </Link>
        </span>
      ))}
    </span>
  );
}

function LeaderboardTournamentStatsSection({
  slug,
  stats,
}: {
  slug: string;
  stats: LeaderboardTournamentStat[];
}) {
  if (stats.length === 0) {
    return null;
  }

  return (
    <section className="page-section">
      <div className="section-heading">
        <div>
          <p className="badge badge-live">Stats tournoi</p>
        </div>
        <p>Les tendances marquantes du classement sur toute la compétition.</p>
      </div>

      <div className="leaderboard-stats-grid">
        {stats.map((stat) => (
          <article className="leaderboard-stat-card" key={stat.key}>
            <div className="leaderboard-stat-card-header">
              <strong>{stat.title}</strong>
              {stat.tooltip ? (
                <LeaderboardStatTooltip content={stat.tooltip} title={stat.title} />
              ) : null}
            </div>
            <span className="leaderboard-stat-value">{stat.value}</span>
            <LeaderboardStatLeaders leaders={stat.leaders} slug={slug} />
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
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const snapshot = leaderboard[mode];
  const isLive = mode === "live";
  const showRankTrends = isLive && snapshot.liveMatchCount > 0;
  const leader = snapshot.rows[0] ?? null;

  return (
    <>
      <section className="toggle-section">
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
        <div className="section-heading">
          <div>
            <p className={isLive ? "badge badge-warning" : "badge badge-live"}>
              {isLive ? "Live provisoire" : "Officiel"}
            </p>
          </div>
          <p>
            {isLive
              ? "Basé sur les matchs terminés et les scores live en cours."
              : "Basé uniquement sur les matchs terminés."}
          </p>
        </div>
        <LeaderboardTable
          selectedUserId={selectedUserId}
          slug={leaderboard.slug}
          snapshot={snapshot}
          previousSnapshot={isLive ? leaderboard.official : undefined}
          showRankTrends={showRankTrends}
          showBonusPoints={leaderboard.bonusResultKnown}
          onSelectUser={setSelectedUserId}
        />
      </section>

      {isLive ? <LeaderboardLiveMatchesPanel matches={leaderboard.liveMatches} /> : null}

      <div className="actions mb-4">
        <CompetitionActionCard
          description="Voir l'évolution du classement"
          href={`/competitions/${leaderboard.slug}/classement/evolution`}
          icon={<ChartLine aria-hidden="true" size={20} strokeWidth={2.8} />}
          title="Graphique du classement"
          tone="coral"
          width="inline"
        />
      </div>

      <section className="page-section">
        <div className="leaderboard-summary">
          <div>
            <strong>Leader du classement</strong>
            {leader ? (
              <span className="leaderboard-leader">
                <Link
                  aria-label={`Voir la fiche de ${leader.name}`}
                  className="leaderboard-leader-link"
                  href={`/competitions/${leaderboard.slug}/joueurs/${leader.userId}`}
                >
                  <PlayerAvatar image={leader.image} name={leader.name} />
                </Link>
                <strong>{leader.name}</strong>
              </span>
            ) : (
              <strong>Aucun prono scoré</strong>
            )}
          </div>
          <div>
            <strong>{isLive ? "Matchs comptés" : "Matchs terminés"}</strong>
            <strong>{snapshot.matchCount}</strong>
          </div>
          <div>
            <strong>{isLive ? "Matchs en cours" : "Participants"}</strong>
            <strong>
              {isLive ? snapshot.liveMatchCount : leaderboard.participantCount}
            </strong>
          </div>
        </div>
      </section>

      <LeaderboardTournamentStatsSection
        slug={leaderboard.slug}
        stats={leaderboard.tournamentStats}
      />

      <section className="page-section">
        <LeaderboardRulesCard isLive={isLive} bonusEnabled={leaderboard.bonusEnabled} />
      </section>
    </>
  );
}
