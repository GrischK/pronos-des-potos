"use client";

import { useMemo, useState } from "react";
import type { ReactNode } from "react";

import { PredictionMatchForm } from "@/components/predictions/PredictionMatchForm";
import type { PredictionMatch } from "@/src/server/predictions";

type PredictionScheduleProps = {
  matches: PredictionMatch[];
  slug: string;
};

export type ScheduleMatch = {
  id: string;
  kickoffAt: string;
  stage: string;
  matchday: number | null;
  homeTeam: {
    name: string;
  } | null;
  awayTeam: {
    name: string;
  } | null;
};

type PredictionScheduleBrowserProps<TMatch extends ScheduleMatch> = {
  groupHeading: string;
  matches: TMatch[];
  phaseHeading: string;
  renderMatch: (match: TMatch) => ReactNode;
};

type PredictionPhaseSection<TMatch extends ScheduleMatch> = {
  id: string;
  label: string;
  title: string;
  kind: "phase";
  matches: TMatch[];
};

type ChronologicalSection<TMatch extends ScheduleMatch> = {
  id: string;
  label: string;
  title: string;
  matches: TMatch[];
};

type ScheduleView = "structure" | "chronology";

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

const phaseOrder = [
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

const twoLeggedStages = new Set([
  "PLAYOFFS",
  "LAST_32",
  "LAST_16",
  "QUARTER_FINALS",
  "SEMI_FINALS",
]);

const dayKeyFormatter = new Intl.DateTimeFormat("fr-CA", {
  day: "2-digit",
  month: "2-digit",
  timeZone: "Europe/Paris",
  year: "numeric",
});

const dayLabelFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  timeZone: "Europe/Paris",
  weekday: "short",
});

function teamKey(name: string) {
  return (aliases[name] ?? name).toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function getStageLabel(stage: string) {
  return phaseLabels[stage] ?? stage.replace(/_/g, " ");
}

function sortMatchesByKickoff<TMatch extends ScheduleMatch>(matches: TMatch[]) {
  return [...matches].sort(
    (a, b) => new Date(a.kickoffAt).getTime() - new Date(b.kickoffAt).getTime(),
  );
}

function getPhaseMatchSections<TMatch extends ScheduleMatch>(
  section: PredictionPhaseSection<TMatch>,
) {
  const matches = sortMatchesByKickoff(section.matches);

  if (
    section.id === "LEAGUE_STAGE" &&
    matches.some((match) => match.matchday !== null)
  ) {
    const matchesByMatchday = new Map<number, TMatch[]>();

    for (const match of matches) {
      const matchday = match.matchday ?? 0;
      matchesByMatchday.set(matchday, [
        ...(matchesByMatchday.get(matchday) ?? []),
        match,
      ]);
    }

    return Array.from(matchesByMatchday.entries())
      .sort(([a], [b]) => a - b)
      .map(([matchday, sectionMatches]) => ({
        id: `matchday-${matchday}`,
        title: matchday > 0 ? `Journée ${matchday}` : "Journée à confirmer",
        matches: sectionMatches,
      }));
  }

  if (
    twoLeggedStages.has(section.id) &&
    matches.length > 1 &&
    matches.length % 2 === 0
  ) {
    const splitIndex = matches.length / 2;

    return [
      {
        id: "first-leg",
        title: "Matchs aller",
        matches: matches.slice(0, splitIndex),
      },
      {
        id: "second-leg",
        title: "Matchs retour",
        matches: matches.slice(splitIndex),
      },
    ];
  }

  return [
    {
      id: "matches",
      title: "Matchs",
      matches,
    },
  ];
}

function getDayKey(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return dayKeyFormatter.format(date);
}

function getDayLabel(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date à confirmer";
  }

  return dayLabelFormatter.format(date);
}

function getChronologicalSections<TMatch extends ScheduleMatch>(matches: TMatch[]) {
  const sections = new Map<string, ChronologicalSection<TMatch>>();

  for (const match of sortMatchesByKickoff(matches)) {
    const usesMatchday = match.stage === "LEAGUE_STAGE" && match.matchday !== null;
    const id = usesMatchday
      ? `${match.stage}-${match.matchday}`
      : `day-${getDayKey(match.kickoffAt)}`;
    const label = usesMatchday
      ? `J${match.matchday}`
      : getDayLabel(match.kickoffAt);
    const title = usesMatchday
      ? `Journée ${match.matchday}`
      : getDayLabel(match.kickoffAt);

    sections.set(id, {
      id,
      label,
      title,
      matches: [...(sections.get(id)?.matches ?? []), match],
    });
  }

  return Array.from(sections.values());
}

export function PredictionScheduleBrowser<TMatch extends ScheduleMatch>({
  groupHeading,
  matches,
  phaseHeading,
  renderMatch,
}: PredictionScheduleBrowserProps<TMatch>) {
  const groupSections = useMemo(
    () =>
      groups
        .map((group) => {
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
        })
        .filter((section) => section.matches.length > 0),
    [matches],
  );
  const stages = useMemo(() => {
    const knownStages = new Set(phaseOrder);
    const excludedStages = new Set(groupSections.length > 0 ? ["GROUP_STAGE"] : []);
    const extraStages = Array.from(
      new Set(
        matches
          .map((match) => match.stage)
          .filter(
            (stage) => !knownStages.has(stage) && !excludedStages.has(stage),
          ),
      ),
    ).sort();
    const phaseSections = [...phaseOrder, ...extraStages]
      .filter((stage) => !excludedStages.has(stage))
      .map((stage) => ({
        id: stage,
        label: getStageLabel(stage),
        title: getStageLabel(stage),
        kind: "phase" as const,
        matches: matches.filter((match) => match.stage === stage),
      }))
      .filter((section) => section.matches.length > 0);

    return [
      ...(groupSections.length > 0
        ? [
            {
              id: "GROUPS",
              label: "Groupes",
              title: "Phase de groupes",
              kind: "groups" as const,
            },
          ]
        : []),
      ...phaseSections,
    ];
  }, [groupSections.length, matches]);
  const chronologicalSections = useMemo(
    () => getChronologicalSections(matches),
    [matches],
  );
  const [view, setView] = useState<ScheduleView>("structure");
  const [activeStageIndex, setActiveStageIndex] = useState(0);
  const [activeGroupId, setActiveGroupId] = useState(groupSections[0]?.id ?? "");
  const [activeDayId, setActiveDayId] = useState(
    chronologicalSections[0]?.id ?? "",
  );
  const activeStage = stages[activeStageIndex] ?? stages[0];
  const activeGroup =
    groupSections.find((section) => section.id === activeGroupId) ?? groupSections[0];
  const activeDay =
    chronologicalSections.find((section) => section.id === activeDayId) ??
    chronologicalSections[0];
  const previousStage = stages[activeStageIndex - 1];
  const nextStage = stages[activeStageIndex + 1];

  if (!activeStage && !activeDay) {
    return null;
  }

  return (
    <div className="schedule-browser">
      <div className="schedule-view-switch" aria-label="Vue des matchs">
        <button
          aria-pressed={view === "structure"}
          onClick={() => setView("structure")}
          type="button"
        >
          Par phase
        </button>
        <button
          aria-pressed={view === "chronology"}
          onClick={() => setView("chronology")}
          type="button"
        >
          Par journée
        </button>
      </div>

      {view === "chronology" && activeDay ? (
        <div className="day-browser">
          <nav aria-label="Journées" className="day-nav">
            {chronologicalSections.map((section) => (
              <button
                aria-pressed={section.id === activeDay.id}
                className="day-nav-button"
                key={section.id}
                onClick={() => setActiveDayId(section.id)}
                type="button"
              >
                <span>{section.label}</span>
                <small>{section.matches.length} matchs</small>
              </button>
            ))}
          </nav>

          <div className="group-panel">
            <div className="section-heading">
              <div>
                <p className="badge badge-live">Chronologie</p>
                <h2>{activeDay.title}</h2>
              </div>
              <p>{activeDay.matches.length} matchs.</p>
            </div>

            <div className="prediction-list">
              {activeDay.matches.map((match) => (
                renderMatch(match)
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {view === "structure" && activeStage ? (
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
      ) : null}

      {view === "structure" && activeStage?.kind === "groups" && activeGroup ? (
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
                <h2>{groupHeading}</h2>
              </div>
              <p>{activeGroup.matches.length} matchs.</p>
            </div>

            <div className="prediction-list">
              {activeGroup.matches.map((match) => (
                renderMatch(match)
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {view === "structure" && activeStage?.kind === "phase" ? (
        <div className="phase-panel">
          <div className="section-heading">
            <div>
              <p className="badge badge-live">{activeStage.title}</p>
              <h2>{phaseHeading}</h2>
            </div>
            <p>{activeStage.matches.length} matchs.</p>
          </div>

          {getPhaseMatchSections(activeStage).map((section) => (
            <div className="match-subsection" key={section.id}>
              <div className="match-subsection-header">
                <h3>{section.title}</h3>
                <span>{section.matches.length} matchs</span>
              </div>
              <div className="prediction-list">
                {section.matches.map((match) => (
                  renderMatch(match)
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}

export function PredictionSchedule({ matches, slug }: PredictionScheduleProps) {
  return (
    <PredictionScheduleBrowser
      groupHeading="Mes scores"
      matches={matches}
      phaseHeading="Mes scores"
      renderMatch={(match) => (
        <PredictionMatchForm key={match.id} match={match} slug={slug} />
      )}
    />
  );
}
