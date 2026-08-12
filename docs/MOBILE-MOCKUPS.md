# Mobile design mockups

The first release intentionally makes **transaction recording** the primary job.

## Home

```text
┌───────────────────────────────┐
│ Expense Tracker           ⋮   │
│ August 12, 2026              │
│                               │
│ ₹24,680                       │
│ spent this month              │
│ 42 transactions               │
│                               │
│ ┌───────────────────────────┐ │
│ │ + Add Transaction         │ │
│ └───────────────────────────┘ │
│                               │
│ ⚡ 3 transactions need review │
│                               │
│ TODAY                         │
│ Amazon                 -₹1,299│
│ Shopping · HDFC              │
│ 7:42 PM                       │
│                               │
│ Swiggy                   -₹480│
│ Food · HDFC                   │
│ 1:15 PM                       │
│                               │
│ August spending               │
│ ────╱╲────╱╲────────          │
│                               │
├───────────────────────────────┤
│ Home Txns  +  Reports  Review │
└───────────────────────────────┘
```

## Add Transaction

```text
┌───────────────────────────────┐
│ ← New Transaction             │
│                               │
│ Expense       Income          │
│                               │
│            ₹                  │
│          1,299                │
│                               │
│ HDFC Bank                  ▼  │
│ Shopping                   ▼  │
│ Amazon                        │
│ Electronics                   │
│                               │
│ 12 Aug 2026 · 7:42 PM         │
│                               │
│ ┌───────────────────────────┐ │
│ │     RECORD TRANSACTION    │ │
│ └───────────────────────────┘ │
└───────────────────────────────┘
```

## Review Queue

```text
┌───────────────────────────────┐
│ Review Queue                  │
│ 3 pending                     │
│                               │
│ ⚡ Amazon              ₹1,299 │
│ Today · 7:42 PM               │
│ Shopping                     │
│ HDFC Credit Card              │
│                               │
│ [ Record ] [ Edit ] Discard  │
│                               │
│ ⚡ Swiggy                ₹480 │
│ ...                           │
└───────────────────────────────┘
```

## Reports

```text
┌───────────────────────────────┐
│ Reports                       │
│ August 2026                  │
│                               │
│ ₹24,680 expenses              │
│ 42 transactions               │
│                               │
│ Daily spending                │
│ ──╱╲──╱╲────╱╲────           │
│                               │
│ Top categories                │
│ Food                 ₹6,820   │
│ Shopping             ₹5,420   │
│ Bills                ₹4,100   │
│ Transport            ₹3,210   │
└───────────────────────────────┘
```
