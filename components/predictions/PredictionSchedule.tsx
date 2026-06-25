"use client";

import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { CompetitionKind } from "@prisma/client";
import { useSearchParams } from "next/navigation";

import { PredictionMatchForm } from "@/components/predictions/PredictionMatchForm";
import {
  CountryFilterPicker,
  buildCountryFilterOptions,
  filterMatchesByCountry,
} from "@/components/predictions/CountryFilter";
import {
  competitionStageOrder,
  getCompetitionStageLabel,
  isTwoLeggedCompetitionStage,
} from "@/src/domain/competition-stage";
import type { PredictionMatch } from "@/src/server/predictions";

type PredictionScheduleProps = {
  competitionKind: CompetitionKind;
  matches: PredictionMatch[];
  slug: string;
  targetMatchId?: string | null;
};

type SavedPredictionDraft = {
  awayScore: number;
  homeScore: number;
  matchId: string;
};

export type ScheduleMatch = {
  id: string;
  kickoffAt: string;
  stage: string;
  matchday: number | null;
  status?: string;
  liveMinute?: number | null;
  homeTeam: {
    name: string;
    flagUrl?: string | null;
  } | null;
  awayTeam: {
    name: string;
    flagUrl?: string | null;
  } | null;
};

type PredictionScheduleBrowserProps<TMatch extends ScheduleMatch> = {
  competitionKind: CompetitionKind;
  groupHeading: string;
  matches: TMatch[];
  phaseHeading: string;
  targetMatchId?: string | null;
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

function arePredictionMatchesEqual(
  currentMatch: PredictionMatch,
  nextMatch: PredictionMatch,
) {
  return (
    currentMatch.id === nextMatch.id &&
    currentMatch.kickoffAt === nextMatch.kickoffAt &&
    currentMatch.stage === nextMatch.stage &&
    currentMatch.matchday === nextMatch.matchday &&
    currentMatch.status === nextMatch.status &&
    currentMatch.liveMinute === nextMatch.liveMinute &&
    currentMatch.homeScore === nextMatch.homeScore &&
    currentMatch.awayScore === nextMatch.awayScore &&
    currentMatch.regularHomeScore === nextMatch.regularHomeScore &&
    currentMatch.regularAwayScore === nextMatch.regularAwayScore &&
    currentMatch.extraTimeHomeScore === nextMatch.extraTimeHomeScore &&
    currentMatch.extraTimeAwayScore === nextMatch.extraTimeAwayScore &&
    currentMatch.penaltyHomeScore === nextMatch.penaltyHomeScore &&
    currentMatch.penaltyAwayScore === nextMatch.penaltyAwayScore &&
    currentMatch.homePlaceholder === nextMatch.homePlaceholder &&
    currentMatch.awayPlaceholder === nextMatch.awayPlaceholder &&
    currentMatch.canPredict === nextMatch.canPredict &&
    currentMatch.prediction?.homeScore === nextMatch.prediction?.homeScore &&
    currentMatch.prediction?.awayScore === nextMatch.prediction?.awayScore &&
    currentMatch.homeTeam?.name === nextMatch.homeTeam?.name &&
    currentMatch.homeTeam?.flagUrl === nextMatch.homeTeam?.flagUrl &&
    currentMatch.awayTeam?.name === nextMatch.awayTeam?.name &&
    currentMatch.awayTeam?.flagUrl === nextMatch.awayTeam?.flagUrl
  );
}

function mergePredictionMatches(
  currentMatches: PredictionMatch[],
  nextMatches: PredictionMatch[],
) {
  const currentById = new Map(currentMatches.map((match) => [match.id, match]));
  let hasChanged = currentMatches.length !== nextMatches.length;
  const mergedMatches = nextMatches.map((nextMatch, index) => {
    const currentMatch = currentById.get(nextMatch.id);

    if (!currentMatch) {
      hasChanged = true;
      return nextMatch;
    }

    if (currentMatches[index]?.id !== nextMatch.id) {
      hasChanged = true;
    }

    if (arePredictionMatchesEqual(currentMatch, nextMatch)) {
      return currentMatch;
    }

    hasChanged = true;
    return nextMatch;
  });

  return hasChanged ? mergedMatches : currentMatches;
}

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

const MATCHES_REFRESH_INTERVAL_MS = 30000;

function isScoreInputFocused() {
  return Boolean(document.activeElement?.closest(".prediction-inputs"));
}

function teamKey(name: string) {
  return (aliases[name] ?? name).toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function sortMatchesByKickoff<TMatch extends ScheduleMatch>(matches: TMatch[]) {
  return [...matches].sort(
    (a, b) => new Date(a.kickoffAt).getTime() - new Date(b.kickoffAt).getTime(),
  );
}

function getPhaseMatchSections<TMatch extends ScheduleMatch>(
  competitionKind: CompetitionKind,
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
    isTwoLeggedCompetitionStage(competitionKind, section.id) &&
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

function getDefaultChronologicalSectionId<TMatch extends ScheduleMatch>(
  sections: ChronologicalSection<TMatch>[],
  targetMatch: TMatch | null,
) {
  if (targetMatch) {
    const targetSection = sections.find((section) =>
      section.matches.some((match) => match.id === targetMatch.id),
    );

    if (targetSection) {
      return targetSection.id;
    }
  }

  return (
    sections[0]?.id ??
    sections[sections.length - 1]?.id ??
    ""
  );
}

function getPriorityMatch<TMatch extends ScheduleMatch>(matches: TMatch[]) {
  const now = Date.now();

  return (
    matches.find((match) => match.status === "LIVE") ??
    matches.find((match) => new Date(match.kickoffAt).getTime() >= now) ??
    matches[matches.length - 1] ??
    null
  );
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

function PendingPredictionPanel({
  onPredictionSaved,
  matches,
  slug,
}: {
  onPredictionSaved: (prediction: SavedPredictionDraft) => void;
  matches: PredictionMatch[];
  slug: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const pendingMatches = sortMatchesByKickoff(
    matches.filter((match) => match.canPredict && !match.prediction),
  );

  if (pendingMatches.length === 0) {
    return (
      <div className="pending-predictions-panel pending-predictions-panel-done">
        <p className="badge badge-live">Pronos à poser</p>
        <strong>Tout est à jour.</strong>
        <span>Aucun match ouvert n'attend ton score.</span>
      </div>
    );
  }

  return (
    <details
      className="pending-predictions-panel"
      onToggle={(event) => {
        setIsOpen(event.currentTarget.open);
      }}
      open={isOpen}
    >
      <summary>
        <span>
          <span className="badge badge-warning">Pronos à poser</span>
          <strong>
            {pendingMatches.length} match{pendingMatches.length > 1 ? "s" : ""}
          </strong>
        </span>
        <span
          aria-hidden="true"
          className="pending-predictions-summary-action"
        >
          <ChevronDown size={18} strokeWidth={3} />
        </span>
      </summary>

      {isOpen ? (
        <div className="pending-predictions-list">
          {pendingMatches.map((match) => (
            <PredictionMatchForm
              key={`pending-${match.id}`}
              match={match}
              onSaved={onPredictionSaved}
              slug={slug}
            />
          ))}
        </div>
      ) : null}
    </details>
  );
}

export function PredictionScheduleBrowser<TMatch extends ScheduleMatch>({
  competitionKind,
  groupHeading,
  matches,
  phaseHeading,
  targetMatchId,
  renderMatch,
}: PredictionScheduleBrowserProps<TMatch>) {
  const dayNavRef = useRef<HTMLElement>(null);
  const groupNavRef = useRef<HTMLElement>(null);
  const dayButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const groupButtonRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const skipNextDayNavScrollRef = useRef(false);
  const [dayNavCanScrollLeft, setDayNavCanScrollLeft] = useState(false);
  const [dayNavCanScrollRight, setDayNavCanScrollRight] = useState(false);
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
    const knownStages = new Set(competitionStageOrder);
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
    const phaseSections = [...competitionStageOrder, ...extraStages]
      .filter((stage) => !excludedStages.has(stage))
      .map((stage) => ({
        id: stage,
        label: getCompetitionStageLabel(stage),
        title: getCompetitionStageLabel(stage),
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
  const priorityMatch = useMemo(() => getPriorityMatch(matches), [matches]);
  const defaultDayId = getDefaultChronologicalSectionId(
    chronologicalSections,
    priorityMatch,
  );
  const [view, setView] = useState<ScheduleView>("chronology");
  const [activeStageIndex, setActiveStageIndex] = useState(0);
  const [activeGroupId, setActiveGroupId] = useState<string>(
    groupSections[0]?.id ?? "",
  );
  const [activeDayId, setActiveDayId] = useState(defaultDayId);
  const appliedTargetMatchIdRef = useRef<string | null>(null);
  const [targetScrollMatchId, setTargetScrollMatchId] = useState<string | null>(null);
  const targetScrollRetryRef = useRef<number | null>(null);
  const activeStage = stages[activeStageIndex] ?? stages[0];
  const activeGroup =
    groupSections.find((section) => section.id === activeGroupId) ?? groupSections[0];
  const activeDay =
    chronologicalSections.find((section) => section.id === activeDayId) ??
    chronologicalSections[0];
  const activeDayIndex = chronologicalSections.findIndex(
    (section) => section.id === activeDay?.id,
  );
  const [mountedDayIds, setMountedDayIds] = useState<Set<string>>(
    () => new Set(defaultDayId ? [defaultDayId] : []),
  );
  const previousStage = stages[activeStageIndex - 1];
  const nextStage = stages[activeStageIndex + 1];
  const matchById = useMemo(() => new Map(matches.map((match) => [match.id, match])), [matches]);
  const mountDaySection = useCallback((sectionId: string) => {
    setMountedDayIds((currentMountedDayIds) => {
      if (currentMountedDayIds.has(sectionId)) {
        return currentMountedDayIds;
      }

      return new Set([...currentMountedDayIds, sectionId]);
    });
  }, []);
  const mountedChronologicalSections = useMemo(
    () =>
      chronologicalSections.filter((section) =>
        mountedDayIds.has(section.id),
      ),
    [chronologicalSections, mountedDayIds],
  );

  useEffect(() => {
    if (!targetMatchId) {
      appliedTargetMatchIdRef.current = null;
      setTargetScrollMatchId(null);
      return;
    }

    if (appliedTargetMatchIdRef.current === targetMatchId) {
      return;
    }

    const targetMatch = matchById.get(targetMatchId) ?? null;

    if (!targetMatch) {
      return;
    }

    const targetDay = chronologicalSections.find((section) =>
      section.matches.some((match) => match.id === targetMatch.id),
    );

    if (targetDay) {
      appliedTargetMatchIdRef.current = targetMatchId;
      setView("chronology");
      setActiveDayId(targetDay.id);
      setTargetScrollMatchId(targetMatchId);
    }
  }, [chronologicalSections, matchById, targetMatchId]);

  useEffect(() => {
    if (view !== "chronology" || !targetScrollMatchId) {
      return;
    }

    if (targetScrollRetryRef.current !== null) {
      window.clearTimeout(targetScrollRetryRef.current);
      targetScrollRetryRef.current = null;
    }

    let attempts = 0;
    const scrollToTarget = () => {
      const targetElement = document.getElementById(`match-${targetScrollMatchId}`);

      if (targetElement) {
        targetElement.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
        targetScrollRetryRef.current = null;
        setTargetScrollMatchId(null);
        return;
      }

      attempts += 1;

      if (attempts < 10) {
        targetScrollRetryRef.current = window.setTimeout(scrollToTarget, 60);
        return;
      }

      targetScrollRetryRef.current = null;
      setTargetScrollMatchId(null);
    };

    targetScrollRetryRef.current = window.setTimeout(scrollToTarget, 0);

    return () => {
      if (targetScrollRetryRef.current !== null) {
        window.clearTimeout(targetScrollRetryRef.current);
        targetScrollRetryRef.current = null;
      }
    };
  }, [activeDayId, targetScrollMatchId, view]);

  useEffect(() => {
    if (activeDayId && chronologicalSections.some((section) => section.id === activeDayId)) {
      return;
    }

    if (defaultDayId && defaultDayId !== activeDayId) {
      setActiveDayId(defaultDayId);
    }
  }, [activeDayId, chronologicalSections, defaultDayId]);

  useEffect(() => {
    const sectionIds = new Set(chronologicalSections.map((section) => section.id));
    const idsToMount = [
      activeDay?.id,
      chronologicalSections[activeDayIndex - 1]?.id,
      chronologicalSections[activeDayIndex + 1]?.id,
    ].filter((id): id is string => Boolean(id));

    setMountedDayIds((currentMountedDayIds) => {
      let hasChanged = false;
      const nextMountedDayIds = new Set<string>();

      for (const sectionId of currentMountedDayIds) {
        if (sectionIds.has(sectionId)) {
          nextMountedDayIds.add(sectionId);
        } else {
          hasChanged = true;
        }
      }

      for (const sectionId of idsToMount) {
        if (!nextMountedDayIds.has(sectionId)) {
          nextMountedDayIds.add(sectionId);
          hasChanged = true;
        }
      }

      return hasChanged ? nextMountedDayIds : currentMountedDayIds;
    });
  }, [activeDay?.id, activeDayIndex, chronologicalSections]);

  useEffect(() => {
    if (view !== "chronology" || chronologicalSections.length === 0) {
      return;
    }

    let isCancelled = false;
    let idleCallbackId: number | null = null;
    let timeoutId: number | null = null;

    const scheduleNextMount = () => {
      if (isCancelled) {
        return;
      }

      if (typeof window.requestIdleCallback === "function") {
        idleCallbackId = window.requestIdleCallback(mountNextIdleDays, {
          timeout: 800,
        });
      } else {
        timeoutId = window.setTimeout(mountNextIdleDays, 120);
      }
    };

    const mountNextIdleDays = () => {
      if (isCancelled) {
        return;
      }

      let mountedMoreDays = false;

      setMountedDayIds((currentMountedDayIds) => {
        const nextMountedDayIds = new Set(currentMountedDayIds);
        let mountedCount = 0;

        for (const section of chronologicalSections) {
          if (nextMountedDayIds.has(section.id)) {
            continue;
          }

          nextMountedDayIds.add(section.id);
          mountedMoreDays = true;
          mountedCount += 1;

          if (mountedCount >= 2) {
            break;
          }
        }

        return mountedMoreDays ? nextMountedDayIds : currentMountedDayIds;
      });

      if (mountedMoreDays) {
        scheduleNextMount();
      }
    };

    scheduleNextMount();

    return () => {
      isCancelled = true;

      if (idleCallbackId !== null) {
        window.cancelIdleCallback(idleCallbackId);
      }

      if (timeoutId !== null) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [chronologicalSections, view]);

  useEffect(() => {
    if (!activeGroupId || !groupSections.some((section) => section.id === activeGroupId)) {
      if (groupSections[0] && activeGroupId !== groupSections[0].id) {
        setActiveGroupId(groupSections[0].id);
      }
    }
  }, [activeGroupId, groupSections]);

  useEffect(() => {
    if (activeStageIndex < 0 || activeStageIndex >= stages.length) {
      if (stages.length > 0) {
        setActiveStageIndex(0);
      }
    }
  }, [activeStageIndex, stages.length]);

  useEffect(() => {
    if (!activeGroupId && groupSections[0]) {
      setActiveGroupId(groupSections[0].id);
    }
  }, [activeGroupId, groupSections]);

  useEffect(() => {
    if (view !== "chronology" || !activeDayId) {
      return;
    }

    if (skipNextDayNavScrollRef.current) {
      skipNextDayNavScrollRef.current = false;
    } else {
      scrollNavButtonIntoView(dayNavRef.current, dayButtonRefs.current[activeDayId] ?? null);
    }

    const nav = dayNavRef.current;

    if (!nav) {
      return;
    }

    const frame = requestAnimationFrame(() => {
      const maxScrollLeft = nav.scrollWidth - nav.clientWidth;
      setDayNavCanScrollLeft(nav.scrollLeft > 0);
      setDayNavCanScrollRight(nav.scrollLeft < maxScrollLeft - 1);
    });

    return () => {
      cancelAnimationFrame(frame);
    };
  }, [activeDayId, view]);

  useEffect(() => {
    if (view !== "structure" || !activeGroupId) {
      return;
    }

    scrollNavButtonIntoView(groupNavRef.current, groupButtonRefs.current[activeGroupId] ?? null);
  }, [activeGroupId, view]);

  useEffect(() => {
    if (view !== "chronology") {
      setDayNavCanScrollLeft(false);
      setDayNavCanScrollRight(false);
      return;
    }

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
  }, [view, chronologicalSections.length]);

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
                  onClick={() => {
                    skipNextDayNavScrollRef.current = true;
                    mountDaySection(section.id);
                    setActiveDayId(section.id);
                  }}
                  onFocus={() => mountDaySection(section.id)}
                  onMouseEnter={() => mountDaySection(section.id)}
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

          <div className="day-panels">
            {mountedChronologicalSections.map((section) => (
              <div
                className="group-panel"
                hidden={section.id !== activeDay.id}
                key={section.id}
              >
                <div className="section-heading">
                  <div>
                    <p className="badge badge-live">{section.title}</p>
                  </div>
                  <p className="badge badge-warning mt-2">
                    {section.matches.length} matchs
                  </p>
                </div>

                <div className="prediction-list">
                  {section.matches.map((match) => renderMatch(match))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {view === "structure" && activeStage ? (
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
          <nav aria-label="Groupes" className="group-nav" ref={groupNavRef}>
            {groupSections.map((section) => (
              <button
                aria-pressed={section.id === activeGroup.id}
                className="group-nav-button"
                key={section.id}
                ref={(element) => {
                  groupButtonRefs.current[section.id] = element;
                }}
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
              </div>
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

          {getPhaseMatchSections(competitionKind, activeStage).map((section) => (
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

export function PredictionSchedule({
  competitionKind,
  matches: initialMatches,
  slug,
  targetMatchId: targetMatchIdProp = null,
}: PredictionScheduleProps) {
  const searchParams = useSearchParams();
  const targetMatchId = targetMatchIdProp ?? searchParams.get("match");
  const [matches, setMatches] = useState(initialMatches);
  const countryOptions = useMemo(() => buildCountryFilterOptions(matches), [matches]);
  const [selectedCountryId, setSelectedCountryId] = useState("");
  const scheduleMatches = useMemo(
    () => filterMatchesByCountry(matches, selectedCountryId),
    [matches, selectedCountryId],
  );
  const handlePredictionSaved = useCallback((prediction: SavedPredictionDraft) => {
    setMatches((currentMatches) => {
      let hasChanged = false;
      const nextMatches = currentMatches.map((match) => {
        if (match.id !== prediction.matchId) {
          return match;
        }

        if (
          match.prediction?.homeScore === prediction.homeScore &&
          match.prediction?.awayScore === prediction.awayScore
        ) {
          return match;
        }

        hasChanged = true;
        return {
          ...match,
          prediction: {
            awayScore: prediction.awayScore,
            homeScore: prediction.homeScore,
          },
        };
      });

      return hasChanged ? nextMatches : currentMatches;
    });
  }, []);
  const renderPredictionMatch = useCallback(
    (match: PredictionMatch) => (
      <PredictionMatchForm
        anchorId={`match-${match.id}`}
        key={match.id}
        match={match}
        onSaved={handlePredictionSaved}
        slug={slug}
      />
    ),
    [handlePredictionSaved, slug],
  );

  useEffect(() => {
    setMatches((currentMatches) =>
      mergePredictionMatches(currentMatches, initialMatches),
    );
  }, [initialMatches]);

  useEffect(() => {
    let isActive = true;
    let controller: AbortController | null = null;

    const refreshMatches = async () => {
      if (document.visibilityState !== "visible" || isScoreInputFocused()) {
        return;
      }

      controller?.abort();
      controller = new AbortController();
      const currentController = controller;

      try {
        const response = await fetch(
          `/api/competitions/${encodeURIComponent(slug)}/pronos/matches`,
          {
            cache: "no-store",
            signal: currentController.signal,
          },
        );

        if (!response.ok) {
          return;
        }

        const payload = (await response.json()) as { matches?: PredictionMatch[] };

        if (isActive && Array.isArray(payload.matches) && !isScoreInputFocused()) {
          setMatches((currentMatches) =>
            mergePredictionMatches(currentMatches, payload.matches ?? []),
          );
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
      } finally {
        if (controller === currentController) {
          controller = null;
        }
      }
    };

    const intervalId = window.setInterval(() => {
      void refreshMatches();
    }, MATCHES_REFRESH_INTERVAL_MS);
    const refreshVisibleMatches = () => {
      void refreshMatches();
    };

    document.addEventListener("visibilitychange", refreshVisibleMatches);

    return () => {
      isActive = false;
      window.clearInterval(intervalId);
      controller?.abort();
      document.removeEventListener("visibilitychange", refreshVisibleMatches);
    };
  }, [slug]);

  return (
    <>
      <PendingPredictionPanel
        matches={matches}
        onPredictionSaved={handlePredictionSaved}
        slug={slug}
      />
      <CountryFilterPicker
        onPick={setSelectedCountryId}
        options={countryOptions}
        value={selectedCountryId}
      />
      {scheduleMatches.length === 0 ? (
        <p>Aucun match pour ce pays.</p>
      ) : (
        <PredictionScheduleBrowser
          competitionKind={competitionKind}
          groupHeading="Mes scores"
          matches={scheduleMatches}
          phaseHeading="Mes scores"
          targetMatchId={targetMatchId}
          renderMatch={renderPredictionMatch}
        />
      )}
    </>
  );
}
