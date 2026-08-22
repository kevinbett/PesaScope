import { Fragment, useMemo, useRef, useState } from 'react'
import { fmt, dayHeading } from '../lib/format.js'
import { titleCase, toCsv } from '../lib/insights.js'
import { saveTextFile } from '../lib/download.js'
import Paginator, { pageSlice } from './Paginator.jsx'
import { printReceipt } from '../lib/receipt.js'
import { printList } from '../lib/printlist.js'

const CAT_ORDER = ['Send money', 'Received', 'Buy Goods (Till)', 'PayBill', 'Bank & cards', 'Savings & investments', 'Loans', 'Fuliza', 'Insurance', 'Betting', 'Airtime & bundles', 'Cash out', 'Cash in', 'Charges & fees', 'Refunds & reversals', 'Other']

export default function TxnTable({ txns, cat, setCat, title, onPick, meta, context }) {
  const [openKey, setOpenKey] = useState(null)
  const [closingKey, setClosingKey] = useState(null)
  const [copied, setCopied] = useState('')
  const LEAVE_MS = 260
  const [sort, setSort] = useState('date')
  const [dir, setDir] = useState('all')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const scrollerRef = useRef(null)
  const goPage = p => { setPage(p); setOpenKey(null); setClosingKey(null); scrollerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }) }

  const byReceipt = useMemo(() => {
    const m = new Map()
    for (const t of txns) { const l = m.get(t.receipt) || []; l.push(t); m.set(t.receipt, l) }
    return m
  }, [txns])
  const rowKey = t => t.receipt + '|' + t.time + '|' + t.details
  const shortName = t => { const n = titleCase(t.who); return (t.cat === 'Send money' || t.cat === 'Received') && !t.type.includes('International') ? n.split(' ')[0] : (n.length > 22 ? n.slice(0, 21) + '…' : n) }
  const toggle = t => {
    const k = rowKey(t)
    if (openKey === k) {
      // play the leave animation, then unmount
      setClosingKey(k)
      setTimeout(() => { setOpenKey(null); setClosingKey(null) }, LEAVE_MS)
      return
    }
    setClosingKey(null)
    setOpenKey(k)
    setTimeout(() => document.querySelector('tr.detail-row')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' }), 60)
  }
  const copy = async (text, label) => { try { await navigator.clipboard.writeText(text); setCopied(label); setTimeout(() => setCopied(''), 1400) } catch {} }

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
  const dayTotals = useMemo(() => {
    const m = new Map()
    for (const t of rows) { const d = m.get(t.date) || { n: 0, inn: 0, out: 0 }; d.n++; d.inn += t.paidIn; d.out += t.withdrawn; m.set(t.date, d) }
    return m
  }, [rows])
  const grouped = sort === 'date'
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
        <button className="btn small" disabled={!rows.length} onClick={() => {
          const filters = [context, cat, dir === 'in' ? 'Money in only' : dir === 'out' ? 'Money out only' : ''].filter(Boolean)
          if (!printList(rows, { heading: title || 'All transactions', filters, meta })) alert('Your browser blocked the print window — allow pop-ups for this page and try again.')
        }}>
          <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true" style={{ verticalAlign: '-2px', marginRight: 5 }}><path d="M4 6V2h8v4M4 12H2V7h12v5h-2M4 10h8v4H4z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>
          Print list ({rows.length})
        </button>
      </div>
      <div className="table-scroller" ref={scrollerRef}>
        <table aria-label={title || 'Transactions'}>
          <thead>
            <tr><th className="chev-col" aria-label="Expand"></th><th>Date</th><th>Type</th><th>Who / what</th><th>Details</th><th className="amt">In</th><th className="amt">Out</th><th className="amt">Fee</th></tr>
          </thead>
          <tbody>
            {shown.map((t, i) => {
              const open = openKey === rowKey(t)
              const closing = closingKey === rowKey(t)
              const linked = (byReceipt.get(t.receipt) || []).filter(x => x !== t)
              const newDay = grouped && (i === 0 || shown[i - 1].date !== t.date)
              const dh = newDay ? dayHeading(t.date) : null
              const dt = newDay ? dayTotals.get(t.date) : null
              return (
                <Fragment key={t.receipt + i}>
                  {newDay && (
                    <tr className="day-row" aria-label={dh.long}>
                      <td colSpan="8">
                        <span className="day-name">{dh.rel ? <><strong>{dh.rel}</strong> · {dh.long}</> : dh.long}</span>
                        <span className="day-meta">{dt.n} transaction{dt.n === 1 ? '' : 's'}{dt.inn ? <> · <span className="in">+{fmt(dt.inn)}</span></> : null}{dt.out ? <> · −{fmt(dt.out)}</> : null}</span>
                      </td>
                    </tr>
                  )}
                  <tr
                    className={'txn-row' + (t.isCharge ? ' charge-row' : '') + (open && !closing ? ' open' : '')}
                    onClick={() => toggle(t)}
                    tabIndex={0}
                    aria-expanded={open}
                    onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(t) } }}
                  >
                    <td className="chev-col"><span className={'chev' + (open && !closing ? ' down' : '')} aria-hidden="true">▸</span></td>
                    <td className="mono">{t.date}<span className="tsub">{t.time.slice(0, 5)}</span></td>
                    <td><span className="catpill">{t.type}</span>{t.fuliza && t.cat !== 'Fuliza' ? <span className="catpill fz">Fuliza</span> : null}</td>
                    <td className="who">{t.isCharge && t.parentWho ? <span className="muted">fee · {titleCase(t.parentWho)}</span> : titleCase(t.who)}{t.phone ? <span className="tsub mono">{t.phone}</span> : t.code ? <span className="tsub mono">{t.code}{t.account ? ' · ' + t.account : ''}</span> : null}</td>
                    <td className="details" title={t.details + ' · ' + t.receipt}>{t.details.length > 64 ? t.details.slice(0, 63) + '…' : t.details}</td>
                    <td className="amt in">{t.paidIn ? fmt(t.paidIn) : ''}</td>
                    <td className="amt">{t.withdrawn ? fmt(t.withdrawn) : ''}</td>
                    <td className="amt fee">{t.fee ? fmt(t.fee) : ''}</td>
                  </tr>
                  {open && (
                    <tr className={'detail-row' + (closing ? ' leaving' : '')}>
                      <td colSpan="8">
                        <div className="detail-wrap"><div className="detail">
                          <div className="detail-main">
                            <div className="detail-amount">
                              <span className={'big ' + (t.paidIn ? 'in' : '')}>{t.paidIn ? '+' : '−'} KES {fmt(t.paidIn || t.withdrawn)}</span>
                              <span className="sub">{t.type} · {t.cat}{t.fuliza ? ' · funded by Fuliza' : ''}{t.pochi ? ' · Pochi la Biashara' : ''}</span>
                            </div>
                            <p className="detail-text">{t.details}</p>
                          </div>
                          <dl className="facts">
                            <div><dt>When</dt><dd className="mono">{t.date} {t.time}</dd></div>
                            <div><dt>Receipt</dt><dd className="mono">{t.receipt} <button className="mini" onClick={e => { e.stopPropagation(); copy(t.receipt, t.receipt) }}>{copied === t.receipt ? 'copied ✓' : 'copy'}</button></dd></div>
                            {t.who && !t.isCharge && <div><dt>{t.cat === 'Send money' || t.cat === 'Received' ? 'Person' : 'Payee'}</dt><dd>{titleCase(t.who)}</dd></div>}
                            {t.phone && <div><dt>Phone</dt><dd className="mono">{t.phone}</dd></div>}
                            {t.code && <div><dt>{t.cat === 'PayBill' || t.cat === 'Bank & cards' || t.cat === 'Insurance' || t.cat === 'Loans' ? 'PayBill' : t.cat === 'Buy Goods (Till)' ? 'Till' : 'Code'}</dt><dd className="mono">{t.code}</dd></div>}
                            {t.account && <div><dt>Account</dt><dd className="mono">{t.account}</dd></div>}
                            {t.fee > 0 && <div><dt>Fee</dt><dd>KES {fmt(t.fee)}{t.withdrawn ? ` (${((t.fee / t.withdrawn) * 100).toFixed(1)}%)` : ''}</dd></div>}
                            {t.isCharge && t.parentWho && <div><dt>Charged for</dt><dd>{titleCase(t.parentWho)}</dd></div>}
                            {t.balance != null && <div><dt>Balance after</dt><dd className="mono">KES {fmt(t.balance)}</dd></div>}
                          </dl>
                          {linked.length > 0 && (
                            <div className="linked">
                              <dt>Same receipt</dt>
                              <ul>
                                {linked.map((x, j) => (
                                  <li key={j}><span className="catpill">{x.type}</span> {x.isCharge ? 'M-PESA charge' : titleCase(x.who)} <span className={'mono ' + (x.paidIn ? 'in' : '')}>{x.paidIn ? '+' : '−'}{fmt(x.paidIn || x.withdrawn)}</span></li>
                                ))}
                              </ul>
                            </div>
                          )}
                          <div className="detail-actions">
                            {onPick && !t.isCharge && (t.phone || t.who) && <button className="btn small" onClick={e => { e.stopPropagation(); onPick({ phone: t.phone, name: t.who, key: t.key }) }}>All transactions with {shortName(t)}</button>}
                            {onPick && t.isCharge && t.parentWho && <button className="btn small" onClick={e => { e.stopPropagation(); onPick({ phone: '', name: t.parentWho, key: t.parentKey }) }}>All with {titleCase(t.parentWho).split(' ')[0]}</button>}
                            <button className="btn small primary" onClick={e => { e.stopPropagation(); if (!printReceipt(t, meta)) alert('Your browser blocked the receipt window — allow pop-ups for this page and try again.') }}>
                              <svg width="14" height="14" viewBox="0 0 16 16" aria-hidden="true" style={{ verticalAlign: '-2px', marginRight: 6 }}><path d="M4 6V2h8v4M4 12H2V7h12v5h-2M4 10h8v4H4z" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/></svg>
                              Print receipt
                            </button>
                            <button className="btn small" onClick={e => { e.stopPropagation(); copy(`${t.date} ${t.time} · ${t.receipt} · ${t.details} · ${t.paidIn ? '+' : '-'}KES ${fmt(t.paidIn || t.withdrawn)}`, 'row') }}>{copied === 'row' ? 'Copied ✓' : 'Copy details'}</button>
                          </div>
                        </div></div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr><td colSpan="5">{rows.length} row{rows.length === 1 ? '' : 's'}</td><td className="amt in">{fmt(totIn)}</td><td className="amt">{fmt(totOut)}</td><td className="amt fee">{fmt(rows.reduce((s, t) => s + (t.fee || 0), 0))}</td></tr>
            </tfoot>
          )}
        </table>
      </div>
      <Paginator total={rows.length} page={page} setPage={goPage} pageSize={pageSize} setPageSize={setPageSize} sizes={[25, 50, 100, 250]} noun="rows" />
      {!rows.length && <p className="more-note">No transactions match.</p>}
    </>
  )
}
