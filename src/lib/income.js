// Income & affordability model built from parsed M-PESA transactions.
// PURE (no DOM, no pdf.js). The accuracy core of the Income Report: separate real
// income from money that merely passed through (loans, Fuliza, own deposits, reversals).
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
])

const median = a => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.floor(s.length / 2)] : 0 }
const sum = a => a.reduce((x, y) => x + y, 0)
const srcKey = t => t.key || brandKey(t.who) || (t.code ? 'code:' + t.code : 'who:' + (t.who || '?'))

// An inflow whose wording marks it as genuinely earned: an employer/business
// payout, a salary run, or an inbound international remittance. These count as
// income even when they arrive under the coarse "Bank & cards" category — which
// otherwise also holds plain "Transfer from Bank" moves that may be your own money.
// (Loans like "Business Payment from Tala" are already filtered out by category.)
const EARNED_WORDING = /^(business payment|salary payment|receive international)/i
const earnedLooking = t => t.cat === 'Received' || EARNED_WORDING.test(t.details || '')

/** months spanned between two 'YYYY-MM-DD' dates, inclusive (min 1) */
function monthsSpanned(from, to) {
  if (!from || !to) return 1
  const a = +from.slice(0, 4) * 12 + +from.slice(5, 7)
  const b = +to.slice(0, 4) * 12 + +to.slice(5, 7)
  return Math.max(1, b - a + 1)
}

/**
 * Group candidate inflows by source and keep those with a regular rhythm
 * (>=3 receipts across >=2 months, even cadence <= 45 days). Mirrors the
 * subscriptions() detector but for money coming IN — this is salary / a regular client.
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

/**
 * Build the income report model.
 * @param {Array} txns  parsed + enriched transactions
 * @param {Object} meta statement meta ({name, phone, period})
 * @returns model consumed by IncomeReport.jsx / incomeReportDoc.js
 */
export function incomeReport(txns, meta = {}) {
  const real = (txns || []).filter(t => !t.isCharge)
  const dates = real.map(t => t.date).filter(Boolean).sort()
  const from = dates[0] || null, to = dates[dates.length - 1] || null
  const months = monthsSpanned(from, to)

  // 1. candidate inflows: money in, not a known pass-through
  const inflows = real.filter(t => t.paidIn > 0)
  const cands = inflows.filter(t => !NON_INCOME_IN.has(t.cat))

  // 2. recurring sources → confident income regardless of channel (Received or bank)
  const rec = recurringSources(cands)

  // 3. classify every candidate
  const counted = []          // headline income
  let bankIn = 0, otherIn = 0 // shown but excluded from headline (may be own funds / one-off)
  for (const t of cands) {
    const isRec = rec.has(srcKey(t))
    if (isRec || earnedLooking(t)) counted.push(t)
    else if (t.cat === 'Bank & cards') bankIn += t.paidIn   // plain bank transfer — may be own funds
    else otherIn += t.paidIn
  }

  // 4. transparency: what we deliberately did not count
  const bucket = cat => sum(inflows.filter(t => t.cat === cat).map(t => t.paidIn))
  const excluded = {
    bankIn, otherIn,
    loans: bucket('Loans'), fuliza: bucket('Fuliza'), cashIn: bucket('Cash in'),
    savings: bucket('Savings & investments'), reversals: bucket('Refunds & reversals'),
  }

  // 5. monthly counted income + stability
  const mMap = new Map()
  for (const t of counted) {
    const k = t.date.slice(0, 7)
    mMap.set(k, (mMap.get(k) || 0) + t.paidIn)
  }
  const monthly = [...mMap.entries()].sort((a, b) => (a[0] < b[0] ? -1 : 1))
    .map(([key, income]) => ({ key, label: monthLbl(key), income }))
  const totalCounted = sum(counted.map(t => t.paidIn))
  const activeMonths = monthly.length
  const avgMonthly = totalCounted / months
  const recurringTotal = sum(counted.filter(t => rec.has(srcKey(t))).map(t => t.paidIn))
  const variableTotal = totalCounted - recurringTotal

  const vals = monthly.map(m => m.income)
  const mean = vals.length ? sum(vals) / vals.length : 0
  const cv = mean > 0 && vals.length > 1
    ? Math.sqrt(sum(vals.map(v => (v - mean) ** 2)) / vals.length) / mean : 0
  const stability = {
    cv,
    label: vals.length < 2 ? 'Too short to tell' : cv < 0.35 ? 'Stable' : cv < 0.75 ? 'Variable' : 'Irregular',
  }

  // 6. top sources (masked names come straight from the statement)
  const sMap = new Map()
  for (const t of counted) {
    const k = srcKey(t)
    const s = sMap.get(k) || { key: k, name: t.who || 'Unknown', total: 0, n: 0, recurring: rec.has(k), cadence: rec.get(k)?.cadence || null }
    s.total += t.paidIn; s.n++; s.name = t.who || s.name
    sMap.set(k, s)
  }
  const sources = [...sMap.values()].sort((a, b) => b.total - a.total).slice(0, 6)
    .map(s => ({ ...s, share: totalCounted ? s.total / totalCounted : 0 }))

  // 7. context: overall in/out and affordability estimate (1/3 of average income)
  const totalIn = sum(inflows.map(t => t.paidIn))
  const totalOut = sum(real.filter(t => t.withdrawn > 0).map(t => t.withdrawn))
  const net = { totalIn, totalOut, monthlyNet: (totalIn - totalOut) / months }
  const affordability = { rent: avgMonthly / 3 }

  return {
    ok: counted.length > 0,
    name: (meta.name || '').trim(),
    phone: meta.phone || '',
    period: { from, to, months },
    avgMonthly, totalCounted, activeMonths,
    recurringTotal, variableTotal,
    stability, monthly, sources, affordability, excluded, net,
    counts: { incomeTxns: counted.length },
  }
}
