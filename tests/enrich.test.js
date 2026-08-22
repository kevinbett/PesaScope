import { describe, it, expect } from 'vitest'
import { enrich, brandKey } from '../src/lib/parser-core.js'

// every transaction family seen in a real Safaricom "Full Statement" (names synthetic)
const CASES = [
  ['Customer Transfer to - 0743***860 JANE DOE', { cat: 'Send money', type: 'Send money', who: 'JANE DOE', phone: '0743***860', fuliza: false }],
  ['Customer Transfer Fuliza MPesa to - 254701***050 JOHN ROE', { cat: 'Send money', who: 'JOHN ROE', phone: '254701***050', fuliza: true }],
  ['Intimate Card Customer Transfer to - 254711***630 ANN ROE', { cat: 'Send money', type: 'Send money (card)' }],
  ['Customer Payment to Small Business to - 254746***796 Oprah Roe', { cat: 'Send money', type: 'Pochi la Biashara', pochi: true }],
  ['Offnet C2B Transfer to 585555 - AIRTEL MONEY. for Mobile No. 254756774073', { cat: 'Send money', type: 'Send to other network', code: '585555' }],
  ['Funds received from - 254729***209 VICTOR ROE', { cat: 'Received', type: 'Received', who: 'VICTOR ROE' }],
  ['Business Payment from 300318 - TIMIZA. via API. Original conversation ID is x.', { cat: 'Loans', type: 'Loan received (app)', who: 'TIMIZA' }],
  ['Business Payment from 300248STANBIC to MPESA Retail via API. Original conversation ID is y', { cat: 'Bank & cards', who: 'STANBIC' }],
  ['Business Payment from 979992 - SportPesa B2C via API', { cat: 'Betting', type: 'Betting payout' }],
  ['Receive International Transfer From 573388 - TERRAPAY MONEY TRANSFER SERVICES (KENYA) LIMITED. Original conversation ID is T.', { cat: 'Received', type: 'International transfer' }],
  ['Transfer from Bank 517819 - IM BANK LIMITED- APP to Customer via API', { cat: 'Bank & cards', type: 'Bank to M-Pesa', who: 'IM BANK LIMITED' }],
  ['Pay Bill Online to 4096483 - ETICA CAPITAL LTD Acc. 218515M', { cat: 'Savings & investments', code: '4096483', account: '218515M' }],
  ['Pay Bill Online Fuliza M-Pesa to 300067 - TIMIZA VIAAbsa Acc. TIM24975217090498', { cat: 'Loans', type: 'Loan repayment (app)', fuliza: true }],
  ['Pay Bill Online to 542542 - IM BANK C2B Acc. 01003206435050', { cat: 'Bank & cards', type: 'To bank / card' }],
  ['Pay Bill Online to 543200 - Sanlam General Insurance Acc. POL1', { cat: 'Insurance' }],
  ['Pay Bill Online to 5212121 - SportPesa 1 Acc. 0722', { cat: 'Betting', type: 'Betting stake' }],
  ['Pay Bill Online to 888880 - KPLC PREPAID Acc. 5423981', { cat: 'PayBill', type: 'PayBill', who: 'KPLC PREPAID' }],
  ['Merchant Payment Online to 330703 - Goodlife Pharmacy Ridgeways Mall', { cat: 'Buy Goods (Till)', type: 'Buy Goods', code: '330703' }],
  ['Merchant Payment Fuliza M-Pesa Online to 897368 - CARREFOUR TWO RIVERS 6', { cat: 'Buy Goods (Till)', fuliza: true }],
  ['Merchant Payment Online to 56 - MRP Stores - Two Rivers Apparel Village SBM', { cat: 'Buy Goods (Till)' }],   // SBM inside a shop name is not a bank
  ['Customer Bundle Purchase to 244441SAFARICOM POSTPAID BUNDLES by - 254707***622 KEVIN ROE', { cat: 'Airtime & bundles', type: 'Bundles' }],
  ['Customer Bundle Purchase with Fuliza to 826915Safaricom Offers by - 254707***622 KEVIN ROE', { cat: 'Airtime & bundles', fuliza: true }],
  ['Airtime Purchase', { cat: 'Airtime & bundles', type: 'Airtime' }],
  ['Customer Withdrawal At Agent Till 056451 - Simnett Ents Gulf Energy', { cat: 'Cash out', type: 'Agent withdrawal', code: '056451' }],
  ['OverDraft of Credit Party - Fuliza M-PESA', { cat: 'Fuliza', type: 'Fuliza draw' }],
  ['OD Loan Repayment to 232323 - M-PESA Overdraw', { cat: 'Fuliza', type: 'Fuliza repayment' }],
  ['Unit Trust Invest To 4145555 - ZIIDI MMF by M-PESA\\UnitTrust', { cat: 'Savings & investments', type: 'MMF deposit' }],
  ['Unit Trust Withdraw From 4145555 - ZIIDI MMF by M-PESA\\UnitTrust', { cat: 'Savings & investments', type: 'MMF withdrawal' }],
  ['M-Shwari Withdraw', { cat: 'Savings & investments', type: 'M-Shwari withdrawal' }],
  ['M-Shwari Loan Disburse', { cat: 'Loans', type: 'Loan received' }],
  ['KCB M-PESA Withdraw', { cat: 'Loans', type: 'Loan received' }],
  ['Sell Shares Payment by 4157363 - ZIIDI TRADER', { cat: 'Savings & investments', type: 'Shares sold' }],
  ['Customer Transfer of Funds Charge', { cat: 'Charges & fees', isCharge: true }],
  ['Pay Bill Charge', { cat: 'Charges & fees', isCharge: true }],
  ['Pay Merchant Charge', { cat: 'Charges & fees', isCharge: true }],
  ['Withdrawal Charge', { cat: 'Charges & fees', isCharge: true }],
  ['Offnet C2B Transaction Reversal by M-PESA\\MMIInitiator for 585555 - AIRTEL MONEY.', { cat: 'Refunds & reversals' }],
]

describe('enrich — every statement family', () => {
  for (const [details, want] of CASES) {
    it(details.slice(0, 60), () => {
      const got = enrich(details)
      for (const [k, v] of Object.entries(want)) expect(got[k], k).toBe(v)
    })
  }
  it('brandKey merges register-numbered tills', () => {
    expect(brandKey('CARREFOUR TWO RIVERS 6')).toBe(brandKey('CARREFOUR TWO RIVERS 85'))
    expect(brandKey('Naivas Kiambu mall')).toBe('NAIVAS KIAMBU MALL')
  })
  it('keys people by phone and merchants by brand', () => {
    expect(enrich('Customer Transfer to - 0743***860 JANE DOE').key).toBe('743***860')
    expect(enrich('Customer Transfer to - 254743***860 JANE DOE').key).toBe('743***860')
    expect(enrich('Merchant Payment Online to 1 - CARREFOUR TWO RIVERS 6').key).toBe('CARREFOUR TWO RIVERS')
  })
})
