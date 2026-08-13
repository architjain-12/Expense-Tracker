# Expense Tracker PWA — v2.3

A dark/light, mobile-first, local-first personal expense tracker designed primarily for iPhone Safari/Chrome and responsive desktop use.

## v2.3 architecture

```text
React PWA
   ↓
Application pages/components
   ↓
Application services
   ↓
Dexie repositories / IndexedDB
   ├── Personal partition
   ├── Demo partition
   ├── Transactions
   ├── Categories / Subcategories
   ├── Accounts
   ├── Review Queue
   ├── Recurring Rules
   ├── Budgets
   ├── Investments
   ├── Interest / FD / RD projections
   └── Settings

Optional cloud copy / recovery:
IndexedDB → Google Apps Script → private Google Sheets

Automation:
iOS Shortcut → NDJSON → Review Queue → Record / Discard

Future migration path:
React → Repository interface → Spring Boot → PostgreSQL
```

The application does not require a running Spring Boot server or hosted database for daily use.

## Important v2.3 accounting model

The application deliberately separates:

```text
Expense ≠ Cash Outflow ≠ Estimated Due ≠ Liability
```

For example, a credit-card purchase is an expense when purchased, but the later credit-card bill settlement is a cash outflow and does not create another expense.

Recurring payments also do **not** create transactions automatically. On the due date they enter the Review Queue. Only `Record` creates the actual transaction.

---

# Complete v2.3 changelog / implementation contract

## A. Baseline features retained from earlier versions

### Local-first architecture
- IndexedDB/Dexie is the primary local data store.
- The PWA works without a running backend.
- Google Sheets is an optional synchronization, backup and reporting layer.
- The architecture remains suitable for a future Spring Boot/PostgreSQL backend.

### Google Sheets
- Google Apps Script is the Sheets API layer.
- Sheet URL and token are configured at runtime, never embedded in source control.
- Smart restore can recover local data when IndexedDB is empty and a valid connection already exists.
- Google Sheets is not treated as the primary transaction database.

### Transactions
- Expense, income and transfer transaction types.
- Date and time.
- Account.
- Amount.
- Merchant.
- Notes.
- Category and optional subcategory.
- Transaction editing and deletion.
- Default account.
- Frequent category ordering.
- Merchant and note suggestions.
- Current-month transaction view.
- Account/category/subcategory filtering.
- Date grouping and totals.
- Recurring source marking.

### Categories
- Complete hierarchical category/subcategory model.
- User customization.
- Add/modify/deactivate categories.
- Optional subcategory.
- Defaults for Needs/Wants, Essential/Discretionary and Fixed/Variable.
- Inline path from Add Transaction to category management.

### Mobile PWA
- iPhone-first responsive web UI.
- Bottom navigation.
- Central `+` Add Transaction action.
- No top Add Transaction button.
- iOS input zoom prevention using mobile-safe control sizing.
- Dark theme plus v2.3 Light/System options.

### Home
- Current-month focus.
- Budget and remaining budget.
- Recent transactions.
- Current-month category spending pie chart.
- Pending Review Queue indicator.
- Estimated dues.
- Income, spending, remaining budget and estimated savings metrics.

### Stats/reporting
- Monthly reporting.
- Yearly reporting.
- Category/subcategory/account grouping.
- Pie distribution.
- Line trend charts.
- Saved report/filter combinations.
- Indian FY and Calendar Year modes.

### Investments
- Investment activity tracking.
- Purchase/activity date.
- Asset type.
- Account.
- Notes.
- Investment reporting.
- Investment activity can also be represented in Transactions.

### Budgets
- Overall monthly/yearly budgets.
- Category budgets.
- Budget progress.
- Remaining budget.

### Data management
- JSON backup/restore.
- CSV export.
- Excel-compatible `.xls` export.
- Master delete for the active IndexedDB partition.
- Personal/Demo data isolation.

### Security
- Local PIN lock.
- WebAuthn/passkey/device-authentication path for Face ID on supported iOS browsers.
- This is a local device lock, not a server-backed account identity system.

---

# v2.3 specific changes

## 1. Home redesign

The Home page now prioritizes current-month metrics in this order:

```text
Current Month
↓
Budget progress
↓
Total spent / Income / Remaining budget / Estimated savings
↓
Pending review queue
↓
Estimated dues
↓
Recent transactions
↓
Category pie chart
```

### Budget progress
- Normal state while below 75%.
- Warning/red state above 75%.
- Broken/over-budget visual state above 100%.
- Shows amount spent and percentage used.

### Estimated savings

```text
Budget or income
- actual expenses
- estimated dues
= estimated savings
```

### Category pie
- Current-month categorical spend.
- Percentage labels.
- Leader-line labels where supported by the chart library.
- Category rows below the chart can navigate to the transaction filter.

## 2. Recurring payments redesigned

Recurring rules no longer directly create ledger transactions.

```text
Recurring Rule
    ↓
Due date arrives
    ↓
Review Queue occurrence
    ↓
Record / Edit / Discard
    ↓
Actual transaction
```

### Duplicate protection
Each occurrence has an identity:

```text
recurringRuleId:dueDate
```

so reopening the PWA cannot create another occurrence.

### Future payments
A future recurring payment remains an estimated/upcoming obligation and is not recorded on the first day of the month.

### Past due rules
If the app was not opened on the exact due date, overdue occurrences are queued using their original occurrence date rather than being silently backdated to the current month.

### Recurring management
- Add.
- Edit.
- Pause/resume.
- Delete.
- Monthly.
- Weekly.
- Every two weeks.
- Quarterly.
- Yearly.
- Category/subcategory.
- Account.

## 3. Generic Review Queue

The queue is intentionally generic so future automation sources can reuse it.

Examples:

```text
Recurring payment
iOS Shortcut transaction
Bank notification
Imported transaction
Future AI suggestion
```

Nothing enters the confirmed transaction ledger until the user accepts it.

## 4. Credit-card model

A credit-card purchase:

```text
Expense = yes
Cash outflow = no
Liability = yes
```

The later bill settlement:

```text
Cash outflow = yes
New expense = no
```

The architecture is prepared for billing/statement date and payment-account metadata.

## 5. Loan model direction

Where loan data is configured, an EMI can eventually be represented as:

```text
EMI
├── Principal → liability repayment
└── Interest  → expense
```

The entire EMI must not automatically become a second expense.

## 6. Investments

Investment records support:
- Purchase/activity date.
- Amount.
- Account.
- Asset type.
- Notes.
- Monthly/yearly/all-time reporting.
- Green investment reporting semantics.

## 7. Income

Income is reported separately from expenses and investments.

Supported conceptual sources:
- Salary.
- Bonus.
- Freelance.
- Interest.
- Dividends.
- Refund.
- Other income.

## 8. Interest / FD / RD / savings calculator

New `More → Interest & Returns` section.

Supports:
- Principal.
- RD installment.
- Annual rate.
- Opening date.
- Term/maturity.
- Compounding assumption.
- FD.
- RD.
- Savings-account projections.
- Projected interest.
- Projected maturity value.
- Optional automatic-interest-recording flag.

Projected interest is kept conceptually separate from actual income transactions so advance-tax/ITR estimates do not inflate actual current income.

Actual bank-credit events can be recorded as:

```text
Income → Interest
```

The calculator is an estimate; bank-specific daily-balance, tax and compounding rules may differ.

## 9. Stats — line charts only

Trend charts use line charts rather than bar charts.

Charts remain vertical/mobile-first.

## 10. Stats attribute toggles

Reports can change:

```text
Group by:
- Category
- Subcategory
- Account

Metric:
- Amount
- Count
- Percentage
```

## 11. Stats monthly/yearly reporting

Monthly navigation uses explicit arrow buttons.

No swipe-based month navigation.

Yearly reporting shows all months as a line trend.

### Indian FY
Default:

```text
1 April → 31 March
```

### Calendar year
Settings can switch reporting to:

```text
1 January → 31 December
```

## 12. Stats filter redesign

Filters are collapsed/minimal by default.

Selected values become removable pills.

Example:

```text
[ Food & Dining × ]
[ Shopping → Gifts × ]
[ Shopping → Clothing × ]
```

If a category is selected, its subcategories are disabled to prevent double counting.

This allows reports such as:

```text
Restaurants
+
Shopping → Gifts
+
Shopping → Clothing
```

without selecting unrelated categories.

## 13. Saved reports

A filter configuration can be saved and reopened later.

Examples:

```text
Lifestyle Spending
Essential Expenses
Shopping
Custom Tax Report
```

## 14. Transactions navigation

Transactions use explicit month arrows rather than a month dropdown.

The `Open Stats` button was removed from Transactions to preserve mobile space.

## 15. Transaction editing

The Edit Transaction page now allows editing the amount in addition to:
- Account.
- Category.
- Subcategory.
- Merchant.
- Notes.
- Date/time.

## 16. Category hierarchy restored

Default hierarchy:

```text
Housing
  Rent
  Maintenance/Society Fees
  Electricity
  Water
  Gas
  Internet
  Mobile
  Repairs

Food & Dining
  Groceries
  Restaurants
  Cafes
  Office
  Food Delivery
  Snacks

Transportation
  Fuel
  Metro/Public Transport
  Taxi/Ride Sharing
  Parking
  Toll
  Vehicle Maintenance

Shopping
  Clothing
  Electronics
  Online Shopping
  Gifts
  Other Shopping

Health
  Doctor
  Pharmacy
  Diagnostics
  Health Insurance
  Fitness

Personal
  Personal Care
  Salon/Grooming
  Hobbies
  Education/Courses

Entertainment
  Movies
  Streaming
  Events
  Sports/Recreation

Travel
  Flights
  Hotels
  Local Transport
  Travel Food
  Activities

Family
  Parents
  Children
  Family Support
  Family Events

Financial
  Bank Charges
  Credit Card Fees
  Loan Interest
  Taxes
  EMI

Investments
  Stocks
  Mutual Funds
  SIP
  Fixed Deposits
  Gold
  Retirement/PF

Income
  Salary
  Bonus
  Freelance
  Interest
  Dividends
  Refund
  Other Income

Miscellaneous
  Uncategorized
  Other
```

## 17. Demo mode / data isolation

v2.3 introduces logical Personal and Demo IndexedDB partitions by using separate Dexie database namespaces.

```text
ExpenseTrackerDB-personal
ExpenseTrackerDB-demo
```

The active partition is selected through local storage and the app reloads when switching partitions.

Demo mode contains generated data for the previous couple of months relative to the current date and can be regenerated/used independently from personal data.

The master delete button deletes the active partition.

### Important limitation
IndexedDB remains browser-origin scoped.

```text
Safari
  └── personal/demo

Chrome
  └── personal/demo
```

Partitions do **not** make Safari and Chrome share data. Google Sheets or a future hosted database is required for cross-browser/device synchronization.

The partition design does, however, make it easier to introduce a proper user/tenant repository later.

## 18. Multi-tenancy future readiness

The current GitHub Pages frontend can be shared by multiple users/devices, but true secure multi-tenancy requires a server-backed identity and database layer.

Future target:

```text
React
 ↓
Authentication
 ↓
Spring Boot
 ↓
PostgreSQL
```

with tenant/user ownership on all persistent entities.

v2.3 does not implement the hosted backend.

## 19. Backup/export

Supported:
- JSON complete local backup.
- JSON import.
- CSV transaction export.
- Excel-compatible `.xls` transaction export.

A PWA cannot reliably schedule arbitrary background writes into iOS Files while fully closed, so automatic scheduled filesystem backup is intentionally not promised as a v2.3 feature. A future native iOS wrapper could provide stronger background scheduling.

## 20. Theme

Settings:

```text
Dark
Light
System
```

Charts follow semantic themes:

```text
Expenses      Blue
Income        Green
Investments   Green
Warning       Red
```

## 21. Options/navigation cleanup

Stats is a primary navigation destination and is no longer duplicated inside Options.

More/Options focuses on:
- Review Queue.
- Categories.
- Recurring Payments.
- Budgets.
- Investments.
- Interest & Returns.
- Settings/Recovery.

## 22. Developer signature

About section:

```text
Expense Tracker v2.3
Designed & Developed by A J
React · IndexedDB · Google Sheets
```

---

# Code flow for a React beginner

Start with:

```text
docs/CODE-FLOW.md
docs/ARCHITECTURE.md
docs/SETUP.md
```

Typical transaction flow:

```text
AddTransaction.tsx
       ↓
createTransaction()
       ↓
Dexie repository / db.transactions
       ↓
IndexedDB
       ↓
useTransactions()
       ↓
React rerenders
```

Recurring flow:

```text
Bootstrap
   ↓
processDueRecurringTransactions()
   ↓
ReviewQueue item
   ↓
ReviewQueue.tsx
   ↓
Record
   ↓
createTransaction()
   ↓
IndexedDB transaction
```

Stats flow:

```text
IndexedDB
   ↓
useTransactions()
   ↓
Stats filters
   ↓
report aggregation
   ↓
Recharts
```

Partition flow:

```text
Active partition
   ↓
ExpenseTrackerDB-personal
or
ExpenseTrackerDB-demo
   ↓
Dexie
   ↓
React hooks
```

---

# Setup

```bash
npm install
npm run dev
```

Production build:

```bash
npm run build
```

The intended build is:

```text
TypeScript check → Vite production build
```

If npm reports missing native/optional packages after a partial install, remove `node_modules` and `package-lock.json` only if necessary, then reinstall with a normal `npm install`. Do not commit personal Google Sheets credentials.

# Google Apps Script

The compatible Apps Script implementation is:

```text
google-apps-script/Code.gs
google-apps-script/README.md
```

Configure the deployed endpoint and token at runtime in:

```text
Options → Settings → Google Sheets
```

# iOS Shortcut automation

Intended flow:

```text
Bank notification
    ↓
iOS Shortcut
    ↓
NDJSON queue in iCloud Drive
    ↓
Expense Tracker → Review Queue → Sync Automation
    ↓
Record / Edit / Discard
```

This architecture intentionally keeps automation events out of the confirmed ledger until reviewed.

# Future database migration

The app remains local-first today, but the repository/service boundary is intended to make a future migration possible:

```text
IndexedDB repository
        ↓
replace/adapt with
        ↓
Spring Boot REST repository
        ↓
PostgreSQL / Cloud SQL / other hosted DB
```

IndexedDB data can be exported as JSON and migrated later. Google Sheets can also serve as an interim portable reporting/backup layer.
