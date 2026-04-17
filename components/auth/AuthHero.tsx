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
        <span>Pronos verrouillés</span>
        <span>Classement live</span>
        <span>Score exact unique</span>
      </div>
    </aside>
  );
}
