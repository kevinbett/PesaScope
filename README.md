# PesaScope

Your M-Pesa statement, decoded — *fedha zako, picha kamili*.

Drop Safaricom's password-protected "M-PESA Full Statement" PDF into the page and get a
spending dashboard built around the questions people actually ask of a statement:

- **Who do I send money to the most — and who sends me money?** Ranked people lists with
  count, total, average, fees paid, and last date; tap a person for every transaction.
- **What are my spending habits?** Plain-language observations: daily rate, big-spend
  weekday, late-night payments, typical payment size, most-visited merchant, Fuliza usage,
  fee burden, regular payees.
- **Where does it go?** Money grouped by what the payee *is*, not just the rail: Send money,
  Received, Buy Goods, PayBill, Bank & cards, Savings & investments, Loans (incl. Timiza /
  Tala / Zenka-style apps), Fuliza, Insurance, Betting, Airtime, Cash, Charges.
- **Search anything** — a name, a masked phone, a PayBill/till number, an account, a receipt —
  and get the matching person's summary plus every sent/received row, fees included.
- Filter chips per category, in/out, sort by size, and CSV export of whatever you're looking at.

Every charge row is linked to the transaction it belongs to (same receipt), so "what did it
cost me to send money to X" is a real number. The parser reconciles to the cent against the
statement's own SUMMARY totals.

**Privacy:** the PDF is decrypted and parsed entirely in the browser with pdf.js —
nothing is uploaded anywhere and nothing persists after the tab closes.

## Run it

```bash
npm install
npm run dev        # local dev server
npm run build      # production build in dist/
npm run preview    # serve the production build locally
```

The `dist/` output is fully static — deploy it to any static host.

## Project layout

```
src/
  App.jsx                  shell: header, loader, dashboard
  styles.css               design tokens (light + dark), all component styles
  lib/parser.js            pdf.js wiring (worker, password handling)
  lib/parser-core.js       pure parser — extraction, column resolution, balance-delta
                           direction inference, enrichment (type / who / phone / code /
                           account / Fuliza flag), name-aware categorisation, fee linking
  lib/insights.js          people, merchants, habits, search, CSV
  lib/sample.js            synthetic sample statement for the demo button
  lib/format.js            KES/date formatting helpers
  components/
    Loader.jsx             drop zone, password unlock, status line
    Dashboard.jsx          tiles, month chips, global search, section layout
    SearchResults.jsx      person summary + matched transactions for a query
    People.jsx             ranked sent-to / received-from lists
    Merchants.jsx          top merchants & bills by brand
    Habits.jsx             spending-habit observation cards
    FlowChart.jsx          daily in/out SVG line chart with crosshair
    HBars.jsx              horizontal bar lists (click to filter)
    TxnTable.jsx           category chips, in/out, sort, show-more, CSV
    Tooltip.jsx            shared cursor-following tooltip hook
```

## How parsing works (and how to tune it)

`lib/parser.js` reads text items with their page coordinates, groups them into rows,
and finds transaction rows by receipt-number + date patterns. Each row's rightmost
amount is treated as the running balance; the transaction's direction (in/out) is
inferred by matching the balance delta against the chronologically previous row, with
column positions and wording as fallbacks — this survives pdf.js merging adjacent
header cells into one text item.

If a real statement puts something odd in "Other", extend `CATS` (category keyword
rules) or `counterparty()` in `lib/parser.js` — that's where all tuning lives.

Not affiliated with Safaricom. Personal analysis, not financial advice.
