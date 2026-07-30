import {
  ArrowRight,
  Bell,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronRight,
  CircleDollarSign,
  CreditCard,
  Download,
  House,
  Landmark,
  List,
  LockKeyhole,
  Pencil,
  PieChart,
  Plus,
  Search,
  SlidersHorizontal,
  Sparkles,
  Target,
  Utensils,
  WalletCards,
  X,
} from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'

type DesktopPage = 'dashboard' | 'transactions' | 'accounts' | 'reports' | 'goals' | 'budgets' | 'settings'
type ModalKind = 'record' | 'move' | 'account' | 'cooloff' | 'funds' | 'goal' | 'plan'

interface DesktopExperienceProps {
  activePage: string
  setActivePage: (page: string) => void
}

const nav = [
  { id: 'dashboard', label: 'Home', icon: House },
  { id: 'transactions', label: 'Ledger', icon: List },
  { id: 'accounts', label: 'Wallet', icon: CreditCard },
  { id: 'reports', label: 'Insights', icon: PieChart },
  { id: 'goals', label: 'Goals', icon: Target },
  { id: 'budgets', label: 'Plan', icon: Check },
] as const

const titles: Record<DesktopPage, { eyebrow: string; first: string; accent: string }> = {
  dashboard: { eyebrow: 'Wed · 23 July', first: 'Good evening,', accent: 'Moeed.' },
  transactions: { eyebrow: 'July · Cycle 4', first: 'The', accent: 'ledger.' },
  accounts: { eyebrow: 'July · Cycle 4', first: 'The', accent: 'wallet.' },
  reports: { eyebrow: 'July · Cycle 4', first: 'Your money,', accent: 'decoded.' },
  goals: { eyebrow: 'July · Cycle 4', first: 'The', accent: 'paths.' },
  budgets: { eyebrow: 'July · Cycle 4', first: 'The', accent: 'plan.' },
  settings: { eyebrow: 'Account', first: 'Your', accent: 'settings.' },
}

const categories = [
  ['Dining Out', '40,139', 82, 'clay'],
  ['Groceries', '18,900', 44, 'sage'],
  ['Transport', '12,400', 29, 'blue'],
] as const

function Money({ children, accent = false }: { children: ReactNode; accent?: boolean }) {
  return <span className={accent ? 'd-money d-accent' : 'd-money'}>{children}</span>
}

function Button({ children, kind = 'primary', onClick }: { children: ReactNode; kind?: 'primary' | 'secondary' | 'quiet'; onClick?: () => void }) {
  return <button type="button" className={`d-button is-${kind}`} onClick={onClick}>{children}</button>
}

function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <section className={`d-card ${className}`}>{children}</section>
}

function Label({ children }: { children: ReactNode }) {
  return <p className="d-label">{children}</p>
}

function CategoryBars({ includeBills = false }: { includeBills?: boolean }) {
  const items = includeBills ? [...categories, ['Bills', '11,000', 24, 'sand'] as const] : categories
  return <div className="d-bars">{items.map(([name, value, width, tone]) => (
    <div className="d-bar" key={name}>
      <div><strong>{name}</strong><Money>{value}</Money></div>
      <span><i className={`is-${tone}`} style={{ width: `${width}%` }} /></span>
    </div>
  ))}</div>
}

function Rail({ activePage, setActivePage }: DesktopExperienceProps) {
  const isSettings = activePage === 'settings'
  return <aside className={`d-rail ${isSettings ? 'is-settings' : ''}`}>
    <div className="d-brand">
      <span className="d-brand-mark">P</span>
      <div><p>Pocket Ledger</p><small>Personal</small></div>
    </div>
    <nav aria-label="Desktop primary navigation">
      {nav.map(({ id, label, icon: Icon }) => <button
        type="button"
        key={id}
        className={activePage === id ? 'is-active' : ''}
        onClick={() => setActivePage(id)}
      ><Icon size={18} /><span>{label}</span>{activePage === id && <i />}</button>)}
    </nav>
    <div className="d-context">
      <Label>{isSettings ? 'Version' : activePage === 'accounts' ? 'Linked' : activePage === 'transactions' ? 'This cycle' : 'Cycle 4 · July'}</Label>
      <p>{isSettings ? <>Pocket Ledger <strong>2.4.0</strong> · up to date.</> : activePage === 'accounts' ? <><strong>4</strong> accounts, synced 6 min ago.</> : activePage === 'transactions' ? <><strong>47</strong> entries logged since 3 July.</> : <>You're <strong>Rs 6,180</strong> under budget so far this month.</>}</p>
    </div>
    <button type="button" className={`d-profile ${isSettings ? 'is-active' : ''}`} onClick={() => setActivePage('settings')}>
      <span>M</span><div><strong>Moeed Ahmed</strong><small>{isSettings ? 'Settings open' : 'Settings'}</small></div>{isSettings ? <i /> : <ChevronRight size={16} />}
    </button>
  </aside>
}

function Topbar({ page, openModal, setActivePage }: { page: DesktopPage; openModal: (kind: ModalKind) => void; setActivePage: (page: string) => void }) {
  const heading = titles[page]
  const isSettings = page === 'settings'
  return <header className="d-topbar">
    <div><Label>{heading.eyebrow}</Label><h1>{heading.first}{page === 'dashboard' && <br />} <em>{heading.accent}</em></h1></div>
    <div className="d-top-actions">
      {!isSettings && <button type="button" className="d-search"><Search size={16} /><span>{page === 'dashboard' ? 'Search transactions' : 'Search entries'}</span></button>}
      {page === 'dashboard' && <button type="button" className="d-icon-button" aria-label="Notifications"><Bell size={17} /></button>}
      {page === 'transactions' && <button type="button" className="d-filter"><CalendarDays size={16} />This cycle<ChevronDown size={14} /></button>}
      {page === 'accounts' && <button type="button" className="d-filter"><SlidersHorizontal size={16} />All accounts<ChevronDown size={14} /></button>}
      {page === 'reports' && <button type="button" className="d-filter">This cycle<ChevronDown size={14} /></button>}
      {page === 'goals' && <Button onClick={() => openModal('goal')}><Plus size={17} />New goal</Button>}
      {page === 'budgets' && <Button onClick={() => openModal('plan')}><Plus size={17} />Add to plan</Button>}
      {(page === 'dashboard' || page === 'transactions') && <Button onClick={() => openModal('record')}><Plus size={17} />Record</Button>}
      {isSettings && <Button kind="secondary" onClick={() => setActivePage('dashboard')}><X size={16} />Close</Button>}
    </div>
  </header>
}

function HomePage({ setActivePage }: { setActivePage: (page: string) => void }) {
  return <div className="d-columns">
    <div className="d-work d-home-work">
      <section className="d-hero d-balance-hero">
        <div><Label>● &nbsp; Total balance</Label><p className="d-hero-number"><small>Rs</small> 48,250</p><span>Across 3 accounts · updated just now</span></div>
        <div className="d-account-split">
          <p><i className="clay" />HBL Bank <Money>18,900</Money></p>
          <p><i className="gold" />Meezan Bank <Money>22,950</Money></p>
          <p><i className="sage" />JazzCash <Money>6,400</Money></p>
          <span><i /><i /><i /></span>
        </div>
      </section>
      <div className="d-mini-grid">
        <button type="button" className="d-mini-card" onClick={() => setActivePage('budgets')}><Label>Safe today</Label><Money>Rs 313</Money><span>Open plan <b>→</b></span></button>
        <div className="d-mini-card is-dashed"><Label>Cycle</Label><Money>Day 0<small>/7</small></Money><span>● On track</span></div>
        <button type="button" className="d-mini-card" onClick={() => setActivePage('accounts')}><Label>Next income</Label><Money>11 <small>days</small></Money><span>Open wallet <b>→</b></span></button>
      </div>
      <Card className="d-ledger-card d-fill">
        <div className="d-card-heading"><h2>Today</h2><button type="button" onClick={() => setActivePage('transactions')}>Full ledger <ArrowRight size={13} /></button></div>
        <TransactionRows compact />
      </Card>
    </div>
    <aside className="d-attention">
      <section className="d-leak"><div><Label>Money leak found</Label><span>↗</span></div><h2>Dining Out</h2><Money>Rs 40,139</Money><p>across 18 orders in 30 days — set a limit?</p></section>
      <Card className="d-quest"><div><Label>This week's quest</Label><small>ends Sun</small></div><h2>Three no-spend days</h2><div className="d-segments"><i /><i /><i /></div><p><strong>2 of 3</strong> done — no streak shame, ever.</p></Card>
      <Card className="d-fill"><Label>Top categories · July</Label><CategoryBars /></Card>
    </aside>
  </div>
}

const ledgerRows = [
  ['Karachi Broast', '1:20 pm', 'Dining Out', 'JazzCash', '−700', 'spent'],
  ['PSO Fuel', '9:40 am', 'Transport', 'Cash', '−850', 'spent'],
  ['Pocket money', '6:00 pm', 'Income', 'Cash', '+5,000', 'income'],
  ['Jazz top-up', '2:10 pm', 'Bills', 'JazzCash', '−300', 'spent'],
  ['To savings', '11:00 am', 'Transfer', 'HBL → JazzCash', '2,000', 'moved'],
  ['Imtiaz Super Market', '7:30 pm', 'Groceries', 'HBL Bank', '−2,000', 'spent'],
] as const

function TransactionRows({ compact = false }: { compact?: boolean }) {
  const rows = compact ? [ledgerRows[0], ledgerRows[2], ['Careem ride', 'yesterday', 'Transport', 'Cash', '−480', 'spent'] as const] : ledgerRows
  return <div className={`d-transactions ${compact ? 'is-compact' : ''}`}>{rows.map((row, index) => <div className="d-transaction" key={row[0]}>
    <i className={`is-${row[5]}`} /><div className="d-entry"><strong>{row[0]}</strong><small>{row[1]}</small></div>
    {!compact && <><span className="d-category">■ &nbsp; {row[2]}</span><span>{row[3]}</span></>}
    <Money accent={row[5] === 'income'}>{row[4]}</Money>
    {!compact && index === 1 && <b className="d-day-separator">Yesterday · <small>Tue 22 Jul</small><em>+2,700</em></b>}
  </div>)}</div>
}

function LedgerPage() {
  return <div className="d-columns">
    <Card className="d-work d-table-card">
      <div className="d-tabs"><button className="is-active">All</button><button>Spent</button><button>Received</button><button>Moved</button></div>
      <div className="d-table-head"><span>Entry</span><span>Category</span><span>Account</span><span>Amount</span></div>
      <div className="d-date-row"><h2>Today <small>· Wed 23 Jul</small></h2><Money>−1,550</Money></div>
      <TransactionRows />
    </Card>
    <aside className="d-attention">
      <Card className="d-flow"><Label>Cycle flow</Label><p><span>● &nbsp; In</span><Money>25,000</Money></p><p><span>● &nbsp; Out</span><Money>9,320</Money></p><hr /><p><strong>Net</strong><Money accent>+15,680</Money></p><div><i /><i /></div></Card>
      <Card className="d-fill"><Label>Where it went · July</Label><CategoryBars includeBills /><div className="d-legend">● Spent &nbsp;&nbsp; <b>● Received</b> &nbsp;&nbsp; ● Moved</div></Card>
    </aside>
  </div>
}

const accounts = [
  ['JazzCash', 'Mobile wallet · ••42', '29,800', 38, 'clay', WalletCards],
  ['HBL Bank', 'Current account · ••07', '34,120', 44, 'blue', Landmark],
  ['Cash', 'In pocket', '9,500', 12, 'sage', CircleDollarSign],
  ['Meezan Savings', 'Locked · matures Sep', '5,000', 6, 'sand', Sparkles],
] as const

function WalletPage({ openModal }: { openModal: (kind: ModalKind) => void }) {
  return <div className="d-columns">
    <div className="d-work">
      <section className="d-hero d-wallet-hero"><div><Label>On hand · all accounts</Label><p className="d-hero-number">Rs 78,420</p><span><b>+15,680</b> this cycle · net after Rs 9,320 spent</span></div><div><Button onClick={() => openModal('move')}><ArrowRight size={17} />Move money</Button><Button kind="quiet" onClick={() => openModal('account')}><Plus size={17} />Add account</Button></div></section>
      <Card className="d-accounts d-fill"><div className="d-card-heading"><h2>Accounts</h2><Label>4 linked</Label></div>{accounts.map(([name, meta, value, amount, tone, Icon]) => <button type="button" key={name}>
        <span className={`d-account-icon is-${tone}`}><Icon size={19} /></span><span><strong>{name}</strong><small>{meta}</small></span><span className="d-account-share"><i><b className={`is-${tone}`} style={{ width: `${amount}%` }} /></i><small>{amount}% of on hand</small></span><Money>{value}</Money><ChevronRight size={16} />
      </button>)}</Card>
    </div>
    <aside className="d-attention">
      <Card className="d-chart-card"><div><Label>Balance · this cycle</Label><b>+25%</b></div><svg viewBox="0 0 400 120" role="img" aria-label="Balance rising this cycle"><defs><linearGradient id="balanceFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#E2703A" stopOpacity=".24"/><stop offset="1" stopColor="#E2703A" stopOpacity="0"/></linearGradient></defs><path d="M0 88 L52 78 L104 84 L156 58 L208 68 L260 42 L312 50 L356 24 L400 18 L400 120 L0 120Z" fill="url(#balanceFill)"/><path d="M0 88 L52 78 L104 84 L156 58 L208 68 L260 42 L312 50 L356 24 L400 18" fill="none" stroke="#E2703A" strokeWidth="3"/></svg><footer><span>3 Jul</span><span>Rs 62,740</span><span>today</span></footer></Card>
      <Card className="d-quick"><Label>Quick move</Label><div><span><small>From</small><strong>HBL Bank</strong></span><b>→</b><span><small>To</small><strong>JazzCash</strong></span></div><footer><Money><small>Rs</small> 2,000</Money><Button onClick={() => openModal('move')}>Move</Button></footer></Card>
      <Card className="d-fill d-scheduled"><Label>Scheduled next</Label><p><span>↑</span><strong>Pocket money<small>in 2 days · to Cash</small></strong><Money accent>+5,000</Money></p><p><span>≡</span><strong>Netflix<small>in 4 days · from HBL</small></strong><Money>−1,100</Money></p><p><span>ϟ</span><strong>K-Electric<small>in 6 days · from JazzCash</small></strong><Money>−3,400</Money></p><footer>Net after scheduled <Money>Rs 78,920</Money></footer></Card>
    </aside>
  </div>
}

function InsightsPage({ openModal }: { openModal: (kind: ModalKind) => void }) {
  return <div className="d-columns">
    <div className="d-work">
      <Card className="d-spend-chart"><div className="d-card-heading"><div><Label>Spending this cycle</Label><h2>Rs 9,320</h2></div><span><b>−18%</b> vs last cycle</span></div><svg viewBox="0 0 760 240" role="img" aria-label="Daily spending chart"><path d="M0 210 H760 M0 150 H760 M0 90 H760 M0 30 H760" stroke="#EDE5D5"/><path d="M0 188 C65 174 80 192 145 152 S235 174 300 116 S390 140 455 82 S545 105 610 58 S700 72 760 30" fill="none" stroke="#E2703A" strokeWidth="5"/><path d="M0 188 C65 174 80 192 145 152 S235 174 300 116 S390 140 455 82 S545 105 610 58 S700 72 760 30 L760 240 L0 240Z" fill="#E2703A" opacity=".09"/></svg></Card>
      <Card className="d-fill"><div className="d-card-heading"><h2>Category story</h2><Label>July</Label></div><CategoryBars includeBills /><div className="d-insight-note"><Utensils size={19}/><p><strong>Dining Out is driving 49% of spending.</strong><br/>Mostly weekday lunches between 1–3 pm.</p><Button kind="secondary">Set a limit</Button></div></Card>
    </div>
    <aside className="d-attention">
      <section className="d-hero d-pace"><Label>Your pace</Label><Money>Rs 1,331</Money><p>per day this cycle</p><div><span style={{ width: '62%' }} /></div><small>At this pace, you'll finish <b>Rs 6,180 under</b> plan.</small></section>
      <Card><Label>Biggest mover</Label><h2>Dining out <Money accent>+31%</Money></h2><p className="d-muted">Up Rs 8,240 from your last cycle.</p></Card>
      <section className="d-leak d-nudge"><Label>Worth a pause?</Label><h2>A new pair of headphones</h2><p>Save it for 48 hours. If it still feels right, it stays.</p><Button kind="secondary" onClick={() => openModal('cooloff')}>Cool it off <ArrowRight size={15}/></Button></section>
      <Card className="d-fill d-quote"><Sparkles size={22}/><h2>“Awareness beats restriction.”</h2><p>Your spending is already trending down.</p></Card>
    </aside>
  </div>
}

function GoalsPage({ openModal }: { openModal: (kind: ModalKind) => void }) {
  const goals = [['Emergency cushion','Rs 72,000','Rs 120,000',60,'sage'],['New laptop','Rs 84,500','Rs 180,000',47,'blue'],['Umrah','Rs 55,000','Rs 250,000',22,'sand']] as const
  return <div className="d-columns">
    <div className="d-work">
      <section className="d-hero d-goal-hero"><div><Label>Closest path</Label><h2>Emergency cushion</h2><p><Money>Rs 72,000</Money> of Rs 120,000</p><div><span style={{ width: '60%' }}/></div><small>Rs 48,000 to go · about 4 months</small></div><div className="d-goal-ring"><span>60<small>%</small></span></div></section>
      <div className="d-goal-grid">{goals.map(([name, current, target, progress, tone]) => <Card key={name}><span className={`d-account-icon is-${tone}`}><Target size={18}/></span><h2>{name}</h2><p><Money>{current}</Money><small>of {target}</small></p><div><span className={`is-${tone}`} style={{ width: `${progress}%` }}/></div><footer><small>{progress}% funded</small><ChevronRight size={15}/></footer></Card>)}</div>
      <Card className="d-fill d-contribution"><div><Label>This cycle</Label><h2>You added <Money accent>Rs 18,500</Money> to your future.</h2></div><Button onClick={() => openModal('funds')}><Plus size={16}/>Add funds</Button></Card>
    </div>
    <aside className="d-attention">
      <Card><Label>All paths</Label><h2><Money>Rs 211,500</Money></h2><p className="d-muted">saved across 3 goals</p></Card>
      <Card className="d-timeline"><Label>Coming into view</Label><p><i/>Emergency cushion<strong>Nov 2026</strong></p><p><i/>New laptop<strong>Mar 2027</strong></p><p><i/>Umrah<strong>Dec 2027</strong></p></Card>
      <section className="d-leak d-goal-nudge"><Label>A gentle nudge</Label><h2>Rs 2,000 this week puts the cushion 5 days closer.</h2><Button kind="secondary" onClick={() => openModal('funds')}>Add Rs 2,000</Button></section>
      <Card className="d-fill d-quote"><Target size={22}/><h2>Three paths. One steady pace.</h2><p>You're ahead of where you started.</p></Card>
    </aside>
  </div>
}

function PlanPage({ openModal }: { openModal: (kind: ModalKind) => void }) {
  const limits = [['Dining Out','40,139','45,000',89,'clay'],['Groceries','18,900','28,000',68,'sage'],['Transport','12,400','20,000',62,'blue'],['Bills','11,000','18,000',61,'sand']] as const
  return <div className="d-columns">
    <div className="d-work">
      <section className="d-hero d-plan-hero"><div><Label>July plan</Label><p className="d-hero-number"><small>Rs</small> 68,320 <small>left</small></p><span>of Rs 105,000 · <b>35% used</b></span></div><div className="d-plan-ring"><span>65<small>%</small><em>remaining</em></span></div></section>
      <Card className="d-fill d-limits"><div className="d-card-heading"><h2>Spending limits</h2><Label>4 active</Label></div>{limits.map(([name, value, max, progress, tone]) => <div key={name}><span className={`d-account-icon is-${tone}`}>●</span><strong>{name}</strong><span className="d-limit-bar"><i><b className={`is-${tone}`} style={{width:`${progress}%`}}/></i><small>{progress}% used</small></span><Money>{value}<small> / {max}</small></Money><ChevronRight size={15}/></div>)}</Card>
    </div>
    <aside className="d-attention">
      <Card className="d-scheduled"><Label>Scheduled</Label><p><span>↑</span><strong>3 payments<small>next 7 days</small></strong><Money>Rs 9,500</Money></p><footer>Already included in your plan</footer></Card>
      <section className="d-leak d-nudge"><Label>Cool-off list</Label><h2>1 decision is waiting</h2><p>Headphones · 31 hours left</p><Button kind="secondary" onClick={() => openModal('cooloff')}>Review <ArrowRight size={15}/></Button></section>
      <Card className="d-quest"><div><Label>This week's quest</Label><small>ends Sun</small></div><h2>Three no-spend days</h2><div className="d-segments"><i/><i/><i/></div><p><strong>2 of 3</strong> complete</p></Card>
      <Card className="d-fill d-plan-note"><Label>Looking good</Label><h2>You're on course to keep <Money accent>Rs 6,180</Money>.</h2><p>No need to squeeze harder.</p></Card>
    </aside>
  </div>
}

function Toggle({ on = true }: { on?: boolean }) { return <button type="button" aria-label="Toggle setting" className={`d-toggle ${on ? 'is-on' : ''}`}><i/></button> }

function SettingsPage({ setActivePage }: { setActivePage: (page: string) => void }) {
  return <div className="d-columns d-settings-grid">
    <div className="d-work">
      <Card className="d-profile-card"><span>M</span><div><h2>Moeed Ahmed</h2><p>moeed.ahmed@gmail.com · Karachi</p></div><Button kind="secondary"><Pencil size={16}/>Edit profile</Button></Card>
      <Card className="d-settings-card"><Label>Cycle & money</Label><div><span className="d-account-icon is-clay"><CalendarDays size={18}/></span><p><strong>Cycle starts on</strong><small>When each budget month resets</small></p><button>3rd <ChevronDown size={14}/></button></div><div><span className="d-account-icon is-sage"><CircleDollarSign size={18}/></span><p><strong>Currency</strong><small>Shown across the app</small></p><button>PKR · Rs <ChevronDown size={14}/></button></div><div><span className="d-account-icon is-blue"><Sparkles size={18}/></span><p><strong>Round small change</strong><small>Hide paisa on totals</small></p><Toggle/></div></Card>
      <Card className="d-settings-card d-fill"><Label>Notifications</Label><div><p><strong>Over-budget alert</strong><small>Ping me when a limit is close</small></p><Toggle/></div><div><p><strong>Bill reminders</strong><small>2 days before anything is due</small></p><Toggle/></div><div><p><strong>Weekly digest</strong><small>A Sunday recap of the cycle</small></p><Toggle on={false}/></div></Card>
    </div>
    <aside className="d-attention">
      <Card className="d-settings-card d-fill"><Label>Data & security</Label><button className="d-setting-link" onClick={() => setActivePage('categories')}><span className="d-account-icon is-sage"><WalletCards size={18}/></span><strong>Manage categories</strong><ChevronRight size={15}/></button><button className="d-setting-link" onClick={() => setActivePage('accounts')}><span className="d-account-icon is-blue"><CreditCard size={18}/></span><strong>Linked accounts</strong><small>4</small><ChevronRight size={15}/></button><button className="d-setting-link"><span className="d-account-icon is-sand"><Download size={18}/></span><strong>Export data</strong><small>CSV</small><ChevronRight size={15}/></button></Card>
      <Button kind="secondary"><LockKeyhole size={16}/>Sign out</Button>
    </aside>
  </div>
}

const modalCopy: Record<ModalKind, { badge: string; title: string; subtitle: string; save: string }> = {
  record: { badge: 'New entry', title: 'Record a spend', subtitle: 'Log it before you forget.', save: 'Save entry' },
  move: { badge: 'Transfer', title: 'Move money', subtitle: 'Shift money between your accounts.', save: 'Move Rs 2,000' },
  account: { badge: 'Wallet', title: 'Add an account', subtitle: 'Bring another balance into view.', save: 'Add account' },
  cooloff: { badge: '48 hour pause', title: 'Cool off a buy', subtitle: 'Give the decision some breathing room.', save: 'Start cool-off' },
  funds: { badge: 'Goal deposit', title: 'Add funds', subtitle: 'Move one of your paths closer.', save: 'Add Rs 2,000' },
  goal: { badge: 'New path', title: 'Create a goal', subtitle: 'Name what you are moving toward.', save: 'Create goal' },
  plan: { badge: 'New limit', title: 'Add to your plan', subtitle: 'Give this category a comfortable edge.', save: 'Add to plan' },
}

function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="d-field"><span>{label}</span><div>{children}</div></label> }

function SlideOver({ kind, close }: { kind: ModalKind; close: () => void }) {
  const copy = modalCopy[kind]
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') close() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [close])
  return <div className="d-modal-layer" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) close() }}>
    <aside className="d-slide-over" role="dialog" aria-modal="true" aria-labelledby="desktop-modal-title">
      <header><div><span><Plus size={14}/></span>{copy.badge}</div><button type="button" onClick={close} aria-label="Close"><X size={17}/></button><h2 id="desktop-modal-title">{copy.title}</h2><p>{copy.subtitle}</p></header>
      <div className="d-modal-body">
        {kind === 'record' && <><div className="d-tabs d-modal-tabs"><button className="is-active">Spent</button><button>Received</button></div><Field label="Amount"><Money><small>Rs</small> 850</Money></Field><div className="d-chips"><button>200</button><button>500</button><button>1,000</button><button>2,000</button></div><Field label="Category"><div className="d-chips"><button className="is-active">Dining Out</button><button>Groceries</button><button>Transport</button><button>Bills</button></div></Field><div className="d-field-row"><Field label="Account">JazzCash ••42 <ChevronDown size={14}/></Field><Field label="When">Today <ChevronDown size={14}/></Field></div><Field label="Note"><span className="d-placeholder">Lunch with the team</span></Field></>}
        {kind === 'move' && <><div className="d-transfer-choice"><Field label="From">HBL Bank <ChevronDown size={14}/></Field><ArrowRight/><Field label="To">JazzCash <ChevronDown size={14}/></Field></div><Field label="Amount"><Money><small>Rs</small> 2,000</Money></Field><Card className="d-modal-summary"><Label>After this move</Label><p>HBL Bank <Money>Rs 32,120</Money></p><p>JazzCash <Money>Rs 31,800</Money></p></Card><Field label="Note"><span className="d-placeholder">Optional</span></Field></>}
        {kind === 'account' && <><Field label="Account name"><span className="d-placeholder">e.g. Meezan Savings</span></Field><Field label="Account type">Bank account <ChevronDown size={14}/></Field><Field label="Opening balance"><Money><small>Rs</small> 0</Money></Field><div className="d-account-types"><button className="is-active"><Landmark/>Bank</button><button><WalletCards/>Wallet</button><button><CircleDollarSign/>Cash</button></div></>}
        {kind === 'cooloff' && <><Field label="What are you considering?"><span>New headphones</span></Field><Field label="Expected price"><Money><small>Rs</small> 18,500</Money></Field><div className="d-pause-card"><Sparkles/><h3>A little space, not a “no”.</h3><p>We’ll bring this back in 48 hours so you can decide with a clear head.</p></div></>}
        {kind === 'funds' && <><Field label="Goal">Emergency cushion <ChevronDown size={14}/></Field><Field label="Amount"><Money><small>Rs</small> 2,000</Money></Field><div className="d-chips"><button>1,000</button><button className="is-active">2,000</button><button>5,000</button></div><Field label="From">HBL Bank <ChevronDown size={14}/></Field><Card className="d-modal-summary"><Label>New progress</Label><p>Emergency cushion <Money accent>62%</Money></p></Card></>}
        {kind === 'goal' && <><Field label="Goal name"><span className="d-placeholder">e.g. Rainy day fund</span></Field><Field label="Target amount"><Money><small>Rs</small> 100,000</Money></Field><Field label="Target date">December 2026 <CalendarDays size={15}/></Field><div className="d-account-types"><button className="is-active"><Target/>Safety</button><button><Sparkles/>Dream</button><button><Landmark/>Milestone</button></div></>}
        {kind === 'plan' && <><Field label="Category">Dining Out <ChevronDown size={14}/></Field><Field label="Monthly limit"><Money><small>Rs</small> 45,000</Money></Field><Card className="d-modal-summary"><Label>Based on your activity</Label><p>Last cycle <Money>Rs 38,400</Money></p><p>This cycle so far <Money accent>Rs 40,139</Money></p></Card><Field label="Reminder">At 80% used <ChevronDown size={14}/></Field></>}
      </div>
      <footer><Button onClick={close}><Check size={18}/>{copy.save}</Button></footer>
    </aside>
  </div>
}

export function DesktopExperience({ activePage, setActivePage }: DesktopExperienceProps) {
  const [modal, setModal] = useState<ModalKind | null>(null)
  const page = (Object.hasOwn(titles, activePage) ? activePage : 'dashboard') as DesktopPage
  return <div className="desktop-experience">
    <Rail activePage={page} setActivePage={setActivePage} />
    <main className="d-main">
      <Topbar page={page} openModal={setModal} setActivePage={setActivePage}/>
      {page === 'dashboard' && <HomePage setActivePage={setActivePage}/>} 
      {page === 'transactions' && <LedgerPage/>}
      {page === 'accounts' && <WalletPage openModal={setModal}/>} 
      {page === 'reports' && <InsightsPage openModal={setModal}/>} 
      {page === 'goals' && <GoalsPage openModal={setModal}/>} 
      {page === 'budgets' && <PlanPage openModal={setModal}/>} 
      {page === 'settings' && <SettingsPage setActivePage={setActivePage}/>} 
    </main>
    {modal && <SlideOver kind={modal} close={() => setModal(null)}/>} 
  </div>
}
