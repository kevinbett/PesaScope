import { describe, it, expect } from 'vitest'
import { search, splitTerms, buildIndex, suggest, buildPeople, topMerchants } from '../src/lib/insights.js'

const mk = (who, phone, code, details, extra = {}) => ({ who, phone, code, account: '', receipt: 'R' + Math.random().toString(36).slice(2, 8), details, isCharge: false, paidIn: 0, withdrawn: 100, fee: 0, cat: phone ? 'Send money' : 'Buy Goods (Till)', type: phone ? 'Send money' : 'Buy Goods', date: '2026-08-01', time: '10:00:00', key: phone ? phone.replace(/^(?:254|0)/, '') : who, dt: new Date('2026-08-01T10:00:00'), ...extra })
const T = [
  mk('FAITH KAMANDE', '0743***860', '', 'Customer Transfer to - 0743***860 FAITH KAMANDE'),
  mk('FAITH KAMANDE', '0743***860', '', 'Customer Transfer to - 0743***860 FAITH KAMANDE'),
  mk('FAITH MWENZE', '254727***849', '', 'Customer Transfer to - 254727***849 FAITH MWENZE'),
  mk('VICTOR MUTAI', '254729***209', '', 'Funds received from - 254729***209 VICTOR MUTAI', { cat: 'Received', type: 'Received', paidIn: 500, withdrawn: 0 }),
  mk('CARREFOUR TWO RIVERS 6', '', '897368', 'Merchant Payment Online to 897368 - CARREFOUR TWO RIVERS 6'),
  mk('CARREFOUR TWO RIVERS 85', '', '897393', 'Merchant Payment Online to 897393 - CARREFOUR TWO RIVERS 85'),
]
T.push({ ...mk('M-PESA charges', '', '', 'Customer Transfer of Funds Charge'), isCharge: true, withdrawn: 22, parentWho: 'FAITH KAMANDE', parentKey: '743***860', parentPhone: '0743***860', cat: 'Charges & fees', type: 'Charge', receipt: T[0].receipt })

describe('search tiers', () => {
  it('exact beats word beats partial, and fees follow their parent', () => {
    expect(search(T, 'Faith Kamande').terms[0].how).toBe('exact')
    expect(search(T, 'Faith Kamande').rows.length).toBe(3)          // 2 sends + linked fee
    expect(search(T, '0743***860').rows.length).toBe(3)
    expect(search(T, '254743860').rows.length).toBe(3)
    expect(search(T, 'faith').terms[0].how).toBe('name contains the word')
    expect(search(T, 'faith').people.length).toBe(2)
    expect(search(T, 'carre').terms[0].how).toBe('partial match')
    expect(search(T, 'carrefour two rivers').rows.length).toBe(2)   // brand key, both registers
  })
  it('offers did-you-mean for misses, including typos', () => {
    expect(search(T, 'fiath').suggestions[0].options.map(o => o.value)).toContain('FAITH KAMANDE')
    expect(search(T, 'zzzz').rows.length).toBe(0)
  })
  it('combines comma terms and deduplicates identities', () => {
    expect(splitTerms('0743***860, 254743***860, Faith, faith , ')).toEqual(['0743***860', 'Faith'])
    expect(search(T, 'Faith Kamande, Victor Mutai').rows.length).toBe(4)
  })
})

describe('index & suggest', () => {
  const idx = buildIndex(T)
  it('lists people by phone and merchants by brand', () => {
    expect(idx.find(e => e.kind === 'person' && e.label === 'FAITH KAMANDE').value).toBe('0743***860')
    expect(idx.filter(e => e.kind === 'merchant').length).toBe(1)
  })
  it('ranks word-prefix above substring and skips already-entered values', () => {
    expect(suggest(idx, 'fai')[0].label).toBe('FAITH KAMANDE')
    expect(suggest(idx, '0743***860')).toEqual([])
  })
})

describe('people & merchants', () => {
  it('aggregate by identity with fees', () => {
    const p = buildPeople(T).find(p => p.name === 'FAITH KAMANDE')
    expect(p.sentN).toBe(2); expect(p.sent).toBe(200)
    expect(topMerchants(T)[0].n).toBe(2)
  })
})
