# VCS Changelog — Transaction & Recurring Engine
### Changes made manually by me in v2.4.1
## Transaction Page

- Updated Transaction page layout and spacing.
- Added collapsible transaction filters to maximize transaction-list space.
- Added transaction search and filter controls.
- Added monthly summary showing **Income, Budget, and Spent**.
- Changed Budget summary to show **Remaining / Overall Budget**.
- Added low-budget warning styling when remaining budget falls below **30%**.
- Reused existing Homepage monthly budget calculation logic.
- Fixed incorrect `useBudgets()` usage that could result in `NaN`.
- Added numeric handling for transaction amounts and budget values.
- Added remaining-budget and remaining-percentage calculations.
- Added Transaction-specific budget styling without modifying shared `.text-danger` behavior.
- Preserved existing global CSS and shared page styling.

## Recurring Engine

- Updated recurring transaction processing logic.
- Corrected recurring transaction due-date calculation.
- Fixed recurring transactions being recorded more than once.
- Corrected recurring transaction handling for the current month.
- Improved estimated dues calculation from scheduled recurring transactions.
- Ensured recurring transactions appear in the review queue on their due date.
- Improved handling of recurring transaction dates and next-occurrence calculation.
- Corrected **bi-weekly recurring logic** to account for the appropriate day of the week.
- Improved recurring transaction categorization so generated transactions retain their category.
- Updated recurring transaction processing to prevent duplicate generated transactions.
- Improved handling of past-due recurring schedules so historical occurrences are not incorrectly generated.
- Ensured recurring transaction edits/deletions are reflected correctly in future processing.