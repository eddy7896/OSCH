# StatCard

One number someone needs to know, with its label and optional trend.

**Provide:** `label`, `value` (pre-formatted: “96.3%”, “₹1,82,40,000”), optional `icon` + `tone`, `trend` (a number, % change), `trendLabel` (“vs. last week”), `sub`.

- The principal dashboard shows at most five stat cards in its top row — “5 things the principal needs to know”, not 20.
- Format money in Indian grouping with ₹. Use tabular numbers.
- A trend is green when the number went up and red when down; if “down is good” (e.g. outstanding fees) still show the arrow, and say it in `trendLabel`.
