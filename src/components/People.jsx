import { useState } from 'react'
import { fmt } from '../lib/format.js'
import Paginator, { pageSlice } from './Paginator.jsx'
import { titleCase } from '../lib/insights.js'

/** ranked list of counterparties — click a row to search for that person */
export default function People({ title, sub, people, field, countField, onPick, emptyNote }) {
  const [expanded, setExpanded] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  // insight-first: a top-10 by default, the full ranked list (paginated) on request
  const TOP = 10
  const { rows, start } = expanded ? pageSlice(people, page, pageSize) : { rows: people.slice(0, TOP), start: 0 }
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
        {rows.map((p, i) => (
          <li key={p.key}>
            <button className="prow" onClick={() => onPick(p)} title={'Show every transaction with ' + titleCase(p.name)}>
              <span className="prank">{start + i + 1}</span>
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
      {expanded
        ? <>
            <Paginator total={people.length} page={page} setPage={setPage} pageSize={pageSize} setPageSize={setPageSize} noun="people" />
            <button className="btn link" onClick={() => { setExpanded(false); setPage(1) }}>Back to top {TOP}</button>
          </>
        : people.length > TOP && <button className="btn link" onClick={() => setExpanded(true)}>See all {people.length.toLocaleString()} people</button>}
    </section>
  )
}
