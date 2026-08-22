import { useEffect, useMemo, useRef, useState } from 'react'
import { fmt, monthOf, monthLbl } from '../lib/format.js'
import { buildPeople, topSentTo, topReceivedFrom, topMerchants, categoryTotals, habits, search, chargesReport } from '../lib/insights.js'
import { useTooltip } from './Tooltip.jsx'
import HBars from './HBars.jsx'
import FlowChart from './FlowChart.jsx'
import TxnTable from './TxnTable.jsx'
import People from './People.jsx'
import Merchants from './Merchants.jsx'
import Habits from './Habits.jsx'
import SearchResults from './SearchResults.jsx'
import Charges from './Charges.jsx'
import Section from './Section.jsx'

function Tiles({ txns, people, onCharges }) {
  const inn = txns.reduce((s, t) => s + t.paidIn, 0)
  const out = txns.reduce((s, t) => s + t.withdrawn, 0)
  const fees = txns.filter(t => t.isCharge).reduce((s, t) => s + t.withdrawn, 0)
  const fuliza = txns.filter(t => t.type === 'Fuliza draw').reduce((s, t) => s + t.paidIn, 0)
  const sentP = people.reduce((s, p) => s + p.sent, 0), recvP = people.reduce((s, p) => s + p.recv, 0)
  const net = inn - out
  const tiles = [
    { lbl: 'Money in', sw: 'zilizoingia', v: fmt(inn), cls: 'pos', sub: 'KES' },
    { lbl: 'Money out', sw: 'zilizotoka', v: fmt(out), cls: '', sub: 'KES' },
    { lbl: 'Net', sw: 'salio', v: (net >= 0 ? '+' : '−') + fmt(Math.abs(net)), cls: net >= 0 ? 'pos' : 'negv', sub: 'KES' },
    { lbl: 'Sent to people', sw: 'ulizotuma', v: fmt(sentP), cls: '', sub: `KES · ${people.filter(p => p.sent > 0).length} people` },
    { lbl: 'Received from people', sw: 'ulizopokea', v: fmt(recvP), cls: 'pos', sub: `KES · ${people.filter(p => p.recv > 0).length} people` },
    { lbl: 'Charges & fees', sw: 'makato', v: fmt(fees), cls: fees > 0 ? 'negv' : '', sub: out ? 'KES · ' + (fees / out * 100).toFixed(1) + '% of outflow · see breakdown ↓' : 'KES', onClick: onCharges },
    { lbl: 'Fuliza borrowed', sw: 'deni la Fuliza', v: fmt(fuliza), cls: '', sub: fuliza ? 'KES · ' + txns.filter(t => t.type === 'Fuliza draw').length + ' draws' : 'none this period' },
  ]
  return (
    <div className="tiles">
      {tiles.map(t => t.onClick ? (
        <button className="tile tile-btn" key={t.lbl} onClick={t.onClick} title="Jump to the charges breakdown">
          <div className="lbl">{t.lbl}<span className="sw-lbl">{t.sw}</span></div>
          <div className={'fig ' + t.cls}>{t.v}</div>
          {t.sub ? <div className="sub">{t.sub}</div> : null}
        </button>
      ) : (
        <div className="tile" key={t.lbl}>
          <div className="lbl">{t.lbl}<span className="sw-lbl">{t.sw}</span></div>
          <div className={'fig ' + t.cls}>{t.v}</div>
          {t.sub ? <div className="sub">{t.sub}</div> : null}
        </div>
      ))}
    </div>
  )
}

export default function Dashboard({ data, isSample, onLoadOwn }) {
  const [monthKey, setMonthKey] = useState('all')
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('')
  const { showTip, hideTip, tooltipEl } = useTooltip()
  const txnsRef = useRef(null)
  const chargesRef = useRef(null)

  const months = useMemo(() => [...new Set(data.txns.map(monthOf))].sort(), [data])
  const txns = useMemo(
    () => data.txns.filter(t => monthKey === 'all' || monthOf(t) === monthKey),
    [data, monthKey]
  )
  const people = useMemo(() => buildPeople(txns), [txns])
  const sentTo = useMemo(() => topSentTo(people, Infinity), [people])
  const recvFrom = useMemo(() => topReceivedFrom(people, Infinity), [people])
  const merchants = useMemo(() => topMerchants(txns, Infinity), [txns])
  const cats = useMemo(() => categoryTotals(txns), [txns])
  const habitItems = useMemo(() => habits(txns, people), [txns, people])
  const result = useMemo(() => search(txns, q), [txns, q])
  const charges = useMemo(() => chargesReport(txns), [txns])
  const catTotal = cats.out.reduce((s, [, v]) => s + v, 0) || 1

  useEffect(() => { setCat('') }, [q])

  const pick = p => { setQ(p.phone || p.name || p.key); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const pickCat = c => { setCat(c); txnsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }
  const goCharges = () => chargesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  const jump = id => {
    if (id === 'overview') return window.scrollTo({ top: 0, behavior: 'smooth' })
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const m = data.meta
  const period = m.period || (txns.length ? txns[0].date + ' → ' + txns[txns.length - 1].date : '')

  // everything currently narrowing the view, each removable on its own
  const active = [
    q ? { key: 'q', label: '“' + q + '”', clear: () => setQ('') } : null,
    monthKey !== 'all' ? { key: 'm', label: monthLbl(monthKey), clear: () => setMonthKey('all') } : null,
    cat ? { key: 'c', label: cat, clear: () => setCat('') } : null,
  ].filter(Boolean)
  const shownCount = result ? result.rows.filter(t => !cat || t.cat === cat).length : txns.filter(t => !cat || t.cat === cat).length
  const clearAll = () => { setQ(''); setMonthKey('all'); setCat('') }

  return (
    <div id="dash" className="show">
      {isSample && (
        <div className="sample-banner" role="status">
          <span><strong>Sample data</strong> — these people, merchants and amounts are made up. Nothing here is from a real statement.</span>
          <button className="btn small" onClick={onLoadOwn}>Load my statement ↑</button>
        </div>
      )}
      <div className="dash-head">
        <span className="who">{m.name || 'Your statement'}</span>
        <span className="meta">{(m.phone ? m.phone + ' · ' : '') + period}</span>
        <span className="meta">{txns.length} transactions</span>
      </div>
      {months.length > 1 && (
        <div className="months">
          <button className="mchip" aria-pressed={monthKey === 'all'} onClick={() => setMonthKey('all')}>All</button>
          {months.map(k => (
            <button key={k} className="mchip" aria-pressed={monthKey === k} onClick={() => setMonthKey(k)}>{monthLbl(k)}</button>
          ))}
        </div>
      )}

      <div className={'searchbar' + (q ? ' active' : '')}>
        <span className="sicon" aria-hidden="true">⌕</span>
        <input
          type="search" value={q} onChange={e => setQ(e.target.value)}
          placeholder="Search a name, phone, PayBill, till, receipt… e.g. “faith”"
          aria-label="Search transactions"
        />
        {q && <button className="sclear" onClick={() => setQ('')} aria-label="Clear search">✕</button>}
      </div>

      {active.length > 0 && (
        <div className="filterstrip" role="status" aria-live="polite">
          <span className="fs-icon" aria-hidden="true">⚲</span>
          <span className="fs-text">Showing <strong>{shownCount.toLocaleString()}</strong> of {data.txns.length.toLocaleString()} transactions</span>
          <span className="fs-pills">
            {active.map(f => (
              <button key={f.key} className="fs-pill" onClick={f.clear} title={'Remove this filter'}>{f.label}<span aria-hidden="true"> ✕</span></button>
            ))}
          </span>
          {active.length > 1 && <button className="fs-clear" onClick={clearAll}>Clear all</button>}
        </div>
      )}

      {!result && (
        <nav className="jumpbar" aria-label="Jump to section">
          {[['overview', 'Overview'], ['transactions', 'Transactions'], ['people', 'People'], ['habits', 'Habits'], ['merchants', 'Merchants'], ['charges', 'Charges']].map(([id, l]) => (
            <button key={id} className="jump" onClick={() => jump(id)}>{l}</button>
          ))}
        </nav>
      )}

      {result ? (
        <SearchResults q={q} result={result} cat={cat} setCat={setCat} setQ={setQ} showTip={showTip} hideTip={hideTip} onPick={pick} meta={data.meta} context={monthKey === 'all' ? '' : monthLbl(monthKey)} />
      ) : (
        <>
          <Tiles txns={txns} people={people} onCharges={goCharges} />

          <div className="charts">
            <section className="panel" style={{ marginTop: 0 }}>
              <h2>Where the money went</h2>
              <HBars entries={cats.out} total={catTotal} tipLabel="of outflow" showTip={showTip} hideTip={hideTip} onPick={pickCat} />
              <p className="chart-note">Outflows by category. Click a bar to filter the transactions below.</p>
            </section>
            <section className="panel" style={{ marginTop: 0 }}>
              <h2>Daily flow</h2>
              <div className="legend">
                <span><span className="sw" style={{ background: 'var(--series-in)' }} />Money in</span>
                <span><span className="sw" style={{ background: 'var(--series-out)' }} />Money out</span>
              </div>
              <FlowChart txns={txns} showTip={showTip} hideTip={hideTip} />
            </section>
          </div>

          <Section id="transactions" title="Transactions" innerRef={txnsRef}>
            <TxnTable txns={txns} cat={cat} setCat={setCat} onPick={pick} meta={data.meta} context={monthKey === 'all' ? '' : monthLbl(monthKey)} />
          </Section>

          <div className="charts" id="people">
            <People id="sent" title="You sent the most to" sub="People, by total sent — tap a name to see every transaction with them." people={sentTo} field="sent" countField="sentN" onPick={pick} emptyNote="No person-to-person sends in this period." />
            <People id="received" title="You received the most from" sub="People and remittance services that paid you." people={recvFrom} field="recv" countField="recvN" onPick={pick} emptyNote="No person-to-person receipts in this period." />
          </div>

          <div className="charts">
            <Habits id="habits" items={habitItems} />
            <Merchants id="merchants" merchants={merchants} onPick={pick} />
          </div>

          <Charges ref={chargesRef} report={charges} onShowAll={() => pickCat('Charges & fees')} onPick={pick} showTip={showTip} hideTip={hideTip} />
        </>
      )}
      {tooltipEl}
    </div>
  )
}
