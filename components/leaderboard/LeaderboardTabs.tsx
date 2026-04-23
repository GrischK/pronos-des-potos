"use client";

import Link from "next/link";
import { useRef, useState } from "react";

import type { LeaderboardData, LeaderboardSnapshot } from "@/src/server/leaderboard";
import { useDismissibleLayer } from "@/src/lib/use-dismissible-layer";

type LeaderboardMode = "official" | "live";

type LeaderboardTabsProps = {
  leaderboard: LeaderboardData;
};

function getInitial(name: string) {
  return name.trim().slice(0, 1).toUpperCase();
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

export function LeaderboardTabs({ leaderboard }: LeaderboardTabsProps) {
  const [mode, setMode] = useState<LeaderboardMode>("official");
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
