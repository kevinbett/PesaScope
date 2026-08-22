import { fmt } from '../lib/format.js'
import { titleCase, CATEGORIES } from '../lib/insights.js'
import Section from './Section.jsx'

/** rows worth a human look, with a one-tap category fix (kept only if memory is on) */
export default function Review({ items, mem }) {
  if (!items.length) return null
  return (
    <Section id="review" title={`Needs a look (${items.length})`} sub="Rows PesaScope couldn’t place, had no details in the statement, or look unusually large. Set a category if you know better — it’s remembered only if you switch memory on below.">
      <ul className="review">
        {items.slice(0, 30).map(({ t, why }) => (
          <li key={t.receipt + t.details.slice(0, 20)} className="review-row">
            <div className="rv-main">
              <div className="rv-who">{t.who ? titleCase(t.who) : <em>Unlabelled</em>} <span className="tsub">{t.date} · {t.receipt}</span></div>
              <div className="rv-why">{why}</div>
              {t.details && <div className="rv-details">{t.details}</div>}
            </div>
            <div className={'rv-amt ' + (t.paidIn ? 'in' : '')}>{t.paidIn ? '+' : '−'}{fmt(t.paidIn || t.withdrawn)}</div>
            <select className="rv-cat" value={t.fixedCat ? t.cat : ''} aria-label="Set category" onChange={e => mem.setCategory(t, e.target.value)}>
              <option value="">{t.fixedCat ? 'Reset to detected' : 'Set category…'}</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </li>
        ))}
      </ul>
      {items.length > 30 && <p className="more-note">Showing the 30 most recent of {items.length}.</p>}
    </Section>
  )
}
