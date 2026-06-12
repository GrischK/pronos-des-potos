"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

type DebugTeam = {
  name?: string | null;
  crest?: string | null;
};

export type ApiDebugMatch = {
  id?: number | string;
  utcDate?: string | null;
  status?: string | null;
  stage?: string | null;
  matchday?: number | null;
  homeTeam?: DebugTeam | null;
  awayTeam?: DebugTeam | null;
  score?: {
    fullTime?: {
      home?: number | null;
      away?: number | null;
    } | null;
  } | null;
};

type ApiDebugMatchesProps = {
  matches: ApiDebugMatch[];
  initialFilters?: {
    status?: string;
    date?: string;
    group?: string;
    country?: string;
  };
};

type FilterOption = {
  label: string;
  value: string;
};

type CountryOption = {
  crest: string | null;
  label: string;
  value: string;
};

const dateLabelFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function normalizeStatus(status: string | null | undefined) {
  return (status ?? "").toUpperCase();
}

function getMatchGroup(status: string | null | undefined) {
  const normalized = normalizeStatus(status);

  if (["IN_PLAY", "PAUSED", "LIVE"].includes(normalized)) {
    return 0;
  }

  if (["FINISHED", "AWARDED"].includes(normalized)) {
    return 2;
  }

  return 1;
}

function getMatchStatusLabel(status: string | null | undefined) {
  const normalized = normalizeStatus(status);

  if (normalized === "IN_PLAY" || normalized === "PAUSED" || normalized === "LIVE") {
    return "En cours";
  }

  if (normalized === "FINISHED" || normalized === "AWARDED") {
    return "Terminé";
  }

  if (normalized === "SCHEDULED") {
    return "Scheduled";
  }

  if (normalized === "POSTPONED") {
    return "Reporté";
  }

  if (normalized === "CANCELLED") {
    return "Annulé";
  }

  if (normalized === "SUSPENDED") {
    return "Interrompu";
  }

  return status ?? "Inconnu";
}

function isLiveStatus(status: string | null | undefined) {
  return ["IN_PLAY", "PAUSED", "LIVE"].includes(normalizeStatus(status));
}

function getTeamName(team: DebugTeam | null | undefined) {
  return team?.name ?? "À déterminer";
}

function getScoreLabel(match: ApiDebugMatch) {
  const home = match.score?.fullTime?.home;
  const away = match.score?.fullTime?.away;

  if (home === null || home === undefined || away === null || away === undefined) {
    return "-";
  }

  return `${home} - ${away}`;
}

function getMatchDateLabel(match: ApiDebugMatch) {
  if (!match.utcDate) {
    return "Date inconnue";
  }

  const date = new Date(match.utcDate);

  if (Number.isNaN(date.getTime())) {
    return "Date inconnue";
  }

  return dateLabelFormatter.format(date);
}

function getMatchDateKey(match: ApiDebugMatch) {
  if (!match.utcDate) {
    return "";
  }

  const date = new Date(match.utcDate);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Paris",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    return "";
  }

  return `${year}-${month}-${day}`;
}

function formatDisplayDate(dateKey: string) {
  if (!dateKey) {
    return "";
  }

  const [year, month, day] = dateKey.split("-");

  if (!year || !month || !day) {
    return "";
  }

  return `${day}/${month}/${year}`;
}

function parseDisplayDate(value: string) {
  const sanitized = value.trim().replace(/\s+/g, "");
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(sanitized);

  if (!match) {
    return "";
  }

  const [, day, month, year] = match;
  return `${year}-${month}-${day}`;
}

function renderTeam(team: DebugTeam | null | undefined) {
  const name = getTeamName(team);
  const flagUrl = team?.crest ?? null;

  return (
    <span className="admin-api-debug-team">
      {flagUrl ? (
        <img alt="" className="team-flag" loading="lazy" src={flagUrl} />
      ) : (
        <span className="team-flag team-flag-fallback">{name.slice(0, 2)}</span>
      )}
      <span>{name}</span>
    </span>
  );
}

function sortCountryOptions(left: CountryOption, right: CountryOption) {
  return left.label.localeCompare(right.label, "fr");
}

function DebugDropdown({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: FilterOption[];
  value: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = options.find((option) => option.value === value) ?? options[0];

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  return (
    <div ref={rootRef} className="bonus-team-picker admin-api-debug-picker">
      <span className="bonus-team-picker-label">{label}</span>
      <button
        aria-expanded={open}
        className="bonus-team-picker-trigger"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span className="bonus-team-picker-value">
          <span>{selected?.label ?? "Tous"}</span>
        </span>
        <ChevronDown aria-hidden="true" size={18} strokeWidth={3} />
      </button>

      {open ? (
        <div className="bonus-team-picker-menu" role="listbox">
          {options.map((option) => (
            <button
              aria-selected={option.value === value}
              className="bonus-team-picker-option"
              key={option.value}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
              role="option"
              type="button"
            >
              <span>{option.label}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function DateFilter({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string, inputValue: string) => void;
  value: string;
}) {
  return (
    <label className="bonus-team-picker admin-api-debug-picker">
      <span className="bonus-team-picker-label">{label}</span>
      <input
        className="bonus-team-picker-trigger admin-api-debug-text-input"
        inputMode="numeric"
        onChange={(event) => onChange(parseDisplayDate(event.target.value), event.target.value)}
        placeholder="12/06/2026"
        value={value}
      />
    </label>
  );
}

function CountryFilter({
  label,
  onChange,
  options,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  options: CountryOption[];
  value: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const [inputValue, setInputValue] = useState(value);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  const filteredOptions = useMemo(() => {
    const query = inputValue.trim().toLowerCase();

    if (!query) {
      return options;
    }

    return options.filter((option) => option.label.toLowerCase().includes(query));
  }, [inputValue, options]);

  return (
    <div ref={rootRef} className="bonus-team-picker admin-api-debug-picker">
      <span className="bonus-team-picker-label">{label}</span>
      <div className="admin-api-debug-country-field">
        <input
          aria-expanded={open}
          className="bonus-team-picker-trigger admin-api-debug-text-input admin-api-debug-country-input"
          onChange={(event) => {
            const nextValue = event.target.value;
            setInputValue(nextValue);
            onChange(nextValue);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Taper un pays"
          value={inputValue}
        />
        <button
          aria-label="Ouvrir la liste des pays"
          aria-expanded={open}
          className="admin-api-debug-country-button"
          onClick={() => setOpen((current) => !current)}
          type="button"
        >
          <ChevronDown aria-hidden="true" size={18} strokeWidth={3} />
        </button>
      </div>

      {open ? (
        <div className="bonus-team-picker-menu admin-api-debug-country-menu" role="listbox">
          <button
            aria-selected={value === ""}
            className="bonus-team-picker-option"
            onClick={() => {
              onChange("");
              setInputValue("");
              setOpen(false);
            }}
            role="option"
            type="button"
          >
            <span>Tous</span>
          </button>
          {filteredOptions.map((option) => (
            <button
              aria-selected={option.value.toLowerCase() === value.toLowerCase()}
              className="bonus-team-picker-option"
              key={option.value}
              onClick={() => {
                onChange(option.value);
                setInputValue(option.label);
                setOpen(false);
              }}
              role="option"
              type="button"
            >
              {option.crest ? (
                <img alt="" className="team-flag" loading="lazy" src={option.crest} />
              ) : (
                <span className="team-flag team-flag-fallback">{option.label.slice(0, 2)}</span>
              )}
              <span>{option.label}</span>
            </button>
          ))}
          {filteredOptions.length === 0 ? (
            <p className="admin-api-debug-country-empty">Aucun pays trouvé.</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function ApiDebugMatches({ matches, initialFilters }: ApiDebugMatchesProps) {
  const [status, setStatus] = useState(initialFilters?.status ?? "all");
  const [dateKey, setDateKey] = useState(initialFilters?.date ?? "");
  const [dateInput, setDateInput] = useState(formatDisplayDate(initialFilters?.date ?? ""));
  const [group, setGroup] = useState(initialFilters?.group ?? "all");
  const [country, setCountry] = useState(initialFilters?.country ?? "");

  const statusOptions = useMemo<FilterOption[]>(
    () => [
      { label: "Tous", value: "all" },
      { label: "En cours", value: "IN_PLAY" },
      { label: "Scheduled", value: "SCHEDULED" },
      { label: "Terminés", value: "FINISHED" },
      { label: "Pause", value: "PAUSED" },
      { label: "Reportés", value: "POSTPONED" },
      { label: "Annulés", value: "CANCELLED" },
      { label: "Interrompus", value: "SUSPENDED" },
    ],
    [],
  );

  const groupOptions = useMemo<FilterOption[]>(
    () => [
      { label: "Tous", value: "all" },
      ...Array.from(new Set(matches.map((match) => match.stage ?? "Phase inconnue")))
        .sort((left, right) => left.localeCompare(right, "fr"))
        .map((stage) => ({ label: stage, value: stage })),
    ],
    [matches],
  );
  const countryOptions = useMemo<CountryOption[]>(
    () =>
      Array.from(
        new Map(
          matches.flatMap((match) => [
            [getTeamName(match.homeTeam), match.homeTeam?.crest ?? null],
            [getTeamName(match.awayTeam), match.awayTeam?.crest ?? null],
          ]),
        ).entries(),
      )
        .map(([label, crest]) => ({
          crest,
          label,
          value: label,
        }))
        .filter((option) => option.value !== "À déterminer")
        .sort(sortCountryOptions),
    [matches],
  );

  const filteredMatches = useMemo(() => {
    return matches
      .filter((match) => {
        const matchStatus = normalizeStatus(match.status);
        const matchGroup = match.stage ?? "Phase inconnue";
        const matchCountry = `${getTeamName(match.homeTeam)} ${getTeamName(match.awayTeam)}`.toLowerCase();

        if (status !== "all" && matchStatus !== normalizeStatus(status)) {
          return false;
        }

        if (dateKey && dateKey !== getMatchDateKey(match)) {
          return false;
        }

        if (group !== "all" && group !== matchGroup) {
          return false;
        }

        if (country && !matchCountry.includes(country.toLowerCase())) {
          return false;
        }

        return true;
      })
      .slice()
      .sort((left, right) => {
        const leftGroup = getMatchGroup(left.status);
        const rightGroup = getMatchGroup(right.status);

        if (leftGroup !== rightGroup) {
          return leftGroup - rightGroup;
        }

        const leftDate = left.utcDate ? new Date(left.utcDate).getTime() : Number.POSITIVE_INFINITY;
        const rightDate = right.utcDate ? new Date(right.utcDate).getTime() : Number.POSITIVE_INFINITY;

        return leftDate - rightDate;
      });
  }, [country, dateKey, group, matches, status]);

  const groupedMatches = useMemo(() => {
    return filteredMatches.reduce<Record<number, ApiDebugMatch[]>>((groups, match) => {
      const bucket = getMatchGroup(match.status);

      if (!groups[bucket]) {
        groups[bucket] = [];
      }

      groups[bucket].push(match);
      return groups;
    }, {});
  }, [filteredMatches]);

  const hasMatches = filteredMatches.length > 0;

  return (
    <div className="admin-api-debug-stack">
      <div className="admin-api-debug-filters">
        <DebugDropdown label="Statut" onChange={setStatus} options={statusOptions} value={status} />
        <DateFilter
          label="Date"
          onChange={(nextValue, nextInput) => {
            setDateInput(nextInput);
            setDateKey(nextValue);
          }}
          value={dateInput}
        />
        <DebugDropdown label="Groupe" onChange={setGroup} options={groupOptions} value={group} />
        <CountryFilter
          label="Pays"
          onChange={setCountry}
          options={countryOptions}
          value={country}
        />
        <button
          className="btn btn-primary admin-api-debug-reset"
          onClick={() => {
            setStatus("all");
            setDateKey("");
            setGroup("all");
            setCountry("");
          }}
          type="button"
        >
          Réinitialiser
        </button>
      </div>

      {hasMatches ? (
        <div className="admin-api-debug-matches">
          {[0, 1, 2].map((bucket) => {
            const bucketMatches = groupedMatches[bucket] ?? [];

            if (bucketMatches.length === 0) {
              return null;
            }

            return (
              <section className="admin-api-debug-matches-group" key={bucket}>
                <h3>{bucket === 0 ? "Matchs en cours" : bucket === 1 ? "Matchs scheduled" : "Matchs terminés"}</h3>
                <div className="admin-api-debug-matches-list">
                  {bucketMatches.map((match, index) => (
                    <article className="admin-api-debug-match" key={match.id ?? `${bucket}-${index}`}>
                      <div className="admin-api-debug-match-top">
                        <div className="admin-api-debug-match-teams">
                          {renderTeam(match.homeTeam)}
                          <span className="admin-api-debug-match-vs">-</span>
                          {renderTeam(match.awayTeam)}
                        </div>
                        <span className={isLiveStatus(match.status) ? "match-status match-live-status" : "match-status"}>
                          {getMatchStatusLabel(match.status)}
                        </span>
                      </div>
                      <div className="admin-api-debug-match-meta">
                        <span>{getScoreLabel(match)}</span>
                        <span>{getMatchDateLabel(match)}</span>
                        <span>{match.stage ?? "Phase inconnue"}</span>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <p className="readonly-notice">Aucun match ne correspond aux filtres sélectionnés.</p>
      )}
    </div>
  );
}
