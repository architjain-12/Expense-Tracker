import { useQuery } from '@tanstack/react-query';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { api } from '../../api/client';

const currentMonth = () => new Date().toISOString().slice(0, 7); // YYYY-MM

function inr(n: number) {
  return `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

export function Dashboard() {
  const month = currentMonth();
  const { data, isLoading, error } = useQuery({
    queryKey: ['monthlySummary', month],
    queryFn: () => api.getMonthlySummary(month),
  });

  if (isLoading) return <p className="text-slate-500">Loading…</p>;
  if (error) return <p className="text-expense">{(error as Error).message}</p>;
  if (!data) return null;

  const savingsRate = data.totalIncome > 0 ? Math.round((data.savings / data.totalIncome) * 100) : 0;

  return (
    <div className="space-y-8">
      <div>
        <p className="text-sm text-slate-500">
          {new Date(month + '-01').toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
        </p>
        <div className="mt-2 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Stat label="Income" value={inr(data.totalIncome)} tone="income" />
          <Stat label="Expenses" value={inr(data.totalExpense)} tone="expense" />
          <Stat label="Invested" value={inr(data.totalInvestment)} tone="invest" />
          <Stat label="Saved" value={`${inr(data.savings)} (${savingsRate}%)`} tone="ink" />
        </div>
      </div>

      <div>
        <h2 className="mb-3 font-display text-lg">Where it went</h2>
        {data.categoryBreakdown.length === 0 ? (
          <p className="text-slate-500">No expenses recorded yet this month.</p>
        ) : (
          <ResponsiveContainer width="100%" height={Math.max(180, data.categoryBreakdown.length * 40)}>
            <BarChart data={data.categoryBreakdown} layout="vertical" margin={{ left: 12, right: 24 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
              <XAxis type="number" tickFormatter={(v) => inr(v)} tick={{ fontSize: 12 }} />
              <YAxis type="category" dataKey="category" width={120} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v: number) => inr(v)} />
              <Bar dataKey="amount" fill="#dc4c3f" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      <p className="text-sm text-slate-400">{data.transactionCount} transactions this month</p>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone: 'income' | 'expense' | 'invest' | 'ink' }) {
  const toneClass = { income: 'text-income', expense: 'text-expense', invest: 'text-invest', ink: 'text-ink' }[tone];
  return (
    <div className="rounded-xl border border-slate-100 p-4">
      <p className="text-xs uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-1 font-display text-xl tabular ${toneClass}`}>{value}</p>
    </div>
  );
}
