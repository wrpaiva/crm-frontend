function EmptyState({ title, description, action }) {
  return (
    <div className="card" style={{ textAlign: 'center', padding: 24 }}>
      {title ? <h3 style={{ marginTop: 0 }}>{title}</h3> : null}
      {description ? <p className="muted-text" style={{ marginBottom: 0 }}>{description}</p> : null}
      {action ? <div style={{ marginTop: 16 }}>{action}</div> : null}
    </div>
  );
}

export default EmptyState;
