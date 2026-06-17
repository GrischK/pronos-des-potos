import type { ReactNode } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { cn } from "@/src/lib/cn";

import { UrgentPredictionBadge } from "./UrgentPredictionBadge";

type CompetitionActionTone =
  | "pitch"
  | "coral"
  | "navy"
  | "card"
  | "bonus"
  | "graph"
  | "stats";
type CompetitionActionWidth = "fill" | "inline";

type CompetitionActionCardProps = {
  href: string;
  icon: ReactNode;
  title: string;
  description: string;
  tone?: CompetitionActionTone;
  width?: CompetitionActionWidth;
  className?: string;
  urgentLabel?: string;
};

const toneClassNames: Record<CompetitionActionTone, string> = {
  pitch: "competition-action--pitch",
  coral: "competition-action--coral",
  navy: "competition-action--navy",
  card: "competition-action--card",
  bonus: "competition-action--bonus",
  graph: "competition-action--graph",
  stats: "competition-action--stats",
};

export function CompetitionActionCard({
  href,
  icon,
  title,
  description,
  tone = "pitch",
  width = "fill",
  className,
  urgentLabel,
}: CompetitionActionCardProps) {
  return (
    <Link
      className={cn(
        "competition-action",
        toneClassNames[tone],
        width === "inline" ? "competition-action-inline" : null,
        className,
      )}
      href={href}
    >
      {urgentLabel ? <UrgentPredictionBadge label={urgentLabel} /> : null}
      <span className="competition-action-icon">{icon}</span>
      <span>
        <strong>{title}</strong>
        <small>{description}</small>
      </span>
      <ChevronRight
        aria-hidden="true"
        className="competition-action-arrow"
        size={20}
        strokeWidth={3}
      />
    </Link>
  );
}
