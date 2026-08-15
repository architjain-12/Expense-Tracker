import { Link, useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ChevronDown,
  ChevronRight,
  PieChart as PieIcon,
} from 'lucide-react';

import {
  useTransactions,
  useAccounts,
  useCategories,
  useReviewQueue,
  useBudgets,
  useRecurringRules,
  useSettings,
} from '../hooks/useDb';

import {
  getRecurringOccurrencesForMonth,
  toDateKey,
} from '../services/recurringService';

import { formatCurrency } from '../utils/format';
import { useMemo, useState } from 'react';

import TransactionList from '../components/TransactionList';
import MetricCard from '../components/MetricCard';

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

const PIE_COLORS = [
  '#7c8cff',
  '#5dd39e',
  '#f2c14e',
  '#e17878',
  '#7fc8f8',
  '#c39be8',
];

function getCurrentMonthKey() {
  const now = new Date();

  return `${now.getFullYear()}-${String(
    now.getMonth() + 1
  ).padStart(2, '0')}`;
}

export default function Home() {
  const navigate = useNavigate();

  const transactions = useTransactions() ?? [];
  const accounts = useAccounts() ?? [];
  const categories = useCategories() ?? [];
  const reviewQueue = useReviewQueue() ?? [];
  const budgets = useBudgets() ?? [];
  const recurring = useRecurringRules() ?? [];
  useSettings();

  const monthKey = getCurrentMonthKey();

  const [estimatedDuesExpanded, setEstimatedDuesExpanded] =
    useState(false);

  /*
   * ---------------------------------------------------------
   * CURRENT MONTH TRANSACTIONS
   * ---------------------------------------------------------
   */

  const monthTransactions = useMemo(
    () =>
      transactions.filter(
        t => t.transactionDateTime?.slice(0, 7) === monthKey
      ),
    [transactions, monthKey]
  );

  const expenses = useMemo(
    () =>
      monthTransactions
        .filter(t => t.type === 'EXPENSE')
        .reduce((sum, t) => sum + Number(t.amount || 0), 0),
    [monthTransactions]
  );

  const income = useMemo(
    () =>
      monthTransactions
        .filter(t => t.type === 'INCOME')
        .reduce((sum, t) => sum + Number(t.amount || 0), 0),
    [monthTransactions]
  );

  /*
   * ---------------------------------------------------------
   * MONTHLY BUDGET
   * ---------------------------------------------------------
   */

  const overallBudget = useMemo(
    () =>
      budgets.find(
        b =>
          !b.categoryId &&
          b.period === 'MONTHLY'
      ),
    [budgets]
  );

  const budget = Number(overallBudget?.amount || 0);

  /*
   * ---------------------------------------------------------
   * ESTIMATED RECURRING DUES
   * ---------------------------------------------------------
   */

  const estimatedDueItems = useMemo(() => {
    const monthDate = new Date(
      `${monthKey}-01T00:00:00`
    );

    const occurrences = getRecurringOccurrencesForMonth(
      recurring,
      monthDate
    );

    return occurrences
      .map(occurrence => {
        const day = toDateKey(occurrence.dueDate);

        const externalId =
          `${occurrence.rule.id}:${day}`;

        const alreadyInReviewQueue =
          reviewQueue.some(
            q =>
              q.externalId === externalId &&
              q.status !== 'DISCARDED'
          );

        const alreadyRecorded =
          transactions.some(
            t =>
              t.recurringRuleId === occurrence.rule.id &&
              t.transactionDateTime?.slice(0, 10) === day
          );

        if (
          alreadyInReviewQueue ||
          alreadyRecorded
        ) {
          return null;
        }

        return {
          id: externalId,
          externalId,
          ruleId: occurrence.rule.id,
          name:
            occurrence.rule.name ||
            'Recurring payment',
          amount: Number(
            occurrence.rule.amount || 0
          ),
          dueDate: occurrence.dueDate,
          type: 'RECURRING',
        };
      })
      .filter(
        item =>
          item !== null
      );
  }, [
    recurring,
    reviewQueue,
    transactions,
    monthKey,
  ]);

  const estimatedDues = useMemo(
    () =>
      estimatedDueItems.reduce(
        (sum, item) =>
          sum + Number(item.amount || 0),
        0
      ),
    [estimatedDueItems]
  );

  /*
   * ---------------------------------------------------------
   * BUDGET CALCULATIONS
   * ---------------------------------------------------------
   */

  const spentPercentage =
    budget > 0
      ? (expenses / budget) * 100
      : 0;

  const duesPercentage =
    budget > 0
      ? (estimatedDues / budget) * 100
      : 0;

  const remaining =
    budget - expenses;

  const remainingAfterDues =
    budget - expenses - estimatedDues;

  /*
   * Prevent the visual dues segment from going
   * beyond the remaining budget.
   */
  const safeSpentPercentage = Math.min(
    100,
    Math.max(0, spentPercentage)
  );

  const remainingPercentage = Math.max(
    0,
    100 - safeSpentPercentage
  );

  const safeDuesPercentage = Math.min(
    remainingPercentage,
    Math.max(0, duesPercentage)
  );

  /*
   * Savings / available money after estimated dues.
   *
   * If a budget exists:
   * budget - expenses - estimated dues
   *
   * Otherwise:
   * income - expenses - estimated dues
   */
  const estimatedSavings =
    budget > 0
      ? remainingAfterDues
      : income - expenses - estimatedDues;

  /*
   * ---------------------------------------------------------
   * CATEGORY DATA
   * ---------------------------------------------------------
   */

  const categoryData = useMemo(() => {
    const map = new Map();

    monthTransactions
      .filter(t => t.type === 'EXPENSE')
      .forEach(t => {
        const id =
          t.categoryId || 'uncategorized';

        map.set(
          id,
          (map.get(id) || 0) +
            Number(t.amount || 0)
        );
      });

    return [...map.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([id, amount]) => ({
        id,
        name:
          categories.find(
            c => c.id === id
          )?.name ||
          'Uncategorized',
        amount,
        percent:
          expenses > 0
            ? (amount / expenses) * 100
            : 0,
      }));
  }, [
    monthTransactions,
    categories,
    expenses,
  ]);

  /*
   * ---------------------------------------------------------
   * RECENT TRANSACTIONS
   * ---------------------------------------------------------
   */

  const recent = useMemo(
    () =>
      transactions
        .slice()
        .sort(
          (a, b) =>
            +new Date(
              b.transactionDateTime
            ) -
            +new Date(
              a.transactionDateTime
            )
        )
        .slice(0, 5),
    [transactions]
  );

  /*
   * ---------------------------------------------------------
   * CURRENT MONTH LABEL
   * ---------------------------------------------------------
   */

  const monthLabel = new Date(
    `${monthKey}-01T00:00:00`
  ).toLocaleDateString(
    'en-IN',
    {
      month: 'long',
      year: 'numeric',
    }
  );

  /*
   * ---------------------------------------------------------
   * PIE CHARt
   * ---------------------------------------------------------
   */
  const [selectedCategory, setSelectedCategory] = useState(null);
  const selectedCategoryData = categoryData.find(
    c => c.id === selectedCategory
  );
  /*
   * ---------------------------------------------------------
   * RENDER
   * ---------------------------------------------------------
   */

  return (
    <div className="page-stack home-page">

      {/* =====================================================
          HEADER
      ====================================================== */}

      <section className="home-header">
        <span className="eyebrow">
          Current month
        </span>

        <h1>{monthLabel}</h1>

        <p className="muted">
          Your important financial snapshot
          at a glance.
        </p>
      </section>


      {/* =====================================================
          BUDGET + COMBINED SPENDING BAR
      ====================================================== */}

      <section className="panel home-budget-card">

        <div className="home-budget-header">

          <div>
            <span className="home-section-label">
              Monthly budget
            </span>

            {budget > 0 ? (
              <div className="home-budget-remaining">
                <strong>
                  {formatCurrency(
                    Math.max(remaining, 0)
                  )}
                </strong>

                <span>
                  remaining
                </span>

                <span className="home-budget-total">
                  / {formatCurrency(budget)}
                </span>
              </div>
            ) : (
              <div className="home-budget-remaining">
                <strong>—</strong>

                <span>
                  No monthly budget configured
                </span>
              </div>
            )}
          </div>

          {budget > 0 && (
            <div className="home-budget-percent">
              {Math.round(
                Math.min(100, spentPercentage)
              )}
              % used
            </div>
          )}

        </div>


        {/* =================================================
            COMBINED BUDGET BAR

            Accent = Actual spending
            Warning = Estimated dues
            Empty  = Remaining
        ================================================== */}

        <div className="home-combined-budget">

          {budget > 0 && (
            <>
              <span
                className="home-budget-spent-segment"
                style={{
                  width: `${safeSpentPercentage}%`,
                }}
              />

              <span
                className="home-budget-dues-segment"
                style={{
                  left: `${safeSpentPercentage}%`,
                  width: `${safeDuesPercentage}%`,
                }}
              />
            </>
          )}

        </div>


        <div className="home-budget-labels">

          <span>
            <i className="home-budget-dot spent" />

            {formatCurrency(expenses)} spent
          </span>

          <span>
            <i className="home-budget-dot dues" />

            {formatCurrency(
              estimatedDues
            )}{' '}
            estimated dues
          </span>

          <span>
            {budget > 0
              ? formatCurrency(
                  Math.max(
                    remainingAfterDues,
                    0
                  )
                ) + ' after dues'
              : 'Set a budget in Options'}
          </span>

        </div>

      </section>


      {/* =====================================================
          IMPORTANT FINANCIAL NUMBERS
      ====================================================== */}

      <section className="metric-grid home-financial-summary">

        <MetricCard
          label="Income"
          value={formatCurrency(income)}
        />

        <MetricCard
          label="Spent"
          value={formatCurrency(expenses)}
        />

        <MetricCard
          label="After estimated dues"
          value={formatCurrency(
            estimatedSavings
          )}
        />

      </section>


      {/* =====================================================
          PENDING REVIEW
      ====================================================== */}

      {reviewQueue.length > 0 && (
        <Link
          to="/review"
          className="home-review-alert"
        >
          <div className="home-review-icon">
            <AlertCircle size={18} />
          </div>

          <div className="home-review-content">
            <strong>
              {reviewQueue.length}{' '}
              pending review{' '}
              {reviewQueue.length === 1
                ? 'item'
                : 'items'}
            </strong>

            <span>
              Transactions are waiting
              for confirmation.
            </span>
          </div>

          <ChevronRight
            size={18}
            className="home-review-arrow"
          />
        </Link>
      )}


      {/* =====================================================
          ESTIMATED DUES
      ====================================================== */}

      <section className="panel home-dues-card">

        <button
          type="button"
          className="home-dues-header"
          onClick={() =>
            setEstimatedDuesExpanded(
              value => !value
            )
          }
        >

          <div className="home-dues-title">

            <div>
              <h2>
                Estimated dues
              </h2>

              <p>
                Future recurring expenses
                expected this month.
              </p>
            </div>

          </div>

          <div className="home-dues-summary">

            <strong>
              {formatCurrency(
                estimatedDues
              )}
            </strong>

            <ChevronDown
              size={17}
              className={
                estimatedDuesExpanded
                  ? 'home-chevron-open'
                  : ''
              }
            />

          </div>

        </button>


        <div className="home-dues-footer">

          <span>
            {estimatedDueItems.length}{' '}
            future expense
            {estimatedDueItems.length !== 1
              ? 's'
              : ''}
          </span>

          <span>
            {estimatedDuesExpanded
              ? 'Tap to hide'
              : 'Tap to view'}
          </span>

        </div>


        {estimatedDuesExpanded && (
          <div className="estimated-dues-list">

            {estimatedDueItems.length === 0 ? (

              <div className="empty-inline">
                No estimated dues for
                this month.
              </div>

            ) : (

              estimatedDueItems.map(
                item => (

                  <button
                    key={item.id}
                    type="button"
                    className="estimated-due-item"
                    onClick={() => {
                      // Navigation can be added later.
                    }}
                  >

                    <div>
                      <strong>
                        {item.name}
                      </strong>

                      <small>
                        Due{' '}
                        {item.dueDate.toLocaleDateString(
                          undefined,
                          {
                            day: 'numeric',
                            month: 'short',
                          }
                        )}
                        {' · '}
                        Recurring
                      </small>
                    </div>

                    <div className="estimated-due-amount">
                      {formatCurrency(
                        item.amount
                      )}

                      <span>
                        <ChevronRight
                          size={16}
                        />
                      </span>
                    </div>

                  </button>

                )
              )

            )}

          </div>
        )}

      </section>


      {/* =====================================================
          RECENT TRANSACTIONS
      ====================================================== */}

      <section className="panel home-recent-card">

        <div className="panel-header">

          <div>
            <h2>
              Recent transactions
            </h2>

            <p>
              Latest confirmed ledger
              activity
            </p>
          </div>

          <Link
            to="/transactions"
            className="text-link"
          >
            View all
          </Link>

        </div>

        <TransactionList
          transactions={recent}
          accounts={accounts}
          categories={categories}
          onSelect={t =>
            navigate(
              `/transactions/${t.id}`
            )
          }
        />

      </section>


      {/* =====================================================
          SPENDING BY CATEGORY
      ====================================================== */}

      <section className="panel home-category-card">

        <div className="panel-header">

          <div>
            <h2>
              Spending by category
            </h2>

            <p>
              Tap a category to filter
              Transactions.
            </p>
          </div>

          <PieIcon size={18} />

        </div>


        {categoryData.length ? (

          <>
            <div className="chart-box spending-donut">
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                <Pie
                  data={categoryData}
                  dataKey="amount"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius="52%"
                  outerRadius="72%"
                  paddingAngle={2}
                  stroke="none"
                  activeShape={false}
                  isAnimationActive={true}
                >
                  {categoryData.map((c, i) => (
                    <Cell
                      key={c.id}
                      fill={PIE_COLORS[i % PIE_COLORS.length]}
                      stroke="none"
                      style={{ outline: "none" }}
                    />
                  ))}
                </Pie>
                  <Tooltip
                    formatter={(value, name) => [
                      formatCurrency(Number(value)),
                      name,
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>

              <div className="donut-center">
                <span>Total spent</span>
                <strong>{formatCurrency(expenses)}</strong>
              </div>
            </div>

            <div className="stacked-list">

              {categoryData.map(
                category => (

                  <button
                    className="stat-row clickable"
                    key={category.id}
                    onClick={() =>
                      navigate(
                        `/transactions?month=${monthKey}&category=${category.id}`
                      )
                    }
                  >

                    <span>
                      {category.name} ·{' '}
                      {category.percent.toFixed(
                        0
                      )}
                      %
                    </span>

                    <strong>
                      {formatCurrency(
                        category.amount
                      )}{' '}
                      <ChevronRight
                        size={14}
                      />
                    </strong>

                  </button>

                )
              )}

            </div>

          </>

        ) : (

          <div className="empty-inline">
            Categories will appear
            after you record spending.
          </div>

        )}

      </section>

    </div>
  );
}