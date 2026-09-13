import { useState } from 'react'
import { fmtKES } from '../lib/format.js'
import { titleCase } from '../lib/insights.js'
import { printIncomeReport } from '../lib/incomeReportDoc.js'
import Section from './Section.jsx'

// Uses PesaScope's own theme tokens so the section adapts to light AND dark mode.
const card = { background: 'var(--accent-soft)', border: '1px solid var(--line)', borderRadius: 12, padding: '12px 14px', color: 'var(--ink)' }
const kS = { fontSize: 10.5, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--accent)', fontWeight: 700 }
const vS = { fontSize: 22, fontWeight: 800, letterSpacing: '-0.01em', marginTop: 3, color: 'var(--ink)' }
const sS = { fontSize: 11, color: 'var(--ink-2)', marginTop: 2 }
const h3S = { fontSize: 12.5, letterSpacing: '.04em', textTransform: 'uppercase', color: 'var(--ink-2)', margin: '0 0 8px' }
const noteS = { background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 12, padding: '14px 16px', color: 'var(--ink)' }
const rowS = { display: 'flex', alignItems: 'center', gap: 12, padding: '5px 0', borderBottom: '1px dashed var(--line)', fontSize: 13, color: 'var(--ink)' }

function Row({ label, note, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 12.5, padding: '6px 0', borderBottom: '1px dashed var(--line)', color: 'var(--ink)' }}>
      <span>{label}{note && <em style={{ fontStyle: 'normal', color: 'var(--ink-3)', fontSize: 11 }}> {note}</em>}</span>
      <span style={{ fontWeight: 600 }}>{fmtKES(value)}</span>
    </div>
  )
}

export default function IncomeReport({ model, defaultName }) {
  const [name, setName] = useState(defaultName || model.name || '')

  if (!model.ok) {
    return (
      <Section id="income" title="Income report" sub="A verified income & affordability summary for visas, loans and landlords.">
        <p className="muted">No money-in was found in this statement, so there's nothing to report on yet.</p>
      </Section>
    )
  }

  const r = { ...model, name }
  const o = r.other, x = r.excluded
  const max = Math.max(1, ...r.regular.monthly.map(m => m.income))
  const cards = r.hasRegular ? [
    ['Regular monthly income', fmtKES(r.regular.avgMonthly), `over ${r.period.months} month${r.period.months === 1 ? '' : 's'}`],
    ['Regular income total', fmtKES(r.regular.total), `${r.regular.count} payment${r.regular.count === 1 ? '' : 's'}`],
    ['Active months', String(r.regular.activeMonths), 'had regular income'],
    ['Stability', r.regular.stability.label, 'month to month'],
  ] : []

  const other = [
    ['Receipts from people (P2P)', o.p2p.payers ? `${o.p2p.n} receipts · ${o.p2p.payers} payers` : '', o.p2p.total],
    ['International remittances', o.remittance.n ? `${o.remittance.n} receipts` : '', o.remittance.total],
    ['Bank transfers in', o.bank.n ? `${o.bank.n} transfers` : '', o.bank.total],
    ['Other receipts', o.misc.n ? `${o.misc.n} receipts` : '', o.misc.total],
  ].filter(([, , v]) => v > 0)
  const excluded = [
    ['Loans received', x.loans], ['Fuliza (overdraft)', x.fuliza], ['Cash deposits', x.cashIn],
    ['Savings withdrawn back', x.savings], ['Betting payouts', x.betting], ['Reversals / refunds', x.reversals],
  ].filter(([, v]) => v > 0)

  return (
    <Section
      id="income"
      title="Income report"
      sub="A conservative, verified income & affordability summary you can print for a visa, loan or landlord — computed on this device from your statement."
      right={<button className="btn small" onClick={() => printIncomeReport(r)}>Download / Print report ↓</button>}
    >
      <label style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', margin: '0 0 16px', fontSize: 13, color: 'var(--ink-2)' }}>
        Name on report
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Full legal name"
          style={{ font: 'inherit', padding: '7px 11px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--ground)', color: 'var(--ink)', minWidth: 220, flex: '1 1 220px', maxWidth: '100%' }} />
      </label>

      {r.hasRegular ? (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 18 }}>
            {cards.map(([k, v, s]) => (
              <div key={k} style={card}><div style={kS}>{k}</div><div style={vS}>{v}</div><div style={sS}>{s}</div></div>
            ))}
          </div>
          <h3 style={h3S}>Regular income by month</h3>
          <div style={{ marginBottom: 18 }}>
            {r.regular.monthly.map(m => (
              <div key={m.key} style={rowS}>
                <span style={{ width: 92, color: 'var(--ink-2)', flex: '0 0 auto' }}>{m.label}</span>
                <span style={{ flex: 1, height: 10, background: 'var(--grid)', borderRadius: 6, overflow: 'hidden' }}>
                  <i style={{ display: 'block', height: '100%', width: Math.max(2, Math.round(m.income / max * 100)) + '%', background: 'var(--accent)', borderRadius: 6 }} />
                </span>
                <span style={{ width: 118, textAlign: 'right', fontWeight: 600, flex: '0 0 auto' }}>{fmtKES(m.income)}</span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div style={{ background: 'var(--amber-bg)', border: '1px solid var(--amber-line)', color: 'var(--amber-ink)', borderRadius: 12, padding: '14px 16px', fontSize: 13, lineHeight: 1.55, marginBottom: 18 }}>
          No <b>regular</b> income was detected — no salary or recurring non-bank payer with an even rhythm. Money did come in, but as one-off receipts, remittances, or transfers from your own bank, itemised below under <b>Other money received</b>.
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 22 }}>
        <div>
          <h3 style={h3S}>Regular income sources</h3>
          {r.regular.sources.length === 0 && <p className="muted">No regular income source detected.</p>}
          {r.regular.sources.map(s => (
            <div key={s.key} style={{ display: 'flex', alignItems: 'baseline', gap: 12, padding: '5px 0', borderBottom: '1px dashed var(--line)', fontSize: 13, color: 'var(--ink)' }}>
              <span style={{ flex: 1, fontWeight: 600 }}>
                {titleCase(s.name)}
                {s.recurring && <b style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', color: 'var(--accent)', background: 'var(--accent-soft)', padding: '1px 7px', borderRadius: 999, marginLeft: 6 }}>{s.cadence || 'regular'}</b>}
              </span>
              <span style={{ textAlign: 'right', fontWeight: 700 }}>{fmtKES(s.total)}<small style={{ display: 'block', fontWeight: 500, color: 'var(--ink-3)', fontSize: 11 }}>{Math.round(s.share * 100)}%</small></span>
            </div>
          ))}
        </div>
        <div>
          <h3 style={h3S}>Affordability estimate</h3>
          <div style={{ ...noteS, fontSize: 13, lineHeight: 1.55 }}>
            Based on <b>regular</b> income, a sustainable monthly rent or loan repayment is around <b style={{ fontSize: 20 }}>{fmtKES(r.affordability.rent)}</b>
            <div style={{ color: 'var(--ink-3)', marginTop: 4 }}>Guide only (≈⅓ of regular income), not financial advice.</div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 22, marginTop: 18 }}>
        <div style={noteS}>
          <h3 style={{ ...h3S, margin: '0 0 6px' }}>Other money received</h3>
          <p style={{ margin: '0 0 8px', fontSize: 12, lineHeight: 1.5, color: 'var(--ink-2)' }}>Came in but <b>not counted</b> as regular income — may be business float, repayments, remittances or your own funds.</p>
          {other.length ? other.map(([l, n, v]) => <Row key={l} label={l} note={n} value={v} />) : <p className="muted">None.</p>}
        </div>
        <div style={noteS}>
          <h3 style={{ ...h3S, margin: '0 0 6px' }}>Not counted — passed through</h3>
          <p style={{ margin: '0 0 8px', fontSize: 12, lineHeight: 1.5, color: 'var(--ink-2)' }}>Borrowed or your own money moving around. Excluded so income isn't inflated.</p>
          {excluded.length ? excluded.map(([l, v]) => <Row key={l} label={l} value={v} />) : <p className="muted">Nothing excluded.</p>}
        </div>
      </div>
    </Section>
  )
}
