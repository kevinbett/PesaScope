import { useEffect, useMemo, useRef, useState } from 'react'
import { useSearchTerms } from '../lib/useSearchTerms.js'
import { fmt, monthOf, monthLbl } from '../lib/format.js'
import { buildPeople, topSentTo, topReceivedFrom, topMerchants, categoryTotals, habits, search, chargesReport, splitTerms, buildIndex, monthlyTrends, subscriptions, reviewItems } from '../lib/insights.js'
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
import SearchBox from './SearchBox.jsx'
import Tiles from './Tiles.jsx'
import FilterStrip from './FilterStrip.jsx'
import Trends from './Trends.jsx'
import Subscriptions from './Subscriptions.jsx'
import Review from './Review.jsx'
import Settings from './Settings.jsx'

export default function Dashboard({ data, isSample, onLoadOwn, mem, onRemoveStatement }) {
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
  const index = useMemo(() => buildIndex(data.txns), [data])   // type-ahead over the whole statement, not the month slice
  const terms = useSearchTerms(q, setQ, index)
  const charges = useMemo(() => chargesReport(txns), [txns])
  const trends = useMemo(() => monthlyTrends(data.txns), [data])          // whole statement, every month
  const subs = useMemo(() => subscriptions(data.txns), [data])
  const review = useMemo(() => reviewItems(data.txns), [data])
  const catTotal = cats.out.reduce((s, [, v]) => s + v, 0) || 1

  useEffect(() => { setCat('') }, [q])

  const pick = p => { setQ(p.phone || p.name || p.key); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const pickCat = c => { setCat(c); txnsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }
  const jump = id => {
    if (id === 'overview') return window.scrollTo({ top: 0, behavior: 'smooth' })
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const m = data.meta
  const period = m.period || (txns.length ? txns[0].date + ' → ' + txns[txns.length - 1].date : '')

  // everything currently narrowing the view, each removable on its own
  const active = [
    ...splitTerms(q).map(term => ({ key: 'q:' + term, label: terms.labelFor(term), clear: () => terms.removeTerm(term) })),
    monthKey !== 'all' ? { key: 'm', label: monthLbl(monthKey), clear: () => setMonthKey('all') } : null,
    cat ? { key: 'c', label: cat, clear: () => setCat('') } : null,
  ].filter(Boolean)
  const shownCount = result ? result.rows.filter(t => !cat || t.cat === cat).length : txns.filter(t => !cat || t.cat === cat).length
  const clearAll = () => { setQ(''); setMonthKey('all'); setCat('') }

  return (
    <div id="dash" className="show">
      {isSample && (
        <div className="sample-banner" role="status">
          <span><strong>Sample data</strong><span className="sb-long"> — these people, merchants and amounts are made up. Nothing here is from a real statement.</span><span className="sb-short"> — not your statement</span></span>
          <button className="btn small" onClick={onLoadOwn}>Load my statement ↑</button>
        </div>
      )}
      <div className="dash-head">
        <span className="who">{m.name || 'Your statement'}</span>
        <span className="meta">{(m.phone ? m.phone + ' · ' : '') + period}</span>
        <span className="meta">{txns.length} transactions</span>
      </div>
      {!isSample && data.files && data.files.length > 0 && (
        <div className="files" aria-label="Loaded statements">
          <span className="lblx">{data.files.length === 1 ? '1 statement' : data.files.length + ' statements combined'}</span>
          {data.files.map((f, i) => (
            <span className="file" key={f.name + i}>📄 <span className="mono">{f.period || f.name}</span> · {f.n.toLocaleString()}<button onClick={() => onRemoveStatement(i)} aria-label={'Remove ' + f.name} title="Remove this statement">✕</button></span>
          ))}
        </div>
      )}
      {months.length > 1 && (
        <div className="months">
          <button className="mchip" aria-pressed={monthKey === 'all'} onClick={() => setMonthKey('all')}>All</button>
          {months.map(k => (
            <button key={k} className="mchip" aria-pressed={monthKey === k} onClick={() => setMonthKey(k)}>{monthLbl(k)}</button>
          ))}
        </div>
      )}

      <SearchBox q={q} setQ={setQ} terms={terms} />

      <FilterStrip active={active} shown={shownCount} total={data.txns.length} onClearAll={clearAll} />

      {!result && (
        <nav className="jumpbar" aria-label="Jump to section">
          {[['overview', 'Overview'], ['transactions', 'Transactions'], ['people', 'People'], ['habits', 'Habits'], ['merchants', 'Merchants'], ['regular', 'Regular'], ['trends', 'Months'], ['charges', 'Charges'], ['review', 'Review']].map(([id, l]) => (
            <button key={id} className="jump" onClick={() => jump(id)}>{l}</button>
          ))}
        </nav>
      )}

      {result ? (
        <SearchResults q={q} result={result} cat={cat} setCat={setCat} setQ={setQ} showTip={showTip} hideTip={hideTip} onPick={pick} meta={data.meta} context={monthKey === 'all' ? '' : monthLbl(monthKey)} mem={mem} index={index} />
      ) : (
        <>
          <Tiles txns={txns} people={people} />

          <div className="charts">
            <section className="panel" style={{ marginTop: 0 }}>
              <h2>Where the money went</h2>
              <HBars entries={cats.out} total={catTotal} tipLabel="of outflow" showTip={showTip} hideTip={hideTip} onPick={pickCat} />
              <p className="chart-note">Outflows by category. Click a bar to filter the transactions below.</p>
            </section>
            <section className="panel" style={{ marginTop: 0 }}>
              <h2>Money flow</h2>
              <div className="legend">
                <span><span className="sw" style={{ background: 'var(--series-in)' }} />Money in</span>
                <span><span className="sw" style={{ background: 'var(--series-out)' }} />Money out</span>
              </div>
              <FlowChart txns={txns} showTip={showTip} hideTip={hideTip} />
              <p className="chart-note">In and out per day, week or month depending on the span. Hover or tap a bar.</p>
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

          <Subscriptions items={subs} onPick={pick} />

          <Trends rows={trends} monthKey={monthKey} onPick={setMonthKey} />

          <Charges ref={chargesRef} report={charges} onShowAll={() => pickCat('Charges & fees')} onPick={pick} showTip={showTip} hideTip={hideTip} />

          <Review items={review} mem={mem} />
        </>
      )}
      {!isSample && <Settings mem={mem} txns={data.txns} />}
      {tooltipEl}
    </div>
  )
}
