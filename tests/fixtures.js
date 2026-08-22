// Builds pdf.js-like positioned lines for a tiny statement, mirroring the real
// layout: centred header cells, left-aligned data at x≈177, wrapped detail lines,
// signed amounts, newest-first order.
const item = (x, str, w = 0) => ({ x, w, str })
const line = (items, page = 1) => ({ y: 0, page, items, text: items.map(i => i.str).join(' ') })

export function statementLines() {
  const L = []
  L.push(line([item(38, 'Customer Name:'), item(120, 'TEST PERSON')]))
  L.push(line([item(38, 'Mobile Number:'), item(120, '0700000000')]))
  L.push(line([item(38, 'Statement Period:'), item(120, '01 Jan 2026 - 31 Jan 2026')]))
  L.push(line([item(38, 'SUMMARY')]))
  L.push(line([item(38, 'SEND MONEY:'), item(380, '0.00'), item(480, '7,078.00')]))          // 7,000 + 78 fee
  L.push(line([item(38, 'RECEIVED MONEY:'), item(380, '5,000.00'), item(480, '0.00')]))
  L.push(line([item(38, 'LIPA NA M-PESA (BUY GOODS):'), item(380, '0.00'), item(480, '180.00')]))
  L.push(line([item(38, 'OTHERS:'), item(380, '176.01'), item(480, '0.00')]))
  L.push(line([item(38, 'TOTAL:'), item(380, '5,176.01'), item(480, '7,258.00')]))
  L.push(line([item(235, 'DETAILED STATEMENT')]))
  L.push(line([item(51, 'Receipt No.'), item(111, 'Completion Time'), item(216, 'Details'), item(282, 'Transaction Status'), item(373, 'Paid In', 30), item(436, 'Withdrawn', 40), item(510, 'Balance', 30)]))
  // newest first, as printed. Balance chain: start 0 → +176.01 draw → -7000 send → -78 fee → +5000 recv → -180 till
  L.push(line([item(38, 'R000000005'), item(108, '2026-01-20 10:00:00'), item(177, 'Merchant Payment Online to'), item(282, 'Completed'), item(464, '-180.00', 40), item(530, '2,918.01', 40)]))
  L.push(line([item(177, '330703 - Goodlife Pharmacy')]))
  L.push(line([item(177, 'Ridgeways Mall')]))
  L.push(line([item(38, 'R000000004'), item(108, '2026-01-15 09:00:00'), item(177, 'Funds received from -'), item(282, 'Completed'), item(391, '5,000.00', 40), item(530, '3,098.01', 40)]))
  L.push(line([item(177, '254729***209 VICTOR ROE')]))
  L.push(line([item(38, 'R000000003'), item(108, '2026-01-10 10:25:50'), item(177, 'Customer Transfer of Funds'), item(282, 'Completed'), item(464, '-78.00', 40), item(530, '-1,901.99', 40)]))
  L.push(line([item(177, 'Charge')]))
  L.push(line([item(38, 'R000000003'), item(108, '2026-01-10 10:25:50'), item(177, 'Customer Transfer to -'), item(282, 'Completed'), item(464, '-7,000.00', 40), item(530, '-1,823.99', 40)]))
  L.push(line([item(177, '0743***860 JANE DOE')]))
  L.push(line([item(38, 'R000000001'), item(108, '2026-01-05 10:50:03'), item(177, 'OverDraft of Credit Party'), item(282, 'Completed'), item(397, '176.01', 40), item(544, '176.01', 40)]))
  L.push(line([item(38, 'R000000000'), item(108, '2026-01-02 08:00:00'), item(177, 'M-Shwari Loan Request'), item(282, 'Completed'), item(397, '0.00', 40), item(544, '0.00', 40)]))  // zero-value row: dropped
  L.push(line([item(20, 'Disclaimer: Any personal information shared with you should be handled in accordance with the Data Protection Act')]))
  L.push(line([item(20, 'Statement Verification Code'), item(300, 'To verify the validity of this M-PESA statement dial *334#')]))
  return L
}
