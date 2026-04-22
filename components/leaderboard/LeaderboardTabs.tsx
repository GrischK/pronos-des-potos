"use client";

import { useState } from "react";

import type { LeaderboardData, LeaderboardSnapshot } from "@/src/server/leaderboard";

type LeaderboardMode = "official" | "live";

type LeaderboardTabsProps = {
  leaderboard: LeaderboardData;
};

function getLeaderLabel(snapshot: LeaderboardSnapshot) {
  return snapshot.rows[0]?.name ?? "Aucun prono scoré";
}

function LeaderboardTable({ snapshot }: { snapshot: LeaderboardSnapshot }) {
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
                <strong>{row.name}</strong>
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
  const rules = [
    { points: "1 pt", label: "Bon résultat" },
    { points: "3 pts", label: "Score exact" },
    { points: "4 pts", label: "Score exact unique" },
  ];

  return (
    <div className="leaderboard-rules" aria-label="Barème des points">
      <div>
        <strong>Barème</strong>
        {/*<strong>*/}
        {/*  {isLive ? "Même règle, scores provisoires" : "Matchs terminés seulement"}*/}
        {/*</strong>*/}
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
            <strong>{getLeaderLabel(snapshot)}</strong>
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

        <LeaderboardTable snapshot={snapshot} />
      </section>
    </>
  );
}
