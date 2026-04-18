"use client";

import { useMemo, useState } from "react";

import { PredictionMatchForm } from "@/components/predictions/PredictionMatchForm";
import type { PredictionMatch } from "@/src/server/predictions";

type PredictionScheduleProps = {
  matches: PredictionMatch[];
  slug: string;
};

const groups = [
  { name: "Groupe A", teams: ["Mexico", "South Africa", "South Korea", "Czech Republic"] },
  { name: "Groupe B", teams: ["Canada", "Qatar", "Switzerland", "Bosnia-Herzegovina"] },
  { name: "Groupe C", teams: ["Brazil", "Morocco", "Haiti", "Scotland"] },
  { name: "Groupe D", teams: ["USA", "Paraguay", "Australia", "Turkey"] },
  { name: "Groupe E", teams: ["Germany", "Curaçao", "Ivory Coast", "Ecuador"] },
  { name: "Groupe F", teams: ["Netherlands", "Japan", "Tunisia", "Sweden"] },
  { name: "Groupe G", teams: ["Belgium", "Egypt", "Iran", "New Zealand"] },
  { name: "Groupe H", teams: ["Spain", "Cape Verde", "Saudi Arabia", "Uruguay"] },
  { name: "Groupe I", teams: ["France", "Senegal", "Norway", "Iraq"] },
  { name: "Groupe J", teams: ["Argentina", "Algeria", "Austria", "Jordan"] },
  { name: "Groupe K", teams: ["Portugal", "Uzbekistan", "Colombia", "DR Congo"] },
  { name: "Groupe L", teams: ["England", "Croatia", "Ghana", "Panama"] },
] as const;

const aliases: Record<string, string> = {
  "Cape Verde Islands": "Cape Verde",
  "Congo DR": "DR Congo",
  Czechia: "Czech Republic",
  "United States": "USA",
};

const phaseLabels: Record<string, string> = {
  LAST_32: "16es de finale",
  LAST_16: "8es de finale",
  QUARTER_FINALS: "Quarts de finale",
  SEMI_FINALS: "Demi-finales",
  THIRD_PLACE: "Match pour la 3e place",
  FINAL: "Finale",
};

const phaseOrder = [
  "LAST_32",
  "LAST_16",
  "QUARTER_FINALS",
  "SEMI_FINALS",
  "THIRD_PLACE",
  "FINAL",
];

function teamKey(name: string) {
  return (aliases[name] ?? name).toLowerCase().replace(/[^a-z0-9]+/g, "");
}

export function PredictionSchedule({ matches, slug }: PredictionScheduleProps) {
  const stages = useMemo(() => {
    const phaseSections = phaseOrder.map((stage) => ({
      id: stage,
      label: phaseLabels[stage],
      title: phaseLabels[stage],
      kind: "phase" as const,
      matches: matches.filter((match) => match.stage === stage),
    })).filter((section) => section.matches.length > 0);

    return [
      {
        id: "GROUPS",
        label: "Groupes",
        title: "Phase de groupes",
        kind: "groups" as const,
      },
      ...phaseSections,
    ];
  }, [matches]);
  const groupSections = useMemo(
    () =>
      groups.map((group) => {
      const teamKeys = new Set(group.teams.map(teamKey));

      return {
        id: group.name,
        label: group.name.replace("Groupe ", ""),
        title: group.name,
        matches: matches.filter(
          (match) =>
            match.homeTeam &&
            match.awayTeam &&
            teamKeys.has(teamKey(match.homeTeam.name)) &&
            teamKeys.has(teamKey(match.awayTeam.name)),
        ),
      };
    }),
    [matches],
  );
  const [activeStageIndex, setActiveStageIndex] = useState(0);
  const [activeGroupId, setActiveGroupId] = useState(groupSections[0]?.id ?? "");
  const activeStage = stages[activeStageIndex] ?? stages[0];
  const activeGroup =
    groupSections.find((section) => section.id === activeGroupId) ?? groupSections[0];
  const previousStage = stages[activeStageIndex - 1];
  const nextStage = stages[activeStageIndex + 1];

  if (!activeStage) {
    return null;
  }

  return (
    <div className="schedule-browser">
      <div className="phase-pager">
        <button
          className="phase-arrow"
          disabled={!previousStage}
          onClick={() => setActiveStageIndex((index) => Math.max(0, index - 1))}
          type="button"
        >
          {"<"}
        </button>
        <div>
          <p className="badge badge-live">{activeStage.label}</p>
          <h2>{activeStage.title}</h2>
        </div>
        <button
          className="phase-arrow"
          disabled={!nextStage}
          onClick={() =>
            setActiveStageIndex((index) => Math.min(stages.length - 1, index + 1))
          }
          type="button"
        >
          {">"}
        </button>
      </div>

      {activeStage.kind === "groups" && activeGroup ? (
        <div className="group-browser">
          <nav aria-label="Groupes" className="group-nav">
            {groupSections.map((section) => (
              <button
                aria-pressed={section.id === activeGroup.id}
                className="group-nav-button"
                key={section.id}
                onClick={() => setActiveGroupId(section.id)}
                type="button"
              >
                {section.label}
              </button>
            ))}
          </nav>

          <div className="group-panel">
            <div className="section-heading">
              <div>
                <p className="badge badge-live">{activeGroup.title}</p>
                <h2>Mes scores</h2>
              </div>
              <p>{activeGroup.matches.length} matchs.</p>
            </div>

            <div className="prediction-list">
              {activeGroup.matches.map((match) => (
                <PredictionMatchForm key={match.id} match={match} slug={slug} />
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {activeStage.kind === "phase" ? (
        <div className="phase-panel">
          <div className="section-heading">
            <div>
              <p className="badge badge-live">{activeStage.title}</p>
              <h2>Mes scores</h2>
            </div>
            <p>{activeStage.matches.length} matchs.</p>
          </div>

          <div className="prediction-list">
            {activeStage.matches.map((match) => (
              <PredictionMatchForm key={match.id} match={match} slug={slug} />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
