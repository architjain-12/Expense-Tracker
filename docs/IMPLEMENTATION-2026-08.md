# Implementation update — August 2026

Implemented in the latest source:

- Recurring payment edit/delete and expanded frequencies.
- Past recurring start dates generate the current month's occurrence without historical backfill.
- Bottom navigation is the only Add Transaction entry point.
- Home budget/remaining progress and estimated recurring dues.
- Monthly/yearly Stats with vertical pie and line charts.
- Collapsible Stats filters, clear filters, multi-select category/subcategory/account filters and saved reports.
- Arrow-button month/year navigation.
- Transaction date grouping and daily totals.
- Investment transactions are also represented in the main ledger.
- Investment and Income reporting.
- Interest calculator, FD/RD/savings projections and optional projected-interest income events.
- Theme setting: dark/light/system.
- Account creation, editing, default selection and archive.
- Quick category/subcategory creation from Add Transaction.
- JSON/CSV/Excel-compatible exports and IndexedDB reset.
- Google Sheets script extended for new entities and real DELETE operations.
- Device lock retained using WebAuthn platform authentication / PIN.
- Future remote database remains an adapter-level extension rather than a user-visible switch.

Validation: TypeScript project check passes with `tsc -p tsconfig.json --noEmit`.
