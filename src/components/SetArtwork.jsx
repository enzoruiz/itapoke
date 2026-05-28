export function SetMark({ logo, symbol, label, code }) {
  if (logo) return <img className="explorer-set-mark" src={logo} alt={`Logo de ${label}`} />;
  if (symbol) return <img className="explorer-set-mark explorer-set-symbol" src={symbol} alt={`Simbolo de ${label}`} />;
  return <span className="explorer-set-mark explorer-set-fallback" aria-hidden="true">{(code || label || 'SET').slice(0, 3)}</span>;
}

export function SetArtwork({ set, className = 'expansion-logo' }) {
  if (set.logo) return <img className={className} src={set.logo} alt={`Logo de ${set.displayName}`} loading="lazy" decoding="async" />;
  if (set.symbol) return <img className={`${className} expansion-symbol`} src={set.symbol} alt={`Simbolo de ${set.displayName}`} loading="lazy" decoding="async" />;
  return <div className={`${className} expansion-logo-placeholder`} aria-hidden="true">{set.code.slice(0, 3)}</div>;
}
