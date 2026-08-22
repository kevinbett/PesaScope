import { useMemo, useRef, useState } from 'react'
import { fmt } from '../lib/format.js'
import { titleCase, toCsv } from '../lib/insights.js'
import { saveTextFile } from '../lib/download.js'
import Paginator, { pageSlice } from './Paginator.jsx'

const CAT_ORDER = ['Send money', 'Received', 'Buy Goods (Till)', 'PayBill', 'Bank & cards', 'Savings & investments', 'Loans', 'Fuliza', 'Insurance', 'Betting', 'Airtime & bundles', 'Cash out', 'Cash in', 'Charges & fees', 'Refunds & reversals', 'Other']

export default function TxnTable({ txns, cat, setCat, title }) {
  const [sort, setSort] = useState('date')
  const [dir, setDir] = useState('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const scrollerRef = useRef(null)
  const goPage = p => { setPage(p); scrollerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }) }

  const cats = useMemo(() => {
    const present = new Set(txns.map(t => t.cat))
    return CAT_ORDER.filter(c => present.has(c))
  }, [txns])

  const rows = useMemo(() => {
    let r = txns.filter(t => (!cat || t.cat === cat) && (dir === 'all' || (dir === 'in' ? t.paidIn > 0 : t.withdrawn > 0)))
    if (sort === 'date') r = r.slice().reverse()
    else r = r.slice().sort((a, b) => (b.paidIn + b.withdrawn) - (a.paidIn + a.withdrawn))
    return r
  }, [txns, cat, dir, sort])
  const { rows: shown } = pageSlice(rows, page, pageSize)
  const totIn = rows.reduce((s, t) => s + t.paidIn, 0), totOut = rows.reduce((s, t) => s + t.withdrawn, 0)

  const download = async () => {
    const ok = await saveTextFile('pesascope-' + (cat ? cat.toLowerCase().replace(/[^a-z]+/g, '-') : 'transactions') + '.csv', toCsv(rows))
    if (!ok) alert('Saving is blocked in this browser — try desktop Chrome or Safari.')
  }

  return (
    <>
      <div className="chips" role="group" aria-label="Filter by category">
        <button className="mchip" aria-pressed={!cat} onClick={() => { setCat(''); setPage(1) }}>All</button>
        {cats.map(c => (
          <button key={c} className="mchip" aria-pressed={cat === c} onClick={() => { setCat(cat === c ? '' : c); setPage(1) }}>{c}</button>
        ))}
      </div>
      <div className="tbl-controls">
        <div className="seg" role="group" aria-label="Direction">
          {[['all', 'In & out'], ['in', 'Money in'], ['out', 'Money out']].map(([v, l]) => (
            <button key={v} aria-pressed={dir === v} onClick={() => { setDir(v); setPage(1) }}>{l}</button>
          ))}
        </div>
        <div className="seg" role="group" aria-label="Sort">
          <button aria-pressed={sort === 'date'} onClick={() => { setSort('date'); setPage(1) }}>Newest</button>
          <button aria-pressed={sort === 'amount'} onClick={() => { setSort('amount'); setPage(1) }}>Largest</button>
        </div>
        <button className="btn small" onClick={download} disabled={!rows.length}>⤓ CSV ({rows.length})</button>
      </div>
      <div className="table-scroller" ref={scrollerRef}>
        <table aria-label={title || 'Transactions'}>
          <thead>
            <tr><th>Date</th><th>Type</th><th>Who / what</th><th>Details</th><th className="amt">In</th><th className="amt">Out</th><th className="amt">Fee</th></tr>
          </thead>
          <tbody>
            {shown.map((t, i) => (
              <tr key={t.receipt + i} className={t.isCharge ? 'charge-row' : undefined}>
                <td className="mono">{t.date}<span className="tsub">{t.time.slice(0, 5)}</span></td>
                <td><span className="catpill">{t.type}</span>{t.fuliza && t.cat !== 'Fuliza' ? <span className="catpill fz">Fuliza</span> : null}</td>
                <td className="who">{t.isCharge && t.parentWho ? <span className="muted">fee · {titleCase(t.parentWho)}</span> : titleCase(t.who)}{t.phone ? <span className="tsub mono">{t.phone}</span> : t.code ? <span className="tsub mono">{t.code}{t.account ? ' · ' + t.account : ''}</span> : null}</td>
                <td className="details" title={t.details + ' · ' + t.receipt}>{t.details.length > 64 ? t.details.slice(0, 63) + '…' : t.details}</td>
                <td className="amt in">{t.paidIn ? fmt(t.paidIn) : ''}</td>
                <td className="amt">{t.withdrawn ? fmt(t.withdrawn) : ''}</td>
                <td className="amt fee">{t.fee ? fmt(t.fee) : ''}</td>
              </tr>
            ))}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr><td colSpan="4">{rows.length} row{rows.length === 1 ? '' : 's'}</td><td className="amt in">{fmt(totIn)}</td><td className="amt">{fmt(totOut)}</td><td className="amt fee">{fmt(rows.reduce((s, t) => s + (t.fee || 0), 0))}</td></tr>
            </tfoot>
          )}
        </table>
      </div>
      <Paginator total={rows.length} page={page} setPage={goPage} pageSize={pageSize} setPageSize={setPageSize} sizes={[25, 50, 100, 250]} noun="rows" />
      {!rows.length && <p className="more-note">No transactions match.</p>}
    </>
  )
}
