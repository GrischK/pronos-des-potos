import {CircleAlert} from "lucide-react";

import { cn } from "@/src/lib/cn";

type UrgentPredictionBadgeProps = {
  label: string;
  className?: string;
};

export function UrgentPredictionBadge({
  label,
  className,
}: UrgentPredictionBadgeProps) {
  return (
    <span className={cn("competition-action-alert-wrap", className)}>
      <span aria-label={label} className="competition-action-alert">
          <CircleAlert aria-hidden="true" size={20} strokeWidth={2.6} />
      </span>
      <span className="competition-action-alert-tooltip" role="tooltip">
        {label}
      </span>
    </span>
  );
}
