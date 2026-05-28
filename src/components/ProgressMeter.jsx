export function ProgressMeter({ value, total, label = 'Progreso' }) {
  const safeTotal = Math.max(Number(total) || 0, 0);
  const safeValue = Math.min(Math.max(Number(value) || 0, 0), safeTotal || Number(value) || 0);
  const percent = safeTotal ? Math.round((safeValue / safeTotal) * 100) : 0;

  return (
    <div className="progress-meter" aria-label={`${label}: ${percent}%`}>
      <div className="progress-meter-top">
        <strong>{label}</strong>
        <span>{`${percent}%`}</span>
      </div>
      <div className="progress-meter-track" aria-hidden="true">
        <span className="progress-meter-fill" style={{ width: `${percent}%` }} />
      </div>
      <div className="progress-meter-caption">{`${safeValue.toLocaleString()} de ${safeTotal.toLocaleString()} cartas`}</div>
    </div>
  );
}
