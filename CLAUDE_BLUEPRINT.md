# PesaScope — Claude session blueprint

Read this first in any new session. It is the re-orientation doc: what the product is, how the code
is shaped, the decisions already made (don't relitigate them), how to QA, and what's still open.

## What it is
A client-side web app that reads Safaricom's password-protected **"M-PESA Full Statement" PDF** and
turns it into insights: people you send to / receive from, spending habits, merchants, month-by-month,
regular payments, charges, a smart search, receipts and printable lists. **Nothing leaves the browser;
nothing is stored unless the user opts in to local memory (aliases + category fixes only).**

- Repo: `~/Documents/iOS Stuff/PesaScope` → `git@github.com:kevinbett/PesaScope.git`
- Sister app in the same folder: `sampuli` (synthetic test-data generator, 16 country packs). Both were
  pushed to GitHub 2026-08-21.
- Stack: React 18 + Vite 5, pdf.js (`pdfjs-dist`), Vitest. No backend, no router, no CSS framework.
- Dev: `npm run dev` (launch.json name `pesascope`, port **5184**; `sampuli` is 5183). `npm test`, `npm run build`.
- Owner: Kevin (bettkevin757@gmail.com). His real statement lives in `~/Downloads/MPESA_Statement_2026-08-21_to_2026-01-01_254707641622.pdf`
  (100 pages, 3,784 rows, Jan–Aug 2026). **Kevin supplies the PIN each session; never write it into the repo.**

## Working agreements (Kevin's rules — follow them)
- Never commit to `main`. Branch per change (`lowercase-noword` names like `feesdemote`), PR with a
  real description, merge with `gh pr merge --merge --delete-branch`. CI must be green.
- **Self-QA every change before reporting done**, in the live preview, with evidence (DOM metrics,
  computed styles, screenshots). Kevin cares about accuracy above all — "accuracy is key".
- Push back with reasons when a request points the wrong way (he explicitly asked for this), then do
  what he decides. Examples already settled: fees demoted from headlines; exact search means
  letters+digits only; a search resolving to >1 counterparty never shows combined totals by default.
- Mobile responsiveness is expected on every change (audit at 375px: no element past the viewport).
- Real statement data: stage a copy in `node_modules/.cache/qa/statement.pdf` (git-ignored) for
  browser QA, fetch it in-page via `/@fs/...`, and **delete the copy afterwards**. Never commit data;
  keep extracts out of the repo; delete scratch extracts when done.

## Code map
```
src/
  App.jsx                 statements[] (multi-load), merged+memory-applied data, refresh guard, home
  main.jsx
  styles.css              organised by component (section headers 1–18); one ≤640px block per component
  lib/
    parser-core.js        PURE: extractLines(doc,onProgress), parseStatement(lines) → {meta,summary,txns},
                          enrich(details) → {type,cat,who,phone,code,account,fuliza,isCharge,key},
                          refine() name-aware re-categorisation, brandKey(), linkCharges()
    parser.js             pdf.js wiring only: parsePdf(buf, password, onProgress), isPasswordError
    insights.js           buildPeople, topSentTo/ReceivedFrom, topMerchants, categoryTotals, habits,
                          search (tiered), buildIndex/suggest (type-ahead), chargesReport,
                          monthlyTrends, subscriptions, reviewItems, toCsv, CATEGORIES, titleCase
    memory.js             opt-in localStorage memory: useMemory(), applyMemory(), mergeStatements(), fixId()
    useSearchTerms.js     token/chip logic for the search box (commit on comma, canonicalise names→phone)
    receipt.js            single-transaction receipt (M-PESA app layout, A4 print CSS)
    printlist.js          A4 statement-style list of any filtered set
    sample.js             synthetic statement (all 14 categories) for the demo button
    format.js             fmt, monthOf/monthLbl, dayHeading
    download.js           plain browser download
  components/
    Loader.jsx            upload hero: drop zone, PIN card, progress, Add/Replace when a statement is loaded
    Dashboard.jsx         layout + state (month, query, category); wires everything below
    SearchBox.jsx         field with chips, suggestions, Clear vs Use ↵, '/' shortcut
    SearchResults.jsx     per-term chips, did-you-mean, ambiguity chooser (+merge), person summary, table
    FilterStrip.jsx       sticky "Showing N of M" with removable pills
    Tiles.jsx             overview tiles (no charges tile — deliberate)
    FlowChart.jsx         grouped bar chart, day/week/month buckets, narrower viewBox on phones
    HBars.jsx             category bars (clickable → filters table)
    Trends.jsx            month by month table (click → month filter)
    People.jsx / Merchants.jsx   top-10 lists, "See all N" → paginated with sticky footer
    Habits.jsx            plain-language observations (fees card last)
    Subscriptions.jsx     regular payments (rhythm-based)
    Review.jsx            "Needs a look" with category fix select
    Charges.jsx           "What M-PESA charged you" (bottom of page, by design)
    Settings.jsx          "Memory on this device" (real statements only)
    TxnTable.jsx          category chips, in/out, sort, fee-rows toggle (hidden by default), day bands,
                          expandable rows (receipt/print/copy), paginator, CSV, Print list
    Paginator.jsx, Section.jsx (collapsible), Tooltip.jsx
tests/                    enrich, parse (synthetic PDF-layout fixture), search, charges, product
scripts/fix-lock.cjs      postinstall: strips versionless other-platform entries from package-lock (npm/cli#4828)
.github/workflows/ci.yml  npm install → add Linux rollup build → test → build
```

## Data model (one transaction)
`receipt, dt (Date), date 'YYYY-MM-DD', time 'HH:MM:SS', details, cat, type, who, key, phone, code,
account, fuliza, isCharge, pochi, paidIn, withdrawn, balance, fee (sum of linked charge rows),
parentWho/parentKey/parentPhone/parentCode (on charge rows), rawWho/rawKey (after an alias), fixedCat`.
- `key` is the identity: phone digits without 254/0 for people, `brandKey(who)` for merchants.
- Charges are separate rows in the PDF; `linkCharges` attaches each to the money-out row sharing its
  receipt (Fuliza-funded sends own their fee; only fall back to the overdraft row when nothing else).
- Categories: Send money, Received, Buy Goods (Till), PayBill, Bank & cards, Savings & investments,
  Loans, Fuliza, Insurance, Betting, Airtime & bundles, Cash out, Cash in, Charges & fees,
  Refunds & reversals, Other. `refine()` moves payees by *what they are* (loan apps → Loans, bank
  paybills/cards → Bank & cards, MMF → Savings, bookmakers → Betting); for **till** merchants only
  explicit bank wording counts (short abbreviations like SBM appear inside shop names).

## Parser facts learned from the real statement
- Header cells are **centred** (Details at x≈216) but data is left-aligned (x≈177): learn the details
  column from data rows, never the header — the bug that once put 2,590 rows in "Other".
- Rows are newest-first; a single signed amount column (negative = out) plus balance; wrapped details
  continue on following lines; linked rows share a receipt; zero-value rows (loan *requests*) are dropped.
- Page-1 SUMMARY gives Safaricom's per-type totals — reconcile against it. Totals must match to the cent;
  Agent withdrawal and Buy Goods match exactly once fees are folded in. Safaricom files bundle purchases
  (paybill 244441) under PayBill; we keep them under Airtime & bundles on purpose.
- Every row's direction was verified against the PDF's printed sign (3,784/3,784).

## Search (decisions)
- Tiered per term, most precise tier that has results wins: exact (letters+digits of name / phone /
  code / account / receipt; merged identity counts) → whole word → partial → did-you-mean (typo-tolerant).
- Comma-separated terms are OR'd; chips show resolved identity ("Otieno Okoth · 0711***937"); typed
  commas and picked suggestions commit chips; a unique full name canonicalises to the person's phone;
  dedupe by identity.
- A single term resolving to >1 counterparty shows a **chooser** (Show only this one → / Combine all N
  / These are the same person — merge) instead of combined totals.
- Right-hand control is "✕ Clear" idle, "Use ↵" while suggestions are open (the ✕ used to be mistaken
  for autocomplete).

## UX decisions already made
- Fees are supporting info: no charges tile, no fee column, fee rows hidden behind a toggle (folded into
  parent Out so totals stay exact), Charges section last. Receipts/CSV/print keep fees.
- Sample data shows an amber sticky banner; loading any file clears stale data immediately; sample link
  and how-to steps hide once a statement is loaded.
- Refresh guard (`beforeunload`) only with a real statement loaded.
- Receipt/print docs carry PesaScope's mark, never Safaricom branding, and say they're reproductions.
- Order: overview charts → Month by month → Transactions → People → Habits & Merchants → Regular →
  Needs a look → Charges → Memory.

## QA recipe (what "self-QA" means here)
1. `npm test` (61) and `npm run build`.
2. Preview (`preview_start` name `pesascope`): sample flow, then the real statement via the staged copy.
3. DOM-driven checks with `javascript_tool`: section list, counts, search tiers, chooser, chips,
   table toggles, print/receipt via a stubbed `window.open`, memory in localStorage.
4. Mobile: `resize_window` mobile → overflow scan (`el.right > innerWidth`), then back to desktop.
5. Preview-pane quirks: no `requestAnimationFrame` and throttled `setTimeout` (hidden pane) — CSS
   animations can't be watched, measure timing in-page with MutationObserver; screenshots of
   *scrolled* positions come back blank (artifact, not a bug); HMR may not re-evaluate lib modules —
   hard reload (`navigate` with force) before trusting behaviour; console-error backlog persists across reloads.

## Known gaps / next steps
- Month-by-month: add a per-category × month grid (categories as rows, months as columns, mini bars).
- Transaction notes/tags through the opt-in memory (not built).
- Web Worker parsing: measured and declined (~75 ms main-thread block out of ~450 ms); per-page
  progress shipped instead. Revisit only if a much larger statement shows real blocking.
- Excluded by Kevin for now: PWA on a real domain; bank-statement parsers.
- Tooltips on charts are hover-driven; touch gets tap-highlight on bars only.

## Sampuli (sister app) in one paragraph
Synthetic test-data generator: 16 country packs in `src/locales/*.js` (contract in its README),
paginated workbench, liquid-glass theme, mobile-responsive. Branch/PR rules identical. Nothing pending.
