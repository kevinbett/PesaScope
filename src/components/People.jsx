import { useRef, useState } from 'react'
import { fmt } from '../lib/format.js'
import Paginator, { pageSlice } from './Paginator.jsx'
import Section from './Section.jsx'
import { titleCase } from '../lib/insights.js'

/** ranked list of counterparties — click a row to search for that person */
export default function People({ id, title, sub, people, field, countField, onPick, emptyNote }) {
  const headRef = useRef(null)
  const [expanded, setExpanded] = useState(false)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  // insight-first: a top-10 by default, the full ranked list (paginated) on request
  const TOP = 10
  const { rows, start } = expanded ? pageSlice(people, page, pageSize) : { rows: people.slice(0, TOP), start: 0 }
  const collapse = () => { setExpanded(false); setPage(1); headRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }
  const goPage = p => { setPage(p); headRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }
  if (!people.length) return (
    <Section id={id} title={title} innerRef={headRef}>
      <p className="chart-note">{emptyNote || 'Nothing in this period.'}</p>
    </Section>
  )
  const max = Math.max(...people.map(p => p[field]), 1)
  return (
    <Section id={id} title={title} sub={sub} innerRef={headRef}>
      <ol className="plist">
        {rows.map((p, i) => (
          <li key={p.key}>
            <button className="prow" onClick={() => onPick(p)} title={'Show every transaction with ' + titleCase(p.name)}>
              <span className="prank">{start + i + 1}</span>
              <span className="pmain">
                <span className="pname"><span className="ptext">{titleCase(p.name)}</span>{p.intl && <span className="ptag">intl</span>}</span>
                <span className="pmeta">
                  {p.phone ? <span className="mono">{p.phone}</span> : null}
                  {p.phone ? ' · ' : ''}{p[countField]} {p[countField] === 1 ? 'time' : 'times'}
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
        ? <div className="list-foot">
            <Paginator total={people.length} page={page} setPage={goPage} pageSize={pageSize} setPageSize={setPageSize} sizes={[10, 25, 50]} noun="people" />
            <button className="btn small" onClick={collapse}>▴ Back to top {TOP}</button>
          </div>
        : people.length > TOP && <button className="btn link" onClick={() => setExpanded(true)}>See all {people.length.toLocaleString()} people</button>}
    </Section>
  )
}
