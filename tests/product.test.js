import { describe, it, expect } from 'vitest'
import { applyMemory, mergeStatements, fixId } from '../src/lib/memory.js'
import { monthlyTrends, subscriptions, reviewItems, buildPeople } from '../src/lib/insights.js'
import { parseStatement } from '../src/lib/parser-core.js'
import { statementLines } from './fixtures.js'

const row = (date, who, phone, out, extra = {}) => ({ receipt: 'R' + date + who.slice(0, 2), date, time: '10:00:00', dt: new Date(date + 'T10:00:00'), details: `Customer Transfer to - ${phone} ${who}`, who, phone, key: phone.replace(/^(?:254|0)/, ''), code: '', account: '', cat: 'Send money', type: 'Send money', paidIn: 0, withdrawn: out, fee: 0, isCharge: false, ...extra })

describe('memory: aliases and category fixes', () => {
  const txns = [row('2026-01-05', 'FAITH KAMANDE', '0743***860', 1000), row('2026-02-05', 'FAITH K', '0722***111', 500), row('2026-03-05', 'OTHER PERSON', '0700***000', 200, { cat: 'Other', type: 'Other' })]
  it('merges two phones into one person', () => {
    const mem = { enabled: false, aliases: [{ canonical: '743***860', label: 'Faith Kamande', members: ['743***860', '722***111'] }], categories: {} }
    const out = applyMemory(txns, mem)
    const people = buildPeople(out)
    expect(people.length).toBe(1)            // two Faiths → one; the 'Other' row isn't a person-to-person send
    expect(people.find(p => p.key === '743***860').sent).toBe(1500)
    expect(out[1].who).toBe('Faith Kamande'); expect(out[1].rawWho).toBe('FAITH K')
  })
  it('applies a category fix by receipt + details', () => {
    const t = txns[2]
    const out = applyMemory(txns, { enabled: false, aliases: [], categories: { [fixId(t)]: 'PayBill' } })
    expect(out[2].cat).toBe('PayBill'); expect(out[2].fixedCat).toBe(true)
  })
  it('is a no-op with empty memory (same objects)', () => {
    expect(applyMemory(txns, { enabled: false, aliases: [], categories: {} })).toBe(txns)
  })
})

describe('multi-statement merge', () => {
  it('dedupes overlapping rows and re-links fees', () => {
    const a = parseStatement(statementLines()), b = parseStatement(statementLines())
    const merged = mergeStatements([a, b])
    expect(merged.length).toBe(a.txns.length)                       // identical statement twice → counted once
    expect(merged.find(t => t.type === 'Send money').fee).toBe(78)  // fee re-attached after dedupe
    expect(merged.every((t, i) => i === 0 || merged[i - 1].dt <= t.dt)).toBe(true)
  })
})

describe('trends, subscriptions, review', () => {
  it('summarises months with net, sent-to-people and top category', () => {
    const t = [row('2026-01-05', 'A B', '0700***001', 100), row('2026-01-06', 'C D', '0700***002', 50, { cat: 'PayBill', type: 'PayBill', who: 'KPLC' }), row('2026-02-05', 'A B', '0700***001', 300)]
    const m = monthlyTrends(t)
    expect(m.map(r => r.key)).toEqual(['2026-01', '2026-02'])
    expect(m[0].out).toBe(150); expect(m[0].sentP).toBe(100); expect(m[0].topCat.name).toBe('Send money')
    expect(m[1].delta).toBe(150)
  })
  it('finds regular payees from steady timing', () => {
    const t = ['2026-01-03', '2026-02-03', '2026-03-04', '2026-04-03'].map(d => row(d, 'ZUKU FIBER', '', 4100, { cat: 'PayBill', type: 'PayBill', phone: '', key: 'ZUKU FIBER', code: '4123456' }))
    const s = subscriptions(t, new Date('2026-04-10'))
    expect(s.length).toBe(1); expect(s[0].cadence).toBe('monthly'); expect(s[0].typical).toBe(4100); expect(s[0].next).toBe('2026-05-03')
    const irregular = ['2026-01-03', '2026-01-05', '2026-03-20', '2026-03-21'].map(d => row(d, 'SHOP', '', 100, { cat: 'Buy Goods (Till)', phone: '', key: 'SHOP' }))
    expect(subscriptions(irregular).length).toBe(0)
  })
  it('flags uncategorised, blank and outsized rows', () => {
    const shop = n => row('2026-01-0' + n, 'SHOP', '0700***009', 1000, { cat: 'Buy Goods (Till)', type: 'Buy Goods', phone: '', key: 'SHOP' })
    const t = [shop(1), shop(2), shop(3), shop(4), row('2026-01-05', 'SHOP', '', 25000, { cat: 'Buy Goods (Till)', type: 'Buy Goods', phone: '', key: 'SHOP' }), row('2026-01-06', '', '', 404.75, { cat: 'Other', type: 'Other', details: '', who: 'Unlabelled' })]
    const r = reviewItems(t)
    expect(r.map(x => x.why)).toEqual(['No details in the statement', expect.stringContaining('Unusually large for Shop')])
    // a big move into savings is not an outlier
    const save = n => row('2026-02-0' + n, 'ZIIDI MMF', '', n === 5 ? 100000 : 10, { cat: 'Savings & investments', type: 'MMF deposit', phone: '', key: 'ZIIDI MMF' })
    expect(reviewItems([save(1), save(2), save(3), save(4), save(5)]).length).toBe(0)
  })
})

describe('search after an alias merge', () => {
  it('finds both phones under the canonical identity', async () => {
    const { search } = await import('../src/lib/insights.js')
    const mem = { enabled: false, aliases: [{ canonical: '743***860', label: 'Faith Kamande', members: ['743***860', '722***111'] }], categories: {} }
    const txns = applyMemory([row('2026-01-05', 'FAITH KAMANDE', '0743***860', 1000), row('2026-02-05', 'FAITH K', '0722***111', 500)], mem)
    expect(search(txns, '0743***860').rows.length).toBe(2)
    expect(search(txns, 'Faith Kamande').rows.length).toBe(2)
  })
})
