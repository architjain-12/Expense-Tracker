import { getEffectiveBudget } from '../services/budgetService';
import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { startOfMonth, endOfMonth, parseISO, format } from "date-fns";
import { useAccounts, useCategories, useTransactions, useBudgets } from "../hooks/useDb";
import TransactionList from "../components/TransactionList";
import { formatCurrency } from "../utils/format";
function shift(key: string, d: number) {
  const [y, m] = key.split("-").map(Number);
  return format(new Date(y, m - 1 + d, 1), "yyyy-MM");
}
export default function Transactions() {
  const [filtersOpen, setFiltersOpen] = useState(false);  
  const navigate = useNavigate();
  const txns = useTransactions();
  const accounts = useAccounts();
  const categories = useCategories();
  const [params] = useSearchParams();
  const [month, setMonth] = useState(
    params.get("month") || new Date().toISOString().slice(0, 7)
  );
  const [view, setView] = useState(params.get("view") || "All Transactions");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState(params.get("category") || "");
  const [subcategory, setSubcategory] = useState(
    params.get("subcategory") || ""
  );
  const [account, setAccount] = useState(params.get("account") || "");
  const roots = useMemo(
    () => categories.filter((c) => !c.parentId),
    [categories]
  );
  const subs = useMemo(
    () => categories.filter((c) => c.parentId === category),
    [categories, category]
  );
  const filtered = useMemo(() => {
    const [y, m] = month.split("-").map(Number);
    const start = startOfMonth(new Date(y, m - 1, 1));
    const end = endOfMonth(start);
    return txns.filter((t) => {
      const d = parseISO(t.transactionDateTime);
      return (
        d >= start &&
        d <= end &&
        (!category || t.categoryId === category) &&
        (!subcategory || t.subcategoryId === subcategory) &&
        (!account || t.accountId === account) &&
        (!query.trim() ||
          `${t.merchant || ""} ${t.notes || ""}`
            .toLowerCase()
            .includes(query.toLowerCase())) &&
        (view === "All Transactions" ||
          (view === "Expenses" && t.type === "EXPENSE") ||
          (view === "Income" && t.type === "INCOME") ||
          (view === "Recurring" && t.source === "RECURRING"))
      );
    });
  }, [txns, month, view, query, category, subcategory, account]);
  const expenseTotal = filtered
    .filter((t) => t.type === "EXPENSE")
    .reduce((s, t) => s + t.amount, 0);
  const clear = () => {
    setCategory("");
    setSubcategory("");
    setAccount("");
    setQuery("");
    setView("All Transactions");
  };
  const monthlyTransactions = useMemo(() => {
    const [y, m] = month.split("-").map(Number);
    const start = startOfMonth(new Date(y, m - 1, 1));
    const end = endOfMonth(start);
  
    return txns.filter((t) => {
      const d = parseISO(t.transactionDateTime);
      return d >= start && d <= end;
    });
  }, [txns, month]);

    const monthlyIncome = monthlyTransactions
    .filter((t) => t.type === "INCOME")
    .reduce((sum, t) => sum + t.amount, 0);

    const monthlySpent = monthlyTransactions
    .filter((t) => t.type === "EXPENSE")
    .reduce((sum, t) => sum + t.amount, 0);

    const budgets = useBudgets();

    const overallBudget = getEffectiveBudget(budgets, undefined, "MONTHLY", new Date());

    const budget = Number(overallBudget?.amount || 0);

    const totalIncome = monthlyTransactions
    .filter(t => t.type === "INCOME")
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

    const totalSpent = monthlyTransactions
    .filter(t => t.type !== "INCOME")
    .reduce((sum, t) => sum + Number(t.amount || 0), 0);

    const remaining = budget - totalSpent;
    const remainingPercentage = remaining / budget * 100;
        
  return (
    <div className="page-stack">
      <section className="hero-row">
        <div>
          <span className="eyebrow">Ledger</span>
          <h1>Transactions</h1>
          <p className="muted">Current full month by default.</p>
        </div>
      </section>
      <div className="month-nav">
        <button className="icon-btn" onClick={() => setMonth(shift(month, -1))}>
          <ChevronLeft />
        </button>
        <strong>{format(parseISO(`${month}-01`), "MMMM yyyy")}</strong>
        <button className="icon-btn" onClick={() => setMonth(shift(month, 1))}>
          <ChevronRight />
        </button>
      </div>
      <section className="transaction-summary">
        <div>
            <span>Income</span>
            <strong className="positive">
            {formatCurrency(monthlyIncome)}
            </strong>
        </div>

        <div>
            <span>Budget</span>
            <strong>
            <span
                className={`budget-remaining ${
                    remainingPercentage < 20 ? "budget-low" : ""
                }`}
                >
                ₹{remaining.toLocaleString("en-IN")}
            </span>
            <span className="budget-overall">
                / ₹{budget.toLocaleString("en-IN")}
            </span>
            </strong>
        </div>
        <div className="transaction-spent">
            <span>Spent</span>
            <strong>
            {formatCurrency(monthlySpent)}
            </strong>
        </div>
      </section>
      <div className="transaction-toolbar">
        <label className="search-field transaction-search">
            <Search size={16} />
            <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search merchant or note"
            />
        </label>

        <button
            className="transaction-filter-btn"
            onClick={() => setFiltersOpen((open) => !open)}
            type="button"
        >
            {filtersOpen ? "Hide Filters" : "Filters"}
        </button>
        </div>
        {filtersOpen && (
  <div className="transaction-filters">
    <select
      value={view}
      onChange={(e) => setView(e.target.value)}
    >
      <option>All Transactions</option>
      <option>Expenses</option>
      <option>Income</option>
      <option>Recurring</option>
    </select>

    <select
      value={category}
      onChange={(e) => {
        setCategory(e.target.value);
        setSubcategory("");
      }}
    >
      <option value="">All categories</option>

      {roots.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </select>

    <select
      value={subcategory}
      disabled={!category}
      onChange={(e) => setSubcategory(e.target.value)}
    >
      <option value="">All subcategories</option>

      {subs.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name}
        </option>
      ))}
    </select>

    <select
      value={account}
      onChange={(e) => setAccount(e.target.value)}
    >
      <option value="">All accounts</option>

      {accounts.map((a) => (
        <option key={a.id} value={a.id}>
          {a.name}
        </option>
        ))}
        </select>
        </div>
        )}
      {/* <div className="toolbar transaction-toolbar">
        <label className="search-field transaction-search">
            <Search size={16} />
            <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search merchant or note"
            />
        </label>

        <select
            value={view}
            onChange={(e) => setView(e.target.value)}
        >
            <option>All Transactions</option>
            <option>Expenses</option>
            <option>Income</option>
            <option>Recurring</option>
        </select>

        <select
            value={category}
            onChange={(e) => {
            setCategory(e.target.value);
            setSubcategory("");
            }}
        >
            <option value="">All categories</option>
            {roots.map((c) => (
            <option key={c.id} value={c.id}>
                {c.name}
            </option>
            ))}
        </select>

        <select
            value={subcategory}
            disabled={!category}
            onChange={(e) => setSubcategory(e.target.value)}
        >
            <option value="">All subcategories</option>
            {subs.map((c) => (
            <option key={c.id} value={c.id}>
                {c.name}
            </option>
            ))}
        </select>

        <select
            value={account}
            onChange={(e) => setAccount(e.target.value)}
        >
            <option value="">All accounts</option>
            {accounts.map((a) => (
            <option key={a.id} value={a.id}>
                {a.name}
            </option>
            ))}
        </select>
      </div> */}
      {(category ||
        subcategory ||
        account ||
        query ||
        view !== "All Transactions") && (
        <div className="filter-chips">
          <button onClick={clear}>
            Clear filters <X size={13} />
          </button>
          {category && (
            <span>{roots.find((c) => c.id === category)?.name}</span>
          )}
          {subcategory && (
            <span>{subs.find((c) => c.id === subcategory)?.name}</span>
          )}
          {account && (
            <span>{accounts.find((a) => a.id === account)?.name}</span>
          )}
        </div>
      )}
      <div className="summary-strip">
        <span>{filtered.length} transactions</span>
        <strong>{formatCurrency(expenseTotal)} expenses</strong>
      </div>
      <section className="panel">
        <TransactionList
          transactions={filtered}
          accounts={accounts}
          categories={categories}
          onSelect={(t) => navigate(`/transactions/${t.id}`)}
        />
      </section>
    </div>
  );
}
