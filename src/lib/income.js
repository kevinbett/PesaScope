// Income & affordability model built from parsed M-PESA transactions.
// PURE (no DOM, no pdf.js).
//
// Design (deliberately CONSERVATIVE — a report a lender/landlord/embassy can trust):
//   • "Regular income" is the headline and counts only money we are confident is earned:
//     inflows from a recurring source (same payer, even cadence) plus explicit "Salary Payment".
//   • Everything else that came in — one-off P2P receipts, international remittances, bank
//     transfers — is shown as "Other money received", clearly labelled and NOT in the headline,
//     because on a busy account it may be business float, repayments, remittances or your own funds.
//   • Money that merely passed through (loans, Fuliza, cash deposits, savings withdrawn back,
//     reversals, betting payouts) is excluded entirely and listed for transparency.
import { brandKey } from './parser-core.js'
import { monthLbl } from './format.js'

// Inflows that are NOT income, no matter how regular they look.
export const NON_INCOME_IN = new Set([
  'Loans',                 // loan disbursements are debt, not earnings
  'Fuliza',                // overdraft drawdown
  'Cash in',               // your own cash deposited
  'Savings & investments', // your own money coming back (M-Shwari/MMF withdrawals)
  'Refunds & reversals',   // money returned, not earned
  'Charges & fees',        // never an inflow that matters
  'Betting',               // a bookmaker payout is not income (SportPesa B2C etc.)
])

const PAYROLL = /^salary payment/i          // explicit payroll — regular income even if seen once
const INTL = /^receive international/i       // inbound remittance — shown, but not headline income

// A payer that is a bank/SACCO. A *recurring* inflow from a bank is almost never
// salary — it's you moving your own money in (bank→M-PESA), a loan, or a facility —
// so it must NOT be promoted to "regular income" just because it repeats. It stays
// under "bank transfers in". (Genuine payroll still counts via PAYROLL wording, and a
// recurring non-bank employer/client still counts.)
const BANK = /\b(bank|sacco|chartered|stanchart|equity|kcb|absa|stanbic|ncba|co-?op|cooperative|dtb|i\s*&\s*m|imbank|sbm|sidian|ecobank|gulf\s*african|diamond\s*trust)\b/i
const looksLikeBank = t => BANK.test(t.who || '') || BANK.test(t.details || '')

const median = a => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : 0 }
const sum = a => a.reduce((x, y) => x + y, 0)
const srcKey = t => t.key || brandKey(t.who) || (t.code ? 'code:' + t.code : 'who:' + (t.who || '?'))

/** months spanned between two 'YYYY-MM-DD' dates, inclusive (min 1) */
function monthsSpanned(from, to) {
  if (!from || !to) return 1
  const a = +from.slice(0, 4) * 12 + +from.slice(5, 7)
  const b = +to.slice(0, 4) * 12 + +to.slice(5, 7)
  return Math.max(1, b - a + 1)
}

/**
 * Group candidate inflows by source and keep those with a regular rhythm
 * (>=3 receipts across >=2 months, even cadence <= 45 days) — a salary or a regular client.
 * @returns {Map<string,{cadence,gapDays}>} keyed by source
 */
function recurringSources(cands) {
  const by = new Map()
  for (const t of cands) {
    const k = srcKey(t)
    const s = by.get(k) || { dates: [], months: new Set() }
    s.dates.push(t.dt); s.months.add(t.date.slice(0, 7))
    by.set(k, s)
  }
  const out = new Map()
  for (const [k, s] of by) {
    if (s.dates.length < 3 || s.months.size < 2) continue
    const d = s.dates.slice().sort((a, b) => a - b)
    const gaps = d.slice(1).map((x, i) => (x - d[i]) / 864e5)
    const gap = median(gaps)
    if (!gap || gap > 45) continue
    if (!gaps.every(g => Math.abs(g - gap) <= Math.max(3, gap * 0.5))) continue
    out.set(k, { cadence: gap <= 9 ? 'weekly' : gap <= 18 ? 'fortnightly' : 'monthly', gapDays: Math.round(gap) })
  }
  return out
}

const tier = arr => ({ total: sum(arr.map(t => t.paidIn)), n: arr.length })

/**
 * Build the income report model.
 * @param {Array} txns  parsed + enriched transactions
 * @param {Object} meta statement meta ({name, phone, period})
 */
export function incomeReport(txns, meta = {}) {
  const real = (txns || []).filter(t => !t.isCharge)
  const dates = real.map(t => t.date).filter(Boolean).sort()
  const from = dates[0] || null, to = dates[dates.length - 1] || null
  const months = monthsSpanned(from, to)

  const inflows = real.filter(t => t.paidIn > 0)
  const cands = inflows.filter(t => !NON_INCOME_IN.has(t.cat))
  const rec = recurringSources(cands)

  // classify every candidate inflow into one confident bucket
  const regular = []
  const other = { p2p: [], remittance: [], bank: [], misc: [] }
  for (const t of cands) {
    const regularByRhythm = rec.has(srcKey(t)) && !looksLikeBank(t)   // recurring, but not a bank source
    if (PAYROLL.test(t.details || '') || regularByRhythm) regular.push(t)
    else if (INTL.test(t.details || '')) other.remittance.push(t)
    else if (t.cat === 'Received') other.p2p.push(t)
    else if (t.cat === 'Bank & cards') other.bank.push(t)
    else other.misc.push(t)
  }

  // ---- headline: regular income ----
  const totalRegular = sum(regular.map(t => t.paidIn))
  const mMap = new Map()
  for (const t of regular) { const k = t.date.slice(0, 7); mMap.set(k, (mMap.get(k) || 0) + t.paidIn) }
  const monthly = [...mMap.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([key, income]) => ({ key, label: monthLbl(key), income }))
  const avgMonthly = totalRegular / months
  const vals = monthly.map(m => m.income)
  const mean = vals.length ? sum(vals) / vals.length : 0
  const cv = mean > 0 && vals.length > 1
    ? Math.sqrt(sum(vals.map(v => (v - mean) ** 2)) / vals.length) / mean : 0
  const stability = {
    cv,
    label: vals.length < 2 ? 'Too short to tell' : cv < 0.35 ? 'Stable' : cv < 0.75 ? 'Variable' : 'Irregular',
  }
  const sMap = new Map()
  for (const t of regular) {
    const k = srcKey(t)
    const s = sMap.get(k) || { key: k, name: t.who || 'Unknown', total: 0, n: 0, recurring: rec.has(k), cadence: rec.get(k)?.cadence || null }
    s.total += t.paidIn; s.n++; s.name = t.who || s.name
    sMap.set(k, s)
  }
  const sources = [...sMap.values()].sort((a, b) => b.total - a.total).slice(0, 6)
    .map(s => ({ ...s, share: totalRegular ? s.total / totalRegular : 0 }))

  // ---- other money received (shown, not counted) ----
  const otherModel = {
    total: sum([...other.p2p, ...other.remittance, ...other.bank, ...other.misc].map(t => t.paidIn)),
    p2p: { ...tier(other.p2p), payers: new Set(other.p2p.map(srcKey)).size },
    remittance: tier(other.remittance),
    bank: tier(other.bank),
    misc: tier(other.misc),
  }

  // ---- excluded pass-through ----
  const bucket = cat => sum(inflows.filter(t => t.cat === cat).map(t => t.paidIn))
  const excluded = {
    loans: bucket('Loans'), fuliza: bucket('Fuliza'), cashIn: bucket('Cash in'),
    savings: bucket('Savings & investments'), reversals: bucket('Refunds & reversals'),
    betting: bucket('Betting'),
  }

  const totalIn = sum(inflows.map(t => t.paidIn))
  const totalOut = sum(real.filter(t => t.withdrawn > 0).map(t => t.withdrawn))

  return {
    ok: totalIn > 0,
    hasRegular: totalRegular > 0,
    name: (meta.name || '').trim(),
    phone: meta.phone || '',
    period: { from, to, months },
    regular: { total: totalRegular, avgMonthly, activeMonths: monthly.length, count: regular.length, stability, monthly, sources },
    other: otherModel,
    excluded,
    totals: { received: totalIn, out: totalOut },
    affordability: { rent: avgMonthly / 3 },   // conservative: from regular income only
  }
}
