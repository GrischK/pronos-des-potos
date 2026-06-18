"use client";

import Link from "next/link";
import { useRef, useState } from "react";

import type { LeaderboardTournamentStat } from "@/src/server/leaderboard";
import { useDismissibleLayer } from "@/src/lib/use-dismissible-layer";

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
          <Link href={`/competitions/${slug}/joueurs/${leader.userId}?from=stats`}>
            {leader.name}
          </Link>
        </span>
      ))}
    </span>
  );
}

type LeaderboardTournamentStatsSectionProps = {
  slug: string;
  stats: LeaderboardTournamentStat[];
};

export function LeaderboardTournamentStatsSection({
  slug,
  stats,
}: LeaderboardTournamentStatsSectionProps) {
  if (stats.length === 0) {
    return null;
  }

  return (
    <section className="page-section">
      <div className="section-heading">
        <div>
          <p className="badge badge-live">Stats tournoi</p>
        </div>
        <p className="mb-2">Les tendances marquantes du classement sur toute la compétition.</p>
        <p>Calculées uniquement sur les matchs terminés.</p>
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
