"use client";

import { ChevronDown } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

export type CountryFilterTeam = {
  id: string;
  name: string;
  flagUrl: string | null;
};

export type CountryFilterMatch = {
  homeTeam: {
    name: string;
    flagUrl: string | null;
  } | null;
  awayTeam: {
    name: string;
    flagUrl: string | null;
  } | null;
};

function getInitial(name: string) {
  return name.trim().slice(0, 1).toUpperCase();
}

function TeamFilterLogo({ team }: { team: CountryFilterTeam }) {
  if (team.flagUrl) {
    return <img alt="" className="team-flag" loading="lazy" src={team.flagUrl} />;
  }

  return <span className="bonus-team-fallback">{getInitial(team.name)}</span>;
}

export function buildCountryFilterOptions(matches: CountryFilterMatch[]) {
  const options = new Map<string, CountryFilterTeam>();

  for (const match of matches) {
    if (match.homeTeam?.name) {
      options.set(match.homeTeam.name, {
        id: match.homeTeam.name,
        name: match.homeTeam.name,
        flagUrl: match.homeTeam.flagUrl ?? null,
      });
    }

    if (match.awayTeam?.name) {
      options.set(match.awayTeam.name, {
        id: match.awayTeam.name,
        name: match.awayTeam.name,
        flagUrl: match.awayTeam.flagUrl ?? null,
      });
    }
  }

  return Array.from(options.values()).sort((a, b) => a.name.localeCompare(b.name, "fr"));
}

export function filterMatchesByCountry<TMatch extends CountryFilterMatch>(
  matches: TMatch[],
  countryId: string,
) {
  if (!countryId) {
    return matches;
  }

  return matches.filter(
    (match) =>
      match.homeTeam?.name === countryId || match.awayTeam?.name === countryId,
  );
}

export function CountryFilterPicker({
  onPick,
  options,
  value,
}: {
  onPick: (value: string) => void;
  options: CountryFilterTeam[];
  value: string;
}) {
  const pickerRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const selectedTeam = useMemo(
    () => options.find((team) => team.id === value) ?? null,
    [options, value],
  );

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
