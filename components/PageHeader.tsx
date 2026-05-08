import { cn } from "@/src/lib/cn";

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  mobileTitle?: string;
  description?: string;
  emblemUrl?: string | null;
  actions?: React.ReactNode;
  className?: string;
};

export function PageHeader({
  eyebrow,
  title,
  mobileTitle,
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
            <span className="page-title-emblem-wrap" aria-hidden="true">
              <img alt="" className="competition-emblem page-title-emblem" src={emblemUrl} />
            </span>
          ) : null}
          <h1>
            <span className={mobileTitle ? "page-title-desktop" : undefined}>{title}</span>
            {mobileTitle ? <span className="page-title-mobile">{mobileTitle}</span> : null}
          </h1>
        </div>
        {description ? <p className="lead">{description}</p> : null}
      </div>
      {actions ? <div className="actions">{actions}</div> : null}
    </header>
  );
}
