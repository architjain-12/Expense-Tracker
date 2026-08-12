import { useEffect } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Layout from '../components/Layout';
import Home from '../pages/Home';
import Transactions from '../pages/Transactions';
import AddTransaction from '../pages/AddTransaction';
import ReviewQueue from '../pages/ReviewQueue';
import Reports from '../pages/Reports';
import Settings from '../pages/Settings';
import Recurring from '../pages/Recurring';
import TransactionDetail from '../pages/TransactionDetail';
import EditTransaction from '../pages/EditTransaction';
import { ensureSeedData } from '../db/seed';
import { processDueRecurringTransactions } from '../services/recurringService';

function Bootstrap() {
  useEffect(() => {
    void (async () => {
      await ensureSeedData();
      await processDueRecurringTransactions();
    })();
  }, []);
  return null;
}

export default function App() {
  return <BrowserRouter basename={import.meta.env.BASE_URL}>
    <Bootstrap />
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/transactions" element={<Transactions />} />
        <Route path="/transactions/:id" element={<TransactionDetail />} />
        <Route path="/transactions/:id/edit" element={<EditTransaction />} />
        <Route path="/add" element={<AddTransaction />} />
        <Route path="/review" element={<ReviewQueue />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/recurring" element={<Recurring />} />
        <Route path="/settings" element={<Settings />} />
      </Route>
    </Routes>
  </BrowserRouter>;
}
