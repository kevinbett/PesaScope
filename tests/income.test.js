import { describe, it, expect } from 'vitest'
import { incomeReport } from '../src/lib/income.js'

// minimal transaction factory (only the fields income.js reads)
const mk = (date, cat, paidIn, opts = {}) => ({
  date, dt: new Date(date + 'T12:00:00'),
  cat, paidIn, withdrawn: opts.withdrawn || 0,
  isCharge: !!opts.isCharge, details: opts.details || '',
  who: opts.who || 'Someone', key: opts.key || '', code: opts.code || '',
})

// A 3-month statement: monthly salary via bank, a few client receipts, plus
// pass-through money that must NOT be counted as income.
function scenario() {
  return [
    // recurring salary arriving as a bank transfer — same source, monthly
    mk('2026-06-01', 'Bank & cards', 60000, { who: 'ACME LTD', key: 'acme' }),
    mk('2026-07-01', 'Bank & cards', 60000, { who: 'ACME LTD', key: 'acme' }),
    mk('2026-08-01', 'Bank & cards', 60000, { who: 'ACME LTD', key: 'acme' }),
    // variable client receipts (P2P) — counted, but not recurring
    mk('2026-06-10', 'Received', 3000, { who: 'Client A', key: 'p1' }),
    mk('2026-07-15', 'Received', 5000, { who: 'Client B', key: 'p2' }),
    mk('2026-08-20', 'Received', 2000, { who: 'Client C', key: 'p3' }),
    // pass-through / not income
    mk('2026-07-05', 'Loans', 15000, { who: 'Tala', key: 'tala' }),
    mk('2026-06-20', 'Cash in', 10000, { who: 'Agent', key: 'ag' }),
    mk('2026-08-25', 'Bank & cards', 40000, { who: 'My Own Bank', key: 'selfbank' }), // one-off bank in
    mk('2026-07-22', 'Refunds & reversals', 500, { who: 'Reversal', key: 'rev' }),
    // a charge row must be ignored entirely even though it has a category
    mk('2026-07-22', 'Charges & fees', 0, { isCharge: true, withdrawn: 22, who: 'M-PESA' }),
  ]
}

describe('incomeReport', () => {
  const r = incomeReport(scenario(), { name: 'Jane Doe', phone: '0722***000' })

  it('counts recurring bank salary and variable receipts as income', () => {
    expect(r.ok).toBe(true)
    expect(r.totalCounted).toBe(190000)      // 180k salary + 10k receipts
    expect(r.recurringTotal).toBe(180000)
    expect(r.variableTotal).toBe(10000)
    expect(r.counts.incomeTxns).toBe(6)
  })

  it('excludes loans, cash-in, reversals and one-off bank transfers from income', () => {
    expect(r.excluded.loans).toBe(15000)
    expect(r.excluded.cashIn).toBe(10000)
    expect(r.excluded.reversals).toBe(500)
    expect(r.excluded.bankIn).toBe(40000)    // the non-recurring bank transfer
  })

  it('averages income over months spanned and derives affordability', () => {
    expect(r.period.months).toBe(3)
    expect(Math.round(r.avgMonthly)).toBe(63333)
    expect(r.activeMonths).toBe(3)
    expect(Math.round(r.affordability.rent)).toBe(21111)
  })

  it('flags the recurring source and scores stability', () => {
    expect(r.sources[0].name).toBe('ACME LTD')
    expect(r.sources[0].recurring).toBe(true)
    expect(r.sources[0].cadence).toBe('monthly')
    expect(r.stability.label).toBe('Stable')
  })

  it('counts a one-off Business Payment (salary) even under Bank & cards', () => {
    const r2 = incomeReport([
      mk('2026-06-25', 'Bank & cards', 62000, { who: 'MAKAZI TECH LTD', key: 'makazi', details: 'Business Payment from 774411 - MAKAZI TECH LTD via API.' }),
      mk('2026-07-10', 'Bank & cards', 30000, { who: 'IM BANK', key: 'imbank', details: 'Transfer from Bank 517819 - IM BANK LIMITED- APP to Customer via API' }),
    ], {})
    expect(r2.totalCounted).toBe(62000)   // salary counted, plain bank transfer held out
    expect(r2.excluded.bankIn).toBe(30000)
  })

  it('reports no income when everything is pass-through', () => {
    const none = incomeReport([
      mk('2026-06-01', 'Loans', 15000, { key: 'l' }),
      mk('2026-06-05', 'Cash in', 8000, { key: 'c' }),
    ], {})
    expect(none.ok).toBe(false)
    expect(none.totalCounted).toBe(0)
    expect(none.avgMonthly).toBe(0)
  })
})
