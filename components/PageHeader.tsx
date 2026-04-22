import { cn } from "@/src/lib/cn";

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  emblemUrl?: string | null;
  actions?: React.ReactNode;
  className?: string;
};

export function PageHeader({
  eyebrow,
  title,
  description,
  emblemUrl,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <header className={cn("page-header", className)}>
      <div>
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <div className="page-title-row">
          {emblemUrl ? (
            <img alt="" className="competition-emblem page-title-emblem" src={emblemUrl} />
          ) : null}
          <h1>{title}</h1>
        </div>
        {description ? <p className="lead">{description}</p> : null}
      </div>
      {actions ? <div className="actions">{actions}</div> : null}
    </header>
  );
}
