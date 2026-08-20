import { fmt, fmtKES } from '../lib/format.js'

export default function HBars({ entries, total, tipLabel, showTip, hideTip }) {
  if (!entries.length) return <p className="chart-note">Nothing in this period.</p>
  const max = Math.max(...entries.map(e => e[1]), 1)
  return (
    <div>
      {entries.map(([name, v]) => (
        <div
          key={name}
          className="hbar-row"
          onMouseMove={ev =>
            showTip(
              <><strong>{name}</strong><br />{fmtKES(v)} · {((v / total) * 100).toFixed(1)}% {tipLabel}</>,
              ev
            )}
          onMouseLeave={hideTip}
        >
          <span className="cat" title={name}>{name}</span>
          <div className="hbar-track">
            <div className="hbar-fill" style={{ width: ((v / max) * 100).toFixed(1) + '%' }} />
          </div>
          <span className="val">{fmt(v)}</span>
        </div>
      ))}
    </div>
  )
}
