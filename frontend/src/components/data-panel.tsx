export function DataPanel({
  title,
  context,
  className = "",
  children,
  action
}: {
  title: string;
  context?: string;
  className?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className={`data-panel ${className}`}>
      <header className="panel-header">
        <div><h2>{title}</h2>{context && <p>{context}</p>}</div>
        {action}
      </header>
      {children}
    </section>
  );
}
