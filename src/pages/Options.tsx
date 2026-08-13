import { BarChart3, BellRing, Boxes, CalendarClock, ChartNoAxesCombined, Calculator, Settings2, Target, WalletCards, BanknoteArrowUp } from 'lucide-react';
import { Link } from 'react-router-dom';
const items=[
 {to:'/review',icon:BellRing,title:'Review Queue',text:'Review bank/Shortcut transactions before recording them.'},
 {to:'/categories',icon:Boxes,title:'Categories',text:'Manage categories and optional subcategories.'},
 {to:'/recurring',icon:CalendarClock,title:'Recurring Payments',text:'Subscriptions, EMI, RD, rent and other scheduled entries.'},
 {to:'/budgets',icon:Target,title:'Budgets',text:'Set optional monthly or yearly spending limits.'},
 {to:'/investments',icon:WalletCards,title:'Investments',text:'Track investment activity and consolidated returns.'},
 {to:'/income',icon:BanknoteArrowUp,title:'Income',text:'Monthly, yearly and all-time income reporting.'},
 {to:'/interest',icon:Calculator,title:'Interest & Returns',text:'Calculate FD/RD/savings interest and projected income for tax planning.'},
 {to:'/stats',icon:ChartNoAxesCombined,title:'Statistics',text:'Build and save custom category/subcategory reports.'},
 {to:'/settings',icon:Settings2,title:'Settings & Recovery',text:'Defaults, accounts, Google Sheets, backup and device lock.'},
];
export default function Options(){return <div className="page-stack"><section className="hero-row"><div><span className="eyebrow">Configuration & tools</span><h1>Options</h1><p className="muted">Tools that are not part of the fast transaction workflow.</p></div></section><div className="options-grid">{items.map(({to,icon:Icon,title,text})=><Link className="option-card" to={to} key={to}><div className="option-icon"><Icon size={19}/></div><div><strong>{title}</strong><p>{text}</p></div></Link>)}</div></div>}
