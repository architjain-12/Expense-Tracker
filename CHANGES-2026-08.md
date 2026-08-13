# Changes in this revision

This revision addresses the requested product changes:

1. Added customizable categories and optional subcategories.
2. Added the complete requested default category/subcategory tree.
3. Add Transaction now shows subcategory only after a category is selected; subcategory remains optional.
4. Fixed default account population after IndexedDB/settings finish loading.
5. Replaced the six-item mobile navigation overflow with exactly five slots: Home, Transactions, Add, Stats, Options.
6. Added Options hub for Review Queue, Categories, Recurring, Budgets, Investments, Statistics and Settings.
7. Added smart Google Sheets restore: automatic attempt when local transaction data is empty and a saved connection exists; manual recovery is available otherwise.
8. Added 16px mobile form-control typography to prevent iOS Safari auto-zoom on normal inputs.
9. Added recurring payments with due-date processing on app start/resume and `↻` indicators.
10. Added investments activity tracking for stocks, mutual funds, SIP, FD, gold and retirement/PF.
11. Added budgets with optional overall/category limits.
12. Added category/subcategory/account filters to Transactions.
13. Added a dedicated Stats screen and retained `/reports` as a compatibility alias.
14. Home now has a clickable category pie chart; category rows also drill into filtered Transactions.
15. Added local device lock via PIN or passkey/platform authenticator (Face ID/passkey manager on supported iPhone/browser combinations).
16. Replaced direct `crypto.randomUUID()` calls with a browser-safe ID generator so localhost/dev environments that lack `crypto.randomUUID()` can still create records.
17. Added source-id idempotency to prevent duplicate automation/recurring transactions.
18. Deduplicated report calculations and transaction list rendering by transaction ID to prevent duplicate spend totals.
19. Added Google Sheets sync queue support for categories, recurring rules, budgets and investments so recovery can restore application configuration as well as transactions.
20. Added recovery/help documentation and beginner-focused React code-flow documentation.
