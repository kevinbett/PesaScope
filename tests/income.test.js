import { describe, it, expect } from 'vitest'
import { incomeReport } from '../src/lib/income.js'

// minimal transaction factory (only the fields income.js reads)
const mk = (date, cat, paidIn, opts = {}) => ({
  date, dt: new Date(date + 'T12:00:00'),
  cat, paidIn, withdrawn: opts.withdrawn || 0,
  isCharge: !!opts.isCharge, details: opts.details || '',
  who: opts.who || 'Someone', key: opts.key || '', code: opts.code || '',
})

// A 3-month statement: monthly salary via bank (recurring), a few one-off client
// receipts, an international remittance, plus pass-through that must be excluded.
function scenario() {
  return [
    // recurring salary arriving as a bank transfer — same source, monthly → REGULAR
    mk('2026-06-01', 'Bank & cards', 60000, { who: 'ACME LTD', key: 'acme' }),
    mk('2026-07-01', 'Bank & cards', 60000, { who: 'ACME LTD', key: 'acme' }),
    mk('2026-08-01', 'Bank & cards', 60000, { who: 'ACME LTD', key: 'acme' }),
    // one-off client receipts (P2P) → OTHER.p2p, not headline
    mk('2026-06-10', 'Received', 3000, { who: 'Client A', key: 'p1' }),
    mk('2026-07-15', 'Received', 5000, { who: 'Client B', key: 'p2' }),
    mk('2026-08-20', 'Received', 2000, { who: 'Client C', key: 'p3' }),
    // international remittance → OTHER.remittance
    mk('2026-07-08', 'Received', 40000, { who: 'Terrapay', key: 'tp', details: 'Receive International Transfer From 573388 - TERRAPAY' }),
    // a one-off bank transfer in → OTHER.bank
    mk('2026-08-05', 'Bank & cards', 30000, { who: 'IM Bank', key: 'im', details: 'Transfer from Bank 517819 - IM BANK LIMITED to Customer' }),
    // pass-through / not income
    mk('2026-07-05', 'Loans', 15000, { who: 'Tala', key: 'tala', details: 'Business Payment from 851901 - Tala Loan via API' }),
    mk('2026-06-20', 'Cash in', 10000, { who: 'Agent', key: 'ag' }),
    mk('2026-07-22', 'Refunds & reversals', 500, { who: 'Reversal', key: 'rev' }),
    mk('2026-08-11', 'Betting', 8000, { who: 'SportPesa', key: 'sp', details: 'Business Payment from 5212201 - SportPesa B2C via API' }),
    // a charge row must be ignored entirely
    mk('2026-07-22', 'Charges & fees', 0, { isCharge: true, withdrawn: 22, who: 'M-PESA' }),
  ]
}

describe('incomeReport (tiered / conservative)', () => {
  const r = incomeReport(scenario(), { name: 'Jane Doe', phone: '0722***000' })

  it('headline counts only regular income (recurring salary)', () => {
    expect(r.hasRegular).toBe(true)
    expect(r.regular.total).toBe(180000)
    expect(r.regular.count).toBe(3)
    expect(r.regular.sources[0].name).toBe('ACME LTD')
    expect(r.regular.sources[0].recurring).toBe(true)
    expect(r.regular.sources[0].cadence).toBe('monthly')
    expect(r.regular.stability.label).toBe('Stable')
  })

  it('shows other receipts separately, not in the headline', () => {
    expect(r.other.p2p.total).toBe(10000)
    expect(r.other.p2p.payers).toBe(3)
    expect(r.other.remittance.total).toBe(40000)
    expect(r.other.bank.total).toBe(30000)     // the one-off bank transfer
    expect(r.other.total).toBe(80000)
  })

  it('excludes loans, cash-in, reversals and betting payouts', () => {
    expect(r.excluded.loans).toBe(15000)
    expect(r.excluded.cashIn).toBe(10000)
    expect(r.excluded.reversals).toBe(500)
    expect(r.excluded.betting).toBe(8000)
  })

  it('averages regular income over months spanned and derives affordability', () => {
    expect(r.period.months).toBe(3)
    expect(r.regular.avgMonthly).toBe(60000)
    expect(r.affordability.rent).toBe(20000)
  })

  it('treats an explicit Salary Payment as regular even if seen once', () => {
    const r2 = incomeReport([
      mk('2026-06-25', 'Received', 55000, { who: 'EMPLOYER LTD', key: 'emp', details: 'Salary Payment from 300111 - EMPLOYER LTD via API' }),
    ], {})
    expect(r2.regular.total).toBe(55000)
    expect(r2.hasRegular).toBe(true)
  })

  it('does NOT count a recurring BANK inflow as regular income (self-funding, not salary)', () => {
    // "Business Payment from STANDARD CHARTERED BANK" repeating fortnightly is you
    // moving your own money in — must land under bank transfers, never as salary.
    const r = incomeReport([
      mk('2026-07-04', 'Bank & cards', 10000, { who: 'STANDARD CHARTERED BANK', key: 'scb', details: 'Business Payment from 329299 - STANDARD CHARTERED BANK via API' }),
      mk('2026-07-17', 'Bank & cards', 5000, { who: 'STANDARD CHARTERED BANK', key: 'scb', details: 'Business Payment from 329299 - STANDARD CHARTERED BANK via API' }),
      mk('2026-07-30', 'Bank & cards', 40000, { who: 'STANDARD CHARTERED BANK', key: 'scb', details: 'Business Payment from 329299 - STANDARD CHARTERED BANK via API' }),
    ], {})
    expect(r.hasRegular).toBe(false)
    expect(r.regular.total).toBe(0)
    expect(r.other.bank.total).toBe(55000)
  })

  it('still counts a recurring NON-bank employer/client as regular income', () => {
    const r = incomeReport([
      mk('2026-06-01', 'Received', 20000, { who: 'ACME LTD', key: 'acme' }),
      mk('2026-07-01', 'Received', 20000, { who: 'ACME LTD', key: 'acme' }),
      mk('2026-08-01', 'Received', 20000, { who: 'ACME LTD', key: 'acme' }),
    ], {})
    expect(r.hasRegular).toBe(true)
    expect(r.regular.total).toBe(60000)
  })

  it('flags no regular income when inflows are all one-off / pass-through', () => {
    const r3 = incomeReport([
      mk('2026-06-10', 'Received', 3000, { key: 'a' }),   // one-off P2P
      mk('2026-06-15', 'Loans', 9000, { key: 'l' }),      // pass-through
    ], {})
    expect(r3.ok).toBe(true)            // money did come in
    expect(r3.hasRegular).toBe(false)   // but none of it is regular income
    expect(r3.regular.total).toBe(0)
    expect(r3.other.p2p.total).toBe(3000)
  })
})
