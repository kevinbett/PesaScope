import { describe, it, expect } from 'vitest'
import { parseStatement } from '../src/lib/parser-core.js'
import { statementLines } from './fixtures.js'

describe('parseStatement on a realistic layout', () => {
  const { meta, summary, txns } = parseStatement(statementLines())
  it('reads the header and summary', () => {
    expect(meta.name).toBe('TEST PERSON'); expect(meta.phone).toBe('0700000000')
    expect(summary['SEND MONEY'].paidOut).toBe(7078)
    expect(summary.TOTAL.paidIn).toBeCloseTo(5176.01)
  })
  it('keeps every non-zero row, drops zero-value rows, and sorts oldest first', () => {
    expect(txns.map(t => t.receipt)).toEqual(['R000000001', 'R000000003', 'R000000003', 'R000000004', 'R000000005'])
  })
  it('recovers wrapped detail lines (data column is left of the centred header)', () => {
    expect(txns.find(t => t.receipt === 'R000000005').details).toBe('Merchant Payment Online to 330703 - Goodlife Pharmacy Ridgeways Mall')
    expect(txns.find(t => t.cat === 'Received').who).toBe('VICTOR ROE')
  })
  it('infers direction from the balance chain / sign', () => {
    const send = txns.find(t => t.type === 'Send money')
    expect(send.withdrawn).toBe(7000); expect(send.paidIn).toBe(0)
    expect(txns.find(t => t.type === 'Fuliza draw').paidIn).toBeCloseTo(176.01)
    expect(txns.find(t => t.cat === 'Received').paidIn).toBe(5000)
  })
  it('reconciles with the statement totals', () => {
    const inn = txns.reduce((s, t) => s + t.paidIn, 0), out = txns.reduce((s, t) => s + t.withdrawn, 0)
    expect(inn).toBeCloseTo(summary.TOTAL.paidIn, 2); expect(out).toBeCloseTo(summary.TOTAL.paidOut, 2)
  })
  it('links the charge to the send sharing its receipt', () => {
    const send = txns.find(t => t.type === 'Send money'); const fee = txns.find(t => t.isCharge)
    expect(send.fee).toBe(78); expect(fee.parentWho).toBe('JANE DOE'); expect(fee.parentPhone).toBe('0743***860')
  })
})
