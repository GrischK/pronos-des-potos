type EmptyStateProps = {
  title: string;
  text: string;
  action?: React.ReactNode;
};

export function EmptyState({ title, text, action }: EmptyStateProps) {
  return (
    <div className="empty-state">
      <div>
        <p className="badge badge-warning">À préparer</p>
        <h2>{title}</h2>
        <p>{text}</p>
      </div>
      {action ? <div className="actions">{action}</div> : null}
    </div>
  );
}
