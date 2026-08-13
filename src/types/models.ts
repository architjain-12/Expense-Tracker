/** Domain models shared by the UI, services and IndexedDB. */
export type TransactionType = 'EXPENSE' | 'INCOME' | 'INVESTMENT' | 'TRANSFER';
export type TransactionSource = 'MANUAL' | 'AUTOMATION' | 'RECURRING' | 'IMPORT' | 'INTEREST';
export type SyncStatus = 'LOCAL' | 'PENDING' | 'SYNCED' | 'FAILED';
export type QueueStatus = 'PENDING' | 'RECORDED' | 'DISCARDED';
export type AccountType = 'BANK_ACCOUNT' | 'CREDIT_CARD' | 'CASH' | 'WALLET' | 'INVESTMENT' | 'OTHER';
export type Frequency = 'DAILY' | 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'BIMONTHLY' | 'QUARTERLY' | 'HALF_YEARLY' | 'YEARLY';

export interface Transaction { id:string; type:TransactionType; amount:number; transactionDateTime:string; accountId:string; categoryId?:string; subcategoryId?:string; merchant?:string; notes?:string; needWant?:'NEED'|'WANT'; essentialDiscretionary?:'ESSENTIAL'|'DISCRETIONARY'; fixedVariable?:'FIXED'|'VARIABLE'; source:TransactionSource; recurringRuleId?:string; sourceId?:string; createdAt:string; updatedAt:string; deletedAt?:string; syncStatus:SyncStatus; }
export interface Account { id:string; name:string; type:AccountType; institution?:string; lastFourDigits?:string; isDefault:boolean; active:boolean; createdAt:string; updatedAt:string; }
export interface Category { id:string; name:string; parentId?:string; icon?:string; defaultNeedWant?:'NEED'|'WANT'; defaultEssentialDiscretionary?:'ESSENTIAL'|'DISCRETIONARY'; defaultFixedVariable?:'FIXED'|'VARIABLE'; active:boolean; sortOrder:number; createdAt:string; updatedAt:string; }
export interface MerchantHistory { value:string; lastUsedAt:string; frequency:number; }
export interface RecurringRule { id:string; name:string; amount:number; type:'EXPENSE'|'INCOME'|'INVESTMENT'; accountId:string; categoryId?:string; subcategoryId?:string; merchant?:string; notes?:string; frequency:Frequency; dayOfMonth?:number; startDate:string; endDate?:string; active:boolean; lastGeneratedDate?:string; nextDueDate:string; createdAt:string; updatedAt:string; }
export interface ReviewQueueItem { id:string; externalId:string; amount:number; type:'EXPENSE'|'INCOME'; merchant?:string; accountHint?:string; transactionDateTime:string; rawMessage?:string; source:'IOS_SHORTCUT'|'MANUAL'|'IMPORT'; status:QueueStatus; suggestedCategoryId?:string; suggestedSubcategoryId?:string; suggestedAccountId?:string; notes?:string; createdAt:string; processedAt?:string; }
export interface Budget { id:string; categoryId?:string; amount:number; period:'MONTHLY'|'YEARLY'; startDate:string; endDate?:string; createdAt:string; updatedAt:string; }
export interface InvestmentEntry { id:string; date:string; name:string; assetType:'STOCK'|'MUTUAL_FUND'|'SIP'|'FIXED_DEPOSIT'|'GOLD'|'RETIREMENT_PF'|'OTHER'; type:'CONTRIBUTION'|'REDEMPTION'|'DIVIDEND'|'INTEREST'; amount:number; accountId?:string; notes?:string; createdAt:string; updatedAt:string; syncStatus:SyncStatus; transactionId?:string; }

export type InterestAccountType = 'FIXED_DEPOSIT'|'RECURRING_DEPOSIT'|'SAVINGS_ACCOUNT';
export type Compounding = 'SIMPLE'|'MONTHLY'|'QUARTERLY'|'HALF_YEARLY'|'YEARLY';
export interface InterestAccount { id:string; name:string; institution?:string; type:InterestAccountType; principal:number; recurringAmount?:number; interestRate:number; compounding:Compounding; openingDate:string; maturityDate?:string; maturityMonths?:number; payoutFrequency:'MATURITY'|'MONTHLY'|'QUARTERLY'|'YEARLY'; accountId?:string; active:boolean; autoRecordInterest:boolean; notes?:string; createdAt:string; updatedAt:string; }
export interface ProjectedIncomeEvent { id:string; interestAccountId:string; expectedDate:string; amount:number; categoryId?:string; status:'PROJECTED'|'RECORDED'|'CANCELLED'; transactionId?:string; createdAt:string; updatedAt:string; }
export interface SavedReport { id:string; name:string; categoryIds:string[]; subcategoryIds:string[]; accountIds:string[]; transactionTypes:TransactionType[]; createdAt:string; updatedAt:string; }

export interface AppSettings { id:'app'; currency:string; defaultAccountId?:string; defaultNeedWant?:'NEED'|'WANT'; defaultEssentialDiscretionary?:'ESSENTIAL'|'DISCRETIONARY'; defaultFixedVariable?:'FIXED'|'VARIABLE'; theme:'dark'|'light'|'system'; googleSheetsEndpoint?:string; googleSheetsToken?:string; lastSuccessfulSync?:string; googleSheetsEnabled:boolean; lockEnabled?:boolean; lockMethod?:'PASSKEY'|'PIN'; passkeyCredentialId?:string; localPinHash?:string; showEstimatedDues?:boolean; }
export interface SyncQueueItem { id:string; entityType:string; entityId:string; operation:'CREATE'|'UPDATE'|'DELETE'; payload:unknown; status:'PENDING'|'SYNCING'|'FAILED'; retryCount:number; lastError?:string; createdAt:string; updatedAt:string; }
