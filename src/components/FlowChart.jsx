import { useEffect, useMemo, useState } from 'react'
import { fmtKES, short, MONTHS } from '../lib/format.js'

const H = 200, padL = 42, padR = 8, padT = 10, padB = 26
/** narrower drawing width on phones so labels render at a readable size */
function useNarrow() {
  const [n, setN] = useState(() => typeof window !== 'undefined' && window.matchMedia('(max-width: 640px)').matches)
  useEffect(() => { const mq = window.matchMedia('(max-width: 640px)'); const f = e => setN(e.matches); mq.addEventListener('change', f); return () => mq.removeEventListener('change', f) }, [])
  return n
}

/** bucket transactions by day / ISO week / month depending on the span */
function bucket(txns) {
  if (!txns.length) return { rows: [], unit: 'day' }
  const first = txns[0].dt, last = txns[txns.length - 1].dt
  const days = Math.max(1, Math.round((last - first) / 864e5) + 1)
  const unit = days <= 45 ? 'day' : days <= 400 ? 'week' : 'month'
  const keyOf = d => {
    if (unit === 'day') return d.toISOString().slice(0, 10)
    if (unit === 'month') return d.toISOString().slice(0, 7)
    const x = new Date(d); x.setHours(0, 0, 0, 0); x.setDate(x.getDate() - ((x.getDay() + 6) % 7)) // Monday
    return x.toISOString().slice(0, 10)
  }
  const m = new Map()
  for (const t of txns) { const k = keyOf(t.dt); const b = m.get(k) || { k, inn: 0, out: 0, n: 0 }; b.inn += t.paidIn; b.out += t.withdrawn; b.n++; m.set(k, b) }
  return { rows: [...m.values()].sort((a, b) => (a.k < b.k ? -1 : 1)), unit }
}
const lbl = (k, unit) => unit === 'month' ? MONTHS[+k.slice(5, 7) - 1] + ' ' + k.slice(2, 4) : +k.slice(8, 10) + ' ' + MONTHS[+k.slice(5, 7) - 1]
const rangeLbl = (k, unit) => {
  if (unit !== 'week') return lbl(k, unit)
  const a = new Date(k + 'T12:00:00'), b = new Date(a); b.setDate(a.getDate() + 6)
  return `${a.getDate()} ${MONTHS[a.getMonth()]} – ${b.getDate()} ${MONTHS[b.getMonth()]}`
}

export default function FlowChart({ txns, showTip, hideTip }) {
  const { rows, unit } = useMemo(() => bucket(txns), [txns])
  const [hi, setHi] = useState(-1)
  const narrow = useNarrow()
  const W = narrow ? 360 : 640
  if (!rows.length) return <p className="chart-note">Nothing in this period.</p>
  const max = Math.max(...rows.map(r => Math.max(r.inn, r.out)), 1)
  const iw = W - padL - padR, ih = H - padT - padB
  const slot = iw / rows.length
  const gap = Math.min(4, slot * 0.18)
  const bw = Math.max(1.5, (slot - gap) / 2)
  const Y = v => padT + ih - (v / max) * ih
  const ticks = [0.25, 0.5, 0.75, 1].map(f => f * max)
  const labelEvery = Math.max(1, Math.ceil(rows.length / (narrow ? 4 : 6)))
  const show = (i, ev) => { setHi(i); const r = rows[i]; showTip(<><strong>{rangeLbl(r.k, unit)}</strong><br />In {fmtKES(r.inn)}<br />Out {fmtKES(r.out)}<br />{r.n} transaction{r.n === 1 ? '' : 's'}</>, ev.touches ? ev.touches[0] : ev) }
  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }} role="img" aria-label={`Money in and out per ${unit}`} onMouseLeave={() => { setHi(-1); hideTip() }}>
      {ticks.map(v => (
        <g key={v}>
          <line x1={padL} x2={W - padR} y1={Y(v)} y2={Y(v)} stroke="var(--grid)" strokeWidth="1" />
          <text x={padL - 6} y={Y(v) + 4} fontSize="10" fill="var(--ink-3)" textAnchor="end">{short(v)}</text>
        </g>
      ))}
      <line x1={padL} x2={W - padR} y1={Y(0)} y2={Y(0)} stroke="var(--axis)" strokeWidth="1" />
      {rows.map((r, i) => {
        const x0 = padL + i * slot + gap / 2
        const dim = hi >= 0 && hi !== i
        return (
          <g key={r.k} opacity={dim ? 0.45 : 1}
             onMouseMove={ev => show(i, ev)} onTouchStart={ev => show(i, ev)} onMouseEnter={ev => show(i, ev)}>
            <rect x={x0 - gap / 2} y={padT} width={slot} height={ih} fill="transparent" />
            <rect x={x0} y={Y(r.inn)} width={bw} height={Math.max(0, Y(0) - Y(r.inn))} rx={Math.min(2, bw / 2)} fill="var(--series-in)" />
            <rect x={x0 + bw} y={Y(r.out)} width={bw} height={Math.max(0, Y(0) - Y(r.out))} rx={Math.min(2, bw / 2)} fill="var(--series-out)" />
            {i % labelEvery === 0 && <text x={x0 + bw} y={H - 8} fontSize="10" fill="var(--ink-3)" textAnchor="middle">{lbl(r.k, unit)}</text>}
          </g>
        )
      })}
    </svg>
  )
}
