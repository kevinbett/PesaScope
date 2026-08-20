# PesaScope

Your M-Pesa statement, decoded — *fedha zako, picha kamili*.

Drop Safaricom's password-protected "M-PESA Full Statement" PDF into the page and get a
spending dashboard: money in/out/net, fees and Fuliza totals, spending by category, daily
flow, top recipients, and a searchable transaction table with per-month filters.

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
  lib/parser.js            the PDF parser — extraction, row/column resolution,
                           balance-delta direction inference, categorisation
  lib/sample.js            synthetic sample statement for the demo button
  lib/format.js            KES/date formatting helpers
  components/
    Loader.jsx             drop zone, password unlock, status line
    Dashboard.jsx          tiles, month chips, chart layout
    FlowChart.jsx          daily in/out SVG line chart with crosshair
    HBars.jsx              horizontal bar lists (categories, recipients)
    TxnTable.jsx           searchable, filterable transaction table
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
