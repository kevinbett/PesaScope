import { fmt, monthLbl } from '../lib/format.js'
import Section from './Section.jsx'

/** month-by-month table: in, out, net, sent to people, top category; click a month to filter */
export default function Trends({ rows, monthKey, onPick }) {
  if (rows.length < 2) return null
  const max = Math.max(...rows.map(r => Math.max(r.inn, r.out)), 1)
  return (
    <Section id="trends" title="Month by month" sub="Is this month heavier than the last? Tap a month to focus the whole dashboard on it.">
      <div className="trend-wrap">
        <table className="trend">
          <thead><tr><th>Month</th><th className="amt">In</th><th className="amt">Out</th><th className="amt">Net</th><th className="amt">Sent to people</th><th>Biggest category</th><th className="amt">vs previous</th></tr></thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.key} className={'trend-row' + (monthKey === r.key ? ' sel' : '')} onClick={() => onPick(monthKey === r.key ? 'all' : r.key)} tabIndex={0}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onPick(monthKey === r.key ? 'all' : r.key) } }}>
                <td className="mon">{monthLbl(r.key)}<span className="tsub">{r.n} txns</span></td>
                <td className="amt in">{fmt(r.inn)}<span className="tbar in" style={{ width: ((r.inn / max) * 100).toFixed(0) + '%' }} /></td>
                <td className="amt">{fmt(r.out)}<span className="tbar out" style={{ width: ((r.out / max) * 100).toFixed(0) + '%' }} /></td>
                <td className={'amt ' + (r.net >= 0 ? 'in' : 'neg')}>{r.net >= 0 ? '+' : '−'}{fmt(Math.abs(r.net))}</td>
                <td className="amt">{fmt(r.sentP)}</td>
                <td className="topcat">{r.topCat ? <>{r.topCat.name}<span className="tsub">{fmt(r.topCat.v)}</span></> : '—'}</td>
                <td className={'amt delta ' + (r.delta == null ? '' : r.delta > 0 ? 'neg' : 'in')}>{r.delta == null ? '—' : (r.delta > 0 ? '▲ ' : '▼ ') + fmt(Math.abs(r.delta))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Section>
  )
}
