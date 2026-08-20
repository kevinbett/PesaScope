import { useMemo, useState } from 'react'
import { fmt } from '../lib/format.js'

const MAXR = 300

export default function TxnTable({ txns }) {
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('')

  const cats = useMemo(() => [...new Set(txns.map(t => t.cat))].sort(), [txns])
  const rows = useMemo(() => {
    const needle = q.toLowerCase()
    return txns
      .filter(t =>
        (!cat || t.cat === cat) &&
        (!needle ||
          t.details.toLowerCase().includes(needle) ||
          t.who.toLowerCase().includes(needle) ||
          t.receipt.toLowerCase().includes(needle))
      )
      .slice()
      .reverse()
  }, [txns, q, cat])

  const shown = rows.slice(0, MAXR)

  return (
    <>
      <div className="tbl-controls">
        <input
          type="search" placeholder="Search details…" aria-label="Search transactions"
          value={q} onChange={e => setQ(e.target.value)}
        />
        <select value={cat} onChange={e => setCat(e.target.value)} aria-label="Filter by category">
          <option value="">All categories</option>
          {cats.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>
      <div className="table-scroller">
        <table aria-label="Transactions">
          <thead>
            <tr><th>Date</th><th>Details</th><th>Category</th><th className="amt">In</th><th className="amt">Out</th></tr>
          </thead>
          <tbody>
            {shown.map((t, i) => (
              <tr key={t.receipt + i}>
                <td className="mono">{t.date}</td>
                <td title={t.details}>{t.details.length > 58 ? t.details.slice(0, 57) + '…' : t.details}</td>
                <td><span className="catpill">{t.cat}</span></td>
                <td className="amt in">{t.paidIn ? fmt(t.paidIn) : ''}</td>
                <td className="amt">{t.withdrawn ? fmt(t.withdrawn) : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="more-note">
        {rows.length > MAXR
          ? `Showing the latest ${MAXR} of ${rows.length} matching rows — narrow the search to see the rest.`
          : `${rows.length} row${rows.length === 1 ? '' : 's'}.`}
      </p>
    </>
  )
}
