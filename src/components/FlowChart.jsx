import { useMemo, useState } from 'react'
import { fmtKES, short, dayLbl } from '../lib/format.js'

const W = 460, H = 210, padL = 44, padR = 8, padT = 10, padB = 24
const iw = W - padL - padR, ih = H - padT - padB

export default function FlowChart({ txns, showTip, hideTip }) {
  const { days, byDay, max } = useMemo(() => {
    const byDay = {}
    txns.forEach(t => {
      byDay[t.date] = byDay[t.date] || { in: 0, out: 0 }
      byDay[t.date].in += t.paidIn
      byDay[t.date].out += t.withdrawn
    })
    const days = Object.keys(byDay).sort()
    const max = Math.max(...days.map(d => Math.max(byDay[d].in, byDay[d].out)), 1)
    return { days, byDay, max }
  }, [txns])

  const [hoverI, setHoverI] = useState(null)

  if (days.length < 2) return <p className="chart-note">Not enough days to draw a flow line.</p>

  const X = i => padL + (i / (days.length - 1)) * iw
  const Y = v => padT + ih - (v / max) * ih
  const path = key => days.map((d, i) => (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(byDay[d][key]).toFixed(1)).join(' ')

  const onMove = ev => {
    const box = ev.currentTarget.ownerSVGElement.getBoundingClientRect()
    const px = ((ev.clientX - box.left) / box.width) * W
    const i = Math.max(0, Math.min(days.length - 1, Math.round(((px - padL) / iw) * (days.length - 1))))
    setHoverI(i)
    const d = days[i]
    showTip(
      <><strong>{dayLbl(d)}</strong><br />In: {fmtKES(byDay[d].in)}<br />Out: {fmtKES(byDay[d].out)}</>,
      ev
    )
  }

  const gridSteps = [1, 2, 3]
  const hd = hoverI != null ? days[hoverI] : null

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto' }} role="img" aria-label="Daily money in and out">
      {gridSteps.map(g => {
        const v = (max * g) / 3, y = Y(v)
        return (
          <g key={g}>
            <line x1={padL} x2={W - padR} y1={y} y2={y} stroke="var(--grid)" strokeWidth="1" />
            <text x={padL - 6} y={y + 4} textAnchor="end" fontSize="10" fill="var(--ink-3)">{short(v)}</text>
          </g>
        )
      })}
      <line x1={padL} x2={W - padR} y1={Y(0)} y2={Y(0)} stroke="var(--axis)" strokeWidth="1" />
      <path d={path('in')} fill="none" stroke="var(--series-in)" strokeWidth="2" strokeLinejoin="round" />
      <path d={path('out')} fill="none" stroke="var(--series-out)" strokeWidth="2" strokeLinejoin="round" />
      <text x={padL} y={H - 6} fontSize="10" fill="var(--ink-3)">{dayLbl(days[0])}</text>
      <text x={W - padR} y={H - 6} textAnchor="end" fontSize="10" fill="var(--ink-3)">{dayLbl(days[days.length - 1])}</text>
      {hd && (
        <>
          <line x1={X(hoverI)} x2={X(hoverI)} y1={padT} y2={padT + ih} stroke="var(--axis)" strokeWidth="1" />
          <circle cx={X(hoverI)} cy={Y(byDay[hd].in)} r="3.5" fill="var(--series-in)" stroke="var(--card)" strokeWidth="2" />
          <circle cx={X(hoverI)} cy={Y(byDay[hd].out)} r="3.5" fill="var(--series-out)" stroke="var(--card)" strokeWidth="2" />
        </>
      )}
      <rect
        x={padL} y={padT} width={iw} height={ih} fill="transparent"
        onMouseMove={onMove}
        onMouseLeave={() => { setHoverI(null); hideTip() }}
      />
    </svg>
  )
}
