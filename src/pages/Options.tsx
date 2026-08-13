import { BellRing, Boxes, CalendarClock, Calculator, Settings2, Target, WalletCards, Banknote } from 'lucide-react';
import { Link } from 'react-router-dom';

const items = [
  { to:'/review', icon:BellRing, title:'Review Queue', text:'Review bank/Shortcut transactions before recording them.' },
  { to:'/categories', icon:Boxes, title:'Categories', text:'Manage categories and optional subcategories.' },
  { to:'/recurring', icon:CalendarClock, title:'Recurring Payments', text:'Subscriptions, EMI, RD, rent and other scheduled entries.' },
  { to:'/budgets', icon:Target, title:'Budgets', text:'Set optional overall or category limits.' },
  { to:'/investments', icon:WalletCards, title:'Investments', text:'Track stocks, mutual funds, SIP, FD, gold and PF activity.' },
  { to:'/interest', icon:Calculator, title:'Interest & Returns', text:'FD, RD and savings projections for advance-tax and ITR planning.' },
  { to:'/income', icon:Banknote, title:'Income', text:'Review recorded income and open income transactions.' },
  { to:'/settings', icon:Settings2, title:'Settings & Recovery', text:'Defaults, Google Sheets, device lock and backup.' },
];

export default function Options(){return <div className="page-stack"><section className="hero-row"><div><span className="eyebrow">Configuration & tools</span><h1>Options</h1><p className="muted">Everything that is not part of the fast transaction workflow.</p></div></section><div className="options-grid">{items.map(({to,icon:Icon,title,text})=><Link className="option-card" to={to} key={to}><div className="option-icon"><Icon size={19}/></div><div><strong>{title}</strong><p>{text}</p></div></Link>)}</div></div>}
