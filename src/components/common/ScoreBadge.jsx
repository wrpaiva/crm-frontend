const LABEL_MAP = {
  hot: 'Quente',
  warm: 'Morno',
  cold: 'Frio'
};

function ScoreBadge({ score, label, size = 'small' }) {
  const displayLabel = LABEL_MAP[label] || LABEL_MAP.cold;
  const className = `score-badge score-${label || 'cold'}${size === 'large' ? ' score-badge-large' : ''}`;

  return (
    <span className={className}>
      {score != null ? score : 0} - {displayLabel}
    </span>
  );
}

export default ScoreBadge;
