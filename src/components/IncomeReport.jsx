import { useState } from 'react'
import { fmtKES } from '../lib/format.js'
import { titleCase } from '../lib/insights.js'
import { printIncomeReport } from '../lib/incomeReportDoc.js'
import Section from './Section.jsx'

const h3S = { fontSize: 12, letterSpacing: '.05em', textTransform: 'uppercase', color: 'var(--ink-3)', margin: '0 0 10px', fontWeight: 700 }
const cardS = { background: 'var(--card)', border: '1px solid var(--line)', borderRadius: 14, padding: '16px 18px', color: 'var(--ink)' }
const rowS = { display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 13, padding: '7px 0', borderBottom: '1px dashed var(--line)', color: 'var(--ink)' }

function Rows({ items }) {
  if (!items.length) return <p className="muted" style={{ fontSize: 13 }}>None.</p>
  return items.map(([label, note, value], i) => (
    <div key={label} style={{ ...rowS, borderBottom: i === items.length - 1 ? 'none' : rowS.borderBottom }}>
      <span>{label}{note && <em style={{ fontStyle: 'normal', color: 'var(--ink-3)', fontSize: 11.5 }}> · {note}</em>}</span>
      <span style={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{fmtKES(value)}</span>
    </div>
  ))
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
  const months = r.period.months
  const fromPeople = o.p2p.total + o.remittance.total + o.misc.total
  const ownBank = o.bank.total
  const passedThrough = x.loans + x.fuliza + x.cashIn + x.savings + x.betting + x.reversals
  const totalIn = r.totals.received || (r.regular.total + o.total + passedThrough) || 1

  // "where your money came from" — honest tiers of every shilling that came in
  const tiers = [
    { key: 'reg', label: 'Regular income', v: r.regular.total, color: 'var(--accent)' },
    { key: 'ppl', label: 'From people (P2P & remittances)', v: fromPeople, color: 'var(--series-in)' },
    { key: 'bank', label: 'Bank transfers in (usually your own)', v: ownBank, color: 'var(--axis)' },
    { key: 'thru', label: 'Loans & pass-through (not yours)', v: passedThrough, color: 'var(--neg)' },
  ].filter(t => t.v > 0)

  return (
    <Section
      id="income"
      title="Income report"
      sub="A conservative, verified income & affordability summary you can print for a visa, loan or landlord — computed on this device, nothing uploaded."
      right={<button className="btn small" onClick={() => printIncomeReport(r)}>Download / Print report ↓</button>}
    >
      <label style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', margin: '0 0 18px', fontSize: 13, color: 'var(--ink-2)' }}>
        Name on report
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Full legal name"
          style={{ font: 'inherit', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--ground)', color: 'var(--ink)', minWidth: 220, flex: '1 1 220px', maxWidth: '100%' }} />
      </label>

      {/* HERO — the one honest headline */}
      <div style={{ ...cardS, padding: '20px 22px', marginBottom: 16, display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
        {r.hasRegular ? (
          <>
            <div>
              <div style={h3S}>Verified regular income</div>
              <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--accent)', lineHeight: 1.05 }}>
                {fmtKES(r.regular.avgMonthly)}<span style={{ fontSize: 16, fontWeight: 600, color: 'var(--ink-2)' }}> /mo</span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--ink-2)', marginTop: 4 }}>over {months} month{months === 1 ? '' : 's'} · {r.regular.count} payment{r.regular.count === 1 ? '' : 's'}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--accent)', background: 'var(--accent-soft)', padding: '4px 10px', borderRadius: 999 }}>{r.regular.stability.label}</span>
              <div style={{ fontSize: 12.5, color: 'var(--ink-2)', marginTop: 6 }}>Affordable rent/repayment<br /><b style={{ color: 'var(--ink)', fontSize: 15 }}>{fmtKES(r.affordability.rent)}</b>/mo</div>
            </div>
          </>
        ) : (
          <div>
            <div style={h3S}>Received from others</div>
            <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--accent)', lineHeight: 1.05 }}>{fmtKES(fromPeople)}</div>
            <div style={{ fontSize: 13, color: 'var(--ink-2)', marginTop: 4 }}>over {months} months · <b style={{ color: 'var(--ink)' }}>no steady salary</b> detected in this statement</div>
          </div>
        )}
      </div>

      {/* WHERE THE MONEY CAME FROM — one honest stacked bar */}
      <h3 style={h3S}>Where your money came from · {fmtKES(totalIn)} total in</h3>
      <div style={{ display: 'flex', height: 16, borderRadius: 8, overflow: 'hidden', marginBottom: 12, border: '1px solid var(--line)' }}>
        {tiers.map(t => <div key={t.key} title={`${t.label}: ${fmtKES(t.v)}`} style={{ width: (t.v / totalIn * 100) + '%', background: t.color }} />)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '6px 18px', marginBottom: 22 }}>
        {tiers.map(t => (
          <div key={t.key} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--ink-2)' }}>
            <span style={{ width: 10, height: 10, borderRadius: 3, background: t.color, flex: '0 0 auto' }} />
            <span style={{ flex: 1 }}>{t.label}</span>
            <b style={{ color: 'var(--ink)', whiteSpace: 'nowrap' }}>{fmtKES(t.v)} · {Math.round(t.v / totalIn * 100)}%</b>
          </div>
        ))}
      </div>

      {/* REGULAR INCOME DETAIL — only when there is some */}
      {r.hasRegular && (
        <div style={{ ...cardS, marginBottom: 16 }}>
          <h3 style={{ ...h3S, marginBottom: 12 }}>Regular income by month & source</h3>
          {r.regular.monthly.map(m => {
            const mx = Math.max(1, ...r.regular.monthly.map(x => x.income))
            return (
              <div key={m.key} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '4px 0', fontSize: 13 }}>
                <span style={{ width: 84, color: 'var(--ink-2)', flex: '0 0 auto' }}>{m.label}</span>
                <span style={{ flex: 1, height: 9, background: 'var(--grid)', borderRadius: 6, overflow: 'hidden' }}><i style={{ display: 'block', height: '100%', width: Math.max(2, Math.round(m.income / mx * 100)) + '%', background: 'var(--accent)' }} /></span>
                <span style={{ width: 110, textAlign: 'right', fontWeight: 600, flex: '0 0 auto' }}>{fmtKES(m.income)}</span>
              </div>
            )
          })}
          <div style={{ borderTop: '1px solid var(--line)', marginTop: 10, paddingTop: 10 }}>
            {r.regular.sources.map(s => (
              <div key={s.key} style={rowS}>
                <span style={{ fontWeight: 600 }}>{titleCase(s.name)}{s.recurring && <em style={{ fontStyle: 'normal', color: 'var(--ink-3)', fontSize: 11.5 }}> · {s.cadence}</em>}</span>
                <span style={{ fontWeight: 700 }}>{fmtKES(s.total)} <span style={{ color: 'var(--ink-3)', fontWeight: 500 }}>{Math.round(s.share * 100)}%</span></span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* DETAIL BREAKDOWN — theme-consistent cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: 16 }}>
        <div style={cardS}>
          <h3 style={h3S}>Money received from others</h3>
          <Rows items={[
            ['Receipts from people (P2P)', o.p2p.payers ? `${o.p2p.n} receipts, ${o.p2p.payers} payers` : '', o.p2p.total],
            ['International remittances', o.remittance.n ? `${o.remittance.n} receipts` : '', o.remittance.total],
            ['Bank transfers in', o.bank.n ? `${o.bank.n} transfers — likely your own` : '', o.bank.total],
            ['Other receipts', o.misc.n ? `${o.misc.n} receipts` : '', o.misc.total],
          ].filter(([, , v]) => v > 0)} />
          <p style={{ margin: '10px 0 0', fontSize: 11.5, color: 'var(--ink-3)', lineHeight: 1.5 }}>Real money in, but not counted as <b>regular</b> income — may be business float, repayments, remittances or your own funds.</p>
        </div>
        <div style={cardS}>
          <h3 style={h3S}>Not counted — passed through</h3>
          <Rows items={[
            ['Loans received', '', x.loans], ['Fuliza (overdraft)', '', x.fuliza], ['Cash deposits', '', x.cashIn],
            ['Savings withdrawn back', '', x.savings], ['Betting payouts', '', x.betting], ['Reversals / refunds', '', x.reversals],
          ].filter(([, , v]) => v > 0)} />
          <p style={{ margin: '10px 0 0', fontSize: 11.5, color: 'var(--ink-3)', lineHeight: 1.5 }}>Borrowed money or your own funds moving around — excluded so income can't be inflated.</p>
        </div>
      </div>
    </Section>
  )
}
