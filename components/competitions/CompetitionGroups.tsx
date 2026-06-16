"use client";

import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { CompetitionKind } from "@prisma/client";

import {
  getCompetitionStageLabel,
  isTwoLeggedCompetitionStage,
} from "@/src/domain/competition-stage";
import { formatMatchScoreText } from "@/src/domain/scoring";
import { getMatchStatusLabel } from "@/src/domain/match-status";
import type {
  CompetitionGroup,
  CompetitionPhase,
  CompetitionScheduleMatch,
} from "@/src/server/competitions";

type CompetitionGroupsProps = {
  competitionKind: CompetitionKind;
  groups: CompetitionGroup[];
  phases: CompetitionPhase[];
};

type TeamFilterOption = {
  id: string;
  name: string;
  flagUrl: string | null;
};

type ChronologicalSection = {
  id: string;
  label: string;
  title: string;
  matches: CompetitionScheduleMatch[];
};

type ScheduleView = "structure" | "chronology";

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Europe/Paris",
});

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

function formatKickoffAt(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Date à confirmer";
  }

  return dateFormatter.format(date);
}

function getTeamName(
  match: CompetitionScheduleMatch,
  side: "home" | "away",
) {
  const team = side === "home" ? match.homeTeam : match.awayTeam;
  const placeholder = side === "home" ? match.homePlaceholder : match.awayPlaceholder;

  return team?.name ?? placeholder ?? "À déterminer";
}

function getTeamFlag(match: CompetitionScheduleMatch, side: "home" | "away") {
  const team = side === "home" ? match.homeTeam : match.awayTeam;

  return team?.flagUrl ?? null;
}

function sortMatchesByKickoff(matches: CompetitionScheduleMatch[]) {
  return [...matches].sort(
    (a, b) => new Date(a.kickoffAt).getTime() - new Date(b.kickoffAt).getTime(),
  );
}

function getInitial(name: string) {
  return name.trim().slice(0, 1).toUpperCase();
}

function TeamFilterLogo({ team }: { team: TeamFilterOption }) {
  if (team.flagUrl) {
    return <img alt="" className="team-flag" loading="lazy" src={team.flagUrl} />;
  }

  return <span className="bonus-team-fallback">{getInitial(team.name)}</span>;
}

function TeamFilterPicker({
  onPick,
  options,
  value,
}: {
  onPick: (value: string) => void;
  options: TeamFilterOption[];
  value: string;
}) {
  const pickerRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const selectedTeam = options.find((team) => team.id === value) ?? null;

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (!pickerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [isOpen]);

  return (
    <div className="bonus-team-picker w-fit min-w-[220px]" ref={pickerRef}>
      <span className="bonus-team-picker-label">Filtrer par pays</span>
      <button
        aria-expanded={isOpen}
        className="bonus-team-picker-trigger min-w-[220px]"
        onClick={() => setIsOpen((open) => !open)}
        type="button"
      >
        <span className="bonus-team-picker-value">
          {selectedTeam ? <TeamFilterLogo team={selectedTeam} /> : null}
          <span>{selectedTeam?.name ?? "Tous les pays"}</span>
        </span>
        <ChevronDown aria-hidden="true" size={18} strokeWidth={3} />
      </button>

      {isOpen ? (
        <div className="bonus-team-picker-menu w-full" role="listbox">
          <button
            aria-selected={value === ""}
            className="bonus-team-picker-option bonus-team-picker-option-clear"
            onClick={() => {
              onPick("");
              setIsOpen(false);
            }}
            role="option"
            type="button"
          >
            <span>Tous les pays</span>
          </button>
          {options.map((team) => (
            <button
              aria-selected={team.id === value}
              className="bonus-team-picker-option"
              key={team.id}
              onClick={() => {
                onPick(team.id);
                setIsOpen(false);
              }}
              role="option"
              type="button"
            >
              <TeamFilterLogo team={team} />
              <span>{team.name}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function matchIncludesTeam(match: CompetitionScheduleMatch, teamId: string) {
  if (!teamId) {
    return true;
  }

  return match.homeTeam?.name === teamId || match.awayTeam?.name === teamId;
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

function getChronologicalSections(matches: CompetitionScheduleMatch[]) {
  const sections = new Map<string, ChronologicalSection>();

  for (const match of sortMatchesByKickoff(matches)) {
    const usesMatchday = match.stage === "LEAGUE_STAGE" && match.matchday !== null;
    const id = usesMatchday
      ? `${match.stage}-${match.matchday}`
      : `day-${getDayKey(match.kickoffAt)}`;
    const label = usesMatchday ? `J${match.matchday}` : getDayLabel(match.kickoffAt);
    const title = usesMatchday ? `Journée ${match.matchday}` : getDayLabel(match.kickoffAt);

    sections.set(id, {
      id,
      label,
      title,
      matches: [...(sections.get(id)?.matches ?? []), match],
    });
  }

  return Array.from(sections.values());
}

function getDefaultChronologicalSectionId(sections: ChronologicalSection[]) {
  const now = Date.now();

  const liveSection = sections.find((section) =>
    section.matches.some((match) => match.status === "LIVE"),
  );

  if (liveSection) {
    return liveSection.id;
  }

  const upcomingSection = sections.find((section) =>
    section.matches.some((match) => new Date(match.kickoffAt).getTime() >= now),
  );

  if (upcomingSection) {
    return upcomingSection.id;
  }

  return sections[0]?.id ?? "";
}

function scrollNavButtonIntoView(
  nav: HTMLElement | null,
  button: HTMLButtonElement | null,
) {
  if (!nav || !button) {
    return;
  }

  const navRect = nav.getBoundingClientRect();
  const buttonRect = button.getBoundingClientRect();
  const delta =
    buttonRect.left -
    navRect.left -
    nav.clientWidth / 2 +
    buttonRect.width / 2;

  nav.scrollTo({
    left: nav.scrollLeft + delta,
    behavior: "smooth",
  });
}

function getPhaseMatchSections(
  competitionKind: CompetitionKind,
  phase: CompetitionPhase,
) {
  const matches = sortMatchesByKickoff(phase.matches);

  if (
    phase.stage === "LEAGUE_STAGE" &&
    matches.some((match) => match.matchday !== null)
  ) {
    const matchesByMatchday = new Map<number, CompetitionScheduleMatch[]>();

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
    isTwoLeggedCompetitionStage(competitionKind, phase.stage) &&
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

function MatchList({ matches }: { matches: CompetitionScheduleMatch[] }) {
  return (
    <div className="match-list">
      {matches.length === 0 ? (
        <p>Aucun match importé pour cette section.</p>
      ) : (
        matches.map((match) => (
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
                {formatMatchScoreText(match)}
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

            <span className="match-status">{getMatchStatusLabel(match.status)}</span>
          </article>
        ))
      )}
    </div>
  );
}

export function CompetitionGroups({
  competitionKind,
  groups,
  phases,
}: CompetitionGroupsProps) {
  const dayNavRef = useRef<HTMLElement>(null);
  const dayButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [dayNavCanScrollLeft, setDayNavCanScrollLeft] = useState(false);
  const [dayNavCanScrollRight, setDayNavCanScrollRight] = useState(false);
  const teamOptions = useMemo(() => {
    const options = new Map<string, TeamFilterOption>();

    for (const match of [...groups.flatMap((group) => group.matches), ...phases.flatMap((phase) => phase.matches)]) {
      if (match.homeTeam?.name) {
        options.set(match.homeTeam.name, {
          id: match.homeTeam.name,
          flagUrl: match.homeTeam.flagUrl ?? null,
          name: match.homeTeam.name,
        });
      }

      if (match.awayTeam?.name) {
        options.set(match.awayTeam.name, {
          id: match.awayTeam.name,
          flagUrl: match.awayTeam.flagUrl ?? null,
          name: match.awayTeam.name,
        });
      }
    }

    return Array.from(options.values()).sort((a, b) => a.name.localeCompare(b.name, "fr"));
  }, [groups, phases]);
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const filteredGroups = useMemo(
    () =>
      groups
        .map((group) => ({
          ...group,
          matches: group.matches.filter((match) => matchIncludesTeam(match, selectedTeamId)),
        }))
        .filter((group) => group.matches.length > 0 || !selectedTeamId),
    [groups, selectedTeamId],
  );
  const filteredPhases = useMemo(
    () =>
      phases
        .map((phase) => ({
          ...phase,
          matches: phase.matches.filter((match) => matchIncludesTeam(match, selectedTeamId)),
        }))
        .filter((phase) => phase.matches.length > 0),
    [phases, selectedTeamId],
  );
  const stages = useMemo(
    () => [
      ...(filteredGroups.length > 0
        ? [
            {
              id: "GROUPS",
              label: "Groupes",
              title: "Phase de groupes",
              kind: "groups" as const,
            },
          ]
        : []),
      ...filteredPhases.map((phase) => ({
        id: phase.name,
        label: phase.name,
        title: phase.name,
        kind: "phase" as const,
        phase,
      })),
    ],
    [filteredGroups.length, filteredPhases],
  );
  const allMatches = useMemo(
    () => sortMatchesByKickoff([...filteredGroups.flatMap((group) => group.matches), ...filteredPhases.flatMap((phase) => phase.matches)]),
    [filteredGroups, filteredPhases],
  );
  const chronologicalSections = useMemo(
    () => getChronologicalSections(allMatches),
    [allMatches],
  );
  const defaultDayId = useMemo(
    () => getDefaultChronologicalSectionId(chronologicalSections),
    [chronologicalSections],
  );
  const [view, setView] = useState<ScheduleView>("chronology");
  const [activeStageIndex, setActiveStageIndex] = useState(0);
  const [activeGroupName, setActiveGroupName] = useState(filteredGroups[0]?.name ?? "");
  const [activeDayId, setActiveDayId] = useState(defaultDayId);
  const activeStage = stages[activeStageIndex] ?? stages[0];
  const activeGroup =
    filteredGroups.find((group) => group.name === activeGroupName) ?? filteredGroups[0];
  const activeDay =
    chronologicalSections.find((section) => section.id === activeDayId) ??
    chronologicalSections[0];
  const previousStage = stages[activeStageIndex - 1];
  const nextStage = stages[activeStageIndex + 1];

  useEffect(() => {
    if (activeStageIndex < stages.length) {
      return;
    }

    setActiveStageIndex(0);
  }, [activeStageIndex, stages.length]);

  useEffect(() => {
    if (activeGroupName && filteredGroups.some((group) => group.name === activeGroupName)) {
      return;
    }

    setActiveGroupName(filteredGroups[0]?.name ?? "");
  }, [activeGroupName, filteredGroups]);

  useEffect(() => {
    if (activeDayId && chronologicalSections.some((section) => section.id === activeDayId)) {
      return;
    }

    if (defaultDayId && defaultDayId !== activeDayId) {
      setActiveDayId(defaultDayId);
    }
  }, [activeDayId, chronologicalSections, defaultDayId]);

  useEffect(() => {
    if (view !== "chronology" || !activeDayId) {
      setDayNavCanScrollLeft(false);
      setDayNavCanScrollRight(false);
      return;
    }

    scrollNavButtonIntoView(dayNavRef.current, dayButtonRefs.current[activeDayId] ?? null);

    const nav = dayNavRef.current;

    if (!nav) {
      return;
    }

    const updateScrollState = () => {
      const maxScrollLeft = nav.scrollWidth - nav.clientWidth;
      setDayNavCanScrollLeft(nav.scrollLeft > 0);
      setDayNavCanScrollRight(maxScrollLeft > 1 && nav.scrollLeft < maxScrollLeft - 1);
    };

    updateScrollState();
    nav.addEventListener("scroll", updateScrollState, { passive: true });

    const resizeObserver = new ResizeObserver(updateScrollState);
    resizeObserver.observe(nav);

    return () => {
      nav.removeEventListener("scroll", updateScrollState);
      resizeObserver.disconnect();
    };
  }, [activeDayId, view]);

  const scrollDayNav = (direction: -1 | 1) => {
    const nav = dayNavRef.current;

    if (!nav) {
      return;
    }

    nav.scrollBy({
      left: direction * Math.max(220, nav.clientWidth * 0.7),
      behavior: "smooth",
    });
  };

  if (!activeStage && !activeDay) {
    return null;
  }

  return (
    <div className="schedule-browser">
      <TeamFilterPicker
        onPick={setSelectedTeamId}
        options={teamOptions}
        value={selectedTeamId}
      />

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
          <div className="day-nav-shell">
            <button
              aria-label="Journées précédentes"
              className="day-nav-chevrons day-nav-chevrons-left"
              disabled={!dayNavCanScrollLeft}
              onClick={() => scrollDayNav(-1)}
              type="button"
            >
              <ChevronLeft aria-hidden="true" size={18} strokeWidth={3} />
            </button>
            <nav aria-label="Journées" className="day-nav" ref={dayNavRef}>
              {chronologicalSections.map((section) => (
                <button
                  aria-pressed={section.id === activeDay.id}
                  className="day-nav-button"
                  key={section.id}
                  ref={(element) => {
                    dayButtonRefs.current[section.id] = element;
                  }}
                  onClick={() => setActiveDayId(section.id)}
                  type="button"
                >
                  <span>{section.label}</span>
                  <small>{section.matches.length} matchs</small>
                </button>
              ))}
            </nav>
            <button
              aria-label="Journées suivantes"
              className="day-nav-chevrons day-nav-chevrons-right"
              disabled={!dayNavCanScrollRight}
              onClick={() => scrollDayNav(1)}
              type="button"
            >
              <ChevronRight aria-hidden="true" size={18} strokeWidth={3} />
            </button>
          </div>

          <div className="group-panel">
            <div className="section-heading">
              <div>
                <p className="badge badge-live">{activeDay.title}</p>
              </div>
              <p className="badge badge-warning mt-2">{activeDay.matches.length} matchs</p>
            </div>

            <MatchList matches={activeDay.matches} />
          </div>
        </div>
      ) : null}

      {view === "chronology" && !activeDay ? (
        <p>Aucun match pour ce pays.</p>
      ) : null}

      {view === "structure" ? (
        <div className="phase-pager">
          <button
            aria-label="Phase précédente"
            className="phase-arrow"
            disabled={!previousStage}
            onClick={() => setActiveStageIndex((index) => Math.max(0, index - 1))}
            type="button"
          >
            <ChevronLeft aria-hidden="true" size={18} strokeWidth={3} />
          </button>
          <div>
            <p className="badge badge-live">{activeStage.label}</p>
            <h2>{activeStage.title}</h2>
          </div>
          <button
            aria-label="Phase suivante"
            className="phase-arrow"
            disabled={!nextStage}
            onClick={() =>
              setActiveStageIndex((index) => Math.min(stages.length - 1, index + 1))
            }
            type="button"
          >
            <ChevronRight aria-hidden="true" size={18} strokeWidth={3} />
          </button>
        </div>
      ) : null}

      {view === "structure" && activeStage?.kind === "groups" && activeGroup ? (
        <div className="group-browser">
          <nav aria-label="Groupes" className="group-nav">
            {filteredGroups.map((group) => (
              <button
                aria-pressed={group.name === activeGroup.name}
                className="group-nav-button"
                key={group.name}
                onClick={() => setActiveGroupName(group.name)}
                type="button"
              >
                {group.name.replace("Groupe ", "")}
              </button>
            ))}
          </nav>

          <div className="group-panel">
            <div className="section-heading">
              <div>
                <p className="badge badge-live">{activeGroup.name}</p>
              </div>
            </div>

            <div className="standings-table-wrap">
              <table className="standings-table">
                <thead>
                  <tr>
                    <th>Équipe</th>
                    <th>J</th>
                    <th>G</th>
                    <th>N</th>
                    <th>P</th>
                    <th>Diff</th>
                    <th>Pts</th>
                  </tr>
                </thead>
                <tbody>
                  {activeGroup.standings.map((row) => (
                    <tr key={row.team.name}>
                      <td>
                        <span className="standings-team">
                          {row.team.flagUrl ? (
                            <img
                              alt=""
                              className="team-flag"
                              loading="lazy"
                              src={row.team.flagUrl}
                            />
                          ) : null}
                          <span>{row.team.name}</span>
                        </span>
                      </td>
                      <td>{row.played}</td>
                      <td>{row.won}</td>
                      <td>{row.drawn}</td>
                      <td>{row.lost}</td>
                      <td>{row.goalDifference}</td>
                      <td>{row.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <MatchList matches={activeGroup.matches} />
          </div>
        </div>
      ) : null}

      {view === "structure" && activeStage?.kind === "phase" ? (
        <div className="phase-panel">
          <div className="section-heading">
            <div>
              <p className="badge badge-live">{activeStage.title}</p>
            </div>
          </div>
          {getPhaseMatchSections(competitionKind, activeStage.phase).map((section) => (
            <div className="match-subsection" key={section.id}>
              <div className="match-subsection-header">
                <h3>{section.title}</h3>
                <span>{section.matches.length} matchs</span>
              </div>
              <MatchList matches={section.matches} />
            </div>
          ))}
        </div>
      ) : null}

      {view === "structure" && !activeStage ? (
        <p>Aucun match pour ce pays.</p>
      ) : null}
    </div>
  );
}
