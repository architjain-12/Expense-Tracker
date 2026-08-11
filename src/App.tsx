import { NavLink, Route, Routes } from 'react-router-dom';
import { Dashboard } from './features/dashboard/Dashboard';
import { AddTransactionForm } from './features/transactions/AddTransactionForm';
import { TransactionsList } from './features/transactions/TransactionsList';

const navItems = [
  { to: '/', label: 'Home' },
  { to: '/add', label: 'Add' },
  { to: '/transactions', label: 'Transactions' },
];

export default function App() {
  return (
    <div className="mx-auto min-h-dvh max-w-2xl px-4 pb-24 pt-6 sm:pb-8">
      <header className="mb-6 flex items-baseline justify-between">
        <h1 className="font-display text-2xl">Ledger</h1>
      </header>

      <main>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route
            path="/add"
            element={
              <section>
                <h2 className="mb-4 font-display text-lg">Add transaction</h2>
                <AddTransactionForm />
              </section>
            }
          />
          <Route
            path="/transactions"
            element={
              <section>
                <h2 className="mb-4 font-display text-lg">This month</h2>
                <TransactionsList />
              </section>
            }
          />
        </Routes>
      </main>

      <nav className="fixed inset-x-0 bottom-0 border-t border-slate-100 bg-paper/95 backdrop-blur sm:static sm:mt-10 sm:border-none sm:bg-transparent">
        <ul className="mx-auto flex max-w-2xl justify-around px-4 py-2 sm:justify-start sm:gap-6 sm:py-0">
          {navItems.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                end={item.to === '/'}
                className={({ isActive }) =>
                  `block px-3 py-2 text-sm font-medium ${isActive ? 'text-accent' : 'text-slate-500'}`
                }
              >
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
