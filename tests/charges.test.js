import { describe, it, expect } from 'vitest'
import { parseStatement, linkCharges } from '../src/lib/parser-core.js'
import { chargesReport } from '../src/lib/insights.js'
import { statementLines } from './fixtures.js'

describe('charges', () => {
  it('reports totals, types and the people behind the fees', () => {
    const { txns } = parseStatement(statementLines())
    const r = chargesReport(txns)
    expect(r.total).toBe(78); expect(r.n).toBe(1)
    expect(r.byType[0][0]).toBe('Send money fee')
    expect(r.topPeople[0].name).toBe('JANE DOE'); expect(r.topPeople[0].fees).toBe(78)
  })
  it('attaches a fee to a Fuliza-funded send, not to the overdraft row', () => {
    const base = { date: '2026-08-20', time: '10:50:03', receipt: 'X', account: '', phone: '', code: '', balance: 0, dt: new Date('2026-08-20T10:50:03') }
    const draw = { ...base, who: 'Fuliza M-PESA', key: 'FULIZA', cat: 'Fuliza', type: 'Fuliza draw', details: 'OverDraft of Credit Party', paidIn: 176.01, withdrawn: 0, isCharge: false, fuliza: true }
    const fee = { ...base, who: 'M-PESA charges', key: 'M', cat: 'Charges & fees', type: 'Charge', details: 'Customer Transfer of Funds Charge', paidIn: 0, withdrawn: 7, isCharge: true }
    const send = { ...base, who: 'JOHN ROE', key: '701***050', phone: '254701***050', cat: 'Send money', type: 'Send money', details: 'Customer Transfer Fuliza MPesa to - 254701***050 JOHN ROE', paidIn: 0, withdrawn: 300, isCharge: false, fuliza: true }
    const txns = [draw, fee, send]; linkCharges(txns)
    expect(send.fee).toBe(7); expect(draw.fee).toBe(0); expect(fee.parentWho).toBe('JOHN ROE')
  })
})
