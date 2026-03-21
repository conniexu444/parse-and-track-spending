![Alt](https://repobeats.axiom.co/api/embed/e2c42f85a99ac624475811ff855556e3eb437d0d.svg "Repobeats analytics image")

# parse-and-track-spending

Upload your bank and credit card statements to see where you've been spending. Everything runs **locally in your browser** — no server, no data uploads, no tracking.

**[Live Demo →](https://conniexu444.github.io/parse-and-track-spending/)**

---

## Features

- **Upload CSVs or PDFs** from American Express, Apple Card, Chase, Capital One, and US Bank
- **Auto-categorizes transactions** into Food & Dining, Transportation, Shopping, and more — using your own keyword config
- **Spending summary** with total spent, total credits, and per-category breakdown
- **Filter by date range and category**, sort by any column
- **Edit categories inline** by clicking the badge on any transaction
- **Dark/light mode** toggle
- **100% private** — all parsing happens client-side via a Web Worker; nothing leaves your device

---

## Getting Started

```bash
git clone https://github.com/conniexu444/parse-and-track-spending.git
cd parse-and-track-spending
npm install
npm run dev
```

`npm run dev` will automatically copy `category-config.example.json` to `category-config.json` on first run. Edit that file to add your own merchant keywords per category.

---

## Supported Statement Formats

| Bank | CSV | PDF |
|------|-----|-----|
| American Express | ✅ | ✅ |
| Apple Card | ✅ | ✅ |
| Chase | ✅ | — |
| Capital One | ✅ | — |
| US Bank | ✅ | ✅ |

PDFs are limited to 60 pages / 2 MB per file.

---

## Customizing Categories

Your personal category config lives at `src/utils/category-config.json` (git-ignored). It maps keyword lists and regex patterns to spending categories. Start from the example:

```bash
cp src/utils/category-config.example.json src/utils/category-config.json
```

Then add your own merchants. For example, to add a coffee shop to "Food & Dining":

```json
{
  "categories": {
    "Food & Dining": {
      "keywords": ["starbucks", "bluestone lane", "your local cafe"]
    }
  }
}
```

---

## Project Structure

```
src/
  components/       # UI components (upload, filters, summary, table, modals)
  hooks/            # useTransactions, useTheme
  utils/            # Parsers (CSV + PDF), storage, formatters, category config
  workers/          # Web Worker for non-blocking parsing
  constants/        # Help modal content
```

---

## Privacy

No data ever leaves your browser. Statements are parsed in a Web Worker, stored in memory for the session, and discarded on page refresh. The app has no backend, no analytics on your transactions, and no third-party integrations that touch your data.
