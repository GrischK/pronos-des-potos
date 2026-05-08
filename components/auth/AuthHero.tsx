import { Shirt } from "lucide-react";

type AuthHeroProps = {
  title: string;
  text: string;
};

export function AuthHero({ title, text }: AuthHeroProps) {
  return (
    <aside className="auth-hero" aria-label="Ambiance compétition">
      <p className="eyebrow">Vestiaire privé</p>
      <h1>{title}</h1>
      <p>{text}</p>

      <div className="auth-locker-visual" aria-hidden="true">
        <span className="auth-locker-shirt">
          <Shirt className="auth-locker-shirt-icon" />
          <span className="auth-locker-shirt-number">10</span>
        </span>
        <span className="auth-locker-key">PDP</span>
        <span className="auth-locker-line" />
      </div>

      <div className="auth-scoreboard">
        <div>
          <span>Les potos</span>
          <strong>4</strong>
        </div>
        <div>
          <span>La chance</span>
          <strong>3</strong>
        </div>
      </div>

      <div className="auth-badges">
        <span>Tu poses ton prono avant le match</span>
        <span>Le classement évolue en direct</span>
        <span>Le score exact fait la diff</span>
      </div>
    </aside>
  );
}
