import { useMemo, useState } from 'react'
import { fmt, fmtKES, monthOf, monthLbl } from '../lib/format.js'
import { useTooltip } from './Tooltip.jsx'
import HBars from './HBars.jsx'
import FlowChart from './FlowChart.jsx'
import TxnTable from './TxnTable.jsx'

function Tiles({ txns }) {
  const inn = txns.reduce((s, t) => s + t.paidIn, 0)
  const out = txns.reduce((s, t) => s + t.withdrawn, 0)
  const fees = txns.filter(t => t.cat === 'Charges & fees').reduce((s, t) => s + t.withdrawn, 0)
  const fuliza = txns.filter(t => t.cat === 'Fuliza').reduce((s, t) => s + t.paidIn, 0)
  const net = inn - out
  const tiles = [
    { lbl: 'Money in', sw: 'zilizoingia', v: fmtKES(inn), cls: 'pos' },
    { lbl: 'Money out', sw: 'zilizotoka', v: fmtKES(out), cls: '' },
    { lbl: 'Net', sw: 'salio la mwezi', v: (net >= 0 ? '+' : '−') + fmt(Math.abs(net)), cls: net >= 0 ? 'pos' : 'negv', sub: 'KES' },
    { lbl: 'Charges & fees', sw: 'makato', v: fmtKES(fees), cls: fees > 0 ? 'negv' : '', sub: out ? (fees / out * 100).toFixed(1) + '% of outflow' : '' },
    { lbl: 'Fuliza borrowed', sw: 'deni la Fuliza', v: fmtKES(fuliza), cls: '', sub: fuliza ? 'auto-repaid from inflows' : 'none this period' },
  ]
  return (
    <div className="tiles">
      {tiles.map(t => (
        <div className="tile" key={t.lbl}>
          <div className="lbl">{t.lbl}<span className="sw-lbl">{t.sw}</span></div>
          <div className={'fig ' + t.cls}>{t.v}</div>
          {t.sub ? <div className="sub">{t.sub}</div> : null}
        </div>
      ))}
    </div>
  )
}

export default function Dashboard({ data, isSample }) {
  const [monthKey, setMonthKey] = useState('all')
  const { showTip, hideTip, tooltipEl } = useTooltip()

  const months = useMemo(() => [...new Set(data.txns.map(monthOf))].sort(), [data])
  const txns = useMemo(
    () => data.txns.filter(t => monthKey === 'all' || monthOf(t) === monthKey),
    [data, monthKey]
  )

  const catEntries = useMemo(() => {
    const by = {}
    txns.forEach(t => { if (t.withdrawn > 0) by[t.cat] = (by[t.cat] || 0) + t.withdrawn })
    return Object.entries(by).sort((a, b) => b[1] - a[1])
  }, [txns])
  const catTotal = catEntries.reduce((s, [, v]) => s + v, 0) || 1

  const recipEntries = useMemo(() => {
    const by = {}
    txns.forEach(t => {
      if (t.withdrawn > 0 && !['Charges & fees', 'Savings & loans', 'Fuliza'].includes(t.cat))
        by[t.who] = (by[t.who] || 0) + t.withdrawn
    })
    return Object.entries(by).sort((a, b) => b[1] - a[1]).slice(0, 8)
  }, [txns])
  const recipTotal = recipEntries.reduce((s, [, v]) => s + v, 0) || 1

  const m = data.meta
  const period = m.period || (txns.length ? txns[0].date + ' → ' + txns[txns.length - 1].date : '')

  return (
    <div id="dash" className="show">
      <div className="dash-head">
        <span className="who">{m.name || 'Your statement'}</span>
        <span className="meta">{(m.phone ? m.phone + ' · ' : '') + period}</span>
        <span className="meta">{txns.length} transactions</span>
        {isSample && <span className="sample-tag show">Sample data — not your statement</span>}
      </div>
      {months.length > 1 && (
        <div className="months">
          <button className="mchip" aria-pressed={monthKey === 'all'} onClick={() => setMonthKey('all')}>All</button>
          {months.map(k => (
            <button key={k} className="mchip" aria-pressed={monthKey === k} onClick={() => setMonthKey(k)}>
              {monthLbl(k)}
            </button>
          ))}
        </div>
      )}
      <Tiles txns={txns} />

      <div className="charts">
        <section className="panel" style={{ marginTop: 0 }}>
          <h2>Where the money went</h2>
          <HBars entries={catEntries} total={catTotal} tipLabel="of outflow" showTip={showTip} hideTip={hideTip} />
          <p className="chart-note">Outflows by category for the selected period. Hover a bar for the share.</p>
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

      <section className="panel">
        <h2>Top recipients</h2>
        <HBars entries={recipEntries} total={recipTotal} tipLabel="of spending" showTip={showTip} hideTip={hideTip} />
        <p className="chart-note">Who received the most, excluding charges and your own savings moves.</p>
      </section>

      <section className="panel">
        <h2>Transactions</h2>
        <TxnTable txns={txns} />
      </section>
      {tooltipEl}
    </div>
  )
}
