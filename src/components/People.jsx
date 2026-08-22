import { fmt } from '../lib/format.js'
import { titleCase } from '../lib/insights.js'

/** ranked list of counterparties — click a row to search for that person */
export default function People({ title, sub, people, field, countField, onPick, emptyNote }) {
  if (!people.length) return (
    <section className="panel">
      <h2>{title}</h2>
      <p className="chart-note">{emptyNote || 'Nothing in this period.'}</p>
    </section>
  )
  const max = Math.max(...people.map(p => p[field]), 1)
  return (
    <section className="panel">
      <h2>{title}</h2>
      {sub && <p className="lede">{sub}</p>}
      <ol className="plist">
        {people.map((p, i) => (
          <li key={p.key}>
            <button className="prow" onClick={() => onPick(p)} title={'Show every transaction with ' + titleCase(p.name)}>
              <span className="prank">{i + 1}</span>
              <span className="pmain">
                <span className="pname">{titleCase(p.name)}{p.intl && <span className="ptag">intl</span>}</span>
                <span className="pmeta">
                  {p.phone ? <span className="mono">{p.phone}</span> : null}
                  {p.phone ? ' · ' : ''}{p[countField]} {p[countField] === 1 ? 'time' : 'times'}
                  {field === 'sent' && p.fees > 0 ? ` · KES ${fmt(p.fees)} in fees` : ''}
                  {field === 'sent' && p.recv > 0 ? ` · received KES ${fmt(p.recv)} back` : ''}
                  {field === 'recv' && p.sent > 0 ? ` · you sent KES ${fmt(p.sent)}` : ''}
                  {' · last ' + p.last}
                </span>
                <span className="pbar"><span style={{ width: ((p[field] / max) * 100).toFixed(1) + '%' }} /></span>
              </span>
              <span className="pamt">KES {fmt(p[field])}<small>avg {fmt(p[field] / Math.max(1, p[countField]))}</small></span>
            </button>
          </li>
        ))}
      </ol>
    </section>
  )
}
