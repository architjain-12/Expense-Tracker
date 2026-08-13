import { useEffect } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import Layout from '../components/Layout';
import AppLockGuard from '../components/AppLockGuard';
import ErrorBoundary from '../components/ErrorBoundary';
import Home from '../pages/Home';
import Transactions from '../pages/Transactions';
import AddTransaction from '../pages/AddTransaction';
import ReviewQueue from '../pages/ReviewQueue';
import Stats from '../pages/Stats';
import Settings from '../pages/Settings';
import Options from '../pages/Options';
import Recurring from '../pages/Recurring';
import Categories from '../pages/Categories';
import Budgets from '../pages/Budgets';
import Investments from '../pages/Investments';
import Income from '../pages/Income';
import InterestReturns from '../pages/InterestReturns';
import TransactionDetail from '../pages/TransactionDetail';
import EditTransaction from '../pages/EditTransaction';
import { ensureSeedData } from '../db/seed';
import { processDueRecurringTransactions } from '../services/recurringService';
import { restoreFromGoogleSheetsIfEmpty } from '../services/googleSheetsService';
import { db } from '../db/database';
import { recordDueInterest } from '../services/interestService';

function Bootstrap(){useEffect(()=>{const run=async()=>{await ensureSeedData();const s=await db.settings.get('app');if(s)document.documentElement.dataset.theme=s.theme||'dark';await processDueRecurringTransactions();await recordDueInterest();await restoreFromGoogleSheetsIfEmpty();};void run();},[]);return null;}

export default function App(){return <BrowserRouter basename={import.meta.env.BASE_URL}>
    <Bootstrap/>
    <ErrorBoundary>
        <AppLockGuard>
            <Routes>
                <Route element={<Layout/>}>
                <Route path="/" element={<Home/>}/>
                <Route path="/transactions" element={<Transactions/>}/>
                <Route path="/transactions/:id" element={<TransactionDetail/>}/>
                <Route path="/transactions/:id/edit" element={<EditTransaction/>}/>
                <Route path="/add" element={<AddTransaction/>}/>
                <Route path="/review" element={<ReviewQueue/>}/>
                <Route path="/stats" element={<Stats/>}/>
                <Route path="/reports" element={<Stats/>}/>
                <Route path="/categories" element={<Categories/>}/>
                <Route path="/budgets" element={<Budgets/>}/>
                <Route path="/investments" element={<Investments/>}/><Route path="/income" element={<Income/>}/><Route path="/interest" element={<InterestReturns/>}/>
                <Route path="/recurring" element={<Recurring/>}/>
                <Route path="/options" element={<Options/>}/>
                <Route path="/settings" element={<Settings/>}/>
                </Route>
            </Routes>
        </AppLockGuard>
    </ErrorBoundary>
    </BrowserRouter>}

