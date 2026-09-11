# PesaScope — Income Report (v1 scope)

Repositioning PesaScope from "M-PESA statement analyzer" to **"get a verified income &
affordability report from your M-PESA statement."** The report is the wallet-open moment:
visa proof-of-funds, loan applications, tenancy checks, gig onboarding.

This doc is the agreed v1 scope. Read `CLAUDE_BLUEPRINT.md` first for how the app is shaped.

## Non-negotiable: the privacy moat stays intact
PesaScope's whole trust story is **nothing leaves the browser**. That is *also* the answer to
"why would a Kenyan trust you with their money data" — so v1 keeps it 100% client-side. The
statement is parsed, the report is computed, and the PDF is generated **in the browser**, exactly
like `receipt.js` / `printlist.js` do today. No backend, no upload, no live Daraja pull in v1.

The money rail (payment) and the data rail (the statement) are designed to **never touch**. When
payment lands (v2), it gates an *unlock*, and the payment endpoint never sees the statement.

## What "income" means (the accuracy core — this is the product)
Money IN on M-PESA is NOT income. The defensible value is separating real income from noise.

Start from gross inflows (`paidIn`), then **exclude** what isn't income:
- Loans disbursed (`Loans`) — that's debt, not income
- `Fuliza` drawdowns — debt
- `Refunds & reversals` — not earnings
- `Cash in` — your own money deposited
- Returns from `Savings & investments` — your own money coming back
- Obvious self-transfers (same identity in and out within a short window)

What remains is **candidate income**, then classified into:
- **Recurring / salary-like** — regular cadence, similar amount, same source (strongest signal).
  Reuse the rhythm logic from `subscriptions()`, applied to inflows instead of outflows.
- **Business / hustle** — many variable receipts (Buy Goods/PayBill *paid to the user* if present,
  or frequent P2P `Received`). Signals informal-trader income.
- **One-off** — large irregular inflows, shown but flagged (may not be recurring income).

Every figure reconciles against the page-1 SUMMARY totals to the cent, per the blueprint. When a
classification is uncertain, we **say so** rather than inflating income — accuracy is key.

## Report contents (v1)
Single, clean, A4-printable report (PesaScope mark, never Safaricom branding; carries the existing
"reproduction, self-reported" disclaimer):
1. **Header** — user-entered name, statement period, masked phone (`0711***937`).
2. **Headline** — Average monthly income, Total income over period, # income-active months.
3. **Income stability** — coefficient of variation → "Stable" / "Variable" / "Irregular".
4. **Monthly income** — bar + table (reuse `monthlyTrends`, income-filtered).
5. **Income sources** — recurring vs variable split; top payers (masked).
6. **Net position** — income vs spending, average monthly surplus/deficit.
7. **Affordability** — estimated affordable rent / loan repayment (e.g. 30–40% of avg income),
   clearly labelled an estimate, not advice.

## Build plan (v1, all client-side)
- `src/lib/income.js` (NEW, PURE) — `incomeReport(txns, meta)` → the model above. Unit-tested like
  `insights.js` (add `tests/income.test.js`). This is where the accuracy work lives.
- `src/lib/incomeReportDoc.js` (NEW) — A4 report generator, same CSP-safe popup pattern as
  `receipt.js`/`printlist.js` (handlers via `addEventListener`, PesaScope mark, print/close).
- `src/components/IncomeReport.jsx` (NEW) — a Dashboard section: name input, the on-screen report,
  "Download / Print report" button. Slots into the existing section order.
- Reuse `monthlyTrends`, `categoryTotals`, `buildPeople`, `subscriptions`, `fmt`. No parser changes.
- Mobile audit at 375px; `npm test` + `npm run build` green; self-QA on the real staged statement.

## Explicitly NOT in v1
- No payment / STK push, no backend, no `/api`, no live Daraja pull, no B2B API, no account.
- Report is **free** in v1 — the goal is to prove demand (GA4 is already live on the site).

## Roadmap after v1 (do not build yet)
- **v2 — paid unlock.** Thin Vercel serverless `/api/mpesa/stk` (+ callback) issues a signed unlock
  token; report export gated behind KES 100–500 STK push. Statement never sent to it. CSP stays
  `connect-src 'self'` because the endpoint is same-origin. Requires a Daraja paybill/till + secrets.
- **v3 — B2B verification.** Lender/landlord/SACCO income-verification API + a shareable, tamper-
  evident report link. This is the real, defensible business. Needs Data Protection Act / ODPC path.

## Open decision for Kevin
1. **Phasing** — recommend shipping v1 (free report) first, then v2 payment once demand shows.
   Alternative: build payment into v1 from day one (slower, needs Daraja creds now).
2. **Income definition** — confirm the exclude-list above matches how you read your own statement,
   especially: do salary/business inflows arrive as `Received`, `Bank & cards`, or a specific PayBill
   in your data? That determines the recurring-income detector's default sources.
