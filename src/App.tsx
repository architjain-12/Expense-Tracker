// -----------------------------------------------------------------------------
// APPLICATION SHELL
// -----------------------------------------------------------------------------
// App.tsx defines the navigation and connects each major V2 feature to a page.

import { NavLink, Route, Routes } from 'react-router-dom';
import { Dashboard } from './features/dashboard/Dashboard';
import { AddTransactionForm } from './features/transactions/AddTransactionForm';
import { TransactionsList } from './features/transactions/TransactionsList';
import { Reports } from './features/reports/Reports';
import { Manage } from './features/manage/Manage';

const navItems = [
  { to: '/', label: 'Dashboard' },
  { to: '/add', label: 'Add' },
  { to: '/transactions', label: 'Transactions' },
  { to: '/reports', label: 'Reports' },
  { to: '/manage', label: 'Manage' },
];

export default function App() {
  return <div className="app-shell">
    <header className="app-header"><div><p className="eyebrow">Personal Finance</p><h1>Ledger V2</h1></div><span className="version">Phase 1</span></header>
    <main><Routes>
      <Route path="/" element={<Dashboard />} />
      <Route path="/add" element={<section><h2>Add transaction</h2><AddTransactionForm /></section>} />
      <Route path="/transactions" element={<section><h2>Transactions</h2><TransactionsList /></section>} />
      <Route path="/reports" element={<section><h2>Reports & net worth</h2><Reports /></section>} />
      <Route path="/manage" element={<section><h2>Manage & settings</h2><Manage /></section>} />
    </Routes></main>
    <nav className="bottom-nav">{navItems.map(item => <NavLink key={item.to} to={item.to} end={item.to === '/'} className={({ isActive }) => isActive ? 'nav-item active' : 'nav-item'}>{item.label}</NavLink>)}</nav>
  </div>;
}
