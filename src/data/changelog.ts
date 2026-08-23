export type ChangelogEntry = {
    version: string;
    description: string;
    changes: string[];
  };
  
  export const CHANGELOG: ChangelogEntry[] = [
    {
      version: '2.4.1',
      description:
        'Backup, recovery, security and partition improvements.',
      changes: [
        'Added encrypted .etarchive backup and restore support.',
        'Added backup integrity and archive validation before restore.',
        'Added restore options for restoring into the current partition or switching to the backup partition.',
        'Added Merge and Replace restore modes.',
        'Added protection against accidentally replacing newer local data.',
        'Added automatic encrypted backup scheduling with configurable frequency and start time.',
        'Added pending-backup handling so generated backups can be saved through the iPhone Files/share sheet.',
        'Added CSV transaction export.',
        'Added Excel-compatible transaction export.',
        'Added CSV transaction import with duplicate detection.',
        'Added Excel-compatible transaction import with duplicate detection.',
        'Added isolated Personal and Demo data partitions.',
        'Prevented master deletion of the Demo partition.',
        'Added Restore Demo Data to return the Demo partition to its original dataset.',
        'Added device PIN lock with 4–8 digit PIN validation.',
        'Added Face ID / platform passkey device authentication.',
        'Added authentication before disabling the device lock.',
        'Added support for authenticating with a registered local passkey.',
        'Added recovery-secret storage using a salted verifier instead of storing the recovery secret directly.',
        'Added recovery-secret verification support for account/device recovery flows.',
        'Improved WebAuthn credential handling and credential discovery.',
        'Improved Web Crypto buffer handling for current TypeScript DOM typings.',
        'Improved Settings with backup, recovery, security and partition management controls.',
        'Added build number and commit information to the About section.',
      ],
    },
  
    {
      version: '2.4.0',
      description:
        'Reporting, recurring transactions and transaction-management improvements.',
      changes: [
        'Improved recurring transaction scheduling and due-date handling.',
        'Improved recurring payment recording and review-queue handling.',
        'Added support for multiple budget periods without unintentionally changing historical budgets.',
        'Improved estimated dues calculations.',
        'Improved transaction categorization and reporting consistency.',
        'Improved statistics and reporting filters.',
        'Added category multi-select filtering.',
        'Improved yearly and monthly reporting.',
        'Improved net cash-flow and savings calculations.',
        'Improved account and credit-card transaction handling.',
        'Improved transaction entry defaults.',
        'Improved application navigation and Settings organization.',
      ],
    },
  
    {
      version: '2.3.0',
      description:
        'Recurring payments, budgets and reporting improvements.',
      changes: [
        'Added editable and deletable recurring payment rules.',
        'Improved handling of recurring payments with past due dates.',
        'Recurring payments are queued for review on their due date.',
        'Improved budget progress and remaining-budget calculations.',
        'Added estimated dues to budget calculations.',
        'Added multi-select category filtering in Statistics.',
        'Added vertical trend charts.',
        'Improved monthly transaction display.',
        'Removed the unnecessary Add Transaction action from the top navigation area.',
        'Improved transaction and reporting UI for mobile use.',
      ],
    },
  
    {
      version: '2.2.0',
      description:
        'Transaction management and reporting improvements.',
      changes: [
        'Improved transaction recording workflow.',
        'Improved transaction categorization.',
        'Improved account selection and transaction defaults.',
        'Improved Statistics and reporting screens.',
        'Improved recurring transaction support.',
        'Improved mobile PWA usability.',
      ],
    },
  
    {
      version: '2.1.0',
      description:
        'Local-first data and synchronization improvements.',
      changes: [
        'Improved IndexedDB data persistence.',
        'Improved Google Sheets synchronization.',
        'Improved offline-first transaction handling.',
        'Improved synchronization status handling.',
        'Improved transaction review workflow.',
      ],
    },
  
    {
      version: '2.0.0',
      description:
        'Major Expense Tracker architecture and UX update.',
      changes: [
        'Introduced the local-first React PWA architecture.',
        'Added IndexedDB as the primary local data store.',
        'Added Google Sheets synchronization through Google Apps Script.',
        'Added transaction review workflow.',
        'Added recurring transaction support.',
        'Added budgets and spending summaries.',
        'Added Statistics and reporting.',
        'Added account management.',
        'Improved mobile-first application design.',
      ],
    },
  
    {
      version: '1.0.0',
      description:
        'Initial Expense Tracker release.',
      changes: [
        'Initial transaction tracking functionality.',
        'Basic expense categorization.',
        'Initial budget tracking.',
        'Initial reporting functionality.',
      ],
    },
  ];