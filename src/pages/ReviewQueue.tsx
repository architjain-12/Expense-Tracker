import { useMemo, useState } from 'react';
import { AlertTriangle, FileUp, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAccounts, useCategories, useReviewQueue } from '../hooks/useDb';
import { db } from '../db/database';
import { createTransaction } from '../services/transactionService';
import { importAutomationNdjson } from '../services/automationService';
import type { ReviewQueueItem } from '../types/models';

export default function ReviewQueue() {
  const navigate = useNavigate();
  const queue = useReviewQueue();
  const accounts = useAccounts();
  const categories = useCategories();
  const [message, setMessage] = useState('');

  const defaultAccount = accounts.find(a => a.isDefault)?.id || accounts[0]?.id || '';

  async function chooseFile(file?: File) {
    if (!file) return;
    try {
      const result = await importAutomationNdjson(file);
      setMessage(`${result.imported} imported, ${result.skipped} duplicates skipped${result.errors.length ? `, ${result.errors.length} errors` : ''}.`);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Could not import automation file.');
    }
  }

  async function record(item: ReviewQueueItem) {
    const categoryId = item.suggestedCategoryId || categories.find(c => c.name.toLowerCase().includes((item.merchant || '').toLowerCase()))?.id;
    await createTransaction({
      type: item.type,
      amount: item.amount,
      transactionDateTime: item.transactionDateTime,
      accountId: item.suggestedAccountId || defaultAccount,
      categoryId,
      subcategoryId: item.suggestedSubcategoryId,
      merchant: item.merchant,
      notes: item.notes,
      source: item.source === 'RECURRING' ? 'RECURRING' : 'AUTOMATION',
      recurringRuleId: item.source === 'RECURRING' ? item.externalId.split(':')[0] : undefined,
      sourceId: item.externalId,
    });
    await db.reviewQueue.update(item.id, { status: 'RECORDED', processedAt: new Date().toISOString() });
  }

  async function discard(item: ReviewQueueItem) {
    await db.reviewQueue.update(item.id, { status: 'DISCARDED', processedAt: new Date().toISOString() });
  }

  const pending = useMemo(() => queue.slice().sort((a,b) => +new Date(b.transactionDateTime) - +new Date(a.transactionDateTime)), [queue]);

  return <div className="page-stack">
    <section className="hero-row"><div><span className="eyebrow">Automation inbox</span><h1>Review Queue</h1><p className="muted">Nothing becomes a real transaction until you confirm it.</p></div><label className="secondary-btn file-btn"><FileUp size={16}/> Sync Automation<input type="file" accept=".ndjson,.json,.txt" onChange={e => chooseFile(e.target.files?.[0])}/></label></section>
    {message && <div className="info-banner"><AlertTriangle size={16}/>{message}</div>}
    {pending.length === 0 ? <div className="empty-state"><div className="empty-icon">✓</div><h3>Queue is clear</h3><p>Import your iOS Shortcut NDJSON file when you have transactions waiting for review.</p></div> : <div className="review-grid">{pending.map(item => <ReviewCard key={item.id} item={item} onRecord={() => record(item)} onDiscard={() => discard(item)} />)}</div>}
  </div>;
}

function ReviewCard({ item, onRecord, onDiscard }: { item: ReviewQueueItem; onRecord: () => Promise<void>; onDiscard: () => Promise<void> }) {
  return <article className="review-card">
    <div className="review-icon"><Zap size={17}/></div>
    <div className="review-card-top"><div><strong>{item.merchant || 'Unknown merchant'}</strong><span>{item.source === 'RECURRING' ? '↻ Recurring · ' : ''}{new Date(item.transactionDateTime).toLocaleString('en-IN')}</span></div><strong>{item.type === 'INCOME' ? '+' : '-'}₹{item.amount.toLocaleString('en-IN')}</strong></div>
    {item.accountHint && <div className="review-meta">{item.accountHint}</div>}
    {item.rawMessage && <details><summary>Original notification</summary><p>{item.rawMessage}</p></details>}
    <div className="review-actions"><button className="primary-btn" onClick={onRecord}>Record</button><button className="secondary-btn" onClick={() => alert('Edit screen will be added in the next UI iteration.')}>Edit</button><button className="text-danger" onClick={onDiscard}>Discard</button></div>
  </article>;
}
