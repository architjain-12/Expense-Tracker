import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { BarChart3, ClipboardCheck, Home, MoreHorizontal, Plus, ReceiptText, Settings2, WifiOff } from 'lucide-react';

const nav = [
  { to: '/', label: 'Home', icon: Home },
  { to: '/transactions', label: 'Transactions', icon: ReceiptText },
  { to: '/reports', label: 'Reports', icon: BarChart3 },
  { to: '/review', label: 'Review', icon: ClipboardCheck },
  { to: '/settings', label: 'More', icon: MoreHorizontal },
];

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">₹</div>
          <div>
            <strong>Expense Tracker</strong>
            <span>Local-first finance</span>
          </div>
        </div>
        <nav className="side-nav">
          {nav.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Icon size={18} />
              <span>{label}</span>
              {label === 'Review' && <span className="nav-badge">!</span>}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="sync-state"><span className={`status-dot ${isOffline ? 'offline' : 'online'}`} />{isOffline ? 'Offline' : 'Local data ready'}</div>
          <button className="ghost-btn" onClick={() => navigate('/settings')}><Settings2 size={16} /> Settings</button>
        </div>
      </aside>

      <main className="main-shell">
        <header className="topbar">
          <div className="mobile-brand">Expense Tracker</div>
          <div className="topbar-actions">
            {isOffline && <span className="offline-pill"><WifiOff size={14} /> Offline</span>}
            <button className="add-top-btn" onClick={() => navigate('/add')}><Plus size={17} /> <span>Add Transaction</span></button>
          </div>
        </header>
        <div className="content"><Outlet /></div>
      </main>

      <nav className="bottom-nav">
        {nav.slice(0, 2).map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className={({ isActive }) => `bottom-item ${isActive ? 'active' : ''}`}>
            <Icon size={18} /><span>{label}</span>
          </NavLink>
        ))}
        <button className={`bottom-add ${location.pathname === '/add' ? 'active' : ''}`} onClick={() => navigate('/add')}><Plus /></button>
        {nav.slice(2).map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} className={({ isActive }) => `bottom-item ${isActive ? 'active' : ''}`}>
            <Icon size={18} /><span>{label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
