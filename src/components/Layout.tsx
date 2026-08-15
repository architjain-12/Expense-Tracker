import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  BarChart3,
  ClipboardCheck,
  Home,
  MoreHorizontal,
  ReceiptText,
  Settings2,
  WifiOff,
  Plus,
} from "lucide-react";

const mainNav = [
  { to: "/", label: "Home", icon: Home },
  { to: "/transactions", label: "Transactions", icon: ReceiptText },
  { to: "/stats", label: "Stats", icon: BarChart3 },
  { to: "/options", label: "Options", icon: MoreHorizontal },
];

export default function Layout() {
  const navigate = useNavigate();
  const isOffline = typeof navigator !== "undefined" && !navigator.onLine;
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">₹</div>
          <div>
            <strong>TRACE</strong>
            <small
              style={{
                display: "block",
                fontSize: "0.5em",
                fontWeight: "normal",
                color: "#666",
              }}
            >
              Follow your Money.
              {/* <strong>T</strong>rack · <strong>R</strong>ecord · <strong>A</strong>nalyze · <strong>C</strong>ategorize · <strong>E</strong>stimate */}
            </small>
          </div>
        </div>
        <nav className="side-nav">
          {mainNav.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `nav-item ${isActive ? "active" : ""}`
              }
            >
              <Icon size={18} />
              <span>{label}</span>
            </NavLink>
          ))}
          <NavLink
            to="/review"
            className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
          >
            <ClipboardCheck size={18} />
            <span>Review Queue</span>
          </NavLink>
        </nav>
        <div className="sidebar-footer">
          <div className="sync-state">
            <span
              className={`status-dot ${isOffline ? "offline" : "online"}`}
            />
            {isOffline ? "Offline" : "Local data ready"}
          </div>
          <button className="ghost-btn" onClick={() => navigate("/options")}>
            <Settings2 size={16} /> Settings
          </button>
        </div>
      </aside>
      <main className="main-shell">
        <header className="topbar">
          <div className="mobile-brand">
            <strong>TRACE</strong>{" "}<span style={{
                display: "inline",
                fontSize: "0.5em",
                fontWeight: 100,
                color: "#666",
              }}>Follow your Money.</span>
            <small
              style={{
                display: "block",
                fontSize: "0.5em",
                fontWeight: "lighter",
                color: "#666",
              }}
            >
              {/* Follow your Money. */}
              <strong>T</strong>rack · <strong>R</strong>ecord · <strong>A</strong>nalyze · <strong>C</strong>ategorize · <strong>E</strong>stimate
            </small>
          </div>
          <div className="topbar-actions">
            {isOffline && (
              <span className="offline-pill">
                <WifiOff size={14} /> Offline
              </span>
            )}
          </div>
        </header>
        <div className="content">
          <Outlet />
        </div>
      </main>
      <nav className="bottom-nav">
        <NavLink
          to="/"
          className={({ isActive }) =>
            `bottom-item ${isActive ? "active" : ""}`
          }
        >
          <Home size={18} />
          <span>Home</span>
        </NavLink>
        <NavLink
          to="/transactions"
          className={({ isActive }) =>
            `bottom-item ${isActive ? "active" : ""}`
          }
        >
          <ReceiptText size={18} />
          <span>Transactions</span>
        </NavLink>
        <button className="bottom-add" onClick={() => navigate("/add")}>
          <Plus />
        </button>
        <NavLink
          to="/stats"
          className={({ isActive }) =>
            `bottom-item ${isActive ? "active" : ""}`
          }
        >
          <BarChart3 size={18} />
          <span>Stats</span>
        </NavLink>
        <NavLink
          to="/options"
          className={({ isActive }) =>
            `bottom-item ${isActive ? "active" : ""}`
          }
        >
          <MoreHorizontal size={18} />
          <span>Options</span>
        </NavLink>
      </nav>
    </div>
  );
}
