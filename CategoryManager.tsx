import { useMemo, useState } from 'react';
import { Edit3, Plus, Trash2 } from 'lucide-react';
import { db } from '../db/database';
import { useCategories } from '../hooks/useDb';
import type { Category } from '../types/models';
import { newId } from '../utils/id';
import { queueEntitySync } from '../services/syncService';

export default function CategoryManager() {
  const categories = useCategories();
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState('');
  const [editing, setEditing] = useState<string | null>(null);
  const roots = useMemo(() => categories.filter(c => !c.parentId), [categories]);

  async function saveCategory() {
    const trimmed = name.trim();
    if (!trimmed) return;
    const existing = editing ? categories.find(c => c.id === editing) : undefined;
    const now = new Date().toISOString();
    const item: Category = existing
      ? { ...existing, name: trimmed, parentId: parentId || undefined, updatedAt: now }
      : { id: newId('cat'), name: trimmed, parentId: parentId || undefined, active: true, sortOrder: categories.length * 10, createdAt: now, updatedAt: now };
    await db.categories.put(item); await queueEntitySync('CATEGORY', item.id, existing ? 'UPDATE' : 'CREATE', item);
    setName(''); setParentId(''); setEditing(null);
  }

  function beginEdit(c: Category) { setEditing(c.id); setName(c.name); setParentId(c.parentId || ''); }

  async function archive(c: Category) {
    const children = categories.filter(x => x.parentId === c.id);
    await db.transaction('rw', db.categories, async () => {
      const updated={ ...c, active:false, updatedAt:new Date().toISOString() }; await db.categories.put(updated); await queueEntitySync('CATEGORY', c.id, 'UPDATE', updated);
      for (const child of children) { const updated={ ...child, active:false, updatedAt:new Date().toISOString() }; await db.categories.put(updated); await queueEntitySync('CATEGORY', child.id, 'UPDATE', updated); }
    });
  }

  return <section className="panel">
    <div className="panel-header"><div><h2>Categories & subcategories</h2><p>Customize the hierarchy without changing historical transactions.</p></div><Plus size={18}/></div>
    <div className="category-editor">
      <input value={name} onChange={e => setName(e.target.value)} placeholder="Category or subcategory name" />
      <select value={parentId} onChange={e => setParentId(e.target.value)}><option value="">Top-level category</option>{roots.map(root => <option key={root.id} value={root.id}>Subcategory of {root.name}</option>)}</select>
      <button className="primary-btn" onClick={saveCategory}>{editing ? <Edit3 size={16}/> : <Plus size={16}/>} {editing ? 'Update' : 'Add'}</button>
      {editing && <button className="secondary-btn" onClick={() => { setEditing(null); setName(''); setParentId(''); }}>Cancel</button>}
    </div>
    <div className="category-tree">{roots.map(root => <div className="category-group" key={root.id}>
      <div className="category-root-row"><span>{root.icon || '•'} <strong>{root.name}</strong></span><span><button className="icon-btn small" onClick={() => beginEdit(root)} title="Edit"><Edit3 size={14}/></button><button className="icon-btn small danger-icon" onClick={() => void archive(root)} title="Archive"><Trash2 size={14}/></button></span></div>
      <div className="category-child-list">{categories.filter(c => c.parentId === root.id).map(child => <div className="category-child-row" key={child.id}><span>↳ {child.name}</span><span><button className="icon-btn small" onClick={() => beginEdit(child)} title="Edit"><Edit3 size={13}/></button><button className="icon-btn small danger-icon" onClick={() => void archive(child)} title="Archive"><Trash2 size={13}/></button></span></div>)}</div>
    </div>)}</div>
  </section>;
}
