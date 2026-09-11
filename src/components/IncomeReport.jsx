import { useState } from 'react'
import { fmtKES } from '../lib/format.js'
import { titleCase } from '../lib/insights.js'
import { printIncomeReport } from '../lib/incomeReportDoc.js'
import Section from './Section.jsx'

const cardStyle = { background: 'var(--chip, #E2F0E8)', borderRadius: 12, padding: '12px 14px' }
const kStyle = { fontSize: 10.5, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--brand, #1D7A4E)', fontWeight: 600 }
const vStyle = { fontSize: 22, fontWeight: 800, letterSpacing: '-0.01em', marginTop: 3 }

export default function IncomeReport({ model, defaultName }) {
  const [name, setName] = useState(defaultName || model.name || '')

  if (!model.ok) {
    return (
      <Section id="income" title="Income report" sub="A verified income & affordability summary for visas, loans and landlords.">
        <p className="muted">No clear income was found in this statement — money in looks like loans, transfers or your own deposits rather than earnings. Load a statement that covers months where you were paid to generate a report.</p>
      </Section>
    )
  }

  const r = { ...model, name }
  const cards = [
    ['Avg monthly income', fmtKES(r.avgMonthly), `over ${r.period.months} month${r.period.months === 1 ? '' : 's'}`],
    ['Total income', fmtKES(r.totalCounted), `${r.counts.incomeTxns} receipts`],
    ['Active months', String(r.activeMonths), 'had income'],
    ['Stability', r.stability.label, 'month to month'],
  ]
  const max = Math.max(1, ...r.monthly.map(m => m.income))

  return (
    <Section
      id="income"
      title="Income report"
      sub="A verified income & affordability summary you can print for a visa, loan or landlord — computed on this device from your statement."
      right={<button className="btn small" onClick={() => printIncomeReport(r)}>Download / Print report ↓</button>}
    >
      <label style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', margin: '0 0 16px', fontSize: 13, color: 'var(--muted, #56605A)' }}>
        Name on report
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Full legal name"
          style={{ font: 'inherit', padding: '7px 11px', borderRadius: 8, border: '1px solid var(--line, #DCE3DE)', minWidth: 220, flex: '1 1 220px', maxWidth: '100%' }}
        />
      </label>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 10, marginBottom: 18 }}>
        {cards.map(([k, v, s]) => (
          <div key={k} style={cardStyle}>
            <div style={kStyle}>{k}</div>
            <div style={vStyle}>{v}</div>
            <div style={{ fontSize: 11, color: 'var(--muted, #56605A)', marginTop: 2 }}>{s}</div>
          </div>
        ))}
      </div>

      <h3 style={{ fontSize: 12.5, letterSpacing: '.04em', textTransform: 'uppercase', color: 'var(--muted, #56605A)', margin: '0 0 8px' }}>Monthly income</h3>
      <div style={{ marginBottom: 18 }}>
        {r.monthly.map(m => (
          <div key={m.key} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '5px 0', borderBottom: '1px dashed var(--line, #DCE3DE)', fontSize: 13 }}>
            <span style={{ width: 92, color: 'var(--muted, #56605A)', flex: '0 0 auto' }}>{m.label}</span>
            <span style={{ flex: 1, height: 10, background: 'var(--track, #EDF2EF)', borderRadius: 6, overflow: 'hidden' }}>
              <i style={{ display: 'block', height: '100%', width: Math.max(2, Math.round(m.income / max * 100)) + '%', background: 'var(--brand, #1D7A4E)', borderRadius: 6 }} />
            </span>
            <span style={{ width: 118, textAlign: 'right', fontWeight: 600, flex: '0 0 auto' }}>{fmtKES(m.income)}</span>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 22 }}>
        <div>
          <h3 style={{ fontSize: 12.5, letterSpacing: '.04em', textTransform: 'uppercase', color: 'var(--muted, #56605A)', margin: '0 0 8px' }}>Top income sources</h3>
          {r.sources.length === 0 && <p className="muted">No named sources.</p>}
          {r.sources.map(s => (
            <div key={s.key} style={{ display: 'flex', alignItems: 'baseline', gap: 12, padding: '5px 0', borderBottom: '1px dashed var(--line, #DCE3DE)', fontSize: 13 }}>
              <span style={{ flex: 1, fontWeight: 600 }}>
                {titleCase(s.name)}
                {s.recurring && <b style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em', color: 'var(--brand, #1D7A4E)', background: 'var(--chip, #D6EBDF)', padding: '1px 7px', borderRadius: 999, marginLeft: 6 }}>{s.cadence || 'regular'}</b>}
              </span>
              <span style={{ textAlign: 'right', fontWeight: 700 }}>{fmtKES(s.total)}<small style={{ display: 'block', fontWeight: 500, color: 'var(--muted, #7E8880)', fontSize: 11 }}>{Math.round(s.share * 100)}%</small></span>
            </div>
          ))}
        </div>
        <div>
          <h3 style={{ fontSize: 12.5, letterSpacing: '.04em', textTransform: 'uppercase', color: 'var(--muted, #56605A)', margin: '0 0 8px' }}>Affordability estimate</h3>
          <div style={{ background: 'var(--soft, #F7F9F7)', border: '1px solid var(--line, #E5E9E5)', borderRadius: 12, padding: '14px 16px', fontSize: 13, lineHeight: 1.55 }}>
            Sustainable monthly rent or loan repayment is around <b style={{ fontSize: 20 }}>{fmtKES(r.affordability.rent)}</b>
            <div className="muted" style={{ marginTop: 4 }}>Guide only (≈⅓ of income), not financial advice.</div>
          </div>
        </div>
      </div>

      <p className="muted" style={{ fontSize: 11.5, marginTop: 16, lineHeight: 1.5 }}>
        Income excludes money that only passed through your account — loans, Fuliza, cash deposits, savings withdrawn back, reversals and one-off bank transfers — so the figure isn't inflated. Everything is computed on this device; nothing is uploaded.
      </p>
    </Section>
  )
}
