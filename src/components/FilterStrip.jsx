/** sticky strip shown only while something narrows the view */
export default function FilterStrip({ active, shown, total, onClearAll }) {
  if (!active.length) return null
  return (
    <div className="filterstrip" role="status" aria-live="polite">
      <span className="fs-icon" aria-hidden="true">⚲</span>
      <span className="fs-text">Showing <strong>{shown.toLocaleString()}</strong> of {total.toLocaleString()} transactions</span>
      <span className="fs-pills">
        {active.map(f => (
          <button key={f.key} className="fs-pill" onClick={f.clear} title="Remove this filter">{f.label}<span aria-hidden="true"> ✕</span></button>
        ))}
      </span>
      {active.length > 1 && <button className="fs-clear" onClick={onClearAll}>Clear all</button>}
    </div>
  )
}
